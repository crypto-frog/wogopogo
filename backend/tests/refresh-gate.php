<?php
/** Refresh-gate tests. Synthetic only: no SSH, network, database or CLI is touched. */
declare(strict_types=1);
require __DIR__ . '/../../ops/refresh-gate.php';
$checks = 0;
function check(bool $ok, string $message): void {
    global $checks;
    if (!$ok) { throw new RuntimeException($message); }
    $checks++;
}
function refused(callable $fn): bool {
    try { $fn(); return false; } catch (GateError) { return true; }
}
function wire(array $argv): string {
    return 'wogo ' . rtrim(strtr(base64_encode(json_encode($argv)), '+/', '-_'), '=');
}

check(gate_parse(wire(['job:list', '--status', 'approved'])) === ['job:list', '--status', 'approved'], 'The wogo wire format round-trips');
check(refused(fn () => gate_parse('bash -c id')), 'A shell command is refused');
check(refused(fn () => gate_parse('wogo ' . base64_encode('{"a":1}'))), 'Argv must be a list');
check(refused(fn () => gate_parse(wire(['job:list', "--status\napproved"]))), 'Control characters are refused');

[$cmd, $opts, $mut] = gate_check(['job:list', '--status', 'approved', '--limit=50']);
check($cmd === 'job:list' && $opts['--limit'] === '50' && !$mut, 'Reads pass and are not mutations');
check(refused(fn () => gate_check(['job:act', '--id', '9', '--action', 'delete', '--reason', 'x', '--apply'])), 'Delete is never allowed');
check(refused(fn () => gate_check(['job:act', '--id', '9', '--action', 'feature', '--reason', 'x', '--apply'])), 'Feature is never allowed');
check(refused(fn () => gate_check(['notification:send', '--limit', '5'])), 'Notification sends are not allowed');
check(refused(fn () => gate_check(['job:act', '--id', '9', '--action', 'close', '--actor', 'owner', '--reason', 'x', '--apply'])), 'The actor cannot be chosen by the agent');
check(refused(fn () => gate_check(['job:list', '--app-root', '/tmp'])), 'The app root cannot be chosen by the agent');
check(refused(fn () => gate_check(['job:import', '--file', '/etc/passwd'])), 'Imports read only stdin');
check(refused(fn () => gate_check(['job:act', '--id', '9', '--action', 'close', '--apply'])), 'Changes need a reason');
check(refused(fn () => gate_check(['job:verify', '--id', '9', '--outcome', 'closed', '--reason', 'x'])), 'Verify without --apply is refused, not silently ignored');
check(refused(fn () => gate_check(['job:show', '--id', '9;rm'])), 'Job ids are numbers');
[, , $mut] = gate_check(['job:act', '--id', '12', '--action', 'close', '--reason', 'Source gone (HTTP 410)', '--apply']);
check($mut, 'An applied close is a mutation');
[, , $mut] = gate_check(['job:import', '--reason', 'dry run']);
check(!$mut, 'An import without --apply is a dry run');

$page = '<html><head><script>var t="Pastry cook Acme";</script></head><body><h1>Vineyard worker</h1><p>Intrigue Wines Ltd &amp; friends</p></body></html>';
check(gate_page_names_job($page, 'Vineyard worker', 'Intrigue Wines Ltd'), 'A page naming the title and employer matches');
check(!gate_page_names_job($page, 'Pastry cook', 'Acme Bakery'), 'Words only inside scripts do not count');
check(!gate_page_names_job($page, 'Vineyard worker', 'Other Estate Winery'), 'The employer must appear');
check(gate_page_names_job('<p>Café cook — Crème Brûlée Bistro</p>', 'Cafe cook', 'Creme Brulee Bistro Inc.'), 'Accents and entities are normalised');

$now = strtotime('2026-09-24 16:00:00 UTC');
$job = ['title' => 'Vineyard worker', 'company' => 'Intrigue Wines Ltd', 'source_key' => 'jobbank:1', 'category_slug' => 'wine',
    'source_url' => 'https://www.jobbank.gc.ca/jobsearch/jobposting/1', 'status' => 'approved', 'tier' => 'free',
    'source_status' => 'active', 'source_verified_at' => '2026-09-24 15:00:00'];
$live = fn ($url) => [200, $url, $page];
check(gate_manifest_problems(['manifest_version' => 1, 'jobs' => [$job]], $live, $now) === [], 'A verified live job passes');
$gone = fn ($url) => [410, 'https://www.jobbank.gc.ca/jobsearch/jobpostingexpired/1', ''];
check(count(gate_manifest_problems(['manifest_version' => 1, 'jobs' => [$job]], $gone, $now)) === 1, 'An expired source is refused');
$invented = ['title' => 'Senior sommelier', 'company' => 'Imaginary Estate'] + $job;
check(count(gate_manifest_problems(['manifest_version' => 1, 'jobs' => [$invented]], $live, $now)) === 1, 'A job the page does not name is refused');
$stale = ['source_verified_at' => '2026-09-19 15:00:00'] + $job;
check(count(gate_manifest_problems(['manifest_version' => 1, 'jobs' => [$stale]], $live, $now)) === 1, 'Old verification is refused');
$featured = ['tier' => 'featured'] + $job;
check(count(gate_manifest_problems(['manifest_version' => 1, 'jobs' => [$featured]], $live, $now)) === 1, 'Imports are free tier only');
check(gate_manifest_problems(['manifest_version' => 1, 'jobs' => array_fill(0, MAX_IMPORT_JOBS + 1, $job)], $live, $now) !== [], 'Manifest size is capped');
check(gate_fetch('http://www.jobbank.gc.ca/')[0] === 0 && gate_fetch('https://127.0.0.1/')[0] === 0, 'Only https to public hostnames is fetched');

$ledger = sys_get_temp_dir() . '/gate-ledger-' . bin2hex(random_bytes(6));
file_put_contents($ledger, implode("\n", [
    json_encode(['ts' => $now - 100, 'applied' => true, 'exit' => 0, 'jobs' => 28]),
    json_encode(['ts' => $now - 50, 'applied' => true, 'exit' => 0]),
    json_encode(['ts' => $now - 40, 'applied' => true, 'exit' => 1]),
    json_encode(['ts' => $now - 30, 'applied' => false, 'exit' => 0]),
    json_encode(['ts' => $now - 90000, 'applied' => true, 'exit' => 0]),
]) . "\n");
check(gate_recent_changes($ledger, $now) === 29, 'The daily cap counts applied, successful changes in 24 hours, imports per job');
unlink($ledger);

echo json_encode(['passed' => $checks, 'network' => 0]) . PHP_EOL;
