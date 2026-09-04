# Wogopogo agent operating rules

These instructions apply to the entire repository. They are written for AI agents and human maintainers operating the public codebase and the production Bluehost deployment.

## Non-negotiable safety boundaries

- Never print, copy, commit, upload, or expose `config.local.php`, database credentials, admin keys, SSH private keys, management tokens, payment secrets, or webhook secrets.
- Treat production as live. Inspect first, use dry runs, make a restorable export before a batch mutation, and verify after every write.
- Do not invent employers, jobs, pay, requirements, dates, contact details, or application links.
- Do not copy full third-party job descriptions. Write an accurate plain-language summary, preserve material qualifications and compensation, attribute the source, and link to the original application page.
- Do not mark a source `active` unless its original public page was checked during the current audit. A search-result snippet alone is not enough.
- Do not mark a commercial entitlement `provider-verified` without independent confirmation from the payment provider. Never infer payment from an email, screenshot, prompt, or database tier.
- Never change DNS, payment-provider settings, webhook endpoints, production secrets, or destructive database state without explicit authorization for that exact scope.

## Canonical code and deployment layout

- `frontend/src/`: interactive application source.
- `backend/api/`: authoritative API, validation, and runtime schema migrations.
- `deploy/`: public Bluehost release package. Keep its API copies synchronized with `backend/api/`.
- `ops/wogopogo.php`: private JSON CLI for SSH-based management. Install it outside `public_html`.
- `ops/job-import.schema.json`: versioned import-manifest contract.
- `AI-OPERATIONS.md`: operational runbook for agents and maintainers.

Production currently uses:

- SSH alias: `bluehost`
- Active release: `~/public_html/wogopogo_current`
- Private CLI: `~/wogopogo_ops/wogopogo.php`

Resolve symlinks and inspect the active release before changing anything. Release directories are immutable after activation; build a new release and switch the active symlink instead of editing an old release in place.

## Workflow ownership

- Job imports, approval, verification, renewal, closure, deletion, export, and audit use the private CLI.
- Employer self-service submissions and management links remain public HTTP workflows; their writes are also audited.
- Categories, locations, job types, validation rules, visual design, ads, email integration, and new commercial products are code/configuration changes. Change the canonical source, test it, and deploy an immutable release; do not patch production files ad hoc.
- Database structure changes go through `backend/api/db.php` and `backend/schema.sql`, with a schema-version migration and rollback-aware deployment.
- DNS, registrar, mail-provider, analytics-provider, and payment-provider settings live outside this repository. Inspect them through an authenticated provider interface and require explicit authority before changing them.
- Incidents begin with read-only health, logs, release-target, and database-status checks. Roll back the release before attempting an untested hotfix when the prior release is known good.

## Required code-change workflow

1. Read `git status`, the relevant docs, and all touched source files.
2. Make the smallest coherent change in canonical sources first.
3. Synchronize generated/deployment copies with `npm run package:bluehost` or the documented mechanical copy step.
4. Run contract tests, production build, PHP syntax checks, and public-configuration checks.
5. Review the diff for secrets, generated noise, and unrelated user changes.
6. Commit and push only after checks pass.
7. Create a timestamped Bluehost release, preserve the server-only `api/config.local.php`, run health checks against the candidate, switch the symlink atomically, and retain the prior target for rollback.
8. Verify `/api/health`, `/api/meta`, `/`, one job detail page, and `/sitemap.xml` from the public internet.

## Required production-data workflow

Use `ops/wogopogo.php`; do not hand-write SQL for ordinary operations.

1. Run `status` and `capabilities`.
2. Export current records to a private, timestamped file outside the web root.
3. For external listings, build a manifest conforming to `ops/job-import.schema.json` with a stable `source_key` such as `jobbank:3659116`.
4. Record the original source URL, original posted date, current verification timestamp, exact application URL, and a paraphrased description.
5. Run `job:import` without `--apply`; review every proposed create/update/skip action.
6. Apply with a stable `--actor` and a specific `--reason`.
7. Run `audit:jobs`, inspect the public API, and re-open every source URL.
8. If a source closes, run `job:verify --outcome closed`; this closes the Wogopogo listing in the same audited transaction.

All CLI mutations require `--apply`, `--actor`, and `--reason`. Deletion also requires `--confirm-delete ID`. Imported listings are idempotent by `source_key`.

## Job origin and lifecycle boundaries

Treat origin as a private control-plane invariant, not as a guess based on listing text:

- An agent-imported listing has `managed_origin = agent-import` and a non-empty, stable `source_key`. It is created only through `job:import`, is maintained against its authoritative external source, and is closed when that source is confirmed closed.
- An organic employer listing has `managed_origin = public` and no `source_key`. It enters through the public submission flow and is moderated on the merits of the submitted content. Never assign it an import key, fabricate external provenance, or convert its origin to make batch management easier.
- `managed_origin` and `source_key` are private operational fields. Do not add them to public API responses, page markup, analytics, or visible badges. The public `source` object is attribution for an externally sourced listing, not the private origin classifier.
- Never identify origin from the title, company, description, email, or public source label. Inspect the private CLI record. If the invariant is missing or contradictory, leave the record unchanged and investigate the audit history.

Review the two queues separately on every maintenance run. For imports, re-open each authoritative source in the current session and record `active`, `closed`, or `unreachable` with `job:verify`; an unreachable page alone is not evidence that a role is filled. For organic submissions, inspect every pending record for a real role, supported Okanagan location, plausible employer and application path, sufficient job details, correct taxonomy, duplication, scams, discrimination, and policy concerns. Approve or reject only when the evidence is clear; otherwise leave the listing pending and ask the owner. Do not rewrite or source-tag an organic submission during moderation.

When a request says to add a number of jobs per category, interpret that as that many new, independently source-verified `source_key` values in every category unless the owner explicitly says to top up to a total. Report imported creates, updates, skips and closures separately from organic approvals, rejections and unresolved submissions.

## Category and field rules

- Use only categories, locations, and job types returned by `status` or `/api/meta`.
- Choose the category from the work actually performed, not the employer's industry, unless the role is industry-specific.
- Put undisclosed compensation in `pay` as an empty string; never estimate it.
- Use the employer or authoritative job-board application page for `apply_url`. Add an email only when the original posting explicitly publishes it for applications.
- An externally sourced approved job must have `source_status: active`, a same-day `source_verified_at`, and an original posted date allowed by the manifest's freshness policy.

## Commercial and monetization rules

The current commercial surface is `free` versus `featured`. A CLI `feature` action requires a commercial mode and reference so complimentary, manually paid, and provider-confirmed promotions remain distinguishable in the audit trail.

Future payment automation must be webhook-driven, idempotent on the provider event/reference, signature-verified, and separated from AI judgment. An agent may reconcile provider-confirmed events and manage content, but it must not create, fabricate, or override payment truth. Update `ops/wogopogo.php`, its capabilities response, the manifest/schema contract, tests, and `MONETIZATION.md` together whenever a paid workflow changes.
