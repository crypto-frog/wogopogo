# Maintenance · September 19, 2026 UTC

Owner request: add at least two real, verified jobs per category; approve pending job requests
unless there is an issue; email every new job request to hello@wogopogo.ca in the Wogopogo
style with one-click approval; take down jobs whose deadline has passed or that are gone at
source; and document the next review, removal and addition run. That run is now automated
every five days: see [WEEKLY-REFRESH.md](WEEKLY-REFRESH.md).

## Result

- **113 live jobs** (from 91), **28 closed**, `audit:jobs`: 0 errors, 0 warnings.
- Live per category: Arts & Media 8 · Education & Childcare 10 · Everything Else 8 ·
  General Labour 8 · Health & Wellness 8 · Hospitality & Food 9 · Office & Admin 7 ·
  Orchards & Agriculture 6 · Retail & Sales 8 · Tech & Digital 8 · Tourism & Recreation 10 ·
  Trades & Construction 8 · Transport & Logistics 8 · Wine & Cideries 7.
- **Organic job requests:** none were pending, so none needed approval. Two operator test
  listings (143, 144) were used to prove the new email end to end and were rejected through
  the email's own Reject button.
- Private exports of every job and the audit log were taken before any change and are kept
  outside the repository.

## Deadlines and removals: what went wrong and how it was fixed

17 listings had a recorded source deadline in the past, and all 17 were first closed on that
basis. Re-opening every source afterwards showed that **11 had been extended by the employer**
and were still advertised. Those 11 were restored the same hour, with the new deadline
recorded (`job:verify active --deadline-at`, then `job:act approve`):

| Listing | Role | Employer | New deadline (UTC) |
| --- | --- | --- | --- |
| 12 | Drywall Installer | Skystar Drywall Ltd. | 2026-09-30 07:00 · [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50194070) |
| 24 | Marketing Coordinator | ACON ACADEMY | 2026-09-30 07:00 · [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50153805) |
| 30 | Vineyard Worker | Nighthawk Vineyards | 2026-10-01 07:00 · [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/49969463) |
| 33 | Cook | The Kelowna Indian Eatery | 2026-10-01 07:00 · [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50218612) |
| 34 | Second Cook | Playtime Casino Kelowna | 2026-10-01 07:00 · [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50208243) |
| 38 | Front Desk Manager | Sparkling Hill Resort | 2026-10-01 07:00 · [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50011488) |
| 39 | Farm Supervisor | Northern Cherries Inc. | 2026-09-25 07:00 · [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50217991) |
| 59 | Delivery Truck Driver | Grewal Logistics Ltd. | 2026-09-30 07:00 · [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50054971) |
| 64 | Marketing Project Manager | Jbenedict Cleaning Services | 2026-10-01 07:00 · [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50008592) |
| 69 | Security Officer | Paladin Security | 2026-10-02 07:00 · [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50171429) |
| 82 | Registered nurse (R.N.) | Galaxy Human Resources Inc | 2026-10-03 07:00 · [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50226161) |

The other 6 were confirmed gone at source (Job Bank HTTP 410, "no longer advertised") and are
closed with `job:verify --outcome closed`:

| Listing | Role | Employer | Original source |
| --- | --- | --- | --- |
| 9 | Fruit Farm Labourer | TBA Farms Ltd. | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50169853) |
| 31 | Vineyard Worker | Bench 1775 Winery | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50222923) |
| 53 | Assistant Store Manager | Edsa Mini Mart | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50208238) |
| 63 | Graphic Designer and Layout Artist | Jafa Signs Ltd. | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50218291) |
| 67 | General Manufacturing Labourer | DekSmart Railings Ltd. | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50208819) |
| 68 | Metal Fabrication Worker | Reidco Metal Industries Ltd. | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50157121) |

**Rule adopted:** a recorded deadline is a reason to look, never a reason to close. Every
closure must follow a fresh read of the source. The runbook and the automated run enforce this.

All other live imported listings were re-verified at source during the run.

## New verified listings (28)

Every posting below was opened at its source on 2026-09-19, is in the region, and was imported
with its own short description (no copied text). Job Bank "licensed third-party" postings
(Super 8 Salmon Arm, Jumping Jack and Pitter Patter ECE) name the real employer and say so in
the listing. The RDOS posting's CivicJobs page blocks automated reads, so it was verified
through its Job Bank mirror and keeps the CivicJobs application link.

