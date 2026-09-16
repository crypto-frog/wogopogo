# Maintenance · September 16, 2026 UTC

Owner request: review all existing sources, add three new jobs per category, moderate
pending submissions, connect Zoho contact mail and email new submissions for review.

## Source and moderation review

- Baseline: 70 approved imported jobs, no organic submissions awaiting moderation.
- 21 original Job Bank pages returned HTTP 410 and explicitly said the posting was
  no longer advertised. All 21 were closed through the audited private CLI.
- 48 other original pages were accessible and current; verified deadlines were
  recorded as UTC closing instants through schema 4.
- One original Workopolis page (listing 15, AI Solutions Specialist) blocks access
  with HTTP 403. Matching recent listings exist elsewhere, but this is not sufficient
  to mark its original source verified. Retain it with an unreachable-source warning,
  pending a fresh original-source check; access blocking is not proof of closure.
- Full database and record exports were retained privately before changes.

## Closed imported listings

| Listing | Role | Employer | Original source |
| --- | --- | --- | --- |
| 35 | Cook - Ethnic Foods | Dosa Crepe Cafe | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50213719) |
| 40 | Farm Supervisor | Beant S Chahal and Chandeep K Chahal | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50178025) |
| 41 | Fruit Farm Worker | Sandhar Farms Ltd. | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50146676) |
| 42 | Registered Nurse | Yarrow Limited Partnership | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50103056) |
| 45 | Electrician | Hot Wire Electric Ltd. | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50171408) |
| 48 | Network System Administrator | Box And Lid Inc. | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50208234) |
| 50 | Electronics Technician | Unitec Canada Fruit and Vegetables Technology Inc. | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50054992) |
| 52 | Sales Supervisor | RobotHouse | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50163029) |
| 57 | Class 1 Truck Driver | Northern Cherries Inc. | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50169324) |
| 60 | Office Administrator | Vernon Alliance Church | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50192973) |
| 62 | Administrative Officer | RobotHouse | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50163037) |
| 2 | Vineyard Worker | Stag's Hollow Winery | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50192328) |
| 3 | Vineyard Worker | Adega on 45th Estate Winery | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50065856) |
| 8 | Greenhouse Worker | SAGE Greenhouses | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50179225) |
| 11 | Licensed Practical Nurse | WeBookCare | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50160527) |
| 13 | Roofer | Brownboy Metal and Roofing Ltd | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50178794) |
| 21 | Truck Driver | CM Linden Trucking Ltd | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50145449) |
| 22 | Medical Office Assistant | Amani Travel Health Clinics | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50176550) |
| 25 | Printing Machine Operator | Dittos Office Services | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50169331) |
| 28 | Security Guard | Blackbird Security Inc. | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50157115) |
| 29 | Animal Control Officer | Penticton Animal Care and Control | [Source](https://www.jobbank.gc.ca/jobsearch/jobposting/50130126) |

## New import · 42 roles

Three new source keys in each of the 14 categories, with no existing keys reused.
Original pages were opened during this audit; descriptions are paraphrased. All
dated opportunities have future deadlines. Undated employer pages remain subject
to the normal 30-day lifetime and regular source review. Some farm roles recruit
now for a 2027 start; these dates are explicit in their summaries.

| Category | Role | Employer | Posted | Source |
| --- | --- | --- | --- | --- |
| agriculture | Farm worker, fruit | Ajmer Singh Sandhu | 2026-09-15 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50294617) |
| agriculture | Farm worker, fruit | Brar Brothers Farming | 2026-09-15 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50292756) |
| agriculture | Farm supervisor | Brarstar Orchards LTD | 2026-09-14 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50285213) |
| arts | Marketing assistant | V-CAN Engineering Inc. | 2026-07-15 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/49908774) |
| arts | Marketing specialist | Vividus Design Inc. | 2026-05-26 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/49591726) |
| arts | Marketing Coordinator (14-month term) | MAKR Group | 2026-09-08 | [Original](https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?client=WPGroup&ccId=19000101_000001&cid=61491ef4-a31f-4eb8-98b4-d8cff67e9197&jobId=602879&lang=en_CA&source=CC2) |
| education | Early childhood educator (ECE) assistant | Two Peas in a Pod Childcare Centre Inc | 2026-09-11 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50267275) |
| education | Early childhood educator (ECE) | Kelowna Early Explorers Academy | 2026-07-31 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/49987243) |
| education | Early childhood educator (ECE) | Presidential Kids Academy | 2026-07-24 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/49957328) |
| health | Pharmacy assistant | PHARMASAVE #242 | 2026-09-15 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50294266) |
| health | Licensed practical nurse (L.P.N.) | Galaxy Human Resources Inc | 2026-09-09 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50253537) |
| health | Registered nurse (R.N.) | Galaxy Human Resources Inc | 2026-09-04 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50226161) |
| hospitality | Cook | Rosalinda's Filipino Kitchen Ltd. | 2026-09-15 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50295024) |
| hospitality | Cook | MR MIKES Steakhouse Casual | 2026-09-15 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50293884) |
| hospitality | Cook | Kasai Teppanyaki Steak & Sushi House Ltd | 2026-09-11 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50268713) |
| labour | Cannabis processing labourer | DEALR Cannabis Inc | 2026-09-15 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50293441) |
| labour | Roofing labourer | Pinnacle Roofing Ltd | 2026-09-14 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50284774) |
| labour | Construction helper | Hotzies Contracting Ltd. | 2026-09-11 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50267287) |
| office | Office supervisor | Mco dentures inc | 2026-09-14 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50285233) |
| office | Administrative assistant | Your dollar store with more | 2026-08-24 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50146205) |
| office | Office services coordinator | PB03 LOGISTICS | 2026-08-21 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50127309) |
| other | Security officer | Vadium Security | 2026-06-16 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/49731958) |
| other | Supervisor, security guards | Intercept Services of Surveillance(ISS) Security Ltd | 2026-08-27 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50168834) |
| other | Bylaw Enforcement Officer (9-month term) | City of Penticton | 2026-09-15 | [Original](https://www.civicjobs.ca/jobs?id=116127) |
| retail | Assistant manager - retail | Black Bear Mini Mart | 2026-09-15 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50294251) |
| retail | Delicatessen department manager - retail | VALOROSO FOODS | 2026-09-11 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50269088) |
| retail | Footwear salesperson - retail | Erhard's Orthopedics Ltd | 2026-09-15 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50292176) |
| tech | Web technician | Box And Lid Inc. | 2026-09-10 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50262440) |
| tech | Junior Data Technologist | Kal Tire | 2026-09-09 | [Original](https://jobs.jobvite.com/kaltire/job/oTSLAfwQ) |
| tech | Senior Data Technologist | Kal Tire | 2026-09-09 | [Original](https://jobs.jobvite.com/kaltire/job/o7RLAfw3) |
| tourism | Front desk supervisor | Coast Oliver Hotel | 2026-08-11 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50057837) |
| tourism | Program Area Leader – Recreation (Casual) | BGC Okanagan | 2026-09-10 | [Original](https://bgcokanagan.bamboohr.com/careers/1080) |
| tourism | Program Area Leader – Recreation | BGC Okanagan | 2026-09-10 | [Original](https://bgcokanagan.bamboohr.com/careers/1081) |
| trades | Carpenter | P3S Constructions Inc. | 2026-09-10 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50261711) |
| trades | Carpenter | UP26 construction ltd | 2026-09-04 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50225525) |
| trades | Carpenter | IK ONKAR ENTERPRISE LTD. | 2026-09-04 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50224099) |
| transport | Shipper-receiver | Varsteel Ltd. | 2026-09-15 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50292809) |
| transport | Delivery driver | Mander Distributors Inc. | 2026-09-14 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50286014) |
| transport | Class 1 truck driver | CM Linden Trucking Ltd | 2026-09-08 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50242773) |
| wine | Vineyard worker | Dirty Laundry Vineyard | 2026-09-14 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50286549) |
| wine | Vineyard worker | Fitzpatrick Family Vineyards | 2026-09-11 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50267714) |
| wine | Vineyard worker | La Frenz Estate Winery Ltd | 2026-09-11 | [Original](https://www.jobbank.gc.ca/jobsearch/jobposting/50267251) |

## Code and validation

Version 1.4.3 is live. This maintenance release adds transactional owner notifications, a protected review link, source
deadline caps, themed contact links and a mobile form overflow fix. The database
migration is additive; mail bodies and management credentials stay outside GitHub.

- 25 outbox/deadline checks and 31 real API/CLI integration checks pass.
- Five cron-environment checks, five frontend contract tests and the production build pass.
- 30 Chromium/Firefox checks cover desktop/mobile contact, forms and review links.
- PHP syntax, public-configuration safety and project-page validation pass.
- [GitHub Quality checks for the deployed revision](https://github.com/crypto-frog/wogopogo/actions/runs/35056426428) completed successfully.
- Mail change 051 passed 55 checks and is installed with the frozen broker preserved.

## Completed changes

- Imported **42 new records**, three new source keys in each of the 14 categories:
  42 creates, zero updates and zero skips. New listing IDs are 72–113.
  Public live count at 04:44 UTC: 91 (before the four local-midnight expirations).
- All 42 original URLs were reopened after publication. Job Bank identities and
  closing dates matched; JavaScript-dependent employer details were also checked.
- Existing review: 21 closures, 48 active verifications, one unreachable original.
  Date-only deadlines expire at the next midnight in America/Vancouver; explicitly
  timed deadlines retain their actual closing instant. Four existing listings close
  at September 16, 07:00 UTC, not earlier during the local September 15 evening.
- Organic moderation: no genuine pending submissions; zero approvals, rejections or
  suspicious submissions. The controlled mail test is separate from this count.
- Contact link appears in the themed footer and server-rendered pages.
- Zoho owner inbox received the complete automatic review notification for controlled
  pending listing 114. The public form, transaction outbox, actual minute scheduler,
  Bluehost transport and Zoho Inbox were exercised. The test was never published
  and was closed through the audited CLI after delivery verification. Final pending
  organic queue: zero; notification outbox: one accepted, none pending or uncertain.
- Fifteen public checks passed on the final release: health, metadata, listings,
  sitemap, home/post/admin, hydrated contact, job schema, exact asset hashes, privacy,
  closed-listing HTTP 410 and truthful source-unreachable wording.

## Deployment and recovery

- Live application revision: `afe1f63bd0f47c3637cf1223f57d4404549b616c` (v1.4.3).
- Active symlink: `~/public_html/wogopogo_current` →
  `~/wogopogo_releases/wogopogo-20260916-v1.4.3-afe1f63`.
- Final private archive SHA-256:
  `1d43208ccf47bef8e1b41bde8d99674b0760a14807375e6bcc8e7c7bd5d62777`.
- 33 archive files verified; exact host PHP passed 25 synthetic checks. Server-only
  configuration was preserved except for enabling the requested notification route.
- Prior v1.4.2 and original v1.4.0 release directories remain for rollback. Application
  rollback is an atomic symlink switch; retain the corrected private CLI and runner
  when using schema-4 releases. A pre-outbox rollback pauses the runner automatically.
  Do not restore an old database snapshot over the new listings or live submissions.
- Full pre-change database/export backups and deployment receipts are private under
  `~/wogopogo_backups/review-20260916` and `~/wogopogo_ops/releases/`.
- One minute cron entry was added; both pre-existing unrelated jobs were preserved.
  cPanel adds its own jailshell declarations and blank lines. Compare job lines when
  checking its normalized output. Latest worker receipts live outside the web root.

## Mail verification and follow-up

Read [MAIL.md](MAIL.md). Change 051 is installed, preserving the frozen broker, existing
mail, limits and expiry. Zoho domain ownership, alias, Canadian MX and 2048-bit DKIM
signing are verified. The combined Bluehost/Zoho SPF record and monitoring DMARC are
published; Bluehost Remote routing is verified through authenticated cPanel.

One review email, `[Wogopogo] Listing #114 awaiting review`, arrived in **Zoho Inbox**
at September 16, 04:40 UTC. Its complete body and authenticated admin review URL were
checked. No applicant replies or extra tests were sent. Never replay this test without
checking its durable outbox and inbox history. Raw messages and receipts stay private.

The first automated form attempt was rejected by host ModSecurity before creating a
record: its headless-browser identification triggered the host filter. The same real
form with normal browser identification succeeded. No firewall settings were changed.
The first cron run selected CGI PHP from the minimal PATH; v1.4.3 explicitly selects
and verifies PHP CLI and validates JSON success before replacing the success receipt.
Regression tests cover both failures and rollback pausing.

At completion, some public DNS edges still return older MX/SPF records; Zoho's SPF
verification badge remains pending propagation. Actual Inbox delivery passed. Recheck
SPF after DNS converges; do not add a second SPF record or replace unrelated mail
settings. The only listing audit warning is original-source access blocking for job 15.
