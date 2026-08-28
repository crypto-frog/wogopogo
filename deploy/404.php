<?php
/**
 * Preserve a genuine HTTP 404 status through Bluehost's front proxy while
 * serving the same accessible, noindex error page used by the frontend.
 */

declare(strict_types=1);

http_response_code(404);
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('X-Content-Type-Options: nosniff');

$page = file_get_contents(__DIR__ . '/404.html');
if ($page === false) {
    echo '<!doctype html><html lang="en-CA"><head><meta name="robots" content="noindex, nofollow"><title>Page Not Found | Wogopogo</title></head><body><h1>Page not found</h1><p><a href="/">Browse current Okanagan jobs</a></p></body></html>';
    exit;
}

echo $page;
