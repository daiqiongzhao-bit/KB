#!/bin/bash

# AI Team Dashboard 实时日志监控工具
# 使用方法：./monitor-logs.sh [选项]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$SCRIPT_DIR/logs/dashboard.log"

# 颜色定义
COLOR_RESET='\033[0m'
COLOR_INFO='\033[36m'      # 青色
COLOR_SUCCESS='\033[32m'   # 绿色
COLOR_WARN='\033[33m'      # 黄色
COLOR_ERROR='\033[31m'     # 红色
COLOR_DEBUG='\033[90m'     # 灰色
COLOR_PERF='\033[35m'      # 紫色

# 检查日志文件
if [ ! -f "$LOG_FILE" ]; then
  echo -e "${COLOR_ERROR}❌ 日志文件不存在: $LOG_FILE${COLOR_RESET}"
  echo ""
  echo "请先启动 Dashboard："
  echo "  ./start-with-log.sh"
  exit 1
fi

# 解析参数
FILTER=""
FOLLOW=true
LINES=50

while [[ $# -gt 0 ]]; do
  case $1 in
    --api)
      FILTER="API"
      shift
      ;;
    --perf)
      FILTER="PERF"
      shift
      ;;
    --error)
      FILTER="ERROR|WARN"
      shift
      ;;
    --github)
      FILTER="GitHub"
      shift
      ;;
    --docker)
      FILTER="Docker"
      shift
      ;;
    --system)
      FILTER="系统"
      shift
      ;;
    --config)
      FILTER="配置"
      shift
      ;;
    --no-follow)
      FOLLOW=false
      shift
      ;;
    -n)
      LINES="$2"
      shift 2
      ;;
    -h|--help)
      echo "AI Team Dashboard 实时日志监控工具"
      echo ""
      echo "用法: $0 [选项]"
      echo ""
      echo "选项:"
      echo "  --api          只显示 API 请求日志"
      echo "  --perf         只显示性能日志"
      echo "  --error        只显示错误和警告"
      echo "  --github       只显示 GitHub 相关日志"
      echo "  --docker       只显示 Docker 相关日志"
      echo "  --system       只显示系统日志"
      echo "  --config       只显示配置日志"
      echo "  --no-follow    不实时跟踪，只显示历史日志"
      echo "  -n <数字>      显示最近 N 行日志（默认 50）"
      echo "  -h, --help     显示此帮助信息"
      echo ""
      echo "示例:"
      echo "  $0                      # 实时查看所有日志"
      echo "  $0 --api                # 实时查看 API 请求"
      echo "  $0 --perf               # 实时查看性能统计"
      echo "  $0 --error              # 实时查看错误和警告"
      echo "  $0 --api --no-follow    # 查看最近 50 条 API 日志"
      echo "  $0 -n 100               # 查看最近 100 行日志"
      exit 0
      ;;
    *)
      echo -e "${COLOR_ERROR}未知选项: $1${COLOR_RESET}"
      echo "使用 -h 或 --help 查看帮助"
      exit 1
      ;;
  esac
done

# 显示标题
clear
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🦞 AI Team Dashboard 日志监控"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 日志文件: $LOG_FILE"
if [ -n "$FILTER" ]; then
  echo "🔍 过滤条件: $FILTER"
fi
if [ "$FOLLOW" = true ]; then
  echo "📡 模式: 实时跟踪"
else
  echo "📋 模式: 历史查看（最近 $LINES 行）"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 统计信息
if [ "$FOLLOW" = false ]; then
  TOTAL_LINES=$(wc -l < "$LOG_FILE")
  echo "📊 日志统计:"
  echo "   总行数: $TOTAL_LINES"
  echo "   ℹ️  INFO:    $(grep -c '\[INFO\]' "$LOG_FILE" || echo 0)"
  echo "   ✅ SUCCESS: $(grep -c '\[SUCCESS\]' "$LOG_FILE" || echo 0)"
  echo "   ⚠️  WARN:    $(grep -c '\[WARN\]' "$LOG_FILE" || echo 0)"
  echo "   ❌ ERROR:   $(grep -c '\[ERROR\]' "$LOG_FILE" || echo 0)"
  echo "   ⏱️  PERF:    $(grep -c '\[PERF\]' "$LOG_FILE" || echo 0)"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
fi

# 查看日志
if [ "$FOLLOW" = true ]; then
  if [ -n "$FILTER" ]; then
    tail -f "$LOG_FILE" | grep --line-buffered -E "$FILTER"
  else
    tail -f "$LOG_FILE"
  fi
else
  if [ -n "$FILTER" ]; then
    tail -"$LINES" "$LOG_FILE" | grep -E "$FILTER"
  else
    tail -"$LINES" "$LOG_FILE"
  fi
fi
