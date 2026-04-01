#!/usr/bin/env bash
# Serves the leaderboard on port 8080 (override with PORT env var)
PORT="${PORT:-62001}"
DIR="$(cd "$(dirname "$0")" && pwd)"
echo "Leaderboard running at http://localhost:${PORT}"
exec python3 -m http.server "$PORT" -d "$DIR"
