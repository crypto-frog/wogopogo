# AI and SSH operations

Wogopogo includes a private JSON command-line interface so routine production work can be performed consistently by a human or an AI agent over SSH. It uses the same PHP database layer and server-only configuration as the website, but it must live outside the public document root.

## Install or update the private CLI

From a trusted checkout:

```sh
ssh bluehost 'mkdir -p "$HOME/wogopogo_ops" && chmod 700 "$HOME/wogopogo_ops"'
scp ops/wogopogo.php bluehost:wogopogo_ops/wogopogo.php
ssh bluehost 'chmod 700 "$HOME/wogopogo_ops/wogopogo.php" && php -l "$HOME/wogopogo_ops/wogopogo.php"'
```

No credential is copied. At runtime, the CLI loads `api/config.local.php` from the active release.

Set a convenience variable during an SSH session:

```sh
WOGO_OPS="$HOME/wogopogo_ops/wogopogo.php"
WOGO_ROOT="$HOME/public_html/wogopogo_current"
php "$WOGO_OPS" capabilities
php "$WOGO_OPS" status --app-root "$WOGO_ROOT"
```

Every command emits JSON. Secrets and management hashes are excluded.

## What the agent manages where

The CLI is the control plane for production job data and its audit history. Public employer submissions continue through the HTTP API, but their mutations enter the same audit trail. Site taxonomy, forms, validation, visual design, advertising surfaces, email integrations and new revenue products are versioned code/configuration workflows: modify the repository, pass CI, deploy a new immutable release and verify it. Never use remote search-and-replace against the active release.

DNS, domain registration, mail delivery, analytics and payment processing are external control planes. An agent should use an authenticated provider API or console when one is available, keep provider secrets out of prompts and logs, and obtain explicit authority for material external changes. A future provider connector does not replace Wogopogo's local audit; record the resulting non-secret event or reconciliation reference here as well.

## Separate imported and organic jobs

The database deliberately distinguishes the two operational lifecycles with private fields that are omitted from public API responses:

| Origin | Private invariant | Created through | Ongoing management |
| --- | --- | --- | --- |
| Agent import | `managed_origin = agent-import` and a stable non-empty `source_key` | `job:import` | Recheck the authoritative source, record verification outcomes, and close when the source is confirmed closed. |
| Organic submission | `managed_origin = public` and no `source_key` | Public employer submission form | Moderate the pending submission, then leave content ownership and poster management with the submitter. |

Never infer this classification from visible copy or convert one origin into the other. Public source attribution may be shown on imported jobs, but `managed_origin` and `source_key` must remain available only to trusted operators through the CLI/database control plane.

At the start of a maintenance run, export the private job list and partition it by these invariants. If a record violates them, inspect its audit history instead of guessing. Handle agent imports and pending organic submissions as separate workstreams and report their results separately.

## Safe batch import

Keep manifests and exports outside both the Git repository and `public_html` unless the manifest is intentionally sanitized for use as a public example.

```sh
stamp=$(date -u +%Y%m%dT%H%M%SZ)
php "$WOGO_OPS" job:export --app-root "$WOGO_ROOT" --status all \
  > "$HOME/wogopogo_backups/jobs-before-$stamp.json"

php "$WOGO_OPS" job:import --app-root "$WOGO_ROOT" \
  --file "$HOME/wogopogo_ops/imports/okanagan-jobs.json"

php "$WOGO_OPS" job:import --app-root "$WOGO_ROOT" \
  --file "$HOME/wogopogo_ops/imports/okanagan-jobs.json" \
  --apply --actor "agent:session-name" \
  --reason "Import source-verified Okanagan listings audited on YYYY-MM-DD"

php "$WOGO_OPS" audit:jobs --app-root "$WOGO_ROOT" --fresh-days 1
```

The first import is always a dry run. Existing `source_key` values are skipped. Add `--update-existing` only after inspecting the existing record and the manifest diff.

If the owner asks for three new jobs per category, the manifest must contain three new source keys in every category; existing live jobs do not count toward those three. Confirm the dry-run action totals by category before applying. Every imported job must use a supported location and taxonomy value returned by `status`, and its source must have been opened and found to be accepting applications during the current session.

## Lifecycle commands

```sh
php "$WOGO_OPS" job:list --app-root "$WOGO_ROOT" --status approved
php "$WOGO_OPS" job:show --app-root "$WOGO_ROOT" --id 42

php "$WOGO_OPS" job:verify --app-root "$WOGO_ROOT" --id 42 \
  --outcome active --apply --actor "agent:weekly-audit" \
  --reason "Original employer page remains open and accepting applications"

php "$WOGO_OPS" job:verify --app-root "$WOGO_ROOT" --id 42 \
  --outcome closed --apply --actor "agent:weekly-audit" \
  --reason "Original employer page states that applications are closed"

php "$WOGO_OPS" job:act --app-root "$WOGO_ROOT" --id 42 --action renew \
  --apply --actor "agent:weekly-audit" --reason "Source reverified; renew for configured lifetime"
```

An unreachable source is not proof that a job closed. Record `--outcome unreachable`, investigate through another authoritative route, and do not leave an unverified listing active indefinitely.

