# Changelog

Notable project changes are recorded here. The format is inspired by Keep a Changelog, and releases follow semantic versioning where practical.

## [Unreleased]

## [1.3.0] - 2026-08-30

### Added

- Public contribution, governance, security, and support documentation
- Automated public-configuration safety checks
- Continuous integration for React, PHP, and deployment artifacts
- GitHub Pages project website
- Tint- and theme-aware Lake Dash microgame, lazy-loaded from a responsive header icon
- Database-rendered homepage links for current jobs

### Changed

- Updated React, React Router, Vite, and the React Vite plugin to supported releases with no npm audit findings
- Added substantive server-delivered homepage content to prevent soft-404 classification
- Return honest 404 responses for unknown routes and canonicalize HTTPS, host, and build-file URL variants
- Limited the sitemap to genuinely indexable content: the homepage and approved, unexpired job listings
- Marked the job-submission form and private utilities as non-indexable while keeping them available to visitors
- Moved public jobs to descriptive `/jobs/{id}/{job-title}` canonical URLs with legacy redirects
- Added accurate job `lastmod` tracking, automatic sitemap growth and removal, and `410 Gone` responses for closed listings
- Made sitemap database outages return `503` so temporary failures cannot resemble mass job removal

## [1.2.0] - 2026-08-27

### Added

- Balanced dark and light themes with six restrained accent options
- Accessible appearance chooser and improved responsive behaviour
- Search, filter, loading, pagination, and form reliability improvements
- Dynamic XML sitemap and server-rendered public job pages
- Canonical, social, JobPosting, Organization, and WebSite metadata
- Deliberate search and AI crawler directives
- Frontend API contract tests

### Changed

- Refined the Okanagan visual identity and job-card presentation
- Strengthened PHP input, request, database, logging, and moderation safeguards
- Improved MySQL compatibility and schema initialization
- Removed placeholder advertising contact details

See [UPGRADE-NOTES.md](UPGRADE-NOTES.md) for the detailed 1.2 migration notes.
