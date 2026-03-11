#!/bin/bash

# AI Team Dashboard 停止脚本
# 使用方法：./stop-dashboard.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/logs/dashboard.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "⚠️  未找到 PID 文件，Dashboard 可能没有运行"
  echo ""
  echo "尝试查找 Dashboard 进程..."
  DASHBOARD_PID=$(ps aux | grep "node server.js" | grep -v grep | awk '{print $2}')
  if [ -n "$DASHBOARD_PID" ]; then
    echo "找到 Dashboard 进程: $DASHBOARD_PID"
    kill "$DASHBOARD_PID" 2>/dev/null
    echo "✅ Dashboard 已停止"
  else
    echo "未找到运行中的 Dashboard 进程"
  fi
  exit 0
fi

DASHBOARD_PID=$(cat "$PID_FILE")

if ps -p "$DASHBOARD_PID" > /dev/null 2>&1; then
  echo "🛑 正在停止 Dashboard (PID: $DASHBOARD_PID)..."
  kill "$DASHBOARD_PID"
  
  # 等待进程结束
  for i in {1..5}; do
    if ! ps -p "$DASHBOARD_PID" > /dev/null 2>&1; then
      echo "✅ Dashboard 已停止"
      rm -f "$PID_FILE"
      exit 0
    fi
    sleep 1
  done
  
  # 如果还没停止，强制结束
  if ps -p "$DASHBOARD_PID" > /dev/null 2>&1; then
    echo "⚠️  正在强制停止..."
    kill -9 "$DASHBOARD_PID"
    sleep 1
  fi
  
  echo "✅ Dashboard 已停止"
  rm -f "$PID_FILE"
else
  echo "⚠️  进程 $DASHBOARD_PID 不存在"
  rm -f "$PID_FILE"
  echo "✅ 已清理 PID 文件"
fi
