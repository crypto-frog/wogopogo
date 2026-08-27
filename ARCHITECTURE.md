# Architecture

Wogopogo is a two-layer web application designed for community-scale operation on conventional shared hosting.

## System context

- **React frontend:** browsing, filtering, posting, management, and moderation interfaces
- **PHP API:** validation, lifecycle rules, moderation authorization, rate limiting, and persistence
- **MySQL:** production data store
- **SQLite:** local development data store
- **PHP job renderer:** public HTML and structured data for `/job/{id}`
- **Apache configuration:** canonical redirects, routing, security headers, and file protections

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

### Public job rendering

1. Apache routes `/job/{id}` to `job.php`.
2. The renderer reads the approved, unexpired listing through the application database layer.
3. It emits descriptive HTML, canonical and social metadata, and JobPosting JSON-LD.
4. The React bundle loads and provides the interactive page.

## Data model

- `categories`: stable category names, slugs, and presentation emoji
- `jobs`: listing content, status, tier, management-token hash, and timestamps
- `rate_limits`: successful submission timestamps associated with a client IP
- `app_meta`: lightweight schema-version state

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

## Deployment boundary

The `deploy/` directory contains a complete static application, API, renderer, sitemap, and Apache rules. It does not contain production credentials or data. Deployment is a maintainer-controlled operation and is not performed automatically when code merges.

