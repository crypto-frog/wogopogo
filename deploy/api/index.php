<?php
/**
 * Wogopogo API
 *
 * Routes (relative to /api):
 *   GET  /health                  service check
 *   GET  /meta                    categories, locations, job types, site flags
 *   GET  /jobs                    list live jobs (search, category, location, type, page)
 *   POST /jobs                    submit a job
 *   GET  /jobs/{id}               one live job (?token= lets the poster preview a pending one)
 *   POST /jobs/{id}/manage        poster actions with their manage token: close | delete
 *   GET  /admin/jobs              moderation list (X-Admin-Key)
 *   POST /admin/jobs/{id}         admin actions: approve | reject | feature | unfeature | close | renew | delete
 */

declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, no-store, max-age=0');
header('Pragma: no-cache');

// Same-origin in production, so CORS is only relaxed for local dev servers.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#', $origin)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Headers: Content-Type, X-Admin-Key');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
}
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require __DIR__ . '/helpers.php';
require __DIR__ . '/db.php';

set_exception_handler(function (Throwable $e) {
    error_log(
        '[Wogopogo ' . gmdate('c') . '] ' . $e->getMessage()
        . ' @ ' . $e->getFile() . ':' . $e->getLine()
    );
    wogo_respond(['error' => 'Server error. Check the server error log or your database settings.'], 500);
});

$cfg    = require __DIR__ . '/config.php';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

/** Resolve the route from the URL (works with and without mod_rewrite). */
function wogo_route(): string
{
    if (isset($_GET['route'])) {
        return trim((string) $_GET['route'], '/');
    }
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $pos  = strpos($path, '/api/');
    if ($pos !== false) {
        $route = substr($path, $pos + 5);
    } elseif (substr($path, -4) === '/api') {
        $route = '';
    } else {
        $route = $path;
    }
    $route = trim($route, '/');
    if ($route === 'index.php') {
        $route = '';
    }
    return $route;
}

$route = wogo_route();
$parts = $route === '' ? [] : explode('/', $route);

// ---------------------------------------------------------------- health
if (($route === '' || $route === 'health') && $method === 'GET') {
    $cfgOk = true;
    $dbMsg = 'ok';
    try {
        wogo_db($cfg);
    } catch (Throwable $e) {
        $cfgOk = false;
        $dbMsg = 'Database connection failed. Check the mysql settings in api/config.php.';
        error_log('[Wogopogo health ' . gmdate('c') . '] ' . $e->getMessage());
    }
    wogo_respond([
        'ok'                 => $cfgOk,
        'app'                => 'Wogopogo API',
        'driver'             => $cfg['db_driver'],
        'database'           => $dbMsg,
        'require_approval'   => (bool) $cfg['require_approval'],
        'admin_key_is_set'   => ($cfg['admin_key'] !== 'change-me' && strlen((string) $cfg['admin_key']) >= 20),
        'time_utc'           => wogo_now(),
    ], $cfgOk ? 200 : 500);
}

$pdo = wogo_db($cfg);

// ------------------------------------------------------------------ meta
if ($route === 'meta' && $method === 'GET') {
    $now  = wogo_now();
    $rows = $pdo->prepare(
        "SELECT c.id, c.name, c.slug, c.emoji, COUNT(j.id) AS jobs
           FROM categories c
      LEFT JOIN jobs j ON j.category_id = c.id
                      AND j.status = 'approved'
                      AND j.expires_at > ?
       GROUP BY c.id, c.name, c.slug, c.emoji
       ORDER BY c.id"
    );
    $rows->execute([$now]);
    $cats = array_map(function ($r) {
        return [
            'id'    => (int) $r['id'],
            'name'  => $r['name'],
            'slug'  => $r['slug'],
            'emoji' => $r['emoji'],
            'jobs'  => (int) $r['jobs'],
        ];
    }, $rows->fetchAll());

    wogo_respond([
        'categories'       => $cats,
        'locations'        => array_values($cfg['locations']),
        'job_types'        => array_values($cfg['job_types']),
        'require_approval' => (bool) $cfg['require_approval'],
        'featured_enabled' => (bool) $cfg['featured_enabled'],
    ]);
}

