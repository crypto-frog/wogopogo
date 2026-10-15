# Source diversity and community-board update — October 15, 2026

The owner requested broader public sourcing and a refresh now, with the same approach carried
into recurring maintenance. The existing five-day VPS timer remains enabled. Its runner fetches
`main` and reads `docs/WEEKLY-REFRESH.md` at the beginning of every run; that runbook now requires
an independent-source pass even when category minimums are already met.

## Data results

A private timestamped export was saved outside the web root before mutations. All changes used
the private CLI and actor `agent:source-diversity-20261015`. Import schema validation and the
server dry run both passed before publication.

- **12 new imports**, **0 import updates**, **0 skips** (IDs 167–178).
- **77 existing imports verified active**; **1 confirmed expired source closed** (ID 102).
- **9 source deadlines updated**, **10 open roles renewed**; 2 previously expired listings
  returned to public visibility after their extended source deadlines were checked.
- **0 pending organic submissions**; 0 organic approvals or rejections.
- **89 live jobs after the run**, up from 75. Every category remains above the two-job minimum.
- Final `audit:jobs --fresh-days 1`: **0 errors, 0 warnings**.

## New source coverage

| Employer-operated publisher | New jobs | Locations |
| --- | ---: | --- |
| [City of Kelowna](https://careeropportunities.kelowna.ca/postings/search) | 3 | Kelowna |
| [Okanagan College](https://jobs.lever.co/okanagan) | 4 | Kelowna, Vernon, Salmon Arm |
| [Interior Health](https://jobs.interiorhealth.ca/) | 3 | Kelowna, Penticton, Vernon |
| [BGC Okanagan](https://bgcokanagan.bamboohr.com/careers) | 2 | Oliver, Armstrong |

All new jobs were checked on their original employer pages, paraphrased, attributed and linked
to the original application route. Original dates were preserved, including older postings
explicitly still open until filled. Pay periods absent from the source were not invented.
The individual source URLs were reopened after import. BGC postings were verified in a rendered
browser because their initial HTML is only an application shell.

Big White and YMCA careers pages were also examined. Their linked UKG portals require JavaScript;
the available initial HTML did not establish individual vacancies for this import. An Interior
Health role in Invermere was excluded as outside the supported region, and a flexible-location
recruitment role was set aside in favour of roles with explicit local worksites.

Live listings outside Job Bank increased from **5 to 17**. Counting provincial Job Bank domains
and its two existing display labels as one publisher, Job Bank still accounts for **72 of 89
live sourced jobs (80.9%)**, down from 70 of 75 (93.3%). This remains a coverage gap; future runs
prioritize other publishers. No valid job was removed to manufacture a better ratio.

## Recurring process and presentation

The runbook now requires searching at least four independent publishers, including three
employer-operated sites, with a target of at least half of additions outside Job Bank and at
least three independent publishers among additions when suitable jobs exist. It requires
source-search evidence, before/after concentration figures and explicit reporting of gaps.
Cross-posted copies and new board IDs alone no longer count as new vacancies. Deadline guidance
uses `America/Vancouver` conversions across daylight-saving changes.

`docs/JOB-SOURCES.md` records discovery starting points. Every imported source remains in the
same recurring verification, renewal and closure workflow; inaccessible pages are investigated
and reported rather than treated as closed.

The website update adds source names and last-check dates to cards, preserves original posting
age, explains the board's selection and verification process, and adds clear free-posting
invitations on the homepage and detail pages. Employer form copy explains direct applications
and the private management link. Private origin-control fields remain private.

The immediate refresh was performed directly by the maintainer. Starting an extra VPS service
instance requires the owner's local sudo authentication, which was unavailable in this session;
no extra service run was started and no schedule or privileges were changed.

## Release verification

Website commit `352921eb5bf66bd874feca8e4ce1af81f378b477` passed all GitHub quality checks:
React contracts and build, production dependency audit, PHP syntax, maintenance, refresh-gate,
API/CLI integration, cron integration, and publication safety. Nine frontend tests include
calendar-date coverage across time zones; original source dates no longer shift a day for
visitors west of UTC. Imported job pages no longer present the board's internal expiration
as the employer's application deadline.

The immutable release passed shared-host PHP lint, CLI status and server-render checks before
activation. The previous release was retained for rollback. Public health, metadata, homepage,
job detail, sitemap and new assets passed after activation. A rendered browser check confirmed
the 89-job total, new source attribution, correct original dates, search, application route and
free-posting entry points. The final production audit again reported zero errors and warnings.

The shared host's standalone refresh-gate test encountered its existing iconv/locale difference;
the same unchanged test passed in the release's supported GitHub PHP environment. The host's
Python 3.6 cannot run the integration harness; the full API/CLI and cron suites passed in CI.
