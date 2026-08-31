<?php
/**
 * Wogopogo helpers: responses, input handling, validation,
 * rate limiting, and admin authentication.
 */

// Polyfills for hosts without the mbstring extension (rare, but cheap
// insurance). UTF-8 aware via the /u regex modifier.
if (!function_exists('mb_strlen')) {
    function mb_strlen(string $s): int
    {
        $n = preg_match_all('/./us', $s);
        return $n === false ? strlen($s) : $n;
    }
}
if (!function_exists('mb_substr')) {
    function mb_substr(string $s, int $start, ?int $length = null): string
    {
        if (@preg_match_all('/./us', $s, $m) === false) {
            return $length === null ? substr($s, $start) : substr($s, $start, $length);
        }
        $slice = $length === null
            ? array_slice($m[0], $start)
            : array_slice($m[0], $start, $length);
        return implode('', $slice);
    }
}

function wogo_respond($data, int $code = 200): void
{
    http_response_code($code);
    $json = json_encode(
        $data,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE
    );
    if ($json === false) {
        http_response_code(500);
        $json = '{"error":"Server response could not be encoded."}';
    }
    echo $json;
    exit;
}

function wogo_error(string $message, int $code = 400): void
{
    wogo_respond(['error' => $message], $code);
}

function wogo_input(): array
{
    $length = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($length > 75000) {
        wogo_error('Request body is too large.', 413);
    }
    $contentType = strtolower(trim(explode(';', (string) ($_SERVER['CONTENT_TYPE'] ?? ''))[0]));
    if ($contentType !== '' && $contentType !== 'application/json') {
        wogo_error('Request body must use application/json.', 415);
    }
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        wogo_error('Request body must be valid JSON.', 400);
    }
    return $data;
}

function wogo_str(array $src, string $key, int $max = 500): string
{
    $v = $src[$key] ?? '';
    if (!is_string($v)) {
        $v = is_scalar($v) ? (string) $v : '';
    }
    // Strip tags, normalise line endings, remove stray control chars
    $v = strip_tags($v);
    $v = str_replace(["\r\n", "\r"], "\n", $v);
    $v = preg_replace('/[^\P{C}\n]/u', '', $v) ?? '';
    $v = trim($v);
    if (mb_strlen($v) > $max) {
        $v = mb_substr($v, 0, $max);
    }
    return $v;
}

function wogo_now(): string
{
    return gmdate('Y-m-d H:i:s');
}

function wogo_client_ip(): string
{
    // On shared hosting REMOTE_ADDR is the honest value.
    return substr($_SERVER['REMOTE_ADDR'] ?? 'unknown', 0, 60);
}

function wogo_like(string $term): string
{
    return '%' . strtr($term, ['!' => '!!', '%' => '!%', '_' => '!_']) . '%';
}

/**
 * Counts successful posts from this IP and blocks past the limits.
 * Also prunes entries older than a day so the table stays tiny.
 */
function wogo_rate_limit(PDO $pdo, array $cfg): void
{
    $ip      = wogo_client_ip();
    $hourAgo = gmdate('Y-m-d H:i:s', time() - 3600);
    $dayAgo  = gmdate('Y-m-d H:i:s', time() - 86400);

    $pdo->prepare('DELETE FROM rate_limits WHERE created_at < ?')->execute([$dayAgo]);

    $q = $pdo->prepare('SELECT COUNT(*) FROM rate_limits WHERE ip = ? AND created_at > ?');

    $q->execute([$ip, $hourAgo]);
    if ((int) $q->fetchColumn() >= (int) $cfg['max_posts_per_hour']) {
        wogo_error('Easy there. You have hit the hourly posting limit, try again in a bit.', 429);
    }
    $q->execute([$ip, $dayAgo]);
    if ((int) $q->fetchColumn() >= (int) $cfg['max_posts_per_day']) {
        wogo_error('Daily posting limit reached. Come back tomorrow.', 429);
    }
}

