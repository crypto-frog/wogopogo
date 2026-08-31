<?php
/**
 * Wogopogo database layer.
 * Opens a PDO connection (SQLite locally, MySQL on Bluehost),
 * creates tables on first run, and seeds categories and demo data.
 */

function wogo_db(array $cfg): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $configuredDriver = (string) ($cfg['db_driver'] ?? '');
    if (!in_array($configuredDriver, ['sqlite', 'mysql'], true)) {
        throw new RuntimeException("db_driver must be either 'sqlite' or 'mysql'.");
    }

    if ($configuredDriver === 'mysql') {
        $m = $cfg['mysql'] ?? [];
        foreach (['host', 'name', 'user', 'pass', 'charset'] as $field) {
            if (!array_key_exists($field, $m) || !is_string($m[$field]) || trim($m[$field]) === '') {
                throw new RuntimeException("Missing mysql.$field in api/config.php.");
            }
        }
        if (!preg_match('/^[A-Za-z0-9_]+$/', $m['charset'])) {
            throw new RuntimeException('mysql.charset contains unsupported characters.');
        }
        $dsn = "mysql:host={$m['host']};dbname={$m['name']};charset={$m['charset']}";
        $pdo = new PDO($dsn, $m['user'], $m['pass'], [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } else {
        if (!isset($cfg['sqlite_path']) || !is_string($cfg['sqlite_path']) || $cfg['sqlite_path'] === '') {
            throw new RuntimeException('Missing sqlite_path in api/config.php.');
        }
        $dir = dirname($cfg['sqlite_path']);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        // Belt and suspenders: block direct web access to the data folder
        $ht = $dir . '/.htaccess';
        if (!file_exists($ht)) {
            @file_put_contents($ht, "Require all denied\n");
        }
        $pdo = new PDO('sqlite:' . $cfg['sqlite_path'], null, null, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $pdo->exec('PRAGMA journal_mode = WAL');
        $pdo->exec('PRAGMA foreign_keys = ON');
    }

    if (!wogo_schema_is_current($pdo)) {
        wogo_init_schema($pdo, $cfg);
    }
    return $pdo;
}

/** A single cheap lookup replaces repeated CREATE TABLE / CREATE INDEX work. */
function wogo_schema_is_current(PDO $pdo): bool
{
    try {
        $stmt = $pdo->prepare("SELECT meta_value FROM app_meta WHERE meta_key = 'schema_version'");
        $stmt->execute();
        return (int) $stmt->fetchColumn() === 3;
    } catch (PDOException $e) {
        return false;
    }
}

function wogo_init_schema(PDO $pdo, array $cfg): void
{
    $driver  = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    $isMysql = ($driver === 'mysql');
    $idCol   = $isMysql ? 'INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY'
                        : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    $suffix  = $isMysql ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' : '';

    $pdo->exec("CREATE TABLE IF NOT EXISTS categories (
        id    $idCol,
        name  VARCHAR(80)  NOT NULL,
        slug  VARCHAR(80)  NOT NULL UNIQUE,
        emoji VARCHAR(16)  NOT NULL DEFAULT ''
    )$suffix");

    $pdo->exec("CREATE TABLE IF NOT EXISTS jobs (
        id          $idCol,
        title       VARCHAR(120) NOT NULL,
        company     VARCHAR(120) NOT NULL,
        category_id INT          NOT NULL,
        location    VARCHAR(80)  NOT NULL,
        job_type    VARCHAR(40)  NOT NULL,
        pay         VARCHAR(120) NOT NULL DEFAULT '',
        description TEXT         NOT NULL,
        apply_email VARCHAR(190) NOT NULL DEFAULT '',
        apply_url   VARCHAR(500) NOT NULL DEFAULT '',
        status      VARCHAR(20)  NOT NULL DEFAULT 'pending',
        tier        VARCHAR(20)  NOT NULL DEFAULT 'free',
        manage_hash CHAR(64)     NOT NULL,
        created_at  VARCHAR(19)  NOT NULL,
        updated_at  VARCHAR(19)  NOT NULL,
        expires_at  VARCHAR(19)  NOT NULL
    )$suffix");

    if (!wogo_column_exists($pdo, 'jobs', 'updated_at')) {
        $pdo->exec("ALTER TABLE jobs ADD COLUMN updated_at VARCHAR(19) NOT NULL DEFAULT ''");
    }
    $pdo->exec("UPDATE jobs SET updated_at = created_at WHERE updated_at = '' OR updated_at IS NULL");

    // Provenance is optional for employer-submitted jobs and required by the
    // private operations CLI for externally sourced listings. source_key is
    // nullable so a unique index can coexist with any number of public posts.
    $jobColumns = [
        'source_key' => "VARCHAR(190) NULL DEFAULT NULL",
        'source_name' => "VARCHAR(120) NOT NULL DEFAULT ''",
        'source_url' => "VARCHAR(500) NOT NULL DEFAULT ''",
        'source_posted_at' => "VARCHAR(10) NOT NULL DEFAULT ''",
        'source_verified_at' => "VARCHAR(19) NOT NULL DEFAULT ''",
        'source_status' => "VARCHAR(20) NOT NULL DEFAULT 'unverified'",
        'managed_origin' => "VARCHAR(30) NOT NULL DEFAULT 'public'",
    ];
    foreach ($jobColumns as $name => $definition) {
        if (!wogo_column_exists($pdo, 'jobs', $name)) {
            $pdo->exec("ALTER TABLE jobs ADD COLUMN $name $definition");
        }
    }

    $pdo->exec("CREATE TABLE IF NOT EXISTS rate_limits (
        id         $idCol,
        ip         VARCHAR(64) NOT NULL,
        created_at VARCHAR(19) NOT NULL
    )$suffix");

    $pdo->exec("CREATE TABLE IF NOT EXISTS app_meta (
        meta_key   VARCHAR(50)  NOT NULL PRIMARY KEY,
        meta_value VARCHAR(255) NOT NULL
    )$suffix");

    $pdo->exec("CREATE TABLE IF NOT EXISTS ops_audit (
        id          $idCol,
        actor       VARCHAR(120) NOT NULL,
        action      VARCHAR(80)  NOT NULL,
        entity_type VARCHAR(40)  NOT NULL,
        entity_id   INT          NULL,
        source_key  VARCHAR(190) NOT NULL DEFAULT '',
        reason      VARCHAR(500) NOT NULL,
        before_json TEXT         NOT NULL,
        after_json  TEXT         NOT NULL,
        created_at  VARCHAR(19)  NOT NULL
    )$suffix");

    // Helpful indexes. MySQL has no portable IF NOT EXISTS form for indexes,
    // so check information_schema explicitly and let genuine DDL errors surface.
    $indexes = [
        ['idx_jobs_status',  'jobs',        'CREATE INDEX idx_jobs_status  ON jobs (status, expires_at)'],
        ['idx_jobs_created', 'jobs',        'CREATE INDEX idx_jobs_created ON jobs (created_at)'],
        ['uq_jobs_source',   'jobs',        'CREATE UNIQUE INDEX uq_jobs_source ON jobs (source_key)'],
        ['idx_rate_ip',      'rate_limits', 'CREATE INDEX idx_rate_ip      ON rate_limits (ip, created_at)'],
        ['idx_rate_created', 'rate_limits', 'CREATE INDEX idx_rate_created ON rate_limits (created_at)'],
        ['idx_ops_created',  'ops_audit',    'CREATE INDEX idx_ops_created ON ops_audit (created_at)'],
    ];
    foreach ($indexes as [$name, $table, $sql]) {
        if ($isMysql) {
            $exists = $pdo->prepare(
                'SELECT COUNT(*) FROM information_schema.statistics
                  WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?'
            );
            $exists->execute([$table, $name]);
            if ((int) $exists->fetchColumn() === 0) {
                $pdo->exec($sql);
            }
        } else {
            $pdo->exec(str_replace('CREATE INDEX', 'CREATE INDEX IF NOT EXISTS', $sql));
        }
    }

    wogo_seed_categories($pdo);

    if (!$isMysql && !empty($cfg['seed_demo'])) {
        wogo_seed_demo($pdo, $cfg);
    }

    $pdo->prepare('REPLACE INTO app_meta (meta_key, meta_value) VALUES (?, ?)')
        ->execute(['schema_version', '3']);
}

function wogo_column_exists(PDO $pdo, string $table, string $column): bool
{
    if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql') {
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM information_schema.columns
              WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?'
        );
        $stmt->execute([$table, $column]);
        return (int) $stmt->fetchColumn() > 0;
    }

    foreach ($pdo->query('PRAGMA table_info(' . $table . ')') as $row) {
        if ((string) $row['name'] === $column) {
            return true;
        }
    }
    return false;
}

