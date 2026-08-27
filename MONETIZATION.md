# Monetization hooks in Wogopogo

The board is free for everyone right now, and it should stay free to browse and free to post while it builds trust and traffic. Nothing below changes that. These are the hooks already wired into the code so that turning on revenue later is a small step, not a rebuild.

## 1. Featured listings (works today, manually)

Every job has a `tier` of either `free` or `featured`. Featured jobs get a gold "Featured" badge, a gold card border, and they pin to the top of every listing page.

How to feature a job today:

1. Open `/admin` and unlock with your admin key.
2. Find the job in the Live tab and click "Feature". Click "Unfeature" to undo.

This means you can sell featured placement right now with nothing but an e-transfer and a minute in the admin panel. A reasonable early offer: 20 to 40 dollars to pin a listing for its 30-day lifetime.

The future automated version: add a Stripe Checkout link on the post-success page ("Make this listing featured for $X"), and a tiny PHP webhook that flips the job's tier to `featured` when payment succeeds. The data model and the display layer are already done, so that upgrade touches only the payment step.

Config switch: `featured_enabled` in `backend/api/config.php` hides all featured styling if you ever want it off.

## 2. Ad slots (built in, switched off)

There are two ad placements already rendered in the layout:

- Home page, between the filters and the job list (`slot="home"`)
- Job detail page, under the apply card (`slot="detail"`)

They render nothing at all until you flip the master switch, so today they are invisible and cost nothing.

To turn ads on:

1. Open `frontend/index.html` and change `window.WOGO_ADS_ENABLED = false` to `true`.
2. Open `frontend/src/components/AdSlot.jsx` and paste your ad network snippet (AdSense or similar) where the placeholder comment says so. The `slot` prop tells you which placement is rendering, so the two spots can serve different units.
3. Rebuild (`npm run build`) and upload the new build.

A note on fit: a local board this size usually earns more from featured listings and direct local sponsors than from programmatic ads, and ads cost you visual credibility. Consider leaving them off until traffic justifies them.

## 3. The Advertise link

The footer deliberately shows no advertising contact until you configure a real one; production should never display a placeholder address. Add an “Advertise” link in `frontend/src/components/Footer.jsx` when you have a dedicated email address or pricing page. It can then double as the contact point for featured-listing sales.

## 4. Ideas that fit later, no code written yet

- Employer packs: 5 featured listings for a flat price, tracked manually at first
- A weekly email digest of new jobs, with one sponsor slot at the top
- A "local business directory" page sold as annual flat-fee listings

## Where everything lives, in one place

| Hook | File |
| --- | --- |
| Featured tier logic and ordering | `backend/api/index.php`, `backend/api/db.php` |
| Feature/unfeature buttons | `frontend/src/pages/Admin.jsx` |
| Featured badge and gold styling | `frontend/src/components/JobCard.jsx`, `frontend/src/styles.css` |
| `featured_enabled` switch | `backend/api/config.php` |
| Ad master switch | `frontend/index.html` |
| Ad slot component and placements | `frontend/src/components/AdSlot.jsx`, used in `Home.jsx` and `JobDetail.jsx` |
| Advertise contact link | `frontend/src/components/Footer.jsx` |
