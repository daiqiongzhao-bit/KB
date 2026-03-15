#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME=ai-team-dashboard
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE_SRC="$SRC_DIR/${SERVICE_NAME}.service"
SERVICE_DST="/etc/systemd/system/${SERVICE_NAME}.service"

if [[ $EUID -ne 0 ]]; then
  echo "请用 root 运行：sudo $0"
  exit 1
fi

mkdir -p "$SRC_DIR/logs"
cp "$SERVICE_SRC" "$SERVICE_DST"
systemctl daemon-reload
systemctl enable --now "$SERVICE_NAME"
systemctl status "$SERVICE_NAME" --no-pager || true

echo
echo "已安装并启动 ${SERVICE_NAME}"
echo "查看日志：journalctl -u ${SERVICE_NAME} -f"
