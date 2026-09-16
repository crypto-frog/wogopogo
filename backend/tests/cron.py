"""Run the actual scheduler wrapper with a minimal cron PATH and isolated fixtures."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
PHP = shutil.which(os.environ.get('WOGO_TEST_PHP', 'php'))
assert PHP, 'PHP CLI is required'
checks = 0

with tempfile.TemporaryDirectory(prefix='wogopogo-cron-') as temp:
    base = Path(temp)
    ops = base / 'wogopogo_ops'
    ops.mkdir()
    app = base / 'public_html/wogopogo_current/api'
    app.mkdir(parents=True)
    (app / 'notifications.php').touch()
    runner = ops / 'notify-submissions.sh'
    shutil.copyfile(ROOT / 'ops/notify-submissions.sh', runner)
    cli = ops / 'wogopogo.php'
    env = dict(os.environ, HOME=str(base), PATH='/usr/bin:/bin', WOGOPOGO_PHP_CLI=PHP)

    def run():
        return subprocess.run(['/bin/bash', str(runner)], env=env, capture_output=True, text=True)

    cli.write_text('<?php echo json_encode(["ok"=>true, "processed"=>0]);')
    assert run().returncode == 0
    receipt = ops / 'submission-notifier-latest.json'
    assert json.loads(receipt.read_text())['ok'] is True
    assert receipt.stat().st_mode & 0o077 == 0
    checks += 1

    # A CGI-like zero-exit response must never replace the last valid receipt.
    original = receipt.read_bytes()
    for body in ['Status: 404 Not Found', '{"ok":false}']:
        cli.write_text('<?php echo ' + repr(body) + ';')
        assert run().returncode == 1
        assert receipt.read_bytes() == original
        assert (ops / 'submission-notifier-error.txt').read_text() == body
        checks += 1

    bad_php = base / 'cgi-only'
    bad_php.write_text('#!/bin/sh\necho "CGI does not support -r"\nexit 1\n')
    bad_php.chmod(0o700)
    env['WOGOPOGO_PHP_CLI'] = str(bad_php)
    assert run().returncode == 1
    assert 'requires a PHP CLI' in (ops / 'submission-notifier-error.txt').read_text()
    assert receipt.read_bytes() == original
    checks += 1

    # Rolling back the application pauses the worker before invoking any transport.
    (app / 'notifications.php').unlink()
    assert run().returncode == 0
    assert receipt.read_bytes() == original
    checks += 1

print(f'{checks} cron wrapper checks passed')