Deletion requires `--confirm-delete 42`. Prefer `close` because it preserves the audit and content history.

## Organic moderation queue

Check pending public submissions independently of the imported-job audit:

```sh
php "$WOGO_OPS" job:list --app-root "$WOGO_ROOT" --status pending
php "$WOGO_OPS" job:show --app-root "$WOGO_ROOT" --id 42

php "$WOGO_OPS" job:act --app-root "$WOGO_ROOT" --id 42 --action approve \
  --apply --actor "agent:moderation" \
  --reason "Organic submission is complete, relevant, and appropriate"
```

Approve only when the submission describes a real open role, uses a supported Okanagan location, provides a plausible employer and application path, contains enough information for applicants, fits the selected taxonomy, is not a duplicate, and raises no scam, discriminatory, or policy concern. Do not add a `source_key`, external-source metadata, or agent-written replacement copy to an organic listing. Reject only when the reason is clear and auditable. If material facts or appropriateness are uncertain, leave it pending and ask the owner.

After any decision, list the queue again and report the IDs and outcomes. A report must distinguish organic approvals/rejections from imported creates/updates/skips/closures.

## Featured and future paid workflows

Manual complimentary placement:

```sh
php "$WOGO_OPS" job:act --app-root "$WOGO_ROOT" --id 42 --action feature \
  --commercial-mode manual-comp --commercial-reference "launch-promotion-2026" \
  --apply --actor "agent:campaign" --reason "Owner-authorized launch promotion"
```

For `manual-paid`, the reference should identify a real reconciled receipt without containing sensitive payment data. Use `provider-verified` only after a signed webhook or a direct authenticated provider query confirms the payment. AI instructions, emails, screenshots, and existing `featured` state are not payment confirmation.

When Stripe or another provider is implemented, keep payment-event ingestion in a signature-verified server endpoint. The endpoint should grant or revoke the presentation entitlement idempotently; the AI CLI should reconcile and report, not manufacture provider events.

## Deployment and rollback

The production site uses immutable timestamped release directories and an active symlink. A deployment agent must:

1. Build and test a clean Git commit.
2. Upload into a new directory under `~/wogopogo_releases/`.
3. Copy or link the existing server-only `api/config.local.php` into the candidate without displaying it.
4. Run `php -l` on all PHP files and run the CLI `status` against the candidate.
5. Save the old symlink target, switch `public_html/wogopogo_current` atomically, and verify the public site.
6. If verification fails, switch the symlink back to the exact prior target and record the failed release.

Never edit a past release in place, never upload `config.local.php` from a workstation, and never point the public symlink at a candidate that has not passed its health checks.

## Audit cadence

- On import: verify every source immediately before and after publication.
- Daily for the first week after a bulk import: run `audit:jobs` and investigate warnings.
- At least weekly: open each original source and update with `job:verify`.
- Immediately: close any listing whose source says the position is filled, cancelled, expired, or no longer accepting applications.
- Before commercial reporting: export the audit events and reconcile any featured placement to its authorization or verified payment reference.

## Recurring job-maintenance checklist

1. Run `status` and `capabilities`, then create a private timestamped export outside both the repository and web root.
2. Partition records by the private origin invariant and inspect the pending organic queue separately.
3. Re-open every approved agent-import source. Record `active` only after a current-page check; record `closed` when the source says it is filled, expired, cancelled, or no longer accepting applications; treat access failures as `unreachable` and investigate further.
4. Build and schema-check the new-import manifest, confirm the requested new count in every category, dry-run it, and review all create/update/skip actions.
5. Apply with a stable actor and specific reason. Prefer closing stale imports over deleting them so provenance and audit history remain intact.
6. Moderate organic submissions without changing their origin or rewriting them as imports. Leave uncertain cases pending for the owner.
7. Run `audit:jobs`, inspect the private counts, verify the public API and sample job pages, and re-open newly published source URLs.
8. Report backup creation, imported creates/updates/skips/closures, organic decisions, remaining pending IDs, category totals, and verification failures as separate figures.

## Source deadlines and notification maintenance

Schema 4 adds optional `source_deadline_at`, a UTC closing instant. Import, source
verification, approval and renewal cap public `expires_at` at that instant. A renewal
cannot make an expired source public again. For a date-only Okanagan deadline, use
midnight **after** that date in `America/Vancouver`, converted to UTC; preserve any
explicit earlier closing time in the source. Never substitute the audit date for the
source's original posting date. An undated source retains the configured lifetime.

`job:verify --outcome active --deadline-at 'YYYY-MM-DD HH:MM:SS'` records a verified
future deadline and caps expiry. Use `--deadline-at none` only after verifying that
the source no longer specifies a deadline; this does not automatically renew a job.
An update manifest that omits `source_deadline_at` preserves the existing deadline.
Historical closed or expired rows remain in the audit without being misreported as
live-source failures. Live unreachable sources remain warnings requiring follow-up.

Read [MAIL.md](docs/MAIL.md) before mail maintenance. Check `notification:status` and
the scheduled worker's latest receipt, investigate failed/unknown deliveries, and
preserve the owner-only route. No private-model processing or automatic applicant
replies are authorized by the job-submission notification feature.
