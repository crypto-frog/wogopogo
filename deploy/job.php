<?php
/**
 * Server-rendered shell for /jobs/{id}/{job-title}.
 * Search crawlers receive the job's text, canonical metadata, and JobPosting
 * JSON-LD immediately; React replaces the fallback for normal visitors.
 */

declare(strict_types=1);

header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function wogo_html(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function wogo_iso_date(string $value): ?string
{
    $date = DateTimeImmutable::createFromFormat(
        'Y-m-d H:i:s',
        $value,
        new DateTimeZone('UTC')
    );
    return $date ? $date->format(DateTimeInterface::ATOM) : null;
}

function wogo_meta_description(string $value): string
{
    $clean = trim((string) preg_replace('/\s+/u', ' ', $value));
    if (mb_strlen($clean) <= 158) {
        return $clean;
    }
    return rtrim(mb_substr($clean, 0, 155)) . '…';
}

function wogo_render_index(
    string $index,
    string $title,
    string $description,
    string $canonical,
    string $robots,
    ?array $schema = null,
    string $fallback = ''
): string {
    $index = (string) preg_replace(
        '#<title>.*?</title>#is',
        '<title>' . wogo_html($title) . '</title>',
        $index,
        1
    );

    $patterns = [
        '#\s*<meta name="description"[^>]*>#i',
        '#\s*<meta name="robots"[^>]*>#i',
        '#\s*<meta name="googlebot"[^>]*>#i',
        '#\s*<meta property="og:title"[^>]*>#i',
        '#\s*<meta property="og:description"[^>]*>#i',
        '#\s*<meta property="og:type"[^>]*>#i',
        '#\s*<meta property="og:url"[^>]*>#i',
        '#\s*<meta name="twitter:title"[^>]*>#i',
        '#\s*<meta name="twitter:description"[^>]*>#i',
        '#\s*<link rel="canonical"[^>]*>#i',
        '#\s*<link rel="alternate" hreflang="en-CA"[^>]*>#i',
    ];
    $index = (string) preg_replace($patterns, '', $index);

    $meta = "\n    "
        . '<meta name="description" content="' . wogo_html($description) . '" />' . "\n    "
        . '<meta name="robots" content="' . wogo_html($robots) . '" />' . "\n    "
        . '<meta name="googlebot" content="' . wogo_html($robots) . '" />' . "\n    "
        . '<meta property="og:title" content="' . wogo_html($title) . '" />' . "\n    "
        . '<meta property="og:description" content="' . wogo_html($description) . '" />' . "\n    "
        . '<meta property="og:type" content="article" />' . "\n    "
        . '<meta property="og:url" content="' . wogo_html($canonical) . '" />' . "\n    "
        . '<meta name="twitter:title" content="' . wogo_html($title) . '" />' . "\n    "
        . '<meta name="twitter:description" content="' . wogo_html($description) . '" />' . "\n    "
        . '<link rel="canonical" href="' . wogo_html($canonical) . '" />' . "\n    "
        . '<link rel="alternate" hreflang="en-CA" href="' . wogo_html($canonical) . '" />';

    if ($schema !== null) {
        $schemaJson = json_encode(
            $schema,
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
                | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
        );
        $meta .= "\n    " . '<script id="wogo-job-posting" type="application/ld+json">'
            . $schemaJson . '</script>';
    }

    $index = str_replace('</head>', $meta . "\n  </head>", $index);
    $fallbackPattern = '#<!--wogo-fallback-start-->.*?<!--wogo-fallback-end-->#s';
    if (preg_match($fallbackPattern, $index)) {
        $index = (string) preg_replace_callback(
            $fallbackPattern,
            static function () use ($fallback): string {
                return '<!--wogo-fallback-start-->' . $fallback . '<!--wogo-fallback-end-->';
            },
            $index,
            1
        );
    } elseif ($fallback !== '') {
        $index = str_replace('<div id="root"></div>', '<div id="root">' . $fallback . '</div>', $index);
    }
    return $index;
}

$indexPath = __DIR__ . '/index.html';
$index = is_file($indexPath) ? file_get_contents($indexPath) : false;
if ($index === false) {
    http_response_code(500);
    echo '<!doctype html><html lang="en-CA"><title>Wogopogo</title><h1>Site unavailable</h1></html>';
    exit;
}

$rawId = (string) ($_GET['id'] ?? '');
$jobId = ctype_digit($rawId) ? (int) $rawId : 0;
$requestedSlug = trim((string) ($_GET['slug'] ?? ''));
$canonical = 'https://wogopogo.ca/jobs/' . $jobId . '/job';

try {
    require __DIR__ . '/api/db.php';
    require __DIR__ . '/api/helpers.php';
    $cfg = require __DIR__ . '/api/config.php';
    $pdo = wogo_db($cfg);
    $stmt = $pdo->prepare(
        'SELECT j.*, c.name AS cat_name, c.slug AS cat_slug
           FROM jobs j JOIN categories c ON c.id = j.category_id
          WHERE j.id = ?'
    );
    $stmt->execute([$jobId]);
    $job = $stmt->fetch();
} catch (Throwable $e) {
    error_log('[Wogopogo job page ' . gmdate('c') . '] ' . $e->getMessage());
    http_response_code(503);
    echo wogo_render_index(
        $index,
        'Wogopogo Temporarily Unavailable',
        'This Wogopogo job listing is temporarily unavailable.',
        $canonical,
        'noindex, nofollow'
    );
    exit;
}

$token = (string) ($_GET['token'] ?? '');
$isOwner = $job && $token !== ''
    && hash_equals((string) $job['manage_hash'], hash('sha256', $token));
$isLive = $job && $job['status'] === 'approved'
    && (string) $job['expires_at'] > gmdate('Y-m-d H:i:s');

if ($job) {
    $canonicalPath = wogo_job_path((int) $job['id'], (string) $job['title']);
    $canonical = 'https://wogopogo.ca' . $canonicalPath;
    $canonicalSlug = wogo_slugify((string) $job['title']);
    if (($isLive || $isOwner) && $requestedSlug !== $canonicalSlug) {
        $location = $canonicalPath;
        if ($isOwner) {
            $location .= '?token=' . rawurlencode($token);
        }
        header('Location: ' . $location, true, $isLive ? 301 : 302);
        exit;
    }
}

if (!$isLive) {
    if ($isOwner) {
        header('Cache-Control: private, no-store');
        echo wogo_render_index(
            $index,
            'Private Job Preview | Wogopogo',
            'Private job-listing preview for the person who submitted it.',
            $canonical,
            'noindex, nofollow'
        );
        exit;
    }

    $isGone = $job && in_array((string) $job['status'], ['approved', 'closed'], true);
    http_response_code($isGone ? 410 : 404);
    header('Cache-Control: public, max-age=60');
    header('X-Robots-Tag: noindex, nofollow');
    $fallback = '<main class="shell page empty"><article>'
        . '<h1>Job listing not found</h1>'
        . '<p>This listing may have been filled, expired, or removed.</p>'
        . '<p><a href="/">Browse current Okanagan jobs</a></p>'
        . '</article></main>';
    echo wogo_render_index(
        $index,
        $isGone ? 'Job Listing Closed | Wogopogo' : 'Job Listing Not Found | Wogopogo',
        $isGone
            ? 'This Wogopogo job listing has closed and is no longer accepting applications.'
            : 'This Wogopogo job listing is no longer available.',
        $canonical,
        'noindex, nofollow',
        null,
        $fallback
    );
    exit;
}

header('Cache-Control: public, max-age=300, stale-while-revalidate=600');

$employmentTypes = [
    'Full-time' => 'FULL_TIME',
    'Part-time' => 'PART_TIME',
    'Contract' => 'CONTRACTOR',
    'Seasonal' => 'TEMPORARY',
    'Casual' => 'OTHER',
    'Internship' => 'INTERN',
];
$isRemote = str_starts_with(strtolower((string) $job['location']), 'remote');
$schema = [
    '@context' => 'https://schema.org',
    '@type' => 'JobPosting',
    'title' => $job['title'],
    'description' => nl2br(wogo_html((string) $job['description'])),
    'identifier' => [
        '@type' => 'PropertyValue',
        'name' => 'Wogopogo',
        'value' => (string) $job['id'],
    ],
    'datePosted' => wogo_iso_date((string) $job['created_at']),
    'validThrough' => wogo_iso_date((string) $job['expires_at']),
    'employmentType' => $employmentTypes[$job['job_type']] ?? $job['job_type'],
    'industry' => $job['cat_name'],
    'hiringOrganization' => [
        '@type' => 'Organization',
        'name' => $job['company'],
    ],
    'url' => $canonical,
];

if ($isRemote) {
    $schema['jobLocationType'] = 'TELECOMMUTE';
    $schema['applicantLocationRequirements'] = [
        '@type' => 'Country',
        'name' => 'Canada',
    ];
} else {
    $schema['jobLocation'] = [
        '@type' => 'Place',
        'address' => [
            '@type' => 'PostalAddress',
            'addressLocality' => $job['location'],
            'addressRegion' => 'BC',
            'addressCountry' => 'CA',
        ],
    ];
}

$title = (string) $job['title'] . ' at ' . (string) $job['company'] . ' | Wogopogo';
$description = wogo_meta_description(
    (string) $job['title'] . ' at ' . (string) $job['company'] . ' in '
    . (string) $job['location'] . '. ' . (string) $job['description']
);
$pay = trim((string) $job['pay']);
$applyEmail = trim((string) $job['apply_email']);
$applyUrl = trim((string) $job['apply_url']);
$fallback = '<main class="shell page detail"><article>'
    . '<nav aria-label="Breadcrumb"><p><a href="/">Okanagan jobs</a> · '
    . wogo_html((string) $job['title']) . '</p></nav>'
    . '<h1>' . wogo_html((string) $job['title']) . '</h1>'
    . '<p><strong>' . wogo_html((string) $job['company']) . '</strong></p>'
    . '<p>' . wogo_html((string) $job['location']) . ' · '
    . wogo_html((string) $job['job_type'])
    . ($pay !== '' ? ' · ' . wogo_html($pay) : '') . '</p>'
    . '<div>' . nl2br(wogo_html((string) $job['description'])) . '</div>'
    . '<section><h2>Apply</h2>'
    . ($applyUrl !== ''
        ? '<p><a href="' . wogo_html($applyUrl) . '">Apply on the employer’s website</a></p>'
        : '')
    . ($applyEmail !== ''
        ? '<p><a href="mailto:' . wogo_html($applyEmail) . '">Apply by email</a></p>'
        : '')
    . '<p>Applications are handled directly by the employer.</p></section>'
    . '</article></main>';

echo wogo_render_index(
    $index,
    $title,
    $description,
    $canonical,
    'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    $schema,
    $fallback
);
