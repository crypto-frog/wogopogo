<?php
/**
 * Wogopogo configuration template.
 *
 * Keep credentials out of version control. For local changes, create
 * config.local.php beside this file. On a production server, edit the
 * server-only copy of this file and never copy it back into the repository.
 */

$CONFIG = [
    // Use "sqlite" for local development and "mysql" on supported production hosts.
    'db_driver' => 'sqlite',

    // MySQL settings from the hosting control panel.
    'mysql' => [
        'host'    => 'localhost',
        'name'    => 'your_cpanel_database',
        'user'    => 'your_cpanel_user',
        'pass'    => 'replace-with-a-strong-password',
        'charset' => 'utf8mb4',
    ],

    // SQLite is intended for local development only.
    'sqlite_path' => __DIR__ . '/data/wogopogo.sqlite',

    /**
     * Moderation key for /admin.
     * The admin API remains disabled while this value is "change-me".
     */
    'admin_key' => 'change-me',

    // New listings wait for approval by default.
    'require_approval' => true,

    // Activate only after Zoho delivery is verified. The private scheduled CLI
    // drains the transactional outbox; public requests never send email.
    'submission_notifications' => [
        'enabled' => false,
        'to' => 'hello@wogopogo.ca',
        'from' => 'hello@wogopogo.ca',
    ],

    // Approved listings remain live for this many days.
    'job_lifetime_days' => 30,

    // Successful submissions allowed per client IP.
    'max_posts_per_hour' => 5,
    'max_posts_per_day'  => 15,

    // Demo data is seeded only for local SQLite development.
    'seed_demo' => true,

    'locations' => [
        'Kelowna', 'West Kelowna', 'Lake Country', 'Vernon', 'Penticton',
        'Summerland', 'Peachland', 'Osoyoos', 'Oliver', 'Okanagan Falls',
        'Keremeos', 'Armstrong', 'Enderby', 'Salmon Arm', 'Big White',
        'Silver Star', 'Apex Mountain', 'Remote (Okanagan-based)',
    ],

    'job_types' => [
        'Full-time', 'Part-time', 'Contract', 'Seasonal', 'Casual', 'Internship',
    ],

    // Enables manual featured-listing controls in the moderator interface.
    'featured_enabled' => true,
];

// Optional untracked overrides for local development and production. Support
// both a file that mutates $CONFIG and a file that returns a partial array.
if (file_exists(__DIR__ . '/config.local.php')) {
    $driverBeforeLocal = $CONFIG['db_driver'];
    $secretConfig = require __DIR__ . '/config.local.php';
    $localSetDriver = false;
    if (is_array($secretConfig)) {
        $localSetDriver = array_key_exists('db_driver', $secretConfig);
        $CONFIG = array_replace_recursive($CONFIG, $secretConfig);
    } elseif ($secretConfig !== 1) {
        throw new RuntimeException('config.local.php must return an array or update $CONFIG directly.');
    } else {
        $localSetDriver = $CONFIG['db_driver'] !== $driverBeforeLocal;
    }

    // Backward compatibility for existing Bluehost overrides that predate the
    // explicit driver setting. Never switch unless every credential placeholder
    // was replaced, and never override an explicit local driver choice.
    $mysql = is_array($CONFIG['mysql'] ?? null) ? $CONFIG['mysql'] : [];
    $mysqlCredentialsSet = ($mysql['name'] ?? 'your_cpanel_database') !== 'your_cpanel_database'
        && ($mysql['user'] ?? 'your_cpanel_user') !== 'your_cpanel_user'
        && ($mysql['pass'] ?? 'replace-with-a-strong-password') !== 'replace-with-a-strong-password';
    if (!$localSetDriver && $CONFIG['db_driver'] === $driverBeforeLocal && $mysqlCredentialsSet) {
        $CONFIG['db_driver'] = 'mysql';
    }
    unset($driverBeforeLocal, $localSetDriver, $mysql, $mysqlCredentialsSet, $secretConfig);
}

return $CONFIG;
