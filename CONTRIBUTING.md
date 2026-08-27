# Contributing to Wogopogo

Thank you for considering a contribution. Wogopogo is deliberately compact, community-oriented software. Changes should preserve that character: useful, accessible, secure, and maintainable on ordinary shared hosting.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Before you begin

- Search existing issues and pull requests.
- Use a discussion or feature-request issue for substantial behaviour or architecture changes.
- Never include production credentials, moderator keys, private job submissions, database exports, logs, or personal information.
- Report suspected security vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

Small documentation fixes and narrowly scoped bug fixes may go directly to a pull request.

## Development setup

For interface-only work:

```bash
cd frontend
npm ci
npm run dev:mock
```

For full-stack work, run PHP from the repository root:

```bash
php -S 127.0.0.1:8000 backend/dev-server.php
```

Then start Vite in another terminal:

```bash
cd frontend
npm ci
npm run dev
```

Local database data is written below `backend/api/data/` and is ignored by Git.

## Branches and commits

Create a focused branch from `main`:

```bash
git switch -c fix/clear-description
```

Use short, descriptive commit messages. A pull request should address one coherent concern and explain both the user impact and implementation.

## Required checks

Before opening a pull request:

```bash
node scripts/check-public-config.mjs
cd frontend
npm test
npm run build
npm audit
```

If PHP is installed, also run:

```bash
php -l backend/api/index.php
php -l backend/api/db.php
php -l backend/api/helpers.php
php -l backend/sitemap.php
php -l deploy/job.php
php -l deploy/sitemap.php
```

CI repeats these checks.

## Project expectations

### Accessibility

- Maintain keyboard access and visible focus states.
- Preserve meaningful labels, landmarks, status messages, and error associations.
- Check narrow mobile layouts and text enlargement.
- Respect reduced-motion preferences.
- Do not communicate state by colour alone.

### Frontend

- Prefer existing components and design tokens.
- Keep dependencies limited and justified.
- Handle loading, empty, error, and stale-request states.
- Avoid collecting information that the feature does not require.

### Backend

- Use prepared statements for every dynamic query.
- Validate and normalize all external input server-side.
- Do not accept administrator credentials in URLs.
- Preserve same-origin production behaviour and moderation defaults.
- Treat management tokens and client IP information as sensitive.

### Search and structured data

- Public job metadata must reflect visible, approved listing data.
- Keep canonical URLs, robots rules, sitemap output, and JobPosting JSON-LD consistent.
- Do not add spam-oriented pages, fabricated content, or crawler-specific claims.

## Pull request checklist

A complete pull request should:

- Explain the problem and the chosen solution.
- Link the relevant issue when one exists.
- Include tests or explain why a test is not practical.
- Include screenshots for visible changes.
- Confirm keyboard and mobile checks for interface changes.
- Update documentation when behaviour or configuration changes.
- Leave the repository's public configuration safety check passing.

Maintainers may request changes, narrow the scope, or decline features that increase operational complexity without a clear community benefit.

## Licence of contributions

By submitting a contribution, you agree that it may be distributed under the project's [MIT License](LICENSE).