| Listing | Category | Role | Employer | Where | Source |
| --- | --- | --- | --- | --- | --- |
| 115 | Wine & Cideries | Vineyard worker | Intrigue Wines Ltd | Lake Country | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50307861) |
| 116 | Wine & Cideries | Vineyard worker | SUBA FARM | Oliver | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50237058) |
| 117 | Orchards & Agriculture | Farm manager | Jealous Fruits Ltd. | Kelowna | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50308322) |
| 118 | Orchards & Agriculture | Dairy farm foreman | Seeland Dairy Ltd | Enderby | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50300112) |
| 119 | Hospitality & Food | Head chef | Wok Inn Restaurant | Kelowna | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50280519) |
| 120 | Hospitality & Food | Cook | Tree To Me Organics Partnership | Keremeos | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50301328) |
| 121 | Tourism & Recreation | Slot supervisor | Cascades Casino Penticton | Penticton | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50317181) |
| 122 | Tourism & Recreation | Front desk manager, hotel | Super8 Salmon Arm | Salmon Arm | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50302916) |
| 123 | Health & Wellness | Pharmacy assistant | Astral IDA Pharmacy | Vernon | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50260056) |
| 124 | Health & Wellness | Client care attendant | Comfort Keepers | Armstrong | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50267257) |
| 125 | Trades & Construction | Automotive mechanic | Kelowna Toyota | Kelowna | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50284831) |
| 126 | Trades & Construction | Carpenter | GS 10 Construction | Vernon | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50316730) |
| 127 | Tech & Digital | Design engineer | Multi-Power Products | Kelowna | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50318479) |
| 128 | Retail & Sales | Retail sales associate | Wearabouts Clothing co. | Vernon | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50253555) |
| 129 | Retail & Sales | Sales advisor | James Tirecraft - TruckPro | Kelowna | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50285238) |
| 130 | Education & Childcare | Early childhood educator (ECE) | Jumping Jack Childcare | Kelowna | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50302897) |
| 131 | Education & Childcare | Early childhood educator (ECE) | Pitter Patter Learning Centres | Penticton | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/49818301) |
| 132 | Transport & Logistics | Class 1 truck driver | RSD Trucking Service | Vernon | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50301739) |
| 133 | Transport & Logistics | Receiving supervisor | OKANAGAN SUNSHINE FRUIT PACKER LTD. | Kelowna | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50301744) |
| 134 | Office & Admin | Accounting clerk | V-CAN Engineering Inc. | Vernon | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50169316) |
| 135 | Office & Admin | Human resources manager | DEALR Cannabis Inc | Salmon Arm | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50293448) |
| 136 | General Labour | General labourer | OKANAGAN SUNSHINE FRUIT PACKER LTD. | Kelowna | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50301747) |
| 137 | General Labour | Landscape worker | United Landscapes | Kelowna | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50267317) |
| 138 | Everything Else | Hairstylist | Spruce Salon | Lake Country | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50262424) |
| 139 | Everything Else | Nail care technician | Vernon City Nails | Vernon | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50245383) |
| 140 | Arts & Media | Audiovisual Technical Specialist | Regional District of Okanagan-Similkameen | Penticton | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50317987) |
| 141 | Arts & Media | Digital Content Creator (student assistant) | Okanagan College | Kelowna | [Source](https://jobs.lever.co/okanagan/9006694d-d29a-4774-aa30-9e1ab57c9e50) |
| 142 | Tech & Digital | Programmer/Analyst, Web Developer (on-call) | Okanagan College | Kelowna | [Source](https://jobs.lever.co/okanagan/0a678af6-8f3a-4043-8248-af6a3860404f) |

## Code released: 1.5.0 and 1.5.1

- Each public job request now emails hello@wogopogo.ca as a branded HTML message (plain text
  kept) with **Review & approve** and **Open in admin** buttons. Review & approve opens a signed,
  single-listing page; opening it changes nothing, and Approve or Reject on the page records the
  decision in the audit trail as `owner-email-link`. See [MAIL.md](MAIL.md).
- 1.5.1 switched the email to a light card under a charcoal header after Zoho's dark mode washed
  out the dark design. Checked in Zoho webmail on 2026-09-19.
- Tests: `backend/tests/maintenance.php` 42 checks, `backend/tests/integration.py` 38 checks.
- Live release: `wogopogo-20260919-v1.5.1-9cdd042`; the previous two releases are kept for rollback.

## Automation added

`ops/refresh-gate.php` and [WEEKLY-REFRESH.md](WEEKLY-REFRESH.md): the owner's VPS runs this
review every five days with Claude Code through a restricted gate that cannot delete, feature
or change configuration, and that refuses any import whose source page does not name the job.
Tested on 2026-09-19: 107 of the 113 live listings pass the gate's independent source check;
the 6 that do not are on JavaScript-only employer pages or CivicJobs, so imports from those
sites fail closed and need a Job Bank mirror.
