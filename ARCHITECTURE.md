# Architecture

Wogopogo is a two-layer web application designed for community-scale operation on conventional shared hosting.

## System context

- **React frontend:** browsing, filtering, posting, management, and moderation interfaces
- **PHP API:** validation, lifecycle rules, moderation authorization, rate limiting, and persistence
- **MySQL:** production data store
- **SQLite:** local development data store
- **PHP homepage renderer:** live crawlable links for approved, unexpired jobs
- **PHP job renderer:** public HTML and structured data for `/jobs/{id}/{job-title}`
- **Apache configuration:** canonical redirects, routing, security headers, and file protections
- **Private operations CLI:** JSON commands for SSH-based imports, lifecycle management, verification, exports, and audit review

The hosted service uses static frontend assets. Node.js is a build tool, not a production runtime.

## Request flows

### Browsing

1. The browser requests the static application.
2. React requests `GET /api/meta` and `GET /api/jobs`.
3. The API returns approved, unexpired listings only.
4. Client-side filters update query parameters and request a fresh result page.

### Submission

1. The browser posts validated form data to `POST /api/jobs`.
2. The API performs independent server-side validation.
3. Rate limiting and the honeypot check run before persistence.
4. The listing and rate-limit record are written in one transaction.
5. A random management token is returned once; only its SHA-256 hash is stored.
6. The listing remains pending when moderation is enabled.

### Moderation

1. A moderator supplies the key through the `X-Admin-Key` request header.
2. The API performs a constant-time comparison.
3. Approved actions change listing state or presentation.
4. Approval and renewal calculate an expiry date using the configured listing lifetime.
5. Mutations append a credential-free before/after event to `ops_audit`.

### Agent and SSH operations

1. The private CLI resolves the active release and loads its server-only configuration without printing it.
2. Read commands return structured JSON; mutations require an explicit apply flag, actor, and reason.
3. External listings are validated against the configured categories, locations, and job types.
4. `source_key` makes manifest imports idempotent, while provenance timestamps distinguish publication from source verification.
5. Every mutation runs in a database transaction and appends an audit event.
6. The CLI is deployed outside `public_html` and therefore has no HTTP route.

### Public job rendering

1. Apache routes `/jobs/{id}/{job-title}` to `job.php`; legacy numeric routes redirect to the descriptive canonical URL.
2. The renderer reads the approved, unexpired listing through the application database layer.
3. It emits descriptive HTML, canonical and social metadata, and JobPosting JSON-LD.
4. The React bundle loads and provides the interactive page.

### Sitemap lifecycle

1. The sitemap reads approved jobs whose expiry is still in the future.
2. Every entry uses the same descriptive canonical URL as the job renderer and an accurate content `lastmod` timestamp.
3. Approval or renewal adds or refreshes an entry; closing, deletion, or expiry removes it automatically.
4. Closed or expired job pages return `410 Gone`, while unknown URLs return `404 Not Found`.
5. A temporary database failure returns `503` instead of an empty sitemap, preventing a crawler from mistaking an outage for mass removal.

## Data model

- `categories`: stable category names, slugs, and presentation emoji
- `jobs`: listing content, status, tier, management-token hash, timestamps, optional source provenance, and verification state
- `rate_limits`: successful submission timestamps associated with a client IP
- `app_meta`: lightweight schema-version state
- `ops_audit`: append-only, credential-free operational mutation history

See [backend/schema.sql](backend/schema.sql) for the reference MySQL schema. Runtime initialization in [backend/api/db.php](backend/api/db.php) is authoritative.

## Listing states

```text
submitted -> pending -> approved -> closed
                    \-> rejected
approved -> expired (derived from expires_at)
any managed state -> deleted
```

Rejected and deleted listings are not publicly retrievable. Expiry is evaluated against UTC time rather than maintained by a background process.

## Configuration

Both committed `config.php` files are safe templates. Local development overrides belong in the ignored `config.local.php`. A production operator maintains the credential-bearing configuration only on the server.

The repository safety script verifies that committed templates remain inert and synchronized.

## Design constraints

- Shared-hosting compatibility
- No mandatory visitor or employer accounts
- Same-origin production API
- Human moderation as the primary abuse control
- Minimal third-party runtime dependencies
- Crawlable public listings without crawler-specific content
- Explicit separation between open-source development and production operations
- Dry-run-first, idempotent, audited automation rather than direct ad-hoc SQL

## Deployment boundary

The `deploy/` directory contains a complete static application, API, renderer, sitemap, and Apache rules. It does not contain production credentials or data. Deployment is a maintainer-controlled operation and is not performed automatically when code merges.
