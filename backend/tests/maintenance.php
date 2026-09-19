<?php
/** Synthetic SQLite tests. No network or real mail transport is used. */
declare(strict_types=1);
require __DIR__ . '/../api/helpers.php';
require __DIR__ . '/../api/db.php';
require __DIR__ . '/../api/notifications.php';
$dir = sys_get_temp_dir() . '/wogo-maintenance-' . bin2hex(random_bytes(8));
mkdir($dir, 0700);
register_shutdown_function(static function () use ($dir): void {
    foreach (glob($dir . '/*') ?: [] as $file) { unlink($file); }
    @unlink($dir . '/.htaccess'); @rmdir($dir);
});
$cfg = ['db_driver' => 'sqlite', 'sqlite_path' => $dir . '/test.sqlite', 'seed_demo' => false,
        'job_lifetime_days' => 30, 'admin_key' => 'synthetic-admin-key-for-tests-only', 'submission_notifications' => ['enabled' => true,
        'to' => 'hello@wogopogo.ca', 'from' => 'hello@wogopogo.ca']];
$pdo = wogo_db($cfg);
$checks = 0;
function check(bool $ok, string $message): void {
    global $checks;
    if (!$ok) { throw new RuntimeException($message); }
    $checks++;
}
function job(PDO $pdo, array $cfg, string $title = 'Synthetic test role'): int {
    $pdo->beginTransaction();
    $pdo->prepare("INSERT INTO jobs (title,company,category_id,location,job_type,pay,description,apply_email,apply_url,status,tier,manage_hash,created_at,updated_at,expires_at)
        VALUES (?, 'Test employer', 1, 'Kelowna', 'Full-time', '', 'Synthetic test details, never published.', 'test@example.invalid', '', 'pending', 'free', ?, ?, ?, ?)")
        ->execute([$title, str_repeat('a', 64), wogo_now(), wogo_now(), wogo_job_expiry($cfg)]);
    $id = (int) $pdo->lastInsertId();
    wogo_notification_enqueue($pdo, $cfg, $id);
    $pdo->commit(); return $id;
}
function state(PDO $pdo, int $id): array {
    $q = $pdo->prepare('SELECT * FROM submission_notifications WHERE job_id = ?');
    $q->execute([$id]); return $q->fetch() ?: [];
}
check(wogo_schema_is_current($pdo), 'Version 4 schema installs');
wogo_init_schema($pdo, $cfg);
check(wogo_schema_is_current($pdo), 'Migration is idempotent');
$pdo->beginTransaction();
wogo_notification_enqueue($pdo, $cfg, 999);
$pdo->rollBack();
check(state($pdo, 999) === [], 'Rolled-back submissions cannot send mail');
try { wogo_notification_enqueue($pdo, $cfg, 999); check(false, 'Transaction required'); }
catch (LogicException $e) { check(true, 'Outbox shares transaction'); }
$id = job($pdo, $cfg, "Title\r\nBcc: intruder@example.invalid");
$calls = [];
$send = static function (array $message, array $config) use (&$calls, $pdo, $cfg): bool {
    $calls[] = $message;
    $nested = wogo_notification_send($pdo, $cfg, 10, 'test', 'Concurrent worker', static fn() => throw new RuntimeException('Duplicate delivery'));
    check($nested['processed'] === 0, 'Concurrent worker cannot reclaim sending row');
    return true;
};
wogo_notification_send($pdo, $cfg, 10, 'test', 'Synthetic acceptance', $send);
check(count($calls) === 1 && state($pdo, $id)['state'] === 'sent', 'One accepted delivery');
check(!str_contains($calls[0]['subject'], "\n") && !str_contains($calls[0]['subject'], 'intruder'), 'Submitter cannot inject headers');
check(str_contains($calls[0]['body'], '/admin?job=' . $id), 'Review link identifies job');
check(!str_contains($calls[0]['body'], str_repeat('a', 64)) && !str_contains($calls[0]['body'], 'manage_token'), 'No management capability in email');
wogo_notification_send($pdo, $cfg, 10, 'test', 'No replay', $send);
check(count($calls) === 1, 'Accepted email is not sent again');
$id = job($pdo, $cfg);
wogo_notification_send($pdo, $cfg, 10, 'test', 'Mail declined', static fn() => false);
check(state($pdo, $id)['state'] === 'pending' && state($pdo, $id)['available_at'] > wogo_now(), 'Explicit refusal backs off');
for ($i = 0; $i < 4; $i++) {
    $pdo->prepare('UPDATE submission_notifications SET available_at = ? WHERE job_id = ?')->execute([wogo_now(), $id]);
    wogo_notification_send($pdo, $cfg, 10, 'test', 'Bounded retries', static fn() => false);
}
check(state($pdo, $id)['state'] === 'failed' && (int) state($pdo, $id)['attempts'] === 5, 'Retry limit is finite');
$id = job($pdo, $cfg);
wogo_notification_send($pdo, $cfg, 10, 'test', 'Interrupted provider', static fn() => throw new RuntimeException('Private provider detail'));
check(state($pdo, $id)['state'] === 'unknown', 'Ambiguous delivery requires review');
check(state($pdo, $id)['last_error'] === 'handoff_exception', 'Private transport exception is not logged');
$result = wogo_notification_send($pdo, $cfg, 10, 'test', 'No blind retry', static fn() => true);
check($result['processed'] === 0, 'Unknown email never retries automatically');
$id = job($pdo, $cfg);
$pdo->prepare("UPDATE submission_notifications SET state = 'sending', started_at = '2000-01-01 00:00:00' WHERE job_id = ?")->execute([$id]);
wogo_notification_send($pdo, $cfg, 10, 'test', 'Crash recovery', static fn() => true);
check(state($pdo, $id)['state'] === 'unknown', 'Stale handoff is held');
foreach (['approved', 'deleted', 'imported'] as $case) {
    $id = job($pdo, $cfg);
    if ($case === 'deleted') { $pdo->prepare('DELETE FROM jobs WHERE id = ?')->execute([$id]); }
    elseif ($case === 'imported') { $pdo->prepare("UPDATE jobs SET managed_origin = 'agent-import', source_key = ? WHERE id = ?")->execute(['test:' . $id, $id]); }
    else { $pdo->prepare("UPDATE jobs SET status = 'approved' WHERE id = ?")->execute([$id]); }
    wogo_notification_send($pdo, $cfg, 10, 'test', 'No stale review notice', static fn() => throw new RuntimeException('Unexpected send'));
    check(state($pdo, $id)['state'] === 'cancelled', 'Skip ' . $case . ' record');
}
$disabled = $cfg; $disabled['submission_notifications']['enabled'] = false;
$id = job($pdo, $disabled);
check(state($pdo, $id) === [], 'Disabled integration enqueues nothing');
check(wogo_notification_send($pdo, $disabled, 10, 'test', 'Disabled')['processed'] === 0, 'Disabled worker sends nothing');
$deadline = gmdate('Y-m-d H:i:s', time() + 3600);
check(wogo_job_expiry($cfg, ['source_deadline_at' => $deadline]) === $deadline, 'Source deadline caps public expiry');
$past = '2000-01-01 00:00:00';
check(wogo_job_expiry($cfg, ['source_deadline_at' => $past]) === $past, 'Renewal cannot resurrect expired source');
check(wogo_job_expiry($cfg) > $deadline, 'Undated jobs keep normal lifetime');
$before = (int) $pdo->query('SELECT COUNT(*) FROM jobs')->fetchColumn();
wogo_init_schema($pdo, $cfg);
check((int) $pdo->query('SELECT COUNT(*) FROM jobs')->fetchColumn() === $before, 'Migration preserves existing jobs');

// ---- One-click review links and the branded email (2026-09-19) ---------------------------
$rid = job($pdo, $cfg, 'Role <script>alert(1)</script> & co');
$msg = wogo_notification_message(wogo_review_job($pdo, $rid), $cfg);
check(str_contains($msg['body'], 'https://wogopogo.ca/api/review?t=' . $rid . '.'), 'Plain text carries the signed review link');
check(str_contains($msg['body'], '/admin?job=' . $rid), 'Plain text keeps the admin link');
check(str_contains($msg['html'], 'Review &amp; approve') && str_contains($msg['html'], '#aab8d2'), 'HTML email is branded with a review button');
check(!str_contains($msg['html'], '<script>alert') && str_contains($msg['html'], '&lt;script&gt;'), 'Submitted text is escaped in the HTML email');
check(!str_contains($msg['html'], 'synthetic-admin-key') && !str_contains($msg['body'], 'synthetic-admin-key'), 'Admin key never appears in email');
preg_match('/t=([0-9A-Za-z._-]+)/', $msg['body'], $m); $token = $m[1];
check(wogo_review_check($cfg, $token) === [$rid, ''], 'A fresh token names its listing');
check(wogo_review_check($cfg, substr($token, 0, -1) . (substr($token, -1) === 'A' ? 'B' : 'A'))[1] !== '', 'A tampered token is refused');
[$tid, $texp, $tsig] = explode('.', $token);
check(wogo_review_check($cfg, ($rid + 1) . '.' . $texp . '.' . $tsig)[1] !== '', 'A token cannot be moved to another listing');
check(wogo_review_check($cfg, wogo_review_token($cfg, $rid, time() - 20 * 86400))[1] !== '', 'An old token has expired');
$other = $cfg; $other['admin_key'] = 'a-different-admin-key-for-tests';
check(wogo_review_check($other, $token)[1] !== '', 'Changing the admin key revokes old links');
check(wogo_review_decide($pdo, $cfg, wogo_review_job($pdo, $rid), 'approve', 'looks real') === 'approved', 'Approve from the review page');
$row = wogo_review_job($pdo, $rid);
check($row['status'] === 'approved' && $row['expires_at'] > wogo_now(), 'Approval publishes with a fresh lifetime');
$audit = $pdo->prepare("SELECT actor, action, reason FROM ops_audit WHERE entity_id = ? ORDER BY id DESC LIMIT 1"); $audit->execute([$rid]); $a = $audit->fetch();
check($a && $a['actor'] === 'owner-email-link' && $a['action'] === 'job.approve' && str_contains($a['reason'], 'looks real'), 'Decision is in the audit trail');
check(wogo_review_decide($pdo, $cfg, $row, 'reject', '') === 'unchanged', 'A decided listing cannot be decided again');
$rej = job($pdo, $cfg, 'Second synthetic role');
check(wogo_review_decide($pdo, $cfg, wogo_review_job($pdo, $rej), 'reject', '') === 'rejected' && wogo_review_job($pdo, $rej)['status'] === 'rejected', 'Reject from the review page');
$imp = job($pdo, $cfg, 'Imported synthetic role');
$pdo->prepare("UPDATE jobs SET managed_origin = 'agent-import', source_key = 'test:1' WHERE id = ?")->execute([$imp]);
check(wogo_review_decide($pdo, $cfg, wogo_review_job($pdo, $imp), 'approve', '') === 'unchanged', 'Imported listings are never approved through a link');
$nokey = $cfg; unset($nokey['admin_key']);
check(str_contains(wogo_notification_message(wogo_review_job($pdo, $rej), $nokey)['body'], '/admin?job=' . $rej), 'Without an admin key the email still sends with the admin link');
echo json_encode(['passed' => $checks, 'real_emails' => 0]) . PHP_EOL;
