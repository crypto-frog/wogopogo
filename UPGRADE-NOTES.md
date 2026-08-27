# Wogopogo 1.2 upgrade notes

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

- Added a database-driven XML sitemap containing the homepage, posting page, and every approved, unexpired job.
- Added server-rendered job text and Google `JobPosting` JSON-LD for every public job URL.
- Added canonical URLs, route-specific titles and descriptions, social metadata, organization and website JSON-LD, Canadian language metadata, and no-index protection for private utility routes.
- Added crawler-aware `robots.txt` rules, sitemap discovery, and a concise `llms.txt` resource. Search crawlers are permitted; GPTBot training access is independently disabled.
- Added canonical-host redirects from `.com` and `www` variants to `https://wogopogo.ca` to prevent duplicate-domain competition.

## Verification

- `npm test` passes all contract tests.
- `npm run build` completes successfully.
- The ready-to-upload `deploy` folder contains the current production build and synchronized API files.

For an instant preview, use `npm run dev:mock` from the `frontend` folder. PHP is needed only for the full-stack local test or the live Bluehost deployment.
