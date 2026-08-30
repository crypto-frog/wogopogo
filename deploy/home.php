<?php
/**
 * Server-rendered homepage fallback.
 *
 * Visitors still receive the React application, while crawlers and clients
 * without JavaScript receive direct links to every job visible on page one.
 * JobPosting schema intentionally remains on individual job pages only.
 */

declare(strict_types=1);

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: public, max-age=60, stale-while-revalidate=120');
header('X-Content-Type-Options: nosniff');

require __DIR__ . '/api/db.php';
require __DIR__ . '/api/helpers.php';

function wogo_home_html(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function wogo_home_excerpt(string $value): string
{
    $clean = trim((string) preg_replace('/\s+/u', ' ', $value));
    return mb_strlen($clean) > 180 ? rtrim(mb_substr($clean, 0, 177)) . '…' : $clean;
}

$index = file_get_contents(__DIR__ . '/index.html');
if ($index === false) {
    http_response_code(500);
    echo '<!doctype html><html lang="en-CA"><title>Wogopogo</title><h1>Site unavailable</h1></html>';
    exit;
}

try {
    $cfg = require __DIR__ . '/api/config.php';
    $pdo = wogo_db($cfg);
    $stmt = $pdo->prepare(
        "SELECT j.id, j.title, j.company, j.location, j.job_type, j.pay,
                j.description, j.created_at, c.name AS cat_name, c.emoji AS cat_emoji
           FROM jobs j JOIN categories c ON c.id = j.category_id
          WHERE j.status = 'approved' AND j.expires_at > ?
          ORDER BY CASE WHEN j.tier = 'featured' THEN 0 ELSE 1 END, j.created_at DESC
          LIMIT 48"
    );
    $stmt->execute([gmdate('Y-m-d H:i:s')]);
    $jobs = $stmt->fetchAll();
} catch (Throwable $e) {
    error_log('[Wogopogo homepage ' . gmdate('c') . '] ' . $e->getMessage());
    http_response_code(503);
    header('Retry-After: 120');
    echo $index;
    exit;
}

$jobMarkup = '';
foreach ($jobs as $job) {
    $path = wogo_job_path((int) $job['id'], (string) $job['title']);
    $pay = trim((string) $job['pay']);
    $jobMarkup .= '<a class="card" href="' . wogo_home_html($path) . '">'
        . '<p class="card-cat"><span aria-hidden="true">' . wogo_home_html((string) $job['cat_emoji'])
        . '</span> ' . wogo_home_html((string) $job['cat_name']) . '</p>'
        . '<h3 class="card-title">' . wogo_home_html((string) $job['title']) . '</h3>'
        . '<p class="card-company">' . wogo_home_html((string) $job['company']) . '</p>'
        . '<p class="card-excerpt">' . wogo_home_html(wogo_home_excerpt((string) $job['description'])) . '</p>'
        . '<p class="card-meta mono">' . wogo_home_html((string) $job['location']) . ' · '
        . wogo_home_html((string) $job['job_type'])
        . ($pay !== '' ? ' · ' . wogo_home_html($pay) : '') . '</p>'
        . '</a>';
}

if ($jobMarkup === '') {
    $jobMarkup = '<div class="empty"><h2>The board is ready for its first listing</h2>'
        . '<p>Wogopogo is open to Okanagan employers. Posting is free, requires no account, '
        . 'and every listing is reviewed before it appears.</p>'
        . '<p><a class="btn btn-primary" href="/post">Post a job for free</a></p></div>';
}

$count = count($jobs);
$fallback = '<main id="main-content">'
    . '<section class="hero"><div class="shell">'
    . '<p class="hero-eyebrow mono">Okanagan Valley · free job board</p>'
    . '<h1 class="hero-title">Local jobs.</h1>'
    . '<p class="hero-sub">Find work, or find your next hire, anywhere from Osoyoos to Salmon Arm. '
    . 'No accounts, no fees, no nonsense.</p>'
    . '<p><a class="btn btn-primary" href="/post">Post a job for free</a></p>'
    . '</div></section>'
    . '<section class="shell listing-section" aria-labelledby="server-job-list-title">'
    . '<h2 id="server-job-list-title" class="results-meta mono">' . $count . ' active '
    . ($count === 1 ? 'job' : 'jobs') . ' on the board</h2>'
    . '<div class="grid">' . $jobMarkup . '</div>'
    . '</section>'
    . '<section class="home-guide" aria-labelledby="server-guide-title"><div class="shell">'
    . '<h2 id="server-guide-title">A straightforward Okanagan job board</h2>'
    . '<p>Job seekers browse without an account. Employers post directly, keep a private management '
    . 'token, and close a listing when the position is filled.</p>'
    . '</div></section>'
    . '</main>';

$markerPattern = '#<!--wogo-fallback-start-->.*?<!--wogo-fallback-end-->#s';
if (preg_match($markerPattern, $index)) {
    $index = (string) preg_replace_callback(
        $markerPattern,
        static function () use ($fallback): string {
            return '<!--wogo-fallback-start-->' . $fallback . '<!--wogo-fallback-end-->';
        },
        $index,
        1
    );
}

echo $index;
