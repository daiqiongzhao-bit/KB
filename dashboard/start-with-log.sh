#!/bin/bash

# AI Team Dashboard 启动脚本（带日志记录）
# 使用方法：./start-with-log.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/dashboard.log"
ERROR_LOG="$LOG_DIR/dashboard-error.log"
PID_FILE="$LOG_DIR/dashboard.pid"

# 创建日志目录
mkdir -p "$LOG_DIR"

# 检查是否已经在运行
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if ps -p "$OLD_PID" > /dev/null 2>&1; then
    echo "⚠️  Dashboard 已经在运行 (PID: $OLD_PID)"
    echo "   如需重启，请先运行: ./stop-dashboard.sh"
    exit 1
  else
    echo "🧹 清理旧的 PID 文件"
    rm -f "$PID_FILE"
  fi
fi

# 检查配置文件
if [ ! -f "$SCRIPT_DIR/config.json" ]; then
  echo "❌ 错误: 未找到 config.json"
  echo "   请复制 config.json.example 为 config.json 并填入你的配置"
  exit 1
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
  echo "❌ 错误: 未找到 Node.js，请先安装 Node.js"
  exit 1
fi

# 检查依赖
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  echo "📦 正在安装依赖..."
  cd "$SCRIPT_DIR" && npm install
fi

echo "🦞 启动 AI Team Dashboard..."
echo "   日志文件: $LOG_FILE"
echo "   错误日志: $ERROR_LOG"
echo "   PID 文件: $PID_FILE"
echo ""

cd "$SCRIPT_DIR"

# 启动服务并记录日志
nohup node server.js >> "$LOG_FILE" 2>> "$ERROR_LOG" &
DASHBOARD_PID=$!

# 保存 PID
echo "$DASHBOARD_PID" > "$PID_FILE"

# 等待服务启动
sleep 2

# 检查进程是否还在运行
if ps -p "$DASHBOARD_PID" > /dev/null 2>&1; then
  PORT=$(node -e "console.log(require('./config.json').dashboard?.port || 3800)" 2>/dev/null || echo "3800")
  echo "✅ Dashboard 启动成功！"
  echo "   PID: $DASHBOARD_PID"
  echo "   访问: http://localhost:$PORT"
  echo ""
  echo "💡 查看日志："
  echo "   实时日志: tail -f $LOG_FILE"
  echo "   错误日志: tail -f $ERROR_LOG"
  echo "   停止服务: ./stop-dashboard.sh"
else
  echo "❌ Dashboard 启动失败！"
  echo ""
  echo "错误信息："
  tail -20 "$ERROR_LOG"
  rm -f "$PID_FILE"
  exit 1
fi
