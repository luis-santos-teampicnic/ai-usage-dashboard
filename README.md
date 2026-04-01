# Claude Token Leaderboard

A single-page wallboard displaying Claude token usage and PR efficiency metrics for the engineering team.

## Files

| File | Purpose |
|------|---------|
| `index.html` | The leaderboard page (all CSS and JS inline) |
| `data.csv` | Token and PR data (updated externally) |
| `logo.png` | Background watermark logo |
| `serve.sh` | Local dev server (port 62001) |
| `install-service.sh` | Installs a systemd service on Debian/Linux |

## Data format

`data.csv` must start with a timestamp comment, followed by one row per engineer:

```
# 2026-04-02T10:00:00+02:00
Name,TotalTokens,TokensLast2Weeks,MergedPRs,MergedPRsPerMillionTokens
Alice,1500000,300000,5,3.33
```

Columns (no header row, comma-separated):
1. Name
2. Total tokens (all time)
3. Tokens in the last 2 weeks
4. Merged PRs in the last 2 weeks
5. Merged PRs² / 1M tokens (efficiency metric)

The leaderboard is sorted descending by column 5.

## Checking out the repository

You need a GitHub fine-grained personal access token with **Contents** and **Metadata** read permissions for this repository.

Clone using the token embedded in the HTTPS URL:

```bash
git clone https://x-access-token:<YOUR_TOKEN>@github.com/luis-santos-teampicnic/ai-usage-dashboard.git
cd ai-usage-dashboard
```

Or, if you prefer not to embed the token in the URL, configure it as a credential helper for this host:

```bash
git config --global credential.helper store
echo "https://x-access-token:<YOUR_TOKEN>@github.com" >> ~/.git-credentials
git clone https://github.com/luis-santos-teampicnic/ai-usage-dashboard.git
cd ai-usage-dashboard
```

> **Note:** Replace `<YOUR_TOKEN>` with your actual token. Treat it like a password — do not commit it to any file.

To pull the latest data after the initial clone:

```bash
git pull
```

## Running locally

```bash
bash serve.sh
# → http://localhost:62001
```

## Installing as a system service (Debian/Linux)

Copy the project to the target machine, then run:

```bash
sudo bash install-service.sh
```

This will:
- Write a systemd unit file to `/etc/systemd/system/claude-leaderboard.service`
- Enable the service so it starts automatically on boot
- Start the service immediately on port **62001**

The service runs as the non-root user who invoked `sudo`.

### Useful commands

```bash
# Check status
systemctl status claude-leaderboard

# Follow logs
journalctl -u claude-leaderboard -f

# Restart after updating data.csv
systemctl restart claude-leaderboard

# Stop the service
systemctl stop claude-leaderboard

# Disable autostart
systemctl disable claude-leaderboard
```

### Updating data

Replace `data.csv` in the project directory. The page auto-refreshes every hour and re-fetches the CSV every 5 minutes, so no service restart is needed.

## Keeping the repo up to date

`refresh.sh` hard-resets the local checkout to match `origin/HEAD`, overwriting any local changes:

```bash
bash refresh.sh
```

`install-service.sh` automatically registers this script as an **hourly cron job** for the service user, so the checkout stays in sync with GitHub without any manual intervention.

To verify the cron job was installed:

```bash
crontab -l
# Should contain a line like:
# 0 * * * * bash /path/to/ai-usage-dashboard/refresh.sh
```

To trigger a manual refresh at any time:

```bash
bash refresh.sh
```

Refresh activity is logged to `refresh.log` in the project directory:

```bash
tail -f refresh.log
```
