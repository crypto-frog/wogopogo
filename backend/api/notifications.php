<?php
/** Transactional submission outbox. Only the private CLI delivers mail. */
declare(strict_types=1);

require_once __DIR__ . '/review.php';

function wogo_notification_enqueue(PDO $pdo, array $cfg, int $jobId): void
{
    if (empty($cfg['submission_notifications']['enabled'])) {
        return;
    }
    if (!$pdo->inTransaction()) {
        throw new LogicException('Submission notifications must share the job transaction.');
    }
    $pdo->prepare('INSERT INTO submission_notifications (job_id, state, attempts, available_at, started_at, sent_at, last_error, created_at)
                   VALUES (?, ?, 0, ?, ?, ?, ?, ?)')
        ->execute([$jobId, 'pending', wogo_now(), '', '', '', wogo_now()]);
}

function wogo_notification_message(array $job, array $cfg = []): array
{
    $id = (int) $job['id'];
    // Owner request 2026-09-19: a branded HTML email with a one-click review link. The link is
    // signed for this one listing (review.php); the admin key and manage tokens are never emailed.
    try {
        $review = $cfg ? wogo_review_url($cfg, $id) : 'https://wogopogo.ca/admin?job=' . $id;
    } catch (RuntimeException $e) {
        $review = 'https://wogopogo.ca/admin?job=' . $id; // no admin key configured: the admin screen still works
    }
    // Submitter content belongs only in the body, never mail headers.
    $body = "A new Wogopogo listing needs review.\n\n"
        . "Review and approve: " . $review . "\n"
        . "The link opens a page where you press Approve or Reject. Opening it changes nothing.\n"
        . "Admin screen: https://wogopogo.ca/admin?job=" . $id . "\n\n";
    foreach (['id' => 'Listing', 'title' => 'Title', 'company' => 'Employer',
              'cat_name' => 'Category', 'location' => 'Location', 'job_type' => 'Type',
              'pay' => 'Pay', 'apply_email' => 'Application email', 'apply_url' => 'Application link',
              'created_at' => 'Submitted (UTC)', 'description' => 'Description'] as $key => $label) {
        $value = str_replace(["\r\n", "\r", "\0"], ["\n", "\n", ''], (string) ($job[$key] ?? ''));
        $body .= $label . ": " . ($value === '' ? 'Not provided' : $value) . "\n\n";
    }
    $body .= "Submitted details are unverified. Review the employer, role and application route before approval.\n";
    $clean = array_map(static fn ($v) => is_string($v) ? str_replace("\0", '', $v) : $v, $job);
    return ['subject' => "[Wogopogo] Listing #$id awaiting review", 'body' => $body,
            'html' => wogo_review_email_html($clean, $review),
            'message_id' => "<wogopogo-submission-$id@wogopogo.ca>"];
}

/** True means local mail-system acceptance, not confirmed inbox delivery. */
function wogo_notification_transport(array $message, array $cfg): bool
{
    $mail = $cfg['submission_notifications'] ?? [];
    foreach (['to', 'from'] as $key) {
        if (($mail[$key] ?? '') !== 'hello@wogopogo.ca') {
            throw new RuntimeException('Notification address is not the configured owner contact.');
        }
    }
    $headers = ['From' => 'Wogopogo <hello@wogopogo.ca>', 'MIME-Version' => '1.0',
                'Message-ID' => $message['message_id'], 'Auto-Submitted' => 'auto-generated'];
    $body = $message['body'];
    if (!empty($message['html'])) {
        // multipart/alternative: plain text first for text-only clients, the branded HTML preferred.
        $boundary = 'wogo-' . bin2hex(random_bytes(12));
        $headers['Content-Type'] = 'multipart/alternative; boundary="' . $boundary . '"';
        $body = "This is a multi-part message in MIME format.\r\n\r\n"
            . "--$boundary\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
            . chunk_split(base64_encode($message['body'])) . "\r\n"
            . "--$boundary\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
            . chunk_split(base64_encode($message['html'])) . "\r\n--$boundary--\r\n";
    } else {
        $headers['Content-Type'] = 'text/plain; charset=UTF-8';
        $headers['Content-Transfer-Encoding'] = '8bit';
    }
    return mail($mail['to'], $message['subject'], $body, $headers, '-fhello@wogopogo.ca');
}

function wogo_notification_status(PDO $pdo): array
{
    $rows = $pdo->query('SELECT state, COUNT(*) AS total FROM submission_notifications GROUP BY state')->fetchAll();
    $counts = [];
    foreach ($rows as $row) {
        $counts[$row['state']] = (int) $row['total'];
    }
    return $counts;
}

function wogo_notification_send(PDO $pdo, array $cfg, int $limit, string $actor, string $reason, ?callable $transport = null): array
{
    if (empty($cfg['submission_notifications']['enabled'])) {
        return ['enabled' => false, 'processed' => 0];
    }
    $transport ??= 'wogo_notification_transport';
    $now = wogo_now();
    // A crash after handoff can have delivered mail. Never retry that ambiguity.
    $stale = gmdate('Y-m-d H:i:s', time() - 600);
    $pdo->prepare("UPDATE submission_notifications SET state = 'unknown', last_error = 'interrupted_handoff'
                   WHERE state = 'sending' AND started_at < ?")->execute([$stale]);
    $limit = max(1, min(50, $limit));
    $stmt = $pdo->prepare("SELECT job_id FROM submission_notifications
                           WHERE state = 'pending' AND available_at <= ? ORDER BY job_id LIMIT $limit");
    $stmt->execute([$now]);
    $processed = [];
    foreach ($stmt->fetchAll() as $item) {
        $id = (int) $item['job_id'];
        // Competing workers can see a candidate, but only one claims its delivery.
        $claim = $pdo->prepare("UPDATE submission_notifications SET state = 'sending', started_at = ?, attempts = attempts + 1
                                WHERE job_id = ? AND state = 'pending' AND available_at <= ?");
        $claim->execute([$now, $id, $now]);
        if ($claim->rowCount() !== 1) {
            continue;
        }
        $query = $pdo->prepare('SELECT j.*, c.name AS cat_name FROM jobs j JOIN categories c ON c.id = j.category_id WHERE j.id = ?');
        $query->execute([$id]);
        $job = $query->fetch();
        $attempt = $pdo->prepare('SELECT attempts FROM submission_notifications WHERE job_id = ?');
        $attempt->execute([$id]);
        $attempts = (int) $attempt->fetchColumn();
        $state = 'cancelled'; $error = ''; $sentAt = ''; $available = $now;
        if ($job && $job['status'] === 'pending' && $job['managed_origin'] === 'public' && empty($job['source_key'])) {
            try {
                if ($transport(wogo_notification_message($job, $cfg), $cfg)) {
                    $state = 'sent'; $sentAt = wogo_now();
                } else {
                    $state = $attempts >= 5 ? 'failed' : 'pending';
                    $error = 'mail_not_accepted';
                    $available = gmdate('Y-m-d H:i:s', time() + [60, 300, 1800, 7200, 21600][min(4, $attempts - 1)]);
                }
            } catch (Throwable $e) {
                $state = 'unknown'; $error = 'handoff_exception';
            }
        }
        $pdo->beginTransaction();
        $pdo->prepare('UPDATE submission_notifications SET state = ?, available_at = ?, sent_at = ?, last_error = ? WHERE job_id = ?')
            ->execute([$state, $available, $sentAt, $error, $id]);
        wogo_audit($pdo, $actor, 'notification.' . $state, 'job', $id, '', $reason,
            [], ['state' => $state, 'attempts' => $attempts, 'error' => $error]);
        $pdo->commit();
        $processed[] = ['id' => $id, 'state' => $state];
    }
    return ['enabled' => true, 'processed' => count($processed), 'results' => $processed,
            'counts' => wogo_notification_status($pdo)];
}
