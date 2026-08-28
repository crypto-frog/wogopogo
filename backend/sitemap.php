<?php
/**
 * Dynamic XML sitemap for the public Wogopogo site.
 * Includes only canonical pages and approved, unexpired jobs.
 */

declare(strict_types=1);

header('Content-Type: application/xml; charset=utf-8');
header('Cache-Control: public, max-age=300, stale-while-revalidate=600');
header('X-Content-Type-Options: nosniff');

require __DIR__ . '/api/db.php';

$baseUrl = 'https://wogopogo.ca';
$jobs = [];

try {
    $cfg = require __DIR__ . '/api/config.php';
    $pdo = wogo_db($cfg);
    $stmt = $pdo->prepare(
        "SELECT id, created_at
           FROM jobs
          WHERE status = 'approved' AND expires_at > ?
          ORDER BY created_at DESC
          LIMIT 49998"
    );
    $stmt->execute([gmdate('Y-m-d H:i:s')]);
    $jobs = $stmt->fetchAll();
} catch (Throwable $e) {
    // Keep the sitemap valid and useful for the static pages during a DB outage.
    error_log('[Wogopogo sitemap ' . gmdate('c') . '] ' . $e->getMessage());
}

function wogo_sitemap_escape(string $value): string
{
    return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
}

function wogo_sitemap_date(string $value): ?string
{
    $date = DateTimeImmutable::createFromFormat(
        'Y-m-d H:i:s',
        $value,
        new DateTimeZone('UTC')
    );
    return $date ? $date->format(DateTimeInterface::ATOM) : null;
}

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
echo '  <url><loc>' . wogo_sitemap_escape($baseUrl . '/') . '</loc></url>' . "\n";

foreach ($jobs as $job) {
    $location = $baseUrl . '/job/' . (int) $job['id'];
    $lastModified = wogo_sitemap_date((string) $job['created_at']);
    echo '  <url><loc>' . wogo_sitemap_escape($location) . '</loc>';
    if ($lastModified !== null) {
        echo '<lastmod>' . wogo_sitemap_escape($lastModified) . '</lastmod>';
    }
    echo '</url>' . "\n";
}

echo '</urlset>' . "\n";
