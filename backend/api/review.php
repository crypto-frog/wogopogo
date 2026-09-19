<?php
/**
 * One-click owner review of public job submissions (owner request, 2026-09-19).
 *
 * The notification email carries a signed link for exactly one pending listing. Opening it
 * shows the full listing in Wogopogo style with Approve and Reject buttons; only a button
 * press (POST) changes anything, because mail scanners open every link in an email. The
 * token names one job and an expiry, is HMAC-signed with a key derived from the server-only
 * admin key (which is never emailed), expires after REVIEW_LINK_DAYS and is inert once the
 * listing is no longer a pending public submission. Decisions use the same update and
 * audit trail as the admin panel, with actor `owner-email-link`.
 */
declare(strict_types=1);

const REVIEW_LINK_DAYS = 14;

function wogo_review_secret(array $cfg): string
{
    $explicit = (string) ($cfg['review_link_secret'] ?? '');
    if (strlen($explicit) >= 32) {
        return $explicit;
    }
    $admin = (string) ($cfg['admin_key'] ?? '');
    if ($admin === '' || $admin === 'change-me' || strlen($admin) < 20) {
        throw new RuntimeException('Review links need a configured admin key.');
    }
    return hash('sha256', 'wogopogo-review-link-v1|' . $admin, true);
}

function wogo_b64url(string $raw): string
{
    return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
}

function wogo_review_token(array $cfg, int $jobId, ?int $now = null): string
{
    $expires = ($now ?? time()) + REVIEW_LINK_DAYS * 86400;
    $body = $jobId . '.' . $expires;
    return $body . '.' . wogo_b64url(substr(hash_hmac('sha256', 'review|' . $body, wogo_review_secret($cfg), true), 0, 24));
}

function wogo_review_url(array $cfg, int $jobId): string
{
    return 'https://wogopogo.ca/api/review?t=' . wogo_review_token($cfg, $jobId);
}

/** [jobId, problem]: problem is '' when the token may act on a job. */
function wogo_review_check(array $cfg, string $token, ?int $now = null): array
{
    if (!preg_match('/^(\d{1,10})\.(\d{9,11})\.([A-Za-z0-9_-]{32})$/', $token, $m)) {
        return [0, 'This review link is not valid.'];
    }
    $good = wogo_b64url(substr(hash_hmac('sha256', 'review|' . $m[1] . '.' . $m[2], wogo_review_secret($cfg), true), 0, 24));
    if (!hash_equals($good, $m[3])) {
        return [0, 'This review link is not valid.'];
    }
    if ((int) $m[2] < ($now ?? time())) {
        return [(int) $m[1], 'This review link has expired. Use the admin screen to review the listing.'];
    }
    return [(int) $m[1], ''];
}

function wogo_review_job(PDO $pdo, int $jobId): ?array
{
    $q = $pdo->prepare('SELECT j.*, c.name AS cat_name, c.emoji AS cat_emoji FROM jobs j JOIN categories c ON c.id = j.category_id WHERE j.id = ?');
    $q->execute([$jobId]);
    return $q->fetch() ?: null;
}

/** Approve or reject exactly like the admin panel, with its own audit actor. */
function wogo_review_decide(PDO $pdo, array $cfg, array $job, string $decision, string $note): string
{
    if ($job['status'] !== 'pending' || ($job['managed_origin'] ?? 'public') !== 'public' || !empty($job['source_key'])) {
        return 'unchanged';
    }
    $now = wogo_now();
    $pdo->beginTransaction();
    if ($decision === 'approve') {
        $pdo->prepare("UPDATE jobs SET status = 'approved', expires_at = ?, updated_at = ? WHERE id = ? AND status = 'pending'")
            ->execute([wogo_job_expiry($cfg, $job), $now, (int) $job['id']]);
    } else {
        $pdo->prepare("UPDATE jobs SET status = 'rejected', updated_at = ? WHERE id = ? AND status = 'pending'")
            ->execute([$now, (int) $job['id']]);
    }
    $after = wogo_review_job($pdo, (int) $job['id']) ?: [];
    $reason = 'Owner decision from the review email' . ($note !== '' ? ': ' . mb_substr($note, 0, 440) : ''); // ops_audit.reason is VARCHAR(500)
    wogo_audit($pdo, 'owner-email-link', 'job.' . $decision, 'job', (int) $job['id'], '', $reason,
        wogo_audit_job($job), wogo_audit_job($after));
    $pdo->commit();
    return $decision === 'approve' ? 'approved' : 'rejected';
}

