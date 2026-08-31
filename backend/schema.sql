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
    updated_at  VARCHAR(19)  NOT NULL,
    expires_at  VARCHAR(19)  NOT NULL,
    source_key  VARCHAR(190) NULL DEFAULT NULL,
    source_name VARCHAR(120) NOT NULL DEFAULT '',
    source_url  VARCHAR(500) NOT NULL DEFAULT '',
    source_posted_at VARCHAR(10) NOT NULL DEFAULT '',
    source_verified_at VARCHAR(19) NOT NULL DEFAULT '',
    source_status VARCHAR(20) NOT NULL DEFAULT 'unverified',
    managed_origin VARCHAR(30) NOT NULL DEFAULT 'public'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ops_audit (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    actor       VARCHAR(120) NOT NULL,
    action      VARCHAR(80)  NOT NULL,
    entity_type VARCHAR(40)  NOT NULL,
    entity_id   INT          NULL,
    source_key  VARCHAR(190) NOT NULL DEFAULT '',
    reason      VARCHAR(500) NOT NULL,
    before_json TEXT         NOT NULL,
    after_json  TEXT         NOT NULL,
    created_at  VARCHAR(19)  NOT NULL
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
CREATE UNIQUE INDEX uq_jobs_source ON jobs (source_key);
CREATE INDEX idx_rate_ip      ON rate_limits (ip, created_at);
CREATE INDEX idx_rate_created ON rate_limits (created_at);
CREATE INDEX idx_ops_created  ON ops_audit (created_at);

REPLACE INTO app_meta (meta_key, meta_value) VALUES ('schema_version', '3');
