"""Exercise the real API and private CLI against a synthetic database and fake MTA."""
import datetime
import json
import os
from pathlib import Path
import shutil
import socket
import sqlite3
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
PHP = os.environ.get('WOGO_TEST_PHP', 'php')
checks = 0


def check(condition, message):
    global checks
    if not condition:
        raise AssertionError(message)
    checks += 1


with tempfile.TemporaryDirectory(prefix='wogopogo-integration-') as temporary:
    base = Path(temporary)
    app = base / 'app'
    shutil.copytree(ROOT / 'backend/api', app / 'api')
    capture = base / 'mail.txt'
    sender = base / 'sendmail'
    sender.write_text('#!/bin/sh\ncat >> ' + str(capture) + '\n')
    sender.chmod(0o700)
    (app / 'api/config.local.php').write_text("<?php return " + "['db_driver'=>'sqlite', 'sqlite_path'=>" + repr(str(base / 'jobs.sqlite')) + ", 'seed_demo'=>false, 'admin_key'=>'synthetic-admin-key-for-tests-only', 'submission_notifications'=>['enabled'=>true]];")

    def cli(command, *args, expected=0):
        result = subprocess.run([PHP, '-d', 'sendmail_path=' + str(sender), str(ROOT / 'ops/wogopogo.php'), command,
                                 '--app-root', str(app), *args], capture_output=True, text=True)
        check(result.returncode == expected, command + ': ' + result.stderr + result.stdout)
        return json.loads(result.stdout)

    cli('status')
    con = sqlite3.connect(base / 'jobs.sqlite')
    # Recreate the old schema boundary, keeping all original tables and records.
    con.execute('DROP TABLE submission_notifications')
    con.execute('ALTER TABLE jobs DROP COLUMN source_deadline_at')
    con.execute("UPDATE app_meta SET meta_value='3' WHERE meta_key='schema_version'")
    con.commit()
    check(cli('status')['schema_version'] == 4, 'Version 3 upgrades through normal CLI startup')
    check(con.execute('SELECT COUNT(*) FROM categories').fetchone()[0] == 14, 'Migration preserves taxonomy')

    router = base / 'router.php'
    router.write_text("<?php require " + repr(str(app / 'api/index.php')) + ';')
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    log = (base / 'server.log').open('w')
    server = subprocess.Popen([PHP, '-S', f'127.0.0.1:{port}', str(router)], stdout=log, stderr=log)

    def request(path, data=None, admin=False):
        headers = {'Content-Type': 'application/json'}
        if admin:
            headers['X-Admin-Key'] = 'synthetic-admin-key-for-tests-only'
        req = urllib.request.Request(f'http://127.0.0.1:{port}/api/' + path,
                                     None if data is None else json.dumps(data).encode(), headers)
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                return response.status, json.loads(response.read())
        except urllib.error.HTTPError as error:
            return error.code, json.loads(error.read())

    try:
        for _ in range(50):
            try:
                if request('health')[0] == 200:
                    break
            except OSError:
                time.sleep(.05)
        else:
            raise AssertionError('Local server did not start')
        payload = dict(title='Synthetic review role', company='Fixture Employer', category_id=1,
                       location='Kelowna', job_type='Full-time', pay='',
                       description='Synthetic test listing used only in this isolated temporary database.',
                       apply_email='fixture@example.invalid', apply_url='')
        status, result = request('jobs', payload)
        check(status == 201 and result['status'] == 'pending', 'Public submission waits for moderation')
        job_id = result['id']
        check(con.execute('SELECT state FROM submission_notifications WHERE job_id=?', (job_id,)).fetchone()[0] == 'pending', 'API atomically queues owner review email')
        check(not capture.exists(), 'Public request never invokes mail transport')
        check(request('jobs/' + str(job_id))[0] == 404, 'Pending submission is private')
        check(request('admin/jobs')[0] == 401, 'Review API needs admin authentication')
        status, invalid = request('jobs', dict(payload, title=''))
        check(status == 422 and con.execute('SELECT COUNT(*) FROM submission_notifications').fetchone()[0] == 1, 'Invalid submission creates no email')
        write = ['--apply', '--actor', 'test:integration', '--reason', 'Synthetic isolated verification']
        cli('notification:send', *write)
        email = capture.read_text()
        from email import message_from_string, policy as email_policy
        import re as re_lib
        parsed = message_from_string(email[email.find('To:'):] if 'To:' in email else email, policy=email_policy.default)
        parts = {part.get_content_type(): part.get_content() for part in parsed.walk() if part.get_content_type() in ('text/plain', 'text/html')}
        text, html_part = parts.get('text/plain', ''), parts.get('text/html', '')
        decoded = email + text + html_part
        check('hello@wogopogo.ca' in email and f'/admin?job={job_id}' in text and 'Fixture Employer' in text, 'Actual transport creates complete owner review message')
        check('multipart/alternative' in email and 'Review &amp; approve' in html_part and 'Fixture Employer' in html_part, 'Owner email includes the branded HTML version')
        review = re_lib.search(r'https://wogopogo\.ca/api/(review\?t=[0-9A-Za-z._-]+)', text)
        check(review is not None, 'Owner email carries a signed one-click review link')
        check(result.get('manage_token', 'not-present') not in decoded and 'synthetic-admin-key-for-tests-only' not in decoded, 'Email does not contain access credentials')
        cli('notification:send', *write)
        check(capture.read_text() == email, 'Repeated scheduled drain does not duplicate mail')
        page = urllib.request.urlopen(f'http://127.0.0.1:{port}/api/' + review.group(1), timeout=5)
        body = page.read().decode()
        check(page.status == 200 and 'Approve &amp; publish' in body and 'Fixture Employer' in body, 'Review link opens the listing with Approve and Reject')
        check(request('jobs/' + str(job_id))[0] == 404, 'Opening the review link does not approve (mail scanners are harmless)')
        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, *args, **kwargs): return None
        form = urllib.parse.urlencode({'t': review.group(1).split('t=', 1)[1], 'decision': 'approve', 'note': 'fixture approved'}).encode()
        try:
            urllib.request.build_opener(NoRedirect).open(urllib.request.Request(f'http://127.0.0.1:{port}/api/review', form), timeout=5)
            posted = 0
        except urllib.error.HTTPError as error:
            posted = error.code
        check(posted == 303, 'Pressing Approve records the decision and redirects')
        check(request('jobs/' + str(job_id))[0] == 200, 'The approved listing is public')
        forged = urllib.parse.urlencode({'t': '1.9999999999.' + 'A' * 32, 'decision': 'approve'}).encode()
        try:
            urllib.request.urlopen(urllib.request.Request(f'http://127.0.0.1:{port}/api/review', forged), timeout=5); forged_code = 200
        except urllib.error.HTTPError as error:
            forged_code = error.code
        check(forged_code == 404, 'A forged review token is refused')
        check(request('admin/jobs/' + str(job_id), {'action': 'approve'}, True)[0] == 200, 'Authenticated owner can approve emailed listing')
        public = request('jobs/' + str(job_id))[1]
        check('source_key' not in json.dumps(public) and 'manage_hash' not in json.dumps(public), 'Public response excludes operational identifiers')
        now = datetime.datetime.now(datetime.timezone.utc)
        deadline = (now + datetime.timedelta(hours=1)).strftime('%Y-%m-%d %H:%M:%S')
        imported = dict(source_key='synthetic:deadline', source_name='Fixture source', source_url='https://example.invalid/job',
                        source_posted_at=now.strftime('%Y-%m-%d'), source_verified_at=now.strftime('%Y-%m-%d %H:%M:%S'),
                        source_deadline_at=deadline, source_status='active', status='approved', tier='free',
                        category_slug='wine', title='Synthetic sourced role', company='Fixture Source', location='Kelowna',
                        job_type='Full-time', pay='', description=payload['description'], apply_url='https://example.invalid/job')
        manifest = base / 'manifest.json'
        manifest.write_text(json.dumps({'manifest_version': 1, 'jobs': [imported]}))
        cli('job:import', '--file', str(manifest))
        check(con.execute("SELECT COUNT(*) FROM jobs WHERE source_key='synthetic:deadline'").fetchone()[0] == 0, 'Import dry run creates nothing')
        check(cli('job:import', '--file', str(manifest), *write)['created'] == 1, 'Source import succeeds')
        row = con.execute("SELECT id,expires_at FROM jobs WHERE source_key='synthetic:deadline'").fetchone()
        check(row[1] == deadline, 'Import uses source closing instant')
        check(cli('job:import', '--file', str(manifest), *write)['skipped'] == 1, 'Import is idempotent')
        imported.pop('source_deadline_at')
        manifest.write_text(json.dumps({'manifest_version': 1, 'jobs': [imported]}))
        cli('job:import', '--file', str(manifest), '--update-existing', *write)
        check(con.execute('SELECT source_deadline_at FROM jobs WHERE id=?', (row[0],)).fetchone()[0] == deadline,
              'An older manifest cannot silently erase a verified deadline')
        check(con.execute('SELECT COUNT(*) FROM submission_notifications').fetchone()[0] == 1, 'Imports do not email owner')
        con.execute("UPDATE jobs SET source_deadline_at='2000-01-01 00:00:00', expires_at='2000-01-01 00:00:00' WHERE id=?", (row[0],))
        con.commit()
        cli('job:act', '--id', str(row[0]), '--action', 'renew', *write)
        request('admin/jobs/' + str(row[0]), {'action': 'approve'}, True)
        check(request('jobs/' + str(row[0]))[0] == 404, 'Neither CLI renewal nor admin approval resurrects expired source')
        check(cli('audit:jobs')['ok'], 'Historical expiry is normal lifecycle, not a false audit error')
    finally:
        server.terminate()
        server.wait(timeout=5)
        log.close()
        con.close()
print(json.dumps({'passed': checks, 'real_emails': 0}))
