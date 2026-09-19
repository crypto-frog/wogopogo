<?php
declare(strict_types=1);

/**
 * Forced-command gate for the unattended Wogopogo refresh agent on the owner's VPS.
 *
 * Installed at ~/wogopogo_ops/refresh-gate.php and bound to one SSH key in
 * ~/.ssh/authorized_keys:
 *
 *   restrict,from="VPS_IP",command="/usr/local/bin/php /home2/USER/wogopogo_ops/refresh-gate.php" ssh-ed25519 ...
 *
 * That key can do nothing except what this file allows: no shell, no file access, no
 * database access. The client (`wogo` on the VPS) sends `wogo <base64url JSON argv>`;
 * an import manifest arrives on stdin. The gate
 *
 *  - allows only the read commands and job:verify, job:act (approve, reject, close, renew)
 *    and job:import; never delete, feature, notification sends or configuration;
 *  - fixes --actor and --app-root itself, so the agent cannot impersonate anyone;
 *  - refuses every mutation while ~/wogopogo_ops/refresh-gate.disabled exists (kill switch);
 *  - caps applied mutations at MAX_DAILY per rolling 24 hours;
 *  - exports every job before the first applied mutation of each UTC day;
 *  - independently re-fetches every imported source_url and refuses a manifest unless each
 *    page is live and names the job title and employer, so a model cannot publish a job
 *    that does not exist at its source;
 *  - appends every call to refresh-gate-ledger.jsonl (no reasons or job text).
 *
 * Tests: backend/tests/refresh-gate.php. Runbook: docs/WEEKLY-REFRESH.md.
 */

const GATE_ACTOR = 'vps-refresh-agent';
const MAX_DAILY = 150;
const MAX_IMPORT_JOBS = 40;
const MAX_MANIFEST_BYTES = 600000;
const MAX_PAGE_BYTES = 3000000;

const GATE_COMMANDS = [
    'capabilities' => [],
    'status' => [],
    'job:list' => ['--status', '--limit'],
    'job:show' => ['--id'],
    'job:export' => ['--status', '--limit'],
    'audit:jobs' => ['--fresh-days'],
    'audit:list' => ['--limit'],
    'notification:status' => [],
    'job:verify' => ['--id', '--outcome', '--deadline-at', '--reason', '--apply'],
    'job:act' => ['--id', '--action', '--reason', '--apply'],
    'job:import' => ['--reason', '--apply'],
];
const GATE_ACTIONS = ['approve', 'reject', 'close', 'renew'];

final class GateError extends RuntimeException {}

function gate_home(): string
{
    return rtrim((string) (getenv('HOME') ?: dirname(__DIR__)), '/');
}

/** Decode "wogo <base64url JSON array of strings>" into argv. */
function gate_parse(string $original): array
{
    if (!preg_match('/^wogo ([A-Za-z0-9_-]{1,40000}={0,2})$/', trim($original), $m)) {
        throw new GateError('This key only accepts the wogo client.');
    }
    $json = base64_decode(strtr($m[1], '-_', '+/'), true);
    $argv = $json === false ? null : json_decode($json, true);
    if (!is_array($argv) || !array_is_list($argv) || $argv === []) {
        throw new GateError('Malformed request.');
    }
    foreach ($argv as $value) {
        if (!is_string($value) || strlen($value) > 500 || preg_match('/[\x00-\x1f\x7f]/', $value)) {
            throw new GateError('Arguments must be short single-line strings.');
        }
    }
    return $argv;
}

/** Validate argv against the allowlist. Returns [command, options, isMutation]. */
function gate_check(array $argv): array
{
    $command = array_shift($argv);
    if (!array_key_exists($command, GATE_COMMANDS)) {
        throw new GateError("Command not allowed through the refresh gate: {$command}");
    }
    $allowed = GATE_COMMANDS[$command];
    $options = [];
    for ($i = 0; $i < count($argv); $i++) {
        $raw = $argv[$i];
        $value = true;
        if (str_contains($raw, '=')) {
            [$raw, $value] = explode('=', $raw, 2);
        } elseif ($raw !== '--apply') {
            if (!isset($argv[$i + 1])) {
                throw new GateError("Missing value for {$raw}.");
            }
            $value = $argv[++$i];
        }
        if (!in_array($raw, $allowed, true) || isset($options[$raw])) {
            throw new GateError("Option not allowed for {$command}: {$raw}");
        }
        if ($raw === '--apply' && $value !== true) {
            throw new GateError('--apply takes no value.');
        }
        $options[$raw] = $value;
    }
    if (isset($options['--id']) && !preg_match('/^[1-9][0-9]{0,9}$/', (string) $options['--id'])) {
        throw new GateError('--id must be a job number.');
    }
    if ($command === 'job:act' && !in_array($options['--action'] ?? '', GATE_ACTIONS, true)) {
        throw new GateError('job:act allows only ' . implode(', ', GATE_ACTIONS) . '.');
    }
    $mutation = in_array($command, ['job:verify', 'job:act', 'job:import'], true) && isset($options['--apply']);
    if (in_array($command, ['job:verify', 'job:act'], true) && !$mutation) {
        throw new GateError("{$command} changes data; pass --apply and --reason.");
    }
    if ($mutation && trim((string) ($options['--reason'] ?? '')) === '') {
        throw new GateError('--reason is required for every change.');
    }
    return [$command, $options, $mutation];
}