function wogo_seed_categories(PDO $pdo): void
{
    $cats = [
        ['Wine & Cideries',        'wine',        '🍇'],
        ['Hospitality & Food',     'hospitality', '🍽️'],
        ['Tourism & Recreation',   'tourism',     '⛵'],
        ['Orchards & Agriculture', 'agriculture', '🍑'],
        ['Health & Wellness',      'health',      '🩺'],
        ['Trades & Construction',  'trades',      '🔧'],
        ['Tech & Digital',         'tech',        '💻'],
        ['Retail & Sales',         'retail',      '🛍️'],
        ['Education & Childcare',  'education',   '📚'],
        ['Transport & Logistics',  'transport',   '🚚'],
        ['Office & Admin',         'office',      '🗂️'],
        ['Arts & Media',           'arts',        '🎨'],
        ['General Labour',         'labour',      '💪'],
        ['Everything Else',        'other',       '✨'],
    ];
    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    $verb = $driver === 'mysql' ? 'INSERT IGNORE' : 'INSERT OR IGNORE';
    $stmt = $pdo->prepare("$verb INTO categories (name, slug, emoji) VALUES (?, ?, ?)");
    foreach ($cats as $c) {
        $stmt->execute($c);
    }
}

function wogo_seed_demo(PDO $pdo, array $cfg): void
{
    $count = (int) $pdo->query('SELECT COUNT(*) FROM jobs')->fetchColumn();
    if ($count > 0) {
        return;
    }

    $slugId = [];
    foreach ($pdo->query('SELECT id, slug FROM categories') as $row) {
        $slugId[$row['slug']] = (int) $row['id'];
    }

    $life = (int) ($cfg['job_lifetime_days'] ?? 30);
    $demo = [
        ['Cellar Hand', 'Quails Hollow Winery', 'wine', 'West Kelowna', 'Seasonal',
         '$22 to $26 per hour',
         "Crush season is coming and our cellar team needs another set of careful hands.\n\nYou will help with receiving fruit, pump-overs, barrel work, and keeping the cellar spotless. Forklift experience is a bonus, a good attitude at 6 am is essential.\n\nBoots and training provided. Season runs September through November with a shot at year-round work.",
         'jobs@example.com', '', 'featured', 30],
        ['Tasting Room Host', 'Naramata Bench Cellars', 'wine', 'Penticton', 'Part-time',
         '$19 per hour plus tips',
         "Pour, chat, and make visitors feel like locals. Weekend availability required, wine knowledge welcome but trainable. Serving It Right certificate needed before your first shift.",
         'hello@example.com', '', 'free', 55],
        ['Line Cook', 'Lakeshore Social', 'hospitality', 'Kelowna', 'Full-time',
         '$21 to $25 per hour',
         "Busy waterfront kitchen looking for a dependable line cook for our summer-to-winter menu change.\n\nYou can hold a station on a Friday night, keep your prep list honest, and take feedback without drama. Extended health after 3 months, staff meals every shift.",
         '', 'https://example.com/apply', 'free', 8],
        ['Orchard Crew Lead', 'Sunmirror Orchards', 'agriculture', 'Summerland', 'Seasonal',
         '$24 per hour',
         "Lead a picking crew of 8 to 12 through cherry and apple season. You set the pace, track bins, and keep quality up. Clean driver abstract required, farm experience strongly preferred. Housing help available for the right person.",
         'work@example.com', '', 'free', 20],
        ['Registered Nurse, Casual', 'Valley Care Group', 'health', 'Vernon', 'Casual',
         'BCNU wage grid',
         "Pick up shifts that fit your life across our two Vernon sites. Current BCCNM registration required. New grads welcome, mentorship provided on your first rotations.",
         'careers@example.com', '', 'free', 31],
        ['Junior Web Developer', 'Peachtree Digital', 'tech', 'Kelowna', 'Full-time',
         '$58k to $70k',
         "Small studio, real clients, no ticket factory.\n\nYou will ship React front ends and the occasional API endpoint, review PRs with the team, and talk to actual humans about what they need. 1 to 2 years experience or a portfolio that says the same. Hybrid, 2 days a week in our downtown Kelowna office.",
         '', 'https://example.com/careers', 'free', 47],
        ['Apprentice Electrician', 'Bluebridge Electric', 'trades', 'Lake Country', 'Full-time',
         '$26 to $34 per hour DOE',
         "2nd or 3rd year apprentice wanted for residential and light commercial work between Kelowna and Vernon. Tools, van stocked, hours steady. We sign off your hours on time, every time.",
         'office@example.com', '', 'free', 70],
        ['Ski & Snowboard Instructor', 'Big White Snow School', 'tourism', 'Big White', 'Seasonal',
         '$20 to $28 per hour plus pass',
         "Teach beginners to love the mountain. CASI or CSIA Level 1 minimum, Level 2 preferred. Season pass, staff housing lottery, and the best office view in the valley.",
         '', 'https://example.com/snowschool', 'free', 26],
        ['Barista, Weekend Opener', 'Kettle Valley Coffee', 'hospitality', 'Penticton', 'Part-time',
         '$17.85 plus tips',
         "Saturday and Sunday 6 am opens. You are reliable, friendly before sunrise, and can steam milk without scorching it. Latte art optional, punctuality is not.",
         'kvcoffee@example.com', '', 'free', 3],
        ['Dental Receptionist', 'Mission Creek Dental', 'office', 'Kelowna', 'Full-time',
         '$23 to $27 per hour',
         "Front desk anchor for a friendly 3-chair practice. Booking, billing, recalls, and keeping the waiting room calm. Dentrix or similar experience is a big plus. Mon to Thu, no weekends.",
         'smile@example.com', '', 'free', 12],
    ];

    $stmt = $pdo->prepare(
        'INSERT INTO jobs (title, company, category_id, location, job_type, pay, description,
                           apply_email, apply_url, status, tier, manage_hash, created_at, updated_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    foreach ($demo as $d) {
        [$title, $company, $slug, $loc, $type, $pay, $desc, $email, $url, $tier, $hoursAgo] = $d;
        $created = gmdate('Y-m-d H:i:s', time() - $hoursAgo * 3600);
        $expires = gmdate('Y-m-d H:i:s', time() - $hoursAgo * 3600 + $life * 86400);
        $stmt->execute([
            $title, $company, $slugId[$slug] ?? 1, $loc, $type, $pay, $desc,
            $email, $url, 'approved', $tier,
            hash('sha256', bin2hex(random_bytes(16))), $created, $created, $expires,
        ]);
    }
}
