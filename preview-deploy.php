<?php
// Simulates the production .htaccess for php -S testing only.
$root = __DIR__ . '/deploy';
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (strpos($path, '/api') === 0) {
    require $root . '/api/index.php';
    return;
}
if ($path === '/sitemap.xml') {
    require $root . '/sitemap.php';
    return;
}
if (preg_match('#^/job/([0-9]+)/?$#', $path, $match)) {
    $_GET['id'] = $match[1];
    require $root . '/job.php';
    return;
}
$file = realpath($root . $path);
if ($file && is_file($file) && strpos($file, $root) === 0) {
    return false; // let the built-in server serve the static file
}
header('Content-Type: text/html; charset=utf-8');
readfile($root . '/index.html');