function wogo_h(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** The fields shown for a submission, in reading order. */
function wogo_review_fields(array $job): array
{
    return [
        'Employer' => $job['company'] ?? '', 'Category' => trim(($job['cat_emoji'] ?? '') . ' ' . ($job['cat_name'] ?? '')),
        'Location' => $job['location'] ?? '', 'Type' => $job['job_type'] ?? '', 'Pay' => $job['pay'] ?? '',
        'Apply by email' => $job['apply_email'] ?? '', 'Apply online' => $job['apply_url'] ?? '',
        'Submitted (UTC)' => $job['created_at'] ?? '', 'Listing' => '#' . (int) ($job['id'] ?? 0),
    ];
}

// ---- The Wogopogo look: charcoal, slate accent, bold sans, mono details -------------
const WOGO_INK = '#e8eaee', WOGO_BG = '#16181c', WOGO_CARD = '#1f2227', WOGO_LINE = '#33373f',
      WOGO_DIM = '#9aa1ad', WOGO_ACCENT = '#aab8d2', WOGO_ACCENT_INK = '#101318';
const WOGO_FONT = "'Manrope','Segoe UI',system-ui,-apple-system,'Helvetica Neue',Arial,sans-serif";
const WOGO_MONO = "ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace";
const WOGO_MARK = '<svg width="34" height="16" viewBox="0 0 34 16" aria-hidden="true"><path d="M2 12c3-6 6-6 8 0M11 12c3-6 6-6 8 0M20 12c2-8 7-9 9-5" fill="none" stroke="#aab8d2" stroke-width="2.4" stroke-linecap="round"/><circle cx="30" cy="5" r="2.2" fill="#aab8d2"/></svg>';

// The email uses a light card under a charcoal Wogopogo header. Mail clients (Zoho included)
// recolour dark emails unpredictably in dark mode; a light body stays crisp everywhere.
const MAIL_BG = '#eef0f3', MAIL_HEAD = '#16181c', MAIL_CARD = '#ffffff', MAIL_INK = '#16181c', MAIL_DIM = '#5b6270',
      MAIL_LINE = '#dde1e6', MAIL_ACCENT = '#2f4a78', MAIL_SOFT = '#f5f6f8';

/** Email HTML: tables and inline styles only, so Zoho, Gmail and phones render it alike. */
function wogo_review_email_html(array $job, string $reviewUrl): string
{
    $rows = '';
    foreach (wogo_review_fields($job) as $label => $value) {
        $shown = $value === '' ? '<span style="color:' . MAIL_DIM . '">Not provided</span>' : nl2br(wogo_h($value));
        $rows .= '<tr><td style="width:130px;padding:8px 14px 8px 0;font:12px/1.5 ' . WOGO_MONO . ';color:' . MAIL_DIM . ';vertical-align:top;white-space:nowrap;border-bottom:1px solid ' . MAIL_LINE . '">' . wogo_h($label)
            . '</td><td style="padding:8px 0;font:14px/1.5 ' . WOGO_FONT . ';color:' . MAIL_INK . ';vertical-align:top;border-bottom:1px solid ' . MAIL_LINE . '">' . $shown . '</td></tr>';
    }
    $desc = nl2br(wogo_h((string) ($job['description'] ?? '')));
    $button = static fn (string $label, string $url, bool $primary): string =>
        '<a href="' . wogo_h($url) . '" style="display:inline-block;padding:13px 24px;margin:4px 8px 4px 0;border-radius:10px;font:700 15px/1.2 ' . WOGO_FONT . ';text-decoration:none;border:2px solid ' . MAIL_ACCENT . ';'
        . ($primary ? 'background:' . MAIL_ACCENT . ';color:#ffffff;' : 'background:#ffffff;color:' . MAIL_ACCENT . ';') . '">' . $label . '</a>';
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>New listing to review</title></head>'
        . '<body style="margin:0;padding:0;background:' . MAIL_BG . '">'
        . '<div style="display:none;max-height:0;overflow:hidden">' . wogo_h($job['title'] . ' at ' . $job['company'] . ' is waiting for your approval.') . '</div>'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' . MAIL_BG . '"><tr><td align="center" style="padding:26px 12px">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px">'
        . '<tr><td style="background:' . MAIL_HEAD . ';border-radius:16px 16px 0 0;padding:18px 24px"><table role="presentation" width="100%"><tr>'
        . '<td style="font:800 20px/1 ' . WOGO_FONT . ';color:#ffffff">' . WOGO_MARK . '&nbsp; Wogopogo</td>'
        . '<td align="right" style="font:11px/1 ' . WOGO_MONO . ';letter-spacing:.14em;color:#aab8d2">NEW LISTING TO REVIEW</td></tr></table></td></tr>'
        . '<tr><td style="background:' . MAIL_CARD . ';border:1px solid ' . MAIL_LINE . ';border-top:0;border-radius:0 0 16px 16px;padding:26px 24px 22px">'
        . '<div style="font:11px/1.4 ' . WOGO_MONO . ';letter-spacing:.14em;color:' . MAIL_DIM . '">OKANAGAN VALLEY · FREE JOB BOARD</div>'
        . '<div style="font:800 26px/1.2 ' . WOGO_FONT . ';color:' . MAIL_INK . ';margin:10px 0 4px">' . wogo_h($job['title']) . '</div>'
        . '<div style="font:15px/1.5 ' . WOGO_FONT . ';color:' . MAIL_DIM . ';margin-bottom:16px">' . wogo_h($job['company']) . ' · ' . wogo_h($job['location']) . '</div>'
        . '<div style="margin:6px 0 18px">' . $button('Review &amp; approve', $reviewUrl, true) . $button('Open in admin', 'https://wogopogo.ca/admin?job=' . (int) $job['id'], false) . '</div>'
        . '<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid ' . MAIL_LINE . '">' . $rows . '</table>'
        . '<div style="font:12px/1.5 ' . WOGO_MONO . ';color:' . MAIL_DIM . ';margin:18px 0 8px">DESCRIPTION</div>'
        . '<div style="font:15px/1.65 ' . WOGO_FONT . ';color:' . MAIL_INK . ';background:' . MAIL_SOFT . ';border:1px solid ' . MAIL_LINE . ';border-radius:12px;padding:14px 16px">' . $desc . '</div>'
        . '<div style="font:13px/1.6 ' . WOGO_FONT . ';color:' . MAIL_DIM . ';margin-top:18px">Submitted details are unverified. Check that the employer is real, the role is in the Okanagan and the application route works before approving.</div>'
        . '</td></tr><tr><td style="padding:16px 8px 0;font:12px/1.6 ' . WOGO_FONT . ';color:' . MAIL_DIM . '">'
        . 'Review &amp; approve opens a page on wogopogo.ca where you press Approve or Reject; opening the email or the link changes nothing. The link works for this one listing for ' . REVIEW_LINK_DAYS . ' days. Please do not forward this email.'
        . '</td></tr></table></td></tr></table></body></html>';
}

/** The page behind the link. */
function wogo_review_page(string $title, string $inner, int $code = 200): never
{
    http_response_code($code);
    header('Content-Type: text/html; charset=utf-8');
    header('X-Robots-Tag: noindex, nofollow');
    header('Referrer-Policy: no-referrer');
    header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
    echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">'
        . '<title>' . wogo_h($title) . ' · Wogopogo review</title><style>'
        . 'body{margin:0;background:' . WOGO_BG . ';color:' . WOGO_INK . ';font:16px/1.6 ' . WOGO_FONT . '}main{max-width:680px;margin:0 auto;padding:28px 18px 60px}'
        . 'header{display:flex;align-items:center;gap:10px;font-weight:800;font-size:20px;margin-bottom:22px}.eyebrow{font:11px/1.4 ' . WOGO_MONO . ';letter-spacing:.14em;color:' . WOGO_DIM . '}'
        . '.card{background:' . WOGO_CARD . ';border:1px solid ' . WOGO_LINE . ';border-radius:16px;padding:24px}h1{font-size:28px;line-height:1.2;margin:10px 0 4px}.sub{color:' . WOGO_DIM . ';margin:0 0 16px}'
        . 'dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 16px;margin:16px 0;padding-top:14px;border-top:1px solid ' . WOGO_LINE . '}dt{font:12px/1.9 ' . WOGO_MONO . ';color:' . WOGO_DIM . '}dd{margin:0;overflow-wrap:anywhere}'
        . '.desc{background:' . WOGO_BG . ';border:1px solid ' . WOGO_LINE . ';border-radius:12px;padding:14px 16px;white-space:pre-wrap;overflow-wrap:anywhere}'
        . 'label{display:block;font:12px/1.4 ' . WOGO_MONO . ';color:' . WOGO_DIM . ';margin:18px 0 6px}textarea{width:100%;box-sizing:border-box;background:' . WOGO_BG . ';color:' . WOGO_INK . ';border:1px solid ' . WOGO_LINE . ';border-radius:10px;padding:10px;font:inherit}'
        . '.row{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}button{font:700 15px/1 ' . WOGO_FONT . ';padding:13px 22px;border-radius:10px;cursor:pointer}'
        . '.ok{background:' . WOGO_ACCENT . ';color:' . WOGO_ACCENT_INK . ';border:1px solid ' . WOGO_ACCENT . '}.no{background:transparent;color:#f0a3a3;border:1px solid #f0a3a3}'
        . '.done{border-color:' . WOGO_ACCENT . '}a{color:' . WOGO_ACCENT . '}.note{color:' . WOGO_DIM . ';font-size:14px}'
        . '</style></head><body><main><header>' . WOGO_MARK . ' Wogopogo</header>' . $inner . '</main></body></html>';
    exit;
}

function wogo_review_listing_html(array $job): string
{
    $rows = '';
    foreach (wogo_review_fields($job) as $label => $value) {
        $rows .= '<dt>' . wogo_h($label) . '</dt><dd>' . ($value === '' ? '<span class="note">Not provided</span>' : wogo_h($value)) . '</dd>';
    }
    return '<div class="eyebrow">NEW LISTING TO REVIEW</div><h1>' . wogo_h($job['title']) . '</h1><p class="sub">' . wogo_h($job['company']) . ' · ' . wogo_h($job['location']) . '</p>'
        . '<dl>' . $rows . '</dl><div class="eyebrow">DESCRIPTION</div><div class="desc">' . wogo_h((string) $job['description']) . '</div>';
}

/** GET shows the listing and buttons; POST records the decision, then redirects (PRG). */
function wogo_review_route(PDO $pdo, array $cfg, string $method): never
{
    $token = (string) ($method === 'POST' ? ($_POST['t'] ?? '') : ($_GET['t'] ?? ''));
    [$jobId, $problem] = wogo_review_check($cfg, $token);
    $job = $jobId ? wogo_review_job($pdo, $jobId) : null;
    if ($problem !== '' || !$job) {
        wogo_review_page('Review link', '<div class="card"><h1>Nothing to do</h1><p>' . wogo_h($problem ?: 'This listing no longer exists.') . '</p><p><a href="https://wogopogo.ca/admin">Open the admin screen</a></p></div>', 404);
    }
    if ($method === 'POST') {
        $decision = (string) ($_POST['decision'] ?? '');
        if (!in_array($decision, ['approve', 'reject'], true)) {
            wogo_review_page('Not saved', '<div class="card"><h1>Not saved</h1><p>Please go back and press Approve or Reject.</p></div>', 400);
        }
        wogo_review_decide($pdo, $cfg, $job, $decision, trim((string) ($_POST['note'] ?? '')));
        http_response_code(303);
        header('Location: /api/review?t=' . rawurlencode($token));
        exit;
    }
    if ($job['status'] !== 'pending') {
        $live = $job['status'] === 'approved';
        $message = $live ? 'Approved. The listing is live on Wogopogo.' : ($job['status'] === 'rejected' ? 'Rejected. The listing will not be published.' : 'This listing is no longer waiting for review.');
        wogo_review_page('Review', '<div class="card done"><div class="eyebrow">DONE</div><h1>' . wogo_h($message) . '</h1>'
            . ($live ? '<p><a href="https://wogopogo.ca/jobs/' . (int) $job['id'] . '">See it on the board</a></p>' : '') . wogo_review_listing_html($job) . '</div>');
    }
    wogo_review_page('Review ' . $job['title'], '<div class="card">' . wogo_review_listing_html($job)
        . '<form method="post" action="/api/review"><input type="hidden" name="t" value="' . wogo_h($token) . '">'
        . '<label for="note">Note for the audit trail (optional)</label><textarea id="note" name="note" rows="2" maxlength="500"></textarea>'
        . '<div class="row"><button class="ok" name="decision" value="approve">Approve &amp; publish</button><button class="no" name="decision" value="reject">Reject</button></div>'
        . '<p class="note">Submitted details are unverified. Approving publishes the listing for ' . (int) $cfg['job_lifetime_days'] . ' days.</p></form></div>');
}
