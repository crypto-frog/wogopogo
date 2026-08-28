# Installing Wogopogo on Bluehost

This guide takes you from the zip file to a live site on Bluehost shared hosting. No command line is needed on the server. Everything happens in cPanel.

Time needed: about 20 to 30 minutes.

## What you need before starting

- A Bluehost account with a domain pointed at it (for example wogopogo.ca)
- The `deploy/` folder from this project (it contains the built site plus the API)
- A password manager or safe place to store two secrets you are about to create: the MySQL password and the admin key
- A verified, restorable backup if the destination already contains any website or database

## Step 1: Set the PHP version

1. Log in to Bluehost and open cPanel (Advanced section).
2. Find "MultiPHP Manager".
3. Select your domain, choose a supported PHP 8.2 or newer release, and click Apply.

The API uses modern PHP and will not run correctly on PHP 7.

## Step 2: Create the MySQL database

1. In cPanel, open "MySQL Databases".
2. Under Create New Database, enter a name like `wogopogo` and click Create Database.
   - Bluehost prefixes names with your cPanel username, so the real name will look like `myuser_wogopogo`. Note the full name.
3. Scroll to MySQL Users, create a user like `wogouser` with a strong generated password. Note the full username (`myuser_wogouser`) and the password.
4. Scroll to Add User To Database, pick the user and the database, click Add, then check ALL PRIVILEGES and click Make Changes.

You now have three values: database name, database user, database password. The host is `localhost` on Bluehost.

## Step 3: Configure the API

Create a private deployment copy of `deploy/` outside the repository, or edit the server-only configuration after upload. Do not place production values in the Git working tree. In that private copy, open `api/config.php` and change these lines:

```php
'db_driver' => 'mysql',        // was 'sqlite'

'mysql' => [
    'host'    => 'localhost',
    'name'    => 'myuser_wogopogo',   // your full database name
    'user'    => 'myuser_wogouser',   // your full database user
    'pass'    => 'your-db-password',
    'charset' => 'utf8mb4',
],

'admin_key' => 'paste-a-long-random-string-here',
```

The admin key is the password for the moderation panel at `/admin`. It must be at least 20 characters; make it long and random. On Mac or Linux you can generate one with:

```
openssl rand -hex 24
```

On Windows, a long random passphrase from your password manager is fine. While the key is left at the default `change-me`, the admin panel stays disabled on purpose, so this step is required.

Never commit, attach to an issue, or share the configured file. The repository safety check intentionally fails if the committed template contains non-template values.

Optional settings in the same file, safe to leave as they are:

- `require_approval` (true): new posts wait for your approval before going public
- `job_lifetime_days` (30): listings expire after this many days
- `rate_limit` (5 per hour, 15 per day per IP): posting limits
- `locations` and `job_types`: edit these arrays to change the dropdowns
- `seed_demo` (true): creates sample jobs only during local SQLite testing. It is intentionally ignored on Bluehost/MySQL, so the production board starts clean.

## Step 4: Upload the files

1. In cPanel, open "File Manager".
2. Click Settings (top right) and enable "Show Hidden Files (dotfiles)". This matters, because the site depends on two `.htaccess` files.
3. Navigate to `public_html` (or the subfolder for your addon domain).
4. Verify that this is the document root for the intended domain. If it contains files, export the associated database and archive the complete directory outside the public root before changing anything. Do not alter an unrelated or shared website.
5. For a new, verified installation only, move any placeholder file into the private backup rather than deleting it.
6. On your computer, compress the CONTENTS of the private deployment copy into a zip. You want `index.html`, `.htaccess`, `assets`, `api`, `job.php`, `sitemap.php`, `favicon.svg`, `robots.txt`, and `llms.txt` at the top level of the zip, not nested inside a `deploy` folder.
7. In File Manager, click Upload, upload that zip into the verified document root, go back, right click the zip, choose Extract, then remove the uploaded archive after successful verification.
8. Confirm you can see `.htaccess` in the document root and another one inside `api/`. If they are missing, hidden files are not shown or the zip was built without them.

## Step 5: Verify

1. Visit `https://yourdomain.com/api/health` in a browser. You should see JSON like:

