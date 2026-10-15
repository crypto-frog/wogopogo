# Wogopogo refresh run: review, removal and addition

Every five days an agent refreshes wogopogo.ca so the board stays accurate and worth visiting:
new local jobs, nothing stale, and quick answers for employers who post. The goal is traffic and
trust. A board that shows jobs that are already gone loses both, so **accuracy beats volume**.

The run is normally done by the unattended Claude Code service on the owner's VPS (see
[Automation](#automation-on-the-vps)). A human-supervised agent can run the same steps by hand;
the only difference is how commands reach the server (see [Command reference](#command-reference)).
The first full run under this runbook is recorded in `docs/MAINTENANCE-2026-09-19.md`.

## Outcomes of a good run

1. Every **pending organic submission** (an employer's own posting) is approved unless there is
   a real problem. The owner also receives each one by email at hello@wogopogo.ca with a
   one-click Review & approve button, so a listing the agent holds back still reaches the owner.
2. Every **live imported job** has had its original source opened during this run. Jobs that are
   gone at source, or whose deadline has passed and was not extended, are closed. Jobs that are
   still open are re-verified, and deadlines the employer extended are carried over.
3. Every **category has at least two live jobs** (aim for 6 to 10), each one a real posting
   found on the internet during this run, checked against its source.
4. `audit:jobs` ends with **0 errors**, and a report says exactly what changed and why.
5. The board draws from **independent public sources**, including employers' own careers
   pages. Every run searches beyond Job Bank and reports its source mix and any coverage gaps.

## Hard rules

- **Never invent anything.** Every employer, title, pay, location and deadline must come from a
  public posting you opened in this run. If a field is not on the page, leave it blank. Do not
  "improve" pay or add requirements.
- **Write your own short description** (2 to 4 sentences, facts from the posting). Never copy a
  full third-party description.
- **Re-open the source before every closure.** On 2026-09-19, 11 of 17 listings closed on their
  recorded deadlines had been extended by the employer and had to be restored. A recorded
  deadline is only a reason to look, never a reason to close.
- **Unreachable is not closed.** A timeout, 403, 429, 5xx, CAPTCHA or a JavaScript-only page
  proves nothing. Record `--outcome unreachable` and try an alternative route (below). Close
  only on clear evidence: HTTP 404 or 410, a redirect to an expired page, a page that says the
  posting is closed, filled or no longer advertised, or a deadline in the past that the live
  page still shows.
- **Imported and organic jobs are separate workstreams.** Imported jobs have
  `managed_origin = agent-import` and a `source_key`; organic jobs have `managed_origin = public`
  and no `source_key`. Never convert one into the other, and never edit an employer's own text.
- **Region:** the Okanagan and Shuswap, from Osoyoos to Salmon Arm, including Lake Country,
  West Kelowna, Summerland, Peachland, Oliver, Keremeos, Coldstream, Armstrong and Enderby.
- **No deletes, no featuring, no configuration changes, no code changes** during a refresh run.
- **No secrets.** Never print, copy or commit configuration, keys or tokens. Keep exports and
  manifests out of the Git repository.

## Step 0: snapshot

```sh
wogo status                                            # health and counts
wogo job:export --status all --limit 5000 > before.json
wogo audit:jobs --fresh-days 5 > audit-before.json
```

Partition `before.json` into imported (`source_key` not empty) and organic jobs. If a record
breaks the invariants above, report it and leave it alone.

## Step 1: organic submissions

```sh
wogo job:list --status pending
```

For each pending job with `managed_origin = public` and no `source_key`:

- **Approve** unless you find a real issue:
  `wogo job:act --id N --action approve --apply --reason "Organic submission reviewed: real local employer, complete details"`.
- **Reject** only for clear abuse: an up-front fee or "starter kit", crypto or money-transfer
  work, requests for banking or ID details, adult content, discrimination, a location outside
  the region with no local work, obvious spam, or an exact duplicate of a live listing.
- **Leave pending** when unsure (for example a vague business you cannot find anywhere). The
  owner decides from the email. Say why in the report.
- Test listings whose title starts with `TEST` are the operator's own; reject them.

## Step 2: re-check every live imported job

For each job with `status = approved` and a `source_key`, open its `source_url` now.

**Job Bank** (`jobbank:NNN`, `https://www.jobbank.gc.ca/jobsearch/jobposting/ID`):
- HTTP 410, or a redirect to `/jobpostingexpired/`, means **closed** ("no longer advertised").
- HTTP 200: the page carries RDFa (there is no JSON-LD). Read
  `property="validThrough"` (the "Advertised until" date D), `property="title"`,
  `property="hiringOrganization"` and `property="baseSalary"`. The Job Bank number appears as
  `<span>Job Bank</span> <span>#NNN</span>`.
- If D is today or later the job is **active**. Convert midnight after D from
  `America/Vancouver` to UTC (07:00 during daylight time, 08:00 during standard time).
  Preserve an explicit closing time. Example: advertised until 2026-10-02 gives
  `2026-10-03 07:00:00`; November 5 gives `2026-11-06 08:00:00`.
- If D is before today on a page that still loads, the posting is **closed**.

**Lever** (`lever:...`, `jobs.lever.co`): 404 means closed; 200 with the posting means active.

**CivicJobs** (`civicjobs:ID`): returns 403 to automated reads. Look for the same posting on Job
Bank (municipal jobs are usually mirrored; search the title and employer), or the employer's own
careers page. If neither can be read, record `unreachable`.

**Employer ATS pages** (BambooHR, ADP, UltiPro, Workday and similar) are often JavaScript-only.
Try the WebFetch tool, the employer's careers page, and Job Bank. If you still cannot see the
posting, record `unreachable` and keep the job.

Then record what you found:

| Finding | Commands |
| --- | --- |
| Active, same deadline | `job:verify --id N --outcome active --apply --reason "..."` |
| Active, deadline extended or newly set | `job:verify --id N --outcome active --deadline-at 'YYYY-MM-DD 07:00:00' --apply --reason "..."`, then `job:act --id N --action renew --apply --reason "..."` (verify never lengthens `expires_at`; renew does, capped by the deadline) |
| Active, but `expires_at` is within 7 days | `job:verify ... active` then `job:act --id N --action renew ...` |
| Closed at source | `job:verify --id N --outcome closed --apply --reason "Job Bank returns 410: no longer advertised"` (this also closes the listing) |
| Cannot tell | `job:verify --id N --outcome unreachable --apply --reason "..."`; the listing stays up |

Also check **approved imports that are already past `expires_at` or `source_deadline_at`**. They
are hidden from the public site but still count in the database. Re-open each one: restore it
with verify-active plus renew if the employer extended it, otherwise verify it closed.

A job that has been `unreachable` in three consecutive runs is flagged in the report for the
owner. Do not close it on that basis alone.

## Step 3: add new jobs

Count live jobs per category from a fresh `wogo job:list --status approved --limit 1000` (live
means `status = approved` and `expires_at` in the future). Bring every category to **at least
2**, and aim for 6 to 10 where good postings exist. Categories: wine, agriculture, hospitality,
tourism, health, trades, tech, retail, education, transport, office, arts, labour, other.

### Required source-diversity pass

Do this on **every run**, even when every category already has two jobs. Read
[`JOB-SOURCES.md`](JOB-SOURCES.md), search at least four independent publishers, including
at least three employer-operated careers sites, and open individual postings before importing.
Rotate employers, communities and sectors; one large employer must not become the replacement
for a single dominant job board. Public search engines are discovery aids, not verification.

For new additions, aim for **at least half from outside Job Bank**, spanning **at least three
independent publishers** when suitable current postings are available. Count a publisher by
the organization responsible for the posting: two employers using Lever are independent;
Job Bank provincial subdomains and mirrors of one vacancy are not. If Job Bank exceeds 60%
of live sourced listings, prioritize verified non-Job-Bank additions over further Job Bank
top-ups. Never close a valid job, duplicate a role, mislabel its source, or lower verification
standards to hit a ratio. These are coverage goals, not quotas that justify invented jobs.

Record each publisher searched, its URL, when checked, candidates considered, accepted jobs,
and specific reasons for rejection or access failure in `source-search.json`. Report the
before/after live counts by publisher, Job Bank share, and distinct publishers among additions.
If the target cannot be met, identify the gap in `report.json.issues` and its summary. Do not
report an all-Job-Bank top-up as a completed diversity pass without the attempted-source evidence.
Put the detailed figures in `report.json.source_diversity`. Also include the before/after
concentration and any unmet target in `summary` and `issues`: the existing runner preserves
the raw report, but its console summary only carries the standard report fields.

Prefer the employer's exact application page as `source_url` and `apply_url` when it is
accessible and verified. Credit the actual publisher in `source_name` (for example,
`City of Kelowna careers`), not a generic label such as "public sources". ATS/API metadata
may corroborate an original posting date; a closing/start date or today's audit date cannot
replace it. If the contract requires a date the publisher does not disclose, skip the import
and report that limitation. Keep paraphrased summaries and material requirements accurate.

All newly added sources enter the **same Step 2 lifecycle on subsequent runs**: check the
original posting, carry forward verified deadline extensions, renew open jobs as needed,
close confirmed removals, and investigate unreachable pages. Do not fall back to importing
a Job Bank mirror just because the original employer page needs additional investigation.

### Job Bank as a supplementary source

Use Job Bank alongside the employer-source pass, particularly for uncovered categories.
Search by city with the `locationparam` id (the free-text location is ignored):

| City | id | City | id |
| --- | --- | --- | --- |
| Kelowna | 22342 | Oliver | 22695 |
| Vernon | 22365 | Keremeos | 39257 |
| Penticton | 22351 | Armstrong | 22326 |
| Summerland | 22713 | Enderby | 22336 |
| Peachland | 22708 | Salmon Arm | 22711 |
| Osoyoos | 22696 | Coldstream | 40052 |

```sh
curl -s 'https://www.jobbank.gc.ca/jobsearch/jobsearch?searchstring=&locationstring=Kelowna%2C+BC&locationparam=22342&sort=D' \
  -H 'User-Agent: Mozilla/5.0' | grep -o 'jobposting/[0-9]*' | sort -u
```

(`sort=D` lists the newest first, 25 per page. Put a keyword in `searchstring=cook` to narrow a
category. Checked on 2026-09-19.)
Employer careers pages, their public applicant-tracking systems, and independent regional
boards are the other required discovery channels; see `JOB-SOURCES.md`.

**Accept a posting only if** it is open now, in the region, posted or re-verified in the last 30
days, names a real employer, and has a working way to apply (the Job Bank page itself is a
valid apply link). Job Bank "licensed third-party" postings are acceptable when they name the
real employer; mention it in the description. Skip postings that charge applicants, recruit
for unnamed clients, or are commission-only sales.

**Avoid duplicates across sources:** compare the requisition number, application URL and
normalized (employer, title, city) against `before.json` and this run's candidates. A new board
ID or a second publisher is not by itself a new vacancy. Keep one live record for the same
role; investigate ambiguous matches. Do not change existing source keys to manufacture new
additions. A genuine new recruitment round must be supported by the employer's current page.

**Manifest (version 1).** One object per job:

```json
{
  "manifest_version": 1,
  "policy": {"max_source_age_days": 180},
  "jobs": [{
    "category_slug": "wine",
    "title": "Vineyard worker",
    "company": "Example Estate Winery Ltd",
    "location": "Lake Country",
    "job_type": "Seasonal",
    "pay": "$18.25 per hour",
    "description": "Your own 2 to 4 sentence summary of the posting.",
    "source_key": "jobbank:1234567",
    "source_name": "Job Bank",
    "source_url": "https://www.jobbank.gc.ca/jobsearch/jobposting/50300000",
    "apply_url": "https://www.jobbank.gc.ca/jobsearch/jobposting/50300000",
    "apply_email": "",
    "source_posted_at": "2026-09-22",
    "source_verified_at": "2026-09-24 16:20:00",
    "source_deadline_at": "2026-10-10 07:00:00",
    "source_status": "active",
    "status": "approved",
    "tier": "free"
  }]
}
```

`source_key` is `jobbank:{Job Bank number}` (the `#NNN` on the page, not the URL id),
`lever:okanagan:{uuid}` or `civicjobs:{id}`. It must be stable because it is how the next run
finds the job again. Use `ops/job-import.schema.json` for the full schema.

Always dry-run first, fix every problem, then apply:

```sh
wogo job:import --reason "Refresh run: dry run" < manifest.json
wogo job:import --apply --reason "Refresh run YYYY-MM-DD: N verified postings" < manifest.json
```

Through the VPS gate, the server fetches every `source_url` again and refuses the whole
manifest unless each page loads as a live posting and names the title and employer. If a job
is refused, check it; drop it or fix the title or company to match the page, and resubmit.

## Step 4: finish

```sh
wogo audit:jobs --fresh-days 5          # must report 0 errors
wogo job:export --status all --limit 5000 > after.json
```

Open https://wogopogo.ca/ and two or three new job pages to confirm they appear. Then write
the report, including source-diversity results and search limitations (the VPS run writes `report.json`; a human run writes a dated
`docs/MAINTENANCE-YYYY-MM-DD.md` with no private data).

## Automation on the VPS

The owner's VPS runs this runbook every five days with Claude Code, unattended. The service
code and installer live in the private ops repository (`crypto-frog/agent-ops`,
`wogopogo-refresh/`); results appear in Mission Control's **wogopogo.ca · refresh runs** panel.

- `wogopogo-refresh.timer` fires daily at 16:00 UTC; the runner works only when five
  days have passed since the last successful run. `sudo systemctl start wogopogo-refresh@now.service`
  runs one immediately.
- The service runs as the unprivileged user `wogo-refresh` with this repository checked out
  read-only, so **editing this file changes the next run**.
- Its only way into the website is one SSH key bound to `ops/refresh-gate.php` on the shared
  host. The gate allows reads, `job:verify`, `job:act` approve, reject, close and renew, and
  `job:import` (with the independent source check). It fixes the audit actor to
  `vps-refresh-agent`, exports every job before the first change of each day
  (`~/wogopogo_ops/exports/auto-before-YYYYMMDD.json`), caps changes at 150 per 24 hours and
  logs every call to `~/wogopogo_ops/refresh-gate-ledger.jsonl`.
- **Stop it at once:** `touch ~/wogopogo_ops/refresh-gate.disabled` on the shared host (every
  change is refused), or `sudo systemctl disable --now wogopogo-refresh.timer` on the VPS.
- **Undo a run:** every change is in `audit:list` with actor `vps-refresh-agent`. Restore a
  wrongly closed job with verify-active plus approve. Remove a bad import with `job:act close`.

## Command reference

Through the VPS gate (automated runs): `wogo COMMAND [--option value]`, with a manifest on stdin
for imports; the gate adds `--app-root` and `--actor`.

By hand, over SSH to the shared host:

```sh
WOGO_OPS="$HOME/wogopogo_ops/wogopogo.php"; WOGO_ROOT="$HOME/public_html/wogopogo_current"
php "$WOGO_OPS" job:list --app-root "$WOGO_ROOT" --status pending
php "$WOGO_OPS" job:verify --app-root "$WOGO_ROOT" --id 42 --outcome closed \
  --apply --actor agent-refresh-YYYYMMDD --reason "Job Bank returns 410"
php "$WOGO_OPS" job:import --app-root "$WOGO_ROOT" --file ~/wogopogo_ops/imports/refresh-YYYYMMDD.json \
  --apply --actor agent-refresh-YYYYMMDD --reason "Refresh run"
```

See `AI-OPERATIONS.md` for the full CLI contract and `docs/MAIL.md` for the review email.
