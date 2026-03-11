#!/bin/bash

# AI Team Dashboard 日志查看脚本
# 使用方法：
#   ./view-logs.sh          - 查看最近 50 行日志
#   ./view-logs.sh -f       - 实时查看日志
#   ./view-logs.sh -e       - 查看错误日志
#   ./view-logs.sh -e -f    - 实时查看错误日志
#   ./view-logs.sh -a       - 查看所有日志

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$SCRIPT_DIR/logs/dashboard.log"
ERROR_LOG="$SCRIPT_DIR/logs/dashboard-error.log"

# 检查日志文件是否存在
if [ ! -f "$LOG_FILE" ] && [ ! -f "$ERROR_LOG" ]; then
  echo "❌ 未找到日志文件"
  echo "   请先使用 ./start-with-log.sh 启动 Dashboard"
  exit 1
fi

# 解析参数
FOLLOW=false
ERROR_ONLY=false
ALL=false

for arg in "$@"; do
  case $arg in
    -f|--follow)
      FOLLOW=true
      ;;
    -e|--error)
      ERROR_ONLY=true
      ;;
    -a|--all)
      ALL=true
      ;;
    -h|--help)
      echo "用法: $0 [选项]"
      echo ""
      echo "选项:"
      echo "  -f, --follow    实时跟踪日志输出"
      echo "  -e, --error     查看错误日志"
      echo "  -a, --all       查看所有日志（不限行数）"
      echo "  -h, --help      显示此帮助信息"
      echo ""
      echo "示例:"
      echo "  $0              查看最近 50 行日志"
      echo "  $0 -f           实时查看日志"
      echo "  $0 -e           查看错误日志"
      echo "  $0 -e -f        实时查看错误日志"
      exit 0
      ;;
  esac
done

# 选择日志文件
if [ "$ERROR_ONLY" = true ]; then
  TARGET_LOG="$ERROR_LOG"
  LOG_NAME="错误日志"
else
  TARGET_LOG="$LOG_FILE"
  LOG_NAME="运行日志"
fi

# 检查文件是否存在
if [ ! -f "$TARGET_LOG" ]; then
  echo "❌ 未找到 $LOG_NAME: $TARGET_LOG"
  exit 1
fi

echo "📋 查看 Dashboard $LOG_NAME"
echo "   文件: $TARGET_LOG"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 显示日志
if [ "$FOLLOW" = true ]; then
  tail -f "$TARGET_LOG"
elif [ "$ALL" = true ]; then
  cat "$TARGET_LOG"
else
  tail -50 "$TARGET_LOG"
fi
