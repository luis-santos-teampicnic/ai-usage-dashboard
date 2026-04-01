#!/usr/bin/env bash
# Installs claude-leaderboard as a systemd service on Debian/Linux.
# Safe to run multiple times — all steps are idempotent.
# Run with: sudo bash install-service.sh
set -euo pipefail

SERVICE="claude-leaderboard"
SERVICE_FILE="/etc/systemd/system/${SERVICE}.service"
DIR="$(cd "$(dirname "$0")" && pwd)"

# Run the service as the invoking user (not root)
RUN_USER="${SUDO_USER:-$(id -un)}"

if [[ "$EUID" -ne 0 ]]; then
  echo "Please run as root: sudo bash install-service.sh" >&2
  exit 1
fi

PYTHON="$(command -v python3 || true)"
if [[ -z "$PYTHON" ]]; then
  echo "python3 not found — install it first: apt-get install python3" >&2
  exit 1
fi

# ── systemd service ───────────────────────────────────────────────────────────
# Overwrites the unit file each run so changes to DIR or RUN_USER are picked up.
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Claude Token Leaderboard
After=network.target

[Service]
Type=simple
User=${RUN_USER}
WorkingDirectory=${DIR}
ExecStart=${PYTHON} -m http.server 62001 -d ${DIR}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE"   # no-op if already enabled
systemctl restart "$SERVICE"  # always ensure latest config is running

# ── Hourly cron job to refresh the repo ──────────────────────────────────────
chmod +x "$DIR/refresh.sh"
CRON_JOB="0 * * * * bash ${DIR}/refresh.sh"

# crontab -l exits 1 when no crontab exists → || true prevents abort
# grep -v exits 1 when every line is removed  → || true prevents abort
EXISTING=$(crontab -u "$RUN_USER" -l 2>/dev/null || true)
CLEANED=$(echo "$EXISTING" | grep -v "refresh.sh" || true)
{ echo "$CLEANED"; echo "$CRON_JOB"; } | crontab -u "$RUN_USER" -

echo ""
echo "Service '${SERVICE}' installed and running."
echo "  URL:    http://localhost:62001"
echo "  Status: systemctl status ${SERVICE}"
echo "  Logs:   journalctl -u ${SERVICE} -f"
echo ""
echo "Hourly refresh cron job installed for user '${RUN_USER}'."
echo "  View cron:   crontab -u ${RUN_USER} -l"
echo "  Refresh log: ${DIR}/refresh.log"
