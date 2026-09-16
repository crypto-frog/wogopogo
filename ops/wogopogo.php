#!/usr/bin/env php
<?php
/**
 * Private, SSH-first operations CLI for Wogopogo.
 *
 * Install this file outside public_html and point --app-root at the active
 * release. Every mutation requires --apply, --actor, and --reason. Output is
 * JSON so a human or an AI agent can inspect it without scraping prose.
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit(1);
}

function cli_json(array $data, int $exitCode = 0): never
{
    $json = json_encode(
        $data,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
            | JSON_INVALID_UTF8_SUBSTITUTE
    );
    fwrite($exitCode === 0 ? STDOUT : STDERR, ($json === false ? '{"ok":false}' : $json) . PHP_EOL);
    exit($exitCode);
}

function cli_fail(string $message, array $details = [], int $exitCode = 1): never
{
    cli_json(['ok' => false, 'error' => $message, 'details' => $details], $exitCode);
}

function cli_options(array $argv): array
{
    $options = [];
    for ($i = 2, $count = count($argv); $i < $count; $i++) {
        $arg = (string) $argv[$i];
        if (!str_starts_with($arg, '--')) {
            cli_fail('Unexpected positional argument.', ['argument' => $arg]);
        }
        $raw = substr($arg, 2);
        if ($raw === '') {
            cli_fail('Empty option name.');
        }
        if (str_contains($raw, '=')) {
            [$key, $value] = explode('=', $raw, 2);
            $options[$key] = $value;
            continue;
        }
        $next = $argv[$i + 1] ?? null;
        if (is_string($next) && !str_starts_with($next, '--')) {
            $options[$raw] = $next;
            $i++;
        } else {
            $options[$raw] = true;
        }
    }
    return $options;
}

function cli_string(array $options, string $key, string $default = ''): string
{
    $value = $options[$key] ?? $default;
    return is_string($value) ? trim($value) : $default;
}

function cli_flag(array $options, string $key): bool
{
    $value = $options[$key] ?? false;
    if ($value === true) {
        return true;
    }
    return is_string($value) && in_array(strtolower($value), ['1', 'true', 'yes'], true);
}

function cli_int(array $options, string $key, int $default, int $min, int $max): int
{
    $raw = $options[$key] ?? $default;
    if (is_string($raw) && preg_match('/^-?\d+$/', $raw)) {
        $raw = (int) $raw;
    }
    if (!is_int($raw)) {
        cli_fail("--$key must be an integer.");
    }
    if ($raw < $min || $raw > $max) {
        cli_fail("--$key must be between $min and $max.");
    }
    return $raw;
}

function cli_help(): array
{
    return [
        'ok' => true,
        'program' => 'wogopogo-ops',
        'usage' => 'php wogopogo.php COMMAND [--option value]',
        'global' => [
            '--app-root' => 'Active release root; defaults to WOGOPOGO_APP_ROOT or ~/public_html/wogopogo_current.',
            '--apply' => 'Required for every mutation. Without it, import is a dry run.',
            '--actor' => 'Required for mutations; use a stable agent/session identity.',
            '--reason' => 'Required for mutations and saved in the append-only audit trail.',
        ],
        'commands' => [
            'capabilities' => 'Machine-readable command and safety contract.',
            'status' => 'Health, schema, configuration flags, categories, and counts.',
            'job:list' => 'List jobs. Options: --status, --limit.',
            'job:show' => 'Show one job. Requires --id.',
            'job:export' => 'Export jobs as JSON. Options: --status, --limit.',
            'job:import' => 'Validate/import a version-1 JSON manifest. Requires --file; use --apply to write.',
            'job:act' => 'approve|reject|feature|unfeature|close|renew|delete. Requires --id and --action.',
            'job:verify' => 'Record active|closed|unreachable source audit. Optional --deadline-at UTC timestamp (or none).',
            'notification:status' => 'Read submission email outbox counts.',
            'notification:send' => 'Deliver due owner notifications; --limit 1..50, --apply, --actor and --reason required.',
            'notification:resolve' => 'Resolve a failed/unknown handoff with --id and --resolution sent|retry after inspecting mail delivery.',
            'audit:jobs' => 'Check provenance, verification freshness, expiry, and application data.',
            'audit:list' => 'Read recent mutation audit events. Option: --limit.',
        ],
    ];
}

function cli_capabilities(): array
{
    return [
        'ok' => true,
        'contract_version' => 1,
        'interface' => 'JSON over SSH/PHP CLI',
        'mutations' => [
            'require' => ['--apply', '--actor', '--reason'],
            'dry_run_default' => true,
            'transactions' => true,
            'append_only_audit' => true,
            'idempotency_key' => 'jobs.source_key',
        ],
        'job_statuses' => ['pending', 'approved', 'rejected', 'closed'],
        'source_statuses' => ['active', 'closed', 'unreachable', 'unverified'],
        'source_deadline_at' => 'Optional UTC closing instant; import, verification, approval and renewal cap listing expiry.',
        'submission_notifications' => 'Transactional owner-only outbox; private scheduled send; interrupted handoffs require explicit resolution.',
        'commercial' => [
            'current_tiers' => ['free', 'featured'],
            'feature_requires' => ['--commercial-mode', '--commercial-reference'],
            'commercial_modes' => ['manual-comp', 'manual-paid', 'provider-verified'],
            'rule' => 'Never use provider-verified without independent confirmation from the payment provider.',
        ],
        'secrets' => 'Loaded only from the active release api/config.local.php; never emitted.',
    ];
}

function cli_write_context(array $options): array
{
    if (!cli_flag($options, 'apply')) {
        cli_fail('Mutation refused without --apply.');
    }
    $actor = cli_string($options, 'actor');
    $reason = cli_string($options, 'reason');
    if ($actor === '' || mb_strlen($actor) > 120) {
        cli_fail('--actor is required and must be at most 120 characters.');
    }
    if ($reason === '' || mb_strlen($reason) > 500) {
        cli_fail('--reason is required and must be at most 500 characters.');
    }
    return [$actor, $reason];
}

function cli_app_root(array $options): string
{
    $candidate = cli_string($options, 'app-root');
    if ($candidate === '') {
        $candidate = trim((string) getenv('WOGOPOGO_APP_ROOT'));
    }
    if ($candidate === '') {
        $candidate = rtrim((string) getenv('HOME'), '/') . '/public_html/wogopogo_current';
    }
    $root = realpath($candidate);
    if ($root === false || !is_file($root . '/api/config.php') || !is_file($root . '/api/config.local.php')) {
        cli_fail('The active application root or its private configuration was not found.', [
            'candidate' => $candidate,
            'expected' => ['api/config.php', 'api/config.local.php'],
        ]);
    }
    return $root;
}

function cli_job(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare(
        'SELECT j.*, c.name AS cat_name, c.slug AS cat_slug, c.emoji AS cat_emoji
           FROM jobs j JOIN categories c ON c.id = j.category_id WHERE j.id = ?'
    );
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function cli_public_job(array $row): array
{
    unset($row['manage_hash']);
    return $row;
}

function cli_valid_date(string $value): bool
{
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value, new DateTimeZone('UTC'));
    return $date !== false && $date->format('Y-m-d') === $value;
}

function cli_valid_timestamp(string $value): bool
{
    $date = DateTimeImmutable::createFromFormat('!Y-m-d H:i:s', $value, new DateTimeZone('UTC'));
    return $date !== false && $date->format('Y-m-d H:i:s') === $value;
}

function cli_http_url(string $value): bool
{
    return filter_var($value, FILTER_VALIDATE_URL) !== false
        && preg_match('#^https?://#i', $value) === 1;
}

function cli_manifest_string(array $job, string $key, int $max, bool $required = true): string
{
    $value = $job[$key] ?? '';
    if (!is_string($value)) {
        cli_fail('Manifest field must be a string.', ['field' => $key]);
    }
    $value = trim(str_replace(["\r\n", "\r"], "\n", $value));
    if (($required && $value === '') || mb_strlen($value) > $max) {
        cli_fail('Manifest field is empty or too long.', ['field' => $key, 'max' => $max]);
    }
    if (strip_tags($value) !== $value || preg_match('/[^\P{C}\n]/u', $value)) {
        cli_fail('Manifest text must be plain text without control characters.', ['field' => $key]);
    }
    return $value;
}

function cli_validate_manifest(array $manifest, array $cfg, PDO $pdo): array
{
    if (($manifest['manifest_version'] ?? null) !== 1 || !is_array($manifest['jobs'] ?? null)) {
        cli_fail('Expected manifest_version 1 and a jobs array.');
    }
    $policy = is_array($manifest['policy'] ?? null) ? $manifest['policy'] : [];
    $maxAge = $policy['max_source_age_days'] ?? null;
    if ($maxAge !== null && (!is_int($maxAge) || $maxAge < 1 || $maxAge > 365)) {
        cli_fail('policy.max_source_age_days must be an integer from 1 to 365.');
    }

    $categories = [];
    foreach ($pdo->query('SELECT id, slug FROM categories') as $category) {
        $categories[(string) $category['slug']] = (int) $category['id'];
    }

    $normalized = [];
    $seen = [];
    $today = new DateTimeImmutable('today', new DateTimeZone('UTC'));
    foreach ($manifest['jobs'] as $index => $raw) {
        if (!is_array($raw)) {
            cli_fail('Each manifest job must be an object.', ['index' => $index]);
        }
        $sourceKey = cli_manifest_string($raw, 'source_key', 190);
        if (!preg_match('#^[a-z0-9][a-z0-9:._/-]{2,189}$#', $sourceKey)) {
            cli_fail('source_key has unsupported characters.', ['index' => $index, 'source_key' => $sourceKey]);
        }
        if (isset($seen[$sourceKey])) {
            cli_fail('Duplicate source_key in manifest.', ['source_key' => $sourceKey]);
        }
        $seen[$sourceKey] = true;

        $categorySlug = cli_manifest_string($raw, 'category_slug', 80);
        if (!isset($categories[$categorySlug])) {
            cli_fail('Unknown category_slug.', ['index' => $index, 'category_slug' => $categorySlug]);
        }
        $location = cli_manifest_string($raw, 'location', 80);
        $jobType = cli_manifest_string($raw, 'job_type', 40);
        if (!in_array($location, $cfg['locations'], true)) {
            cli_fail('Location is not configured.', ['index' => $index, 'location' => $location]);
        }
        if (!in_array($jobType, $cfg['job_types'], true)) {
            cli_fail('Job type is not configured.', ['index' => $index, 'job_type' => $jobType]);
        }

        $applyUrl = cli_manifest_string($raw, 'apply_url', 400);
        $sourceUrl = cli_manifest_string($raw, 'source_url', 500);
        $applyEmail = cli_manifest_string($raw, 'apply_email', 160, false);
        if (!cli_http_url($applyUrl) || !cli_http_url($sourceUrl)) {
            cli_fail('apply_url and source_url must be HTTP(S) URLs.', ['index' => $index]);
        }
        if ($applyEmail !== '' && filter_var($applyEmail, FILTER_VALIDATE_EMAIL) === false) {
            cli_fail('Invalid apply_email.', ['index' => $index]);
        }

        $postedAt = cli_manifest_string($raw, 'source_posted_at', 10);
        $verifiedAt = cli_manifest_string($raw, 'source_verified_at', 19);
        if (!cli_valid_date($postedAt) || !cli_valid_timestamp($verifiedAt)) {
            cli_fail('Source dates must use UTC YYYY-MM-DD and YYYY-MM-DD HH:MM:SS.', ['index' => $index]);
        }
        $postedDate = new DateTimeImmutable($postedAt, new DateTimeZone('UTC'));
        $age = (int) $postedDate->diff($today)->format('%r%a');
        if ($age < 0 || ($maxAge !== null && $age > $maxAge)) {
            cli_fail('Source posting date violates the manifest freshness policy.', [
                'index' => $index,
                'source_posted_at' => $postedAt,
                'age_days' => $age,
                'max_age_days' => $maxAge,
            ]);
        }
        $verifiedDate = new DateTimeImmutable($verifiedAt, new DateTimeZone('UTC'));
        if ($verifiedDate > new DateTimeImmutable('now', new DateTimeZone('UTC'))) {
            cli_fail('source_verified_at cannot be in the future.', ['index' => $index]);
        }

        $status = cli_manifest_string($raw, 'status', 20, false) ?: 'pending';
        $tier = cli_manifest_string($raw, 'tier', 20, false) ?: 'free';
        $sourceStatus = cli_manifest_string($raw, 'source_status', 20, false) ?: 'active';
        $deadline = cli_manifest_string($raw, 'source_deadline_at', 19, false);
        if ($deadline !== '' && (!cli_valid_timestamp($deadline) || $deadline <= wogo_now())) {
            cli_fail('Source deadline must be an unexpired UTC timestamp.', ['index' => $index]);
        }
        if (!in_array($status, ['pending', 'approved'], true)
            || !in_array($tier, ['free', 'featured'], true)
            || !in_array($sourceStatus, ['active', 'unreachable', 'unverified'], true)) {
            cli_fail('Invalid status, tier, or source_status.', ['index' => $index]);
        }
        if ($status === 'approved' && $sourceStatus !== 'active') {
            cli_fail('Approved imported jobs must have an active source.', ['index' => $index]);
        }

        $normalized[] = [
            'source_key' => $sourceKey,
            'title' => cli_manifest_string($raw, 'title', 90),
            'company' => cli_manifest_string($raw, 'company', 90),
            'category_id' => $categories[$categorySlug],
            'category_slug' => $categorySlug,
            'location' => $location,
            'job_type' => $jobType,
            'pay' => cli_manifest_string($raw, 'pay', 90, false),
            'description' => cli_manifest_string($raw, 'description', 6000),
            'apply_email' => $applyEmail,
            'apply_url' => $applyUrl,
            'status' => $status,
            'tier' => $tier,
            'source_name' => cli_manifest_string($raw, 'source_name', 120),
            'source_url' => $sourceUrl,
            'source_posted_at' => $postedAt,
            'source_verified_at' => $verifiedAt,
            'source_status' => $sourceStatus,
            'source_deadline_at' => $deadline,
            'source_deadline_provided' => array_key_exists('source_deadline_at', $raw),
        ];
    }
    return $normalized;
}

function cli_commercial_guard(array $options): array
{
    $mode = cli_string($options, 'commercial-mode');
    $reference = cli_string($options, 'commercial-reference');
    if (!in_array($mode, ['manual-comp', 'manual-paid', 'provider-verified'], true) || $reference === '') {
        cli_fail('Featuring requires --commercial-mode and --commercial-reference.', [
            'allowed_modes' => ['manual-comp', 'manual-paid', 'provider-verified'],
        ]);
    }
    return [$mode, $reference];
}

$command = $argv[1] ?? 'help';
$options = cli_options($argv);

if (in_array($command, ['help', '--help', '-h'], true)) {
    cli_json(cli_help());
}
if ($command === 'capabilities') {
    cli_json(cli_capabilities());
}

$appRoot = cli_app_root($options);
require $appRoot . '/api/helpers.php';
require $appRoot . '/api/db.php';
require $appRoot . '/api/notifications.php';
$cfg = require $appRoot . '/api/config.php';
$pdo = wogo_db($cfg);

try {
    if ($command === 'notification:status') {
        cli_json(['ok' => true, 'enabled' => (bool) ($cfg['submission_notifications']['enabled'] ?? false),
            'counts' => wogo_notification_status($pdo)]);
    }
    if ($command === 'notification:send') {
        [$actor, $reason] = cli_write_context($options);
        cli_json(['ok' => true] + wogo_notification_send($pdo, $cfg,
            cli_int($options, 'limit', 10, 1, 50), $actor, $reason));
    }
    if ($command === 'notification:resolve') {
        [$actor, $reason] = cli_write_context($options);
        $id = cli_int($options, 'id', 0, 1, PHP_INT_MAX);
        $resolution = cli_string($options, 'resolution');
        if (!in_array($resolution, ['sent', 'retry'], true)) {
            cli_fail('Resolution must be sent or retry after checking actual delivery.');
        }
        $pdo->beginTransaction();
        $update = $pdo->prepare("UPDATE submission_notifications SET state = ?, available_at = ?, last_error = '', sent_at = ?
                                WHERE job_id = ? AND state IN ('unknown', 'failed')");
        $update->execute([$resolution === 'retry' ? 'pending' : 'sent', wogo_now(), $resolution === 'sent' ? wogo_now() : '', $id]);
        if ($update->rowCount() !== 1) {
            $pdo->rollBack(); cli_fail('Only a failed or unknown notification can be resolved.');
        }
        wogo_audit($pdo, $actor, 'notification.resolve.' . $resolution, 'job', $id, '', $reason, [], ['resolution' => $resolution]);
        $pdo->commit(); cli_json(['ok' => true, 'id' => $id, 'resolution' => $resolution]);
    }
    if ($command === 'status') {
        $counts = [];
        foreach ($pdo->query('SELECT status, COUNT(*) AS count FROM jobs GROUP BY status') as $row) {
            $counts[(string) $row['status']] = (int) $row['count'];
        }
        $categories = $pdo->query(
            "SELECT c.id, c.name, c.slug, c.emoji,
                    SUM(CASE WHEN j.status = 'approved' AND j.expires_at > '" . wogo_now() . "' THEN 1 ELSE 0 END) AS live_jobs
               FROM categories c LEFT JOIN jobs j ON j.category_id = c.id
              GROUP BY c.id, c.name, c.slug, c.emoji ORDER BY c.id"
        )->fetchAll();
        $schema = $pdo->query("SELECT meta_value FROM app_meta WHERE meta_key = 'schema_version'")->fetchColumn();
        cli_json([
            'ok' => true,
            'app_root' => $appRoot,
            'driver' => $pdo->getAttribute(PDO::ATTR_DRIVER_NAME),
            'schema_version' => (int) $schema,
            'require_approval' => (bool) $cfg['require_approval'],
            'featured_enabled' => (bool) $cfg['featured_enabled'],
            'job_lifetime_days' => (int) $cfg['job_lifetime_days'],
            'counts' => $counts,
            'categories' => $categories,
            'locations' => array_values($cfg['locations']),
            'job_types' => array_values($cfg['job_types']),
            'time_utc' => wogo_now(),
        ]);
    }

    if (in_array($command, ['job:list', 'job:export'], true)) {
        $status = cli_string($options, 'status', 'all');
        if (!in_array($status, ['all', 'pending', 'approved', 'rejected', 'closed'], true)) {
            cli_fail('Unsupported --status.');
        }
        $limit = cli_int($options, 'limit', 200, 1, 5000);
        $sql = 'SELECT j.*, c.name AS cat_name, c.slug AS cat_slug, c.emoji AS cat_emoji
                  FROM jobs j JOIN categories c ON c.id = j.category_id';
        $params = [];
        if ($status !== 'all') {
            $sql .= ' WHERE j.status = ?';
            $params[] = $status;
        }
        $sql .= " ORDER BY j.created_at DESC LIMIT $limit";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $jobs = array_map('cli_public_job', $stmt->fetchAll());
        cli_json(['ok' => true, 'status' => $status, 'count' => count($jobs), 'jobs' => $jobs]);
    }

    if ($command === 'job:show') {
        $id = cli_int($options, 'id', 0, 1, PHP_INT_MAX);
        $job = cli_job($pdo, $id);
        if ($job === null) {
            cli_fail('Job not found.', ['id' => $id]);
        }
        cli_json(['ok' => true, 'job' => cli_public_job($job)]);
    }

    if ($command === 'job:import') {
        $file = cli_string($options, 'file');
        if ($file === '' || !is_file($file) || !is_readable($file)) {
            cli_fail('Readable --file is required.');
        }
        $raw = file_get_contents($file);
        $manifest = $raw === false ? null : json_decode($raw, true);
        if (!is_array($manifest)) {
            cli_fail('Manifest is not valid JSON.');
        }
        $jobs = cli_validate_manifest($manifest, $cfg, $pdo);
        if (array_filter($jobs, static fn(array $job): bool => $job['tier'] === 'featured')) {
            cli_commercial_guard($options);
        }
        $updateExisting = cli_flag($options, 'update-existing');
        $actions = [];
        $lookup = $pdo->prepare('SELECT id FROM jobs WHERE source_key = ?');
        foreach ($jobs as $job) {
            $lookup->execute([$job['source_key']]);
            $existingId = $lookup->fetchColumn();
            $actions[] = [
                'source_key' => $job['source_key'],
                'action' => $existingId ? ($updateExisting ? 'update' : 'skip') : 'create',
                'existing_id' => $existingId ? (int) $existingId : null,
            ];
        }
        if (!cli_flag($options, 'apply')) {
            cli_json([
                'ok' => true,
                'dry_run' => true,
                'validated' => count($jobs),
                'actions' => $actions,
            ]);
        }
        [$actor, $reason] = cli_write_context($options);
        $life = (int) $cfg['job_lifetime_days'];
        $now = wogo_now();
        $created = 0;
        $updated = 0;
        $skipped = 0;
        $ids = [];
        $pdo->beginTransaction();
        foreach ($jobs as $job) {
            $expires = wogo_job_expiry($cfg, $job);
            $lookup->execute([$job['source_key']]);
            $existingId = $lookup->fetchColumn();
            if ($existingId && !$updateExisting) {
                $skipped++;
                $ids[] = (int) $existingId;
                continue;
            }
            if ($existingId) {
                $before = cli_job($pdo, (int) $existingId) ?: [];
                if (!$job['source_deadline_provided']) {
                    $job['source_deadline_at'] = (string) ($before['source_deadline_at'] ?? '');
                    $expires = wogo_job_expiry($cfg, $job);
                }
                $pdo->prepare(
                    'UPDATE jobs SET title = ?, company = ?, category_id = ?, location = ?, job_type = ?,
                     pay = ?, description = ?, apply_email = ?, apply_url = ?, status = ?, tier = ?,
                     updated_at = ?, source_name = ?, source_url = ?, source_posted_at = ?,
                     source_verified_at = ?, source_status = ?, managed_origin = ?, source_deadline_at = ?, expires_at = ? WHERE id = ?'
                )->execute([
                    $job['title'], $job['company'], $job['category_id'], $job['location'], $job['job_type'],
                    $job['pay'], $job['description'], $job['apply_email'], $job['apply_url'], $job['status'],
                    $job['tier'], $now, $job['source_name'], $job['source_url'], $job['source_posted_at'],
                    $job['source_verified_at'], $job['source_status'], 'agent-import', $job['source_deadline_at'],
                    min((string) $before['expires_at'], $expires), (int) $existingId,
                ]);
                $after = cli_job($pdo, (int) $existingId) ?: [];
                wogo_audit($pdo, $actor, 'job.import.update', 'job', (int) $existingId, $job['source_key'],
                    $reason, wogo_audit_job($before), wogo_audit_job($after));
                $updated++;
                $ids[] = (int) $existingId;
                continue;
            }

            $pdo->prepare(
                'INSERT INTO jobs
                 (title, company, category_id, location, job_type, pay, description, apply_email, apply_url,
                  status, tier, manage_hash, created_at, updated_at, expires_at, source_key, source_name,
                  source_url, source_posted_at, source_verified_at, source_status, managed_origin, source_deadline_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )->execute([
                $job['title'], $job['company'], $job['category_id'], $job['location'], $job['job_type'],
                $job['pay'], $job['description'], $job['apply_email'], $job['apply_url'], $job['status'],
                $job['tier'], hash('sha256', bin2hex(random_bytes(32))), $now, $now, $expires,
                $job['source_key'], $job['source_name'], $job['source_url'], $job['source_posted_at'],
                $job['source_verified_at'], $job['source_status'], 'agent-import', $job['source_deadline_at'],
            ]);
            $id = (int) $pdo->lastInsertId();
            $after = cli_job($pdo, $id) ?: [];
            wogo_audit($pdo, $actor, 'job.import.create', 'job', $id, $job['source_key'],
                $reason, [], wogo_audit_job($after));
            $created++;
            $ids[] = $id;
        }
        $pdo->commit();
        cli_json([
            'ok' => true,
            'dry_run' => false,
            'created' => $created,
            'updated' => $updated,
            'skipped' => $skipped,
            'ids' => $ids,
        ]);
    }

    if ($command === 'job:act') {
        [$actor, $reason] = cli_write_context($options);
        $id = cli_int($options, 'id', 0, 1, PHP_INT_MAX);
        $action = cli_string($options, 'action');
        if (!in_array($action, ['approve', 'reject', 'feature', 'unfeature', 'close', 'renew', 'delete'], true)) {
            cli_fail('Unsupported --action.');
        }
        $commercial = null;
        if ($action === 'feature') {
            $commercial = cli_commercial_guard($options);
        }
        if ($action === 'delete' && cli_string($options, 'confirm-delete') !== (string) $id) {
            cli_fail('Delete requires --confirm-delete with the exact job id.');
        }
        $before = cli_job($pdo, $id);
        if ($before === null) {
            cli_fail('Job not found.', ['id' => $id]);
        }
        $now = wogo_now();
        $pdo->beginTransaction();
        switch ($action) {
            case 'approve':
                $pdo->prepare("UPDATE jobs SET status = 'approved', expires_at = ?, updated_at = ? WHERE id = ?")
                    ->execute([wogo_job_expiry($cfg, $before), $now, $id]);
                break;
            case 'reject':
            case 'close':
                $newStatus = $action === 'reject' ? 'rejected' : 'closed';
                $pdo->prepare('UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?')
                    ->execute([$newStatus, $now, $id]);
                break;
            case 'feature':
            case 'unfeature':
                $tier = $action === 'feature' ? 'featured' : 'free';
                $pdo->prepare('UPDATE jobs SET tier = ?, updated_at = ? WHERE id = ?')
                    ->execute([$tier, $now, $id]);
                break;
            case 'renew':
                $pdo->prepare('UPDATE jobs SET expires_at = ?, updated_at = ? WHERE id = ?')
                    ->execute([wogo_job_expiry($cfg, $before), $now, $id]);
                break;
            case 'delete':
                $pdo->prepare('DELETE FROM jobs WHERE id = ?')->execute([$id]);
                break;
        }
        $after = $action === 'delete' ? [] : (cli_job($pdo, $id) ?: []);
        $auditReason = $reason;
        if ($commercial !== null) {
            $auditReason .= ' | commercial=' . $commercial[0] . ':' . $commercial[1];
        }
        wogo_audit($pdo, $actor, 'job.' . $action, 'job', $id, (string) ($before['source_key'] ?? ''),
            $auditReason, wogo_audit_job($before), wogo_audit_job($after));
        $pdo->commit();
        cli_json(['ok' => true, 'id' => $id, 'action' => $action, 'job' => cli_public_job($after)]);
    }

    if ($command === 'job:verify') {
        [$actor, $reason] = cli_write_context($options);
        $id = cli_int($options, 'id', 0, 1, PHP_INT_MAX);
        $outcome = cli_string($options, 'outcome');
        if (!in_array($outcome, ['active', 'closed', 'unreachable'], true)) {
            cli_fail('--outcome must be active, closed, or unreachable.');
        }
        $before = cli_job($pdo, $id);
        if ($before === null || trim((string) ($before['source_key'] ?? '')) === '') {
            cli_fail('Only sourced jobs can be verified.', ['id' => $id]);
        }
        $now = wogo_now();
        $pdo->beginTransaction();
        if ($outcome === 'closed') {
            $pdo->prepare("UPDATE jobs SET source_status = 'closed', source_verified_at = ?, status = 'closed', updated_at = ? WHERE id = ?")
                ->execute([$now, $now, $id]);
        } else {
            $pdo->prepare('UPDATE jobs SET source_status = ?, source_verified_at = ?, updated_at = ? WHERE id = ?')
                ->execute([$outcome, $now, $now, $id]);
        }
        if (array_key_exists('deadline-at', $options)) {
            $deadline = cli_string($options, 'deadline-at');
            if ($deadline === 'none') {
                $deadline = '';
            } elseif (!cli_valid_timestamp($deadline)) {
                $pdo->rollBack(); cli_fail('--deadline-at must be a UTC timestamp or none.');
            }
            if ($outcome === 'active' && $deadline !== '' && $deadline <= $now) {
                $pdo->rollBack(); cli_fail('An expired source cannot be verified active.');
            }
            $expires = $deadline === '' ? (string) $before['expires_at'] : min((string) $before['expires_at'], $deadline);
            $pdo->prepare('UPDATE jobs SET source_deadline_at = ?, expires_at = ? WHERE id = ?')
                ->execute([$deadline, $expires, $id]);
        }
        $after = cli_job($pdo, $id) ?: [];
        wogo_audit($pdo, $actor, 'job.verify.' . $outcome, 'job', $id, (string) $before['source_key'],
            $reason, wogo_audit_job($before), wogo_audit_job($after));
        $pdo->commit();
        cli_json(['ok' => true, 'id' => $id, 'outcome' => $outcome, 'job' => cli_public_job($after)]);
    }

    if ($command === 'audit:jobs') {
        $freshDays = cli_int($options, 'fresh-days', 7, 1, 90);
        $rows = $pdo->query("SELECT * FROM jobs WHERE managed_origin = 'agent-import' ORDER BY id")->fetchAll();
        $issues = [];
        $threshold = gmdate('Y-m-d H:i:s', time() - $freshDays * 86400);
        foreach ($rows as $row) {
            $id = (int) $row['id'];
            $isLive = $row['status'] === 'approved' && $row['expires_at'] > wogo_now();
            $checks = [
                ['source_key', trim((string) $row['source_key']) !== '', 'error'],
                ['source_url', cli_http_url((string) $row['source_url']), 'error'],
                ['apply_url', cli_http_url((string) $row['apply_url']), 'error'],
                ['source_active', !$isLive || (string) $row['source_status'] === 'active',
                    (string) $row['source_status'] === 'unreachable' ? 'warning' : 'error'],
                ['verification_fresh', !$isLive || (string) $row['source_verified_at'] >= $threshold, 'warning'],
                ['source_deadline_respected', empty($row['source_deadline_at'])
                    || $row['expires_at'] <= $row['source_deadline_at'], 'error'],
            ];
            foreach ($checks as [$check, $passed, $severity]) {
                if (!$passed) {
                    $issues[] = ['id' => $id, 'source_key' => $row['source_key'], 'check' => $check, 'severity' => $severity];
                }
            }
        }
        $errors = count(array_filter($issues, static fn(array $issue): bool => $issue['severity'] === 'error'));
        cli_json([
            'ok' => $errors === 0,
            'audited' => count($rows),
            'fresh_days' => $freshDays,
            'errors' => $errors,
            'warnings' => count($issues) - $errors,
            'issues' => $issues,
        ], $errors === 0 ? 0 : 2);
    }

    if ($command === 'audit:list') {
        $limit = cli_int($options, 'limit', 100, 1, 1000);
        $rows = $pdo->query("SELECT * FROM ops_audit ORDER BY id DESC LIMIT $limit")->fetchAll();
        cli_json(['ok' => true, 'count' => count($rows), 'events' => $rows]);
    }

    cli_fail('Unknown command.', ['command' => $command, 'help' => cli_help()['commands']]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    cli_fail('Operation failed.', ['type' => get_class($e), 'message' => $e->getMessage()]);
}