// ------------------------------------------------------------- jobs list
if ($route === 'jobs' && $method === 'GET') {
    $now    = wogo_now();
    $where  = ["j.status = 'approved'", 'j.expires_at > :now'];
    $params = [':now' => $now];

    $cat = trim((string) ($_GET['category'] ?? ''));
    if ($cat !== '') {
        $where[]          = 'c.slug = :cat';
        $params[':cat']   = $cat;
    }
    $loc = trim((string) ($_GET['location'] ?? ''));
    if ($loc !== '') {
        $where[]          = 'j.location = :loc';
        $params[':loc']   = $loc;
    }
    $type = trim((string) ($_GET['type'] ?? ''));
    if ($type !== '') {
        $where[]          = 'j.job_type = :type';
        $params[':type']  = $type;
    }
    $search = trim((string) ($_GET['search'] ?? ''));
    if ($search !== '') {
        // Native MySQL prepared statements require a unique placeholder for
        // each occurrence, even when every placeholder receives the same value.
        $where[] = "(j.title LIKE :q_title ESCAPE '!' OR j.company LIKE :q_company ESCAPE '!' OR j.description LIKE :q_description ESCAPE '!')";
        $pattern = wogo_like(mb_substr($search, 0, 80));
        $params[':q_title'] = $pattern;
        $params[':q_company'] = $pattern;
        $params[':q_description'] = $pattern;
    }

    $whereSql = implode(' AND ', $where);
    $baseSql  = "FROM jobs j JOIN categories c ON c.id = j.category_id WHERE $whereSql";

    $countStmt = $pdo->prepare("SELECT COUNT(*) $baseSql");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    $perPage = min(50, max(1, (int) ($_GET['per_page'] ?? 12)));
    $pages   = max(1, (int) ceil($total / $perPage));
    $page    = min($pages, max(1, (int) ($_GET['page'] ?? 1)));
    $offset  = ($page - 1) * $perPage;

    $listStmt = $pdo->prepare(
        "SELECT j.*, c.name AS cat_name, c.slug AS cat_slug, c.emoji AS cat_emoji
         $baseSql
         ORDER BY CASE WHEN j.tier = 'featured' THEN 0 ELSE 1 END, j.created_at DESC
         LIMIT $perPage OFFSET $offset"
    );
    $listStmt->execute($params);

    $jobs = array_map(function ($r) {
        return wogo_job_public($r, false);
    }, $listStmt->fetchAll());

    wogo_respond([
        'jobs'        => $jobs,
        'page'        => $page,
        'per_page'    => $perPage,
        'total'       => $total,
        'total_pages' => $pages,
    ]);
}

