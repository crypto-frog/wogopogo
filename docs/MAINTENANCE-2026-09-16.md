# Maintenance · September 16, 2026 UTC

Owner request: review all existing sources, add three new jobs per category, moderate
pending submissions, connect Zoho contact mail and email new submissions for review.

## Source and moderation review

- Baseline: 70 approved imported jobs, no organic submissions awaiting moderation.
- 21 original Job Bank pages returned HTTP 410 and explicitly said the posting was
  no longer advertised. All 21 were closed through the audited private CLI.
- 48 other original pages were accessible and current; verified deadlines are being
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

Version 1.4.1 adds transactional owner notifications, a protected review link, source
deadline caps, themed contact links and a mobile form overflow fix. The database
migration is additive; mail bodies and management credentials stay outside GitHub.

- 25 outbox/deadline checks and 31 real API/CLI integration checks pass.
- Five frontend contract tests and the production build pass.
- 30 Chromium/Firefox checks cover desktop/mobile contact, forms and review links.
- PHP syntax, public-configuration safety and project-page validation pass.
- Mail change 051 passed 55 checks and is installed with the frozen broker preserved.

## Activation

Prepared and tested. Production website activation, import and actual notification
delivery verification are pending; update this section from their receipts.
