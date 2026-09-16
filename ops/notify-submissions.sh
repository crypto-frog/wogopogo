#!/bin/bash
# Install outside public_html. Run once per minute from the account's crontab.
set -euo pipefail
umask 077
ops_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
app_root="$(readlink -f -- "$HOME/public_html/wogopogo_current")"
# A rollback to pre-outbox code pauses delivery while retaining queued records.
[[ -f "$app_root/api/notifications.php" ]] || exit 0
exec 9>"$ops_dir/submission-notifier.lock"
flock -n 9 || exit 0
receipt="$(mktemp "$ops_dir/.submission-notifier.XXXXXX")"
trap 'rm -f -- "$receipt"' EXIT
if timeout 60 php "$ops_dir/wogopogo.php" notification:send --app-root "$app_root" \
    --limit 10 --apply --actor system:submission-notifier \
    --reason 'Scheduled delivery of pending employer submissions to owner review' >"$receipt" 2>&1; then
    mv -- "$receipt" "$ops_dir/submission-notifier-latest.json"
else
    mv -- "$receipt" "$ops_dir/submission-notifier-error.txt"
    exit 1
fi