function wogo_rate_record(PDO $pdo): void
{
    $pdo->prepare('INSERT INTO rate_limits (ip, created_at) VALUES (?, ?)')
        ->execute([wogo_client_ip(), wogo_now()]);
}

/** Append-only operational audit trail. Never pass credentials or manage tokens. */
function wogo_audit(
    PDO $pdo,
    string $actor,
    string $action,
    string $entityType,
    ?int $entityId,
    string $sourceKey,
    string $reason,
    array $before = [],
    array $after = []
): void {
    $encode = static function (array $value): string {
        $json = json_encode(
            $value,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE
        );
        return $json === false ? '{}' : $json;
    };
    $pdo->prepare(
        'INSERT INTO ops_audit
         (actor, action, entity_type, entity_id, source_key, reason, before_json, after_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        mb_substr($actor, 0, 120),
        mb_substr($action, 0, 80),
        mb_substr($entityType, 0, 40),
        $entityId,
        mb_substr($sourceKey, 0, 190),
        mb_substr($reason, 0, 500),
        $encode($before),
        $encode($after),
        wogo_now(),
    ]);
}

/** Remove private management material before recording rows in the audit log. */
function wogo_audit_job(array $row): array
{
    unset($row['manage_hash']);
    return $row;
}

/**
 * Admin auth. The key is accepted only through X-Admin-Key, keeping it
 * out of URLs, browser history, access logs, and request bodies.
 */
function wogo_require_admin(array $cfg): void
{
    $configured = (string) ($cfg['admin_key'] ?? '');
    if ($configured === 'change-me' || strlen($configured) < 20) {
        wogo_error('Admin is disabled. Set an admin_key of at least 20 characters in api/config.php first.', 403);
    }
    $given = $_SERVER['HTTP_X_ADMIN_KEY'] ?? null;
    if (!is_string($given) || !hash_equals($configured, $given)) {
        wogo_error('Invalid admin key.', 401);
    }
}

/** Public shape of a job row (never leaks manage_hash). */
function wogo_slugify(string $value): string
{
    $ascii = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
    $normalized = strtolower($ascii === false ? $value : $ascii);
    $slug = trim((string) preg_replace('/[^a-z0-9]+/', '-', $normalized), '-');
    return $slug === '' ? 'job' : substr($slug, 0, 80);
}

function wogo_job_path(int $id, string $title): string
{
    return '/jobs/' . $id . '/' . wogo_slugify($title);
}

function wogo_job_public(array $row, bool $withDescription = true): array
{
    $out = [
        'id'       => (int) $row['id'],
        'title'    => $row['title'],
        'company'  => $row['company'],
        'category' => [
            'id'    => (int) ($row['category_id'] ?? 0),
            'name'  => $row['cat_name'] ?? '',
            'slug'  => $row['cat_slug'] ?? '',
            'emoji' => $row['cat_emoji'] ?? '',
        ],
        'location'   => $row['location'],
        'job_type'   => $row['job_type'],
        'pay'        => $row['pay'],
        'tier'       => $row['tier'],
        'status'     => $row['status'],
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at'] ?? $row['created_at'],
        'expires_at' => $row['expires_at'],
        'url_path'   => wogo_job_path((int) $row['id'], (string) $row['title']),
    ];
    if ($withDescription) {
        $out['description'] = $row['description'];
        $out['apply_email'] = $row['apply_email'];
        $out['apply_url']   = $row['apply_url'];
    } else {
        $excerpt = preg_replace('/\s+/', ' ', $row['description']);
        $out['excerpt'] = mb_strlen($excerpt) > 200
            ? mb_substr($excerpt, 0, 200) . '…'
            : $excerpt;
    }
    if (trim((string) ($row['source_url'] ?? '')) !== '') {
        $out['source'] = [
            'name'        => (string) ($row['source_name'] ?? ''),
            'url'         => (string) $row['source_url'],
            'posted_at'   => (string) ($row['source_posted_at'] ?? ''),
            'verified_at' => (string) ($row['source_verified_at'] ?? ''),
            'status'      => (string) ($row['source_status'] ?? 'unverified'),
        ];
    }
    return $out;
}
