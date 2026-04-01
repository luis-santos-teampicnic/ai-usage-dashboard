#!/usr/bin/env bash
# Pulls the latest from GitHub and hard-resets the local checkout.
# Safe to run at any time — local changes will be overwritten.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
LOG="$DIR/refresh.log"

cd "$DIR"
echo "[$(date -Iseconds)] Refreshing from origin..." >> "$LOG"
git fetch --all --quiet
git reset --hard origin/HEAD --quiet
echo "[$(date -Iseconds)] Done." >> "$LOG"
