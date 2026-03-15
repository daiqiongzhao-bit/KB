#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p logs data .cache
export NODE_ENV=production
exec node server.js