// ------------------------------------------------------------ create job
if ($route === 'jobs' && $method === 'POST') {
    $in = wogo_input();

    // Honeypot: real people never see this field. Bots fill it in.
    // Answer with a convincing success and quietly do nothing.
    if (wogo_str($in, 'website', 200) !== '') {
        wogo_respond(['ok' => true, 'id' => 0, 'status' => 'pending', 'manage_token' => '']);
    }

    $pdo->beginTransaction();
    wogo_rate_limit($pdo, $cfg);

    $title   = wogo_str($in, 'title', 90);
    $company = wogo_str($in, 'company', 90);
    $rawCatId = $in['category_id'] ?? null;
    $catId   = is_int($rawCatId) || (is_string($rawCatId) && ctype_digit($rawCatId))
        ? (int) $rawCatId
        : 0;
    $loc     = wogo_str($in, 'location', 80);
    $type    = wogo_str($in, 'job_type', 40);
    $pay     = wogo_str($in, 'pay', 90);
    $desc    = wogo_str($in, 'description', 6000);
    $email   = wogo_str($in, 'apply_email', 160);
    $url     = wogo_str($in, 'apply_url', 400);

    $errors = [];
    if (mb_strlen($title) < 3)      $errors['title']       = 'Job title needs at least 3 characters.';
    if (mb_strlen($company) < 2)    $errors['company']     = 'Company name needs at least 2 characters.';
    if (mb_strlen($desc) < 30)      $errors['description'] = 'Tell people a bit more, 30 characters minimum.';
    if (!in_array($loc, $cfg['locations'], true))  $errors['location'] = 'Pick a location from the list.';
    if (!in_array($type, $cfg['job_types'], true)) $errors['job_type'] = 'Pick a job type from the list.';

    $catStmt = $pdo->prepare('SELECT id FROM categories WHERE id = ?');
    $catStmt->execute([$catId]);
    if (!$catStmt->fetchColumn()) {
        $errors['category_id'] = 'Pick a category from the list.';
    }

    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors['apply_email'] = 'That email address does not look right.';
    }
    if ($url !== '' && (!filter_var($url, FILTER_VALIDATE_URL) || !preg_match('#^https?://#i', $url))) {
        $errors['apply_url'] = 'Application links must start with http:// or https://';
    }
    if ($email === '' && $url === '') {
        $errors['apply_email'] = 'Give applicants an email or a link, at least one.';
    }

    if ($errors) {
        wogo_respond(['error' => 'Please fix the highlighted fields.', 'fields' => $errors], 422);
    }

    $token  = bin2hex(random_bytes(16));
    $status = $cfg['require_approval'] ? 'pending' : 'approved';
    $now    = wogo_now();
    $life   = (int) $cfg['job_lifetime_days'];

    $pdo->prepare(
        'INSERT INTO jobs (title, company, category_id, location, job_type, pay, description,
                           apply_email, apply_url, status, tier, manage_hash, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $title, $company, $catId, $loc, $type, $pay, $desc,
        $email, $url, $status, 'free',
        hash('sha256', $token), $now,
        gmdate('Y-m-d H:i:s', time() + $life * 86400),
    ]);

    $newId = (int) $pdo->lastInsertId();
    wogo_rate_record($pdo);
    $pdo->commit();

    wogo_respond([
        'ok'           => true,
        'id'           => $newId,
        'status'       => $status,
        'manage_token' => $token,
    ], 201);
}

// ------------------------------------------------- single job / manage it
if (count($parts) >= 2 && $parts[0] === 'jobs' && ctype_digit($parts[1])) {
    $jobId = (int) $parts[1];
    $stmt  = $pdo->prepare(
        'SELECT j.*, c.name AS cat_name, c.slug AS cat_slug, c.emoji AS cat_emoji
           FROM jobs j JOIN categories c ON c.id = j.category_id
          WHERE j.id = ?'
    );
    $stmt->execute([$jobId]);
    $job = $stmt->fetch();

    if (count($parts) === 2 && $method === 'GET') {
        if (!$job) {
            wogo_error('This listing is as elusive as the lake monster. It may have been removed.', 404);
        }
        $token   = (string) ($_GET['token'] ?? '');
        $isOwner = $token !== '' && hash_equals($job['manage_hash'], hash('sha256', $token));
        $isLive  = $job['status'] === 'approved' && $job['expires_at'] > wogo_now();
        if (!$isLive && !$isOwner) {
            wogo_error('This listing is no longer available.', 404);
        }
        wogo_respond(['job' => wogo_job_public($job, true)]);
    }

    if (count($parts) === 3 && $parts[2] === 'manage' && $method === 'POST') {
        if (!$job) {
            wogo_error('Listing not found.', 404);
        }
        $in     = wogo_input();
        $token  = (string) ($in['token'] ?? '');
        $action = (string) ($in['action'] ?? '');
        if ($token === '' || !hash_equals($job['manage_hash'], hash('sha256', $token))) {
            wogo_error('That manage token does not match this listing.', 401);
        }
        if ($action === 'close') {
            $pdo->prepare("UPDATE jobs SET status = 'closed' WHERE id = ?")->execute([$jobId]);
            wogo_respond(['ok' => true, 'status' => 'closed']);
        }
        if ($action === 'delete') {
            $pdo->prepare('DELETE FROM jobs WHERE id = ?')->execute([$jobId]);
            wogo_respond(['ok' => true, 'deleted' => true]);
        }
        wogo_error("Unknown action. Use 'close' or 'delete'.", 400);
    }
}

