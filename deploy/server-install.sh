#!/usr/bin/env bash
# Install or update the Mapper hub on a Linux server FROM A GIT CLONE of this repo.
#
#   git clone https://github.com/danielmkongo/mapper-hub.git     # anywhere, e.g. /root/...
#   cd mapper-hub
#   sudo bash deploy/server-install.sh          # port 7000
#   sudo bash deploy/server-install.sh 8000     # or another port
#
# Update later (from the same folder):
#   git pull && sudo bash deploy/server-install.sh
#
# Runs the hub as the systemd service "mapper-hub" straight from this folder. The hub is
# its own web server - no nginx needed. Safe to re-run.
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "run with sudo"; exit 1; }
APP="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${1:-${PORT:-7000}}"
say() { printf '\n== %s\n' "$*"; }

# ---- Node.js ---------------------------------------------------------------
need_node=1
if command -v node >/dev/null; then
  [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 18 ] && need_node=0
fi
if [ "$need_node" -eq 1 ]; then
  say "Installing Node.js 20"
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl gnupg
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi
say "Node $(node -v)"

# ---- dependencies ------------------------------------------------------------
say "Installing dependencies in $APP"
cd "$APP"
npm ci --omit=dev --no-audit --no-fund

# Run as a dedicated "mapper" user when the folder allows it. A clone under /root is not
# readable by other users, so there the service runs as root and ownership is left alone.
if [[ "$APP" == /root* ]]; then
  RUN_AS=root
else
  RUN_AS=mapper
  id mapper >/dev/null 2>&1 || useradd --system --home "$APP" --shell /usr/sbin/nologin mapper
  chown -R mapper:mapper "$APP"
  # git refuses to work in a repo owned by another user unless told it's fine
  git config --global --add safe.directory "$APP" 2>/dev/null || true
fi

# ---- service ---------------------------------------------------------------
say "Service on port $PORT"
cat >/etc/systemd/system/mapper-hub.service <<EOF
[Unit]
Description=Mapper hub (indoor tracking positions + digital twin)
After=network-online.target
Wants=network-online.target

[Service]
User=$RUN_AS
WorkingDirectory=$APP
Environment=PORT=$PORT
Environment=HOST=0.0.0.0
ExecStart=$(command -v node) server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable mapper-hub >/dev/null
systemctl restart mapper-hub
sleep 2
systemctl --no-pager --lines=5 status mapper-hub || true
curl -fsS "http://127.0.0.1:$PORT/api/config" >/dev/null && echo "hub answering on port $PORT"

# ---- firewall ---------------------------------------------------------------
if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow "$PORT/tcp" >/dev/null && echo "ufw: opened $PORT/tcp"
fi

IP=$(curl -fsS -m 5 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
say "Done: open http://$IP:$PORT/"
echo "If it does not load from outside, also open TCP $PORT in your hosting provider's firewall."
echo "Room setup (anchor positions, names): $APP/config/room.json, then: systemctl restart mapper-hub"