function gate_norm(string $text): string
{
    $text = html_entity_decode((string) preg_replace('/<[^>]*>/', ' ', $text), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $text = mb_strtolower($text, 'UTF-8');
    $ascii = function_exists('iconv') ? @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text) : false;
    $text = $ascii === false ? $text : $ascii;
    return ' ' . trim((string) preg_replace('/[^a-z0-9]+/', ' ', $text)) . ' ';
}

function gate_words(string $text): array
{
    $stop = ['ltd', 'inc', 'corp', 'co', 'llc', 'limited', 'the', 'and', 'of', 'for', 'a', 'an', 'in', 'at'];
    return array_values(array_diff(array_filter(explode(' ', trim(gate_norm($text))), fn ($w) => strlen($w) >= 2), $stop));
}

/** True when the page text names the job: most title words and at least one employer word. */
function gate_page_names_job(string $html, string $title, string $company): bool
{
    // Drop scripts and styles so a URL or tracking blob cannot satisfy the match.
    $html = (string) preg_replace('#<(script|style)\b[^>]*>.*?</\1>#is', ' ', $html);
    $page = gate_norm($html);
    $titleWords = gate_words($title);
    $companyWords = gate_words($company);
    if ($titleWords === [] || $companyWords === []) {
        return false;
    }
    $hits = count(array_filter($titleWords, fn ($w) => str_contains($page, " {$w} ")));
    $employer = count(array_filter($companyWords, fn ($w) => strlen($w) >= 3 && str_contains($page, " {$w} ")));
    return $hits / count($titleWords) >= 0.6 && $employer > 0;
}

function gate_public_host(string $host): bool
{
    if ($host === '' || filter_var($host, FILTER_VALIDATE_IP) || !str_contains($host, '.')) {
        return false;
    }
    $ips = gethostbynamel($host) ?: [];
    foreach ($ips as $ip) {
        if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            return false;
        }
    }
    return $ips !== [];
}

/** Fetch an https page. Returns [httpCode, finalUrl, body]. */
function gate_fetch(string $url): array
{
    $host = strtolower((string) parse_url($url, PHP_URL_HOST));
    if (parse_url($url, PHP_URL_SCHEME) !== 'https' || !gate_public_host($host)) {
        return [0, $url, ''];
    }
    $body = '';
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 4,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
        CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; WogopogoSourceCheck/1.0; +https://wogopogo.ca/)',
        CURLOPT_HTTPHEADER => ['Accept: text/html', 'Accept-Language: en-CA,en;q=0.8'],
        CURLOPT_WRITEFUNCTION => function ($ch, $chunk) use (&$body) {
            $body .= $chunk;
            return strlen($body) > MAX_PAGE_BYTES ? 0 : strlen($chunk);
        },
    ]);
    curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $final = (string) curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
    $ip = (string) curl_getinfo($ch, CURLINFO_PRIMARY_IP);
    curl_close($ch);
    if ($ip !== '' && !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
        return [0, $final, ''];
    }
    return [$code, $final, $body];
}

/** Every problem that stops a manifest; an empty list means it may be imported. */
function gate_manifest_problems(array $manifest, callable $fetch, int $now): array
{
    $problems = [];
    $jobs = $manifest['jobs'] ?? null;
    if (($manifest['manifest_version'] ?? null) !== 1 || !is_array($jobs) || !array_is_list($jobs)) {
        return ['Manifest must be version 1 with a jobs list.'];
    }
    if ($jobs === [] || count($jobs) > MAX_IMPORT_JOBS) {
        return ['A manifest carries 1 to ' . MAX_IMPORT_JOBS . ' jobs.'];
    }
    foreach ($jobs as $n => $job) {
        $label = '#' . ($n + 1) . ' ' . substr((string) ($job['title'] ?? '?'), 0, 60);
        foreach (['title', 'company', 'source_key', 'source_url', 'category_slug'] as $field) {
            if (!is_string($job[$field] ?? null) || trim($job[$field]) === '') {
                $problems[] = "{$label}: {$field} is required.";
                continue 2;
            }
        }
        if (($job['source_status'] ?? '') !== 'active' || ($job['tier'] ?? 'free') !== 'free'
            || !in_array($job['status'] ?? '', ['approved', 'pending'], true)) {
            $problems[] = "{$label}: must be status approved or pending, source_status active, tier free.";
            continue;
        }
        $verified = strtotime(((string) ($job['source_verified_at'] ?? '')) . ' UTC');
        if ($verified === false || $verified > $now + 300 || $now - $verified > 3 * 86400) {
            $problems[] = "{$label}: source_verified_at must be within the last 3 days (UTC).";
            continue;
        }
        [$code, $final, $body] = $fetch($job['source_url']);
        if ($code !== 200 || stripos($final, 'expired') !== false) {
            $problems[] = "{$label}: source did not load as a live posting (HTTP {$code}).";
        } elseif (!gate_page_names_job($body, $job['title'], $job['company'])) {
            $problems[] = "{$label}: the source page does not name this title and employer.";
        }
    }
    return $problems;
}

