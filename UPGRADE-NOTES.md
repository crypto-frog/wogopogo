# Wogopogo 1.4 upgrade notes

Version 1.4 adds an SSH-first, JSON operations interface for safe human and AI-agent management. The database migrates automatically to schema version 3, adding source provenance to jobs and an append-only `ops_audit` table. Existing employer-submitted jobs remain valid; their provenance is marked `unverified` until an operator explicitly records a source check.

Install `ops/wogopogo.php` outside `public_html` and point it at the active release. Mutations require `--apply`, an actor, and a reason; imports are dry runs by default and idempotent by `source_key`. See `AI-OPERATIONS.md` and the repository-wide `AGENTS.md` for import, audit, deployment, rollback, and future payment-workflow rules.

The public job response and detail page now expose source attribution when it exists. CI builds and retains a tested Bluehost artifact, validates the operations contract, and continues to reject server-only configuration or private key material.

## Previous 1.3 changes

Version 1.3 adds the optional Lake Dash microgame and moves live job listings to descriptive, server-rendered URLs. The database migrates automatically to schema version 2 by adding `updated_at`, which powers accurate sitemap `lastmod` values. Existing `/job/{id}` links redirect to the new canonical route, and no production job data or server-only configuration needs to be replaced.

The dynamic homepage now exposes direct job links without requiring JavaScript. The sitemap grows on approval and renewal, shrinks on close, deletion, or expiry, and returns a temporary error rather than an empty URL set during a database outage. Closed or expired job pages return `410 Gone` to accelerate search cleanup.

## Previous 1.2 changes

This release preserves the original Okanagan-lake visual identity while making the interface more polished, restrained, searchable, accessible, and production-ready.

## Appearance

- Replaced the front-page headline with “Local jobs.” and removed the old wording from sharing metadata.
- Added a neutral charcoal option and made it the default dark appearance.
- Retained Lake, Cobalt, Violet, Rose, Ember, and Forest while reducing background saturation and glow intensity; accents remain clearly visible on controls and focus states.
- Reworked light mode around soft paper-grey surfaces instead of pure white, with individually tuned, professional contrast.
- Added an accessible appearance chooser with native radio-keyboard behaviour, focus return, outside-click dismissal, and a narrow-screen layout.
- Improved cards with useful job excerpts, subtle depth, and stable loading skeletons.

## User experience and accessibility

- Added a skip link and route focus handling.
- Improved mobile grids and header behaviour down to narrow phone widths.
- Added selected-state semantics to category filters and complete keyboard behaviour to moderation tabs.
- Improved pagination focus, form error focus, field descriptions, invalid-field styling, copy feedback, and touch targets.
- Closed and expired listings no longer present active application controls.
- Removed the placeholder advertising email from the production footer.

## Frontend reliability

- Prevented delayed searches from overwriting newer filters.
- Added API timeouts, clearer connection errors, non-JSON response detection, and no-stale-cache requests.
- Made metadata retryable and refreshed category counts after relevant posting and moderation actions.
- Prevented stale admin-tab requests from replacing newer results.
- Hardened saved manage-token data and URL-driven Manage-page state.
- Brought the mock demo's validation, expiry, sorting, and approval behaviour into line with the production API.
- Added dependency-free contract tests, run with `npm test`.

## Backend and Bluehost readiness

- Fixed production MySQL search, which previously reused an unsupported named parameter.
- Corrected the Bluehost database configuration instructions and health-check example.
- Replaced repeated schema DDL on every request with a lightweight schema-version check.
- Made category seeding idempotent and added the missing rate-limit cleanup index.
- Made job creation and its rate-limit record one transaction.
- Added request-size/content-type checks, safe JSON encoding, strict database-driver validation, stronger admin-key requirements, cache protections, and reliable server logging.
- Removed admin-key support from query strings.
- Added baseline Apache browser-security headers.

## Search and machine-readable discovery

- Added a database-driven XML sitemap containing the homepage and every approved, unexpired job.
- Added server-rendered job text and Google `JobPosting` JSON-LD for every public job URL.
- Added canonical URLs, route-specific titles and descriptions, social metadata, organization and website JSON-LD, Canadian language metadata, and no-index protection for private utility routes.
- Added crawler-aware `robots.txt` rules, sitemap discovery, and a concise `llms.txt` resource. Search crawlers are permitted; GPTBot training access is independently disabled.
- Added canonical-host redirects from `.com` and `www` variants to `https://wogopogo.ca` to prevent duplicate-domain competition.

## Verification

- `npm test` passes all contract tests.
- `npm run build` completes successfully.
- The ready-to-upload `deploy` folder contains the current production build and synchronized API files.

For an instant preview, use `npm run dev:mock` from the `frontend` folder. PHP is needed only for the full-stack local test or the live Bluehost deployment.