```json
{"ok":true,"driver":"mysql","admin_key_is_set":true,"time_utc":"..."}
```

   The database tables are created automatically on this first request.
2. Visit `https://yourdomain.com`. The board should load. Production starts without sample jobs.
3. Click "Post a job", submit a test listing, and save the manage token it gives you.
4. Visit `https://yourdomain.com/admin`, unlock with your admin key, and approve the test post from the Pending tab.
5. Confirm the post now appears on the home page, then delete it from the admin panel if you like.
6. Visit `https://yourdomain.com/sitemap.xml`. It should display XML containing the homepage and the approved test job.

If all six checks pass, you are live.

## Google Search Console and AI search

1. Add and verify the `wogopogo.ca` Domain property in Google Search Console using its DNS TXT record.
2. Open Sitemaps and submit `sitemap.xml`.
3. Inspect the homepage and one approved `/job/{id}` URL, then request indexing.
4. Test an approved job page in Google's Rich Results Test and confirm that a `JobPosting` item is detected.

The sitemap contains the homepage, the public posting page, and every approved, unexpired job. A new board with no active listings therefore reports two discovered pages. Private `/admin` and `/manage` utilities are deliberately excluded.

`robots.txt` explicitly permits OAI-SearchBot, ChatGPT-User, PerplexityBot, and Perplexity-User on public pages. If Google Search Console reports “Couldn’t fetch,” or AI search crawlers receive a Cloudflare challenge, the application files are not the cause: configure Cloudflare to allow verified Google crawlers and the official crawler IP ranges. Verify IP addresses as well as user-agent names; a user-agent string alone can be spoofed.

## Updating the site later

Frontend changes (design, text, pages):

1. Run `npm run build` in the `frontend` folder.
2. Upload the contents of `frontend/dist/` to `public_html`, replacing matching files. This includes `index.html`, `post.html`, `404.html`, `assets/`, `robots.txt`, `llms.txt`, and the favicon. Deleting the old `assets` folder first keeps things tidy, since built filenames change with every build.

Backend changes: upload the changed file from `backend/api/` into `public_html/api/`. Never overwrite your live `config.php` with the one from the zip, since the live one holds your real credentials.

Search-rendering changes: upload the corresponding `job.php`, `sitemap.php`, `robots.txt`, `llms.txt`, and root `.htaccess` files from `deploy/`. The sitemap uses the existing API configuration and database; it does not have separate credentials.

Your data lives in MySQL, so replacing files never touches the jobs.

## Installing in a subfolder instead of the root

The build assumes the site lives at the domain root. If you want it at `yourdomain.com/jobs/` instead:

1. In `frontend/vite.config.js`, add `base: '/jobs/'` to the config.
2. In `frontend/src/App.jsx`, change the router to `<BrowserRouter basename="/jobs">`.
3. Rebuild, and upload everything to `public_html/jobs/` instead.

## Troubleshooting

Page refresh on a job page gives a 404
: The root `.htaccess` is missing or was not extracted. Re-check Step 4, item 7.

`/api/health` returns a 500 error or a blank page
: Almost always wrong MySQL credentials in `config.php`, or an unsupported PHP version. Check Bluehost's PHP error log for the underlying message.

`/api/health` says `"admin_key_is_set": false`
: You are still on the default admin key. Edit `config.php` on the server (File Manager has a built-in editor) and set a real key.

The site loads but looks completely unstyled or blank
: The `assets` folder did not upload, or the site is in a subfolder without the base-path changes above. Open the browser console; 404s on `/assets/...` confirm it.

Posting a job says "Too many posts from your network"
: The rate limiter is working. Limits are in `config.php`.

## Security checklist before you share the link

- [ ] Admin key changed from `change-me` to a long random value
- [ ] HTTPS works (Bluehost provides free SSL under cPanel, Security, SSL/TLS Status). Once it does, open the root `.htaccess` and remove the `#` from the two rewrite lines under “force HTTPS” to redirect all traffic to HTTPS.
- [ ] `require_approval` is true, so nothing goes public without you seeing it
- [ ] cPanel backups are enabled (cPanel, Files, Backup), so the database is recoverable
- [ ] If you want advertising inquiries, add your real contact or pricing link in the footer. No placeholder address is displayed by default.
