#!/bin/bash

# Dashboard 日志功能演示脚本
# 展示如何使用新的日志监控功能

clear
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🦞 AI Team Dashboard 日志功能演示"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}📚 本演示将向您展示 Dashboard 的日志监控功能${NC}"
echo ""
echo "您将看到："
echo "  1. 启动 Dashboard（带日志记录）"
echo "  2. 实时监控运行日志"
echo "  3. 查看性能分析报告"
echo "  4. 使用各种过滤器查看日志"
echo ""
echo -e "${YELLOW}注意：这只是演示，实际使用时请根据需要选择工具${NC}"
echo ""
read -p "按 Enter 键开始演示..." dummy

# ═══════════════ 第 1 步：检查当前状态 ═══════════════
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${CYAN}📋 第 1 步：检查 Dashboard 状态${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "logs/dashboard.pid" ]; then
  PID=$(cat logs/dashboard.pid)
  if ps -p "$PID" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Dashboard 正在运行 (PID: $PID)${NC}"
    echo ""
    read -p "是否要停止并重新启动以查看完整日志？(y/N) " response
    if [[ "$response" =~ ^[Yy]$ ]]; then
      echo ""
      echo "正在停止 Dashboard..."
      ./stop-dashboard.sh
      echo ""
      sleep 2
    else
      echo ""
      echo -e "${YELLOW}将使用现有的 Dashboard 进程${NC}"
      SKIP_START=true
    fi
  else
    echo -e "${YELLOW}⚠️  Dashboard 未运行${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Dashboard 未运行${NC}"
fi

echo ""
read -p "按 Enter 继续..." dummy

# ═══════════════ 第 2 步：启动 Dashboard ═══════════════
if [ "$SKIP_START" != true ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e "${CYAN}🚀 第 2 步：启动 Dashboard（带日志记录）${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "命令: ./start-with-log.sh"
  echo ""
  
  # 清空旧日志
  if [ -f "logs/dashboard.log" ]; then
    echo "清空旧日志..."
    > logs/dashboard.log
    > logs/dashboard-error.log
  fi
  
  ./start-with-log.sh
  
  echo ""
  echo -e "${GREEN}Dashboard 已启动！${NC}"
  echo ""
  read -p "按 Enter 继续查看日志..." dummy
fi

# ═══════════════ 第 3 步：查看启动日志 ═══════════════
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${CYAN}📄 第 3 步：查看启动日志${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "命令: ./view-logs.sh"
echo ""
echo "日志内容："
echo "─────────────────────────────────────────"

if [ -f "logs/dashboard.log" ]; then
  head -20 logs/dashboard.log
  echo "─────────────────────────────────────────"
  echo ""
  echo -e "${GREEN}✅ 可以看到详细的启动过程！${NC}"
else
  echo -e "${YELLOW}⚠️  日志文件尚未生成，请等待 Dashboard 完全启动${NC}"
fi

echo ""
read -p "按 Enter 继续..." dummy

# ═══════════════ 第 4 步：实时监控 API 请求 ═══════════════
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${CYAN}📡 第 4 步：实时监控 API 请求${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "命令: ./monitor-logs.sh --api"
echo ""
echo -e "${YELLOW}提示：请在浏览器中访问 http://localhost:3800${NC}"
echo -e "${YELLOW}      然后观察实时 API 请求日志${NC}"
echo ""
echo "这里显示最近的 API 请求："
echo "─────────────────────────────────────────"

if [ -f "logs/dashboard.log" ]; then
  grep '\[API\]' logs/dashboard.log 2>/dev/null | tail -5 || echo "暂无 API 请求记录"
else
  echo "日志文件不存在"
fi

echo "─────────────────────────────────────────"
echo ""
echo -e "${GREEN}💡 要实时查看，请运行: ./monitor-logs.sh --api${NC}"
echo ""
read -p "按 Enter 继续..." dummy

# ═══════════════ 第 5 步：查看性能统计 ═══════════════
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${CYAN}⏱️  第 5 步：查看性能统计${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "命令: ./monitor-logs.sh --perf"
echo ""
echo "最近的性能数据："
echo "─────────────────────────────────────────"

if [ -f "logs/dashboard.log" ]; then
  grep '\[PERF\]' logs/dashboard.log 2>/dev/null | tail -5 || echo "暂无性能数据"
else
  echo "日志文件不存在"
fi

echo "─────────────────────────────────────────"
echo ""
echo -e "${GREEN}💡 要实时查看，请运行: ./monitor-logs.sh --perf${NC}"
echo ""
read -p "按 Enter 继续..." dummy

# ═══════════════ 第 6 步：查看分析报告 ═══════════════
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${CYAN}📊 第 6 步：生成日志分析报告${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "命令: ./analyze-logs.sh"
echo ""

if [ -f "logs/dashboard.log" ] && [ -s "logs/dashboard.log" ]; then
  echo "正在生成分析报告..."
  echo ""
  ./analyze-logs.sh
else
  echo -e "${YELLOW}⚠️  日志文件为空或不存在${NC}"
  echo ""
  echo "请先："
  echo "  1. 确保 Dashboard 已启动"
  echo "  2. 在浏览器中访问并操作一下"
  echo "  3. 等待几秒钟让日志累积"
  echo "  4. 再运行 ./analyze-logs.sh"
fi

echo ""
read -p "按 Enter 继续..." dummy

# ═══════════════ 总结 ═══════════════
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 演示完成！${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 您已经了解了以下功能："
echo ""
echo "  1. ✅ 启动 Dashboard（带日志）"
echo "  2. ✅ 查看启动日志"
echo "  3. ✅ 监控 API 请求"
echo "  4. ✅ 查看性能统计"
echo "  5. ✅ 生成分析报告"
echo ""
echo "🛠️  可用工具清单："
echo ""
echo "  ./start-with-log.sh       启动 Dashboard（带日志）"
echo "  ./stop-dashboard.sh        停止 Dashboard"
echo "  ./view-logs.sh             查看日志文件"
echo "  ./monitor-logs.sh          实时监控所有日志"
echo "  ./monitor-logs.sh --api    只监控 API 请求"
echo "  ./monitor-logs.sh --perf   只监控性能数据"
echo "  ./monitor-logs.sh --error  只监控错误警告"
echo "  ./analyze-logs.sh          生成分析报告"
echo ""
echo "📖 更多信息："
echo ""
echo "  cat LOGGING_GUIDE.md       查看完整使用指南"
echo "  cat logs/README.md         查看日志说明"
echo "  ./monitor-logs.sh --help   查看监控工具帮助"
echo ""
echo "🌟 建议工作流："
echo ""
echo "  1. 启动时使用: ./start-with-log.sh"
echo "  2. 实时监控: ./monitor-logs.sh --api"
echo "  3. 定期查看: ./analyze-logs.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