function gate_ledger_path(): string
{
    return gate_home() . '/wogopogo_ops/refresh-gate-ledger.jsonl';
}

/** Applied changes in the last 24 hours (an import counts once per job). */
function gate_recent_changes(string $ledger, int $now): int
{
    $count = 0;
    foreach (is_file($ledger) ? file($ledger, FILE_IGNORE_NEW_LINES) : [] as $line) {
        $row = json_decode($line, true);
        if (is_array($row) && !empty($row['applied']) && ($row['exit'] ?? 1) === 0 && ($row['ts'] ?? 0) > $now - 86400) {
            $count += max(1, (int) ($row['jobs'] ?? 1));
        }
    }
    return $count;
}

function gate_log(array $row): void
{
    $row = ['ts' => time(), 'at' => gmdate('Y-m-d\TH:i:s\Z')] + $row;
    file_put_contents(gate_ledger_path(), json_encode($row, JSON_UNESCAPED_SLASHES) . "\n", FILE_APPEND | LOCK_EX);
}

function gate_run(array $args, ?string $stdin = null): int
{
    $proc = proc_open($args, [0 => ['pipe', 'r'], 1 => STDOUT, 2 => STDERR], $pipes);
    if (!is_resource($proc)) {
        throw new GateError('Could not start the CLI.');
    }
    fwrite($pipes[0], (string) $stdin);
    fclose($pipes[0]);
    return proc_close($proc);
}

function gate_main(): int
{
    $home = gate_home();
    $ops = "{$home}/wogopogo_ops";
    $cli = [PHP_BINARY, "{$ops}/wogopogo.php"];
    $root = "{$home}/public_html/wogopogo_current";
    $argv = gate_parse((string) getenv('SSH_ORIGINAL_COMMAND'));
    [$command, $options, $mutation] = gate_check($argv);
    $entry = ['cmd' => $command, 'id' => isset($options['--id']) ? (int) $options['--id'] : null,
        'op' => $options['--action'] ?? $options['--outcome'] ?? null, 'applied' => $mutation,
        'from' => strtok((string) getenv('SSH_CLIENT'), ' ') ?: null];

    if ($mutation) {
        if (is_file("{$ops}/refresh-gate.disabled")) {
            throw new GateError('The refresh gate is switched off (refresh-gate.disabled). No changes were made.');
        }
        if (gate_recent_changes(gate_ledger_path(), time()) >= MAX_DAILY) {
            throw new GateError('Daily change limit reached (' . MAX_DAILY . '). No changes were made.');
        }
        $backup = "{$ops}/exports/auto-before-" . gmdate('Ymd') . '.json';
        if (!is_file($backup)) {
            $out = fopen($backup, 'x');
            $proc = proc_open([...$cli, 'job:export', '--app-root', $root, '--status', 'all', '--limit', '5000'], [1 => $out, 2 => STDERR], $pipes);
            if (!is_resource($proc) || proc_close($proc) !== 0) {
                @unlink($backup);
                throw new GateError('Backup export failed; no changes were made.');
            }
            chmod($backup, 0600);
        }
    }

    $args = [...$cli, $command, '--app-root', $root];
    foreach ($options as $key => $value) {
        if ($key === '--apply') {
            continue;
        }
        $args[] = $key;
        $args[] = $key === '--reason' ? '[vps-refresh] ' . $value : (string) $value;
    }
    if ($mutation) {
        array_push($args, '--apply', '--actor', GATE_ACTOR);
    }

    if ($command === 'job:import') {
        $raw = stream_get_contents(STDIN, MAX_MANIFEST_BYTES + 1);
        $manifest = json_decode((string) $raw, true);
        if (strlen((string) $raw) > MAX_MANIFEST_BYTES || !is_array($manifest)) {
            throw new GateError('Send the manifest as JSON on stdin (under 600 KB).');
        }
        $problems = gate_manifest_problems($manifest, 'gate_fetch', time());
        if ($problems !== []) {
            gate_log($entry + ['exit' => 2, 'jobs' => count($manifest['jobs'] ?? []), 'refused' => count($problems)]);
            echo json_encode(['ok' => false, 'error' => 'Manifest refused by the source check.', 'problems' => $problems], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), "\n";
            return 2;
        }
        $file = "{$ops}/imports/auto-" . gmdate('Ymd\THis\Z') . '-' . bin2hex(random_bytes(3)) . '.json';
        file_put_contents($file, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        chmod($file, 0600);
        array_push($args, '--file', $file);
        $entry['jobs'] = count($manifest['jobs']);
    }

    $exit = gate_run($args);
    gate_log($entry + ['exit' => $exit]);
    return $exit;
}

if (PHP_SAPI === 'cli' && realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    try {
        exit(gate_main());
    } catch (GateError $e) {
        fwrite(STDOUT, json_encode(['ok' => false, 'error' => $e->getMessage()]) . "\n");
        exit(2);
    }
}
