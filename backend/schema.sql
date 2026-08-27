-- Wogopogo MySQL schema (reference).
-- You normally do NOT need this file: the API creates these tables
-- automatically on its first request. It is here in case you prefer
-- to import via phpMyAdmin or want to inspect the structure.

CREATE TABLE IF NOT EXISTS categories (
    id    INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name  VARCHAR(80)  NOT NULL,
    slug  VARCHAR(80)  NOT NULL UNIQUE,
    emoji VARCHAR(16)  NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jobs (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(120) NOT NULL,
    company     VARCHAR(120) NOT NULL,
    category_id INT          NOT NULL,
    location    VARCHAR(80)  NOT NULL,
    job_type    VARCHAR(40)  NOT NULL,
    pay         VARCHAR(120) NOT NULL DEFAULT '',
    description TEXT         NOT NULL,
    apply_email VARCHAR(190) NOT NULL DEFAULT '',
    apply_url   VARCHAR(500) NOT NULL DEFAULT '',
    status      VARCHAR(20)  NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | closed
    tier        VARCHAR(20)  NOT NULL DEFAULT 'free',     -- free | featured  (monetization hook)
    manage_hash CHAR(64)     NOT NULL,                    -- sha256 of the poster's manage token
    created_at  VARCHAR(19)  NOT NULL,                    -- UTC 'Y-m-d H:i:s'
    expires_at  VARCHAR(19)  NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_limits (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    ip         VARCHAR(64) NOT NULL,
    created_at VARCHAR(19) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_meta (
    meta_key   VARCHAR(50)  NOT NULL PRIMARY KEY,
    meta_value VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_jobs_status  ON jobs (status, expires_at);
CREATE INDEX idx_jobs_created ON jobs (created_at);
CREATE INDEX idx_rate_ip      ON rate_limits (ip, created_at);
CREATE INDEX idx_rate_created ON rate_limits (created_at);

REPLACE INTO app_meta (meta_key, meta_value) VALUES ('schema_version', '1');