// ----------------------------------------------------------------- admin
if ($route === 'admin/jobs' && $method === 'GET') {
    wogo_require_admin($cfg);
    $status  = (string) ($_GET['status'] ?? 'pending');
    $allowed = ['pending', 'approved', 'rejected', 'closed', 'all'];
    if (!in_array($status, $allowed, true)) {
        $status = 'pending';
    }
    $sql = 'SELECT j.*, c.name AS cat_name, c.slug AS cat_slug, c.emoji AS cat_emoji
              FROM jobs j JOIN categories c ON c.id = j.category_id';
    $params = [];
    if ($status !== 'all') {
        $sql     .= ' WHERE j.status = ?';
        $params[] = $status;
    }
    $sql .= ' ORDER BY j.created_at DESC LIMIT 200';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $jobs = array_map(function ($r) {
        return wogo_job_public($r, true);
    }, $stmt->fetchAll());
    wogo_respond(['jobs' => $jobs, 'status' => $status]);
}

if (count($parts) === 3 && $parts[0] === 'admin' && $parts[1] === 'jobs'
    && ctype_digit($parts[2]) && $method === 'POST') {
    $in = wogo_input();
    wogo_require_admin($cfg);
    $jobId  = (int) $parts[2];
    $action = (string) ($in['action'] ?? '');
    $life   = (int) $cfg['job_lifetime_days'];

    $exists = $pdo->prepare('SELECT id FROM jobs WHERE id = ?');
    $exists->execute([$jobId]);
    if (!$exists->fetchColumn()) {
        wogo_error('Listing not found.', 404);
    }

    switch ($action) {
        case 'approve':
            // Approval starts the clock so review time never eats the listing window
            $pdo->prepare("UPDATE jobs SET status = 'approved', expires_at = ? WHERE id = ?")
                ->execute([gmdate('Y-m-d H:i:s', time() + $life * 86400), $jobId]);
            break;
        case 'reject':
            $pdo->prepare("UPDATE jobs SET status = 'rejected' WHERE id = ?")->execute([$jobId]);
            break;
        case 'feature':
            if (empty($cfg['featured_enabled'])) {
                wogo_error('Featured listings are switched off in config.php.', 400);
            }
            $pdo->prepare("UPDATE jobs SET tier = 'featured' WHERE id = ?")->execute([$jobId]);
            break;
        case 'unfeature':
            $pdo->prepare("UPDATE jobs SET tier = 'free' WHERE id = ?")->execute([$jobId]);
            break;
        case 'close':
            $pdo->prepare("UPDATE jobs SET status = 'closed' WHERE id = ?")->execute([$jobId]);
            break;
        case 'renew':
            $pdo->prepare('UPDATE jobs SET expires_at = ? WHERE id = ?')
                ->execute([gmdate('Y-m-d H:i:s', time() + $life * 86400), $jobId]);
            break;
        case 'delete':
            $pdo->prepare('DELETE FROM jobs WHERE id = ?')->execute([$jobId]);
            break;
        default:
            wogo_error('Unknown admin action.', 400);
    }
    wogo_respond(['ok' => true, 'action' => $action]);
}

wogo_error('No such endpoint.', 404);
