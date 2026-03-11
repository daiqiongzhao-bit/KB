#!/bin/bash

# AI Team Dashboard 日志分析工具
# 分析日志中的性能数据、请求统计和错误报告

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$SCRIPT_DIR/logs/dashboard.log"

# 颜色定义
COLOR_RESET='\033[0m'
COLOR_CYAN='\033[36m'
COLOR_GREEN='\033[32m'
COLOR_YELLOW='\033[33m'
COLOR_RED='\033[31m'
COLOR_PURPLE='\033[35m'
COLOR_BOLD='\033[1m'

# 检查日志文件
if [ ! -f "$LOG_FILE" ]; then
  echo -e "${COLOR_RED}❌ 日志文件不存在: $LOG_FILE${COLOR_RESET}"
  exit 1
fi

clear
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${COLOR_BOLD}🦞 AI Team Dashboard 日志分析报告${COLOR_RESET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ═══════════════ 基础统计 ═══════════════
echo -e "${COLOR_CYAN}📊 基础统计${COLOR_RESET}"
echo "─────────────────────────────────────────"

TOTAL_LINES=$(wc -l < "$LOG_FILE" 2>/dev/null || echo 0)
INFO_COUNT=$(grep -c '\[INFO\]' "$LOG_FILE" 2>/dev/null || echo 0)
SUCCESS_COUNT=$(grep -c '\[SUCCESS\]' "$LOG_FILE" 2>/dev/null || echo 0)
WARN_COUNT=$(grep -c '\[WARN\]' "$LOG_FILE" 2>/dev/null || echo 0)
ERROR_COUNT=$(grep -c '\[ERROR\]' "$LOG_FILE" 2>/dev/null || echo 0)
PERF_COUNT=$(grep -c '\[PERF\]' "$LOG_FILE" 2>/dev/null || echo 0)

echo "  总日志行数: $TOTAL_LINES"
echo -e "  ${COLOR_CYAN}ℹ️  INFO:    $INFO_COUNT${COLOR_RESET}"
echo -e "  ${COLOR_GREEN}✅ SUCCESS: $SUCCESS_COUNT${COLOR_RESET}"
echo -e "  ${COLOR_YELLOW}⚠️  WARN:    $WARN_COUNT${COLOR_RESET}"
echo -e "  ${COLOR_RED}❌ ERROR:   $ERROR_COUNT${COLOR_RESET}"
echo -e "  ${COLOR_PURPLE}⏱️  PERF:    $PERF_COUNT${COLOR_RESET}"
echo ""

# ═══════════════ 启动信息 ═══════════════
echo -e "${COLOR_CYAN}🚀 启动信息${COLOR_RESET}"
echo "─────────────────────────────────────────"

LAST_START=$(grep '正在初始化' "$LOG_FILE" 2>/dev/null | tail -1)
STARTUP_SUCCESS=$(grep 'Dashboard 启动成功' "$LOG_FILE" 2>/dev/null | tail -1)

if [ -n "$LAST_START" ]; then
  echo "  最后启动时间: $(echo "$LAST_START" | grep -oE '\[.*?\]' | head -1 | tr -d '[]')"
  if [ -n "$STARTUP_SUCCESS" ]; then
    echo -e "  ${COLOR_GREEN}状态: 启动成功 ✅${COLOR_RESET}"
  else
    echo -e "  ${COLOR_YELLOW}状态: 启动中或启动失败 ⚠️${COLOR_RESET}"
  fi
else
  echo -e "  ${COLOR_YELLOW}未找到启动记录${COLOR_RESET}"
fi

# 显示配置加载信息
CONFIG_LOAD=$(grep '配置文件加载成功' "$LOG_FILE" 2>/dev/null | tail -1)
if [ -n "$CONFIG_LOAD" ]; then
  echo "  配置加载: 成功"
fi
echo ""

# ═══════════════ API 请求统计 ═══════════════
echo -e "${COLOR_CYAN}📡 API 请求统计${COLOR_RESET}"
echo "─────────────────────────────────────────"

API_TOTAL=$(grep -c '\[API\]' "$LOG_FILE" 2>/dev/null || echo 0)
echo "  总请求数: $API_TOTAL"
echo ""

if [ "$API_TOTAL" -gt 0 ]; then
  echo "  请求分布:"
  grep '\[API\]' "$LOG_FILE" 2>/dev/null | grep -oE 'GET /api/[^ ]+|POST /api/[^ ]+' | sort | uniq -c | sort -rn | head -10 | while read count endpoint; do
    echo "    $endpoint: $count 次"
  done
  echo ""
  
  # 最近的请求
  echo "  最近 5 次请求:"
  grep '\[API\]' "$LOG_FILE" 2>/dev/null | tail -5 | while read line; do
    TIME=$(echo "$line" | grep -oE '\[.*?\]' | head -1 | tr -d '[]' | cut -d' ' -f2)
    ENDPOINT=$(echo "$line" | grep -oE 'GET /api/[^ ]+|POST /api/[^ ]+')
    DURATION=$(echo "$line" | grep -oE '[0-9]+ms' | head -1)
    echo "    [$TIME] $ENDPOINT - $DURATION"
  done
fi
echo ""

# ═══════════════ 性能统计 ═══════════════
echo -e "${COLOR_PURPLE}⏱️  性能统计${COLOR_RESET}"
echo "─────────────────────────────────────────"

if [ "$PERF_COUNT" -gt 0 ]; then
  echo "  操作耗时统计（平均值）:"
  echo ""
  
  # API 请求平均耗时
  API_PERF=$(grep '\[PERF\].*GET /api/monitor' "$LOG_FILE" 2>/dev/null | grep -oE '\([0-9]+ms\)' | tr -d '()ms' || echo "")
  if [ -n "$API_PERF" ]; then
    API_COUNT=$(echo "$API_PERF" | wc -l)
    API_AVG=$(echo "$API_PERF" | awk '{sum+=$1} END {if(NR>0) print int(sum/NR); else print 0}')
    API_MAX=$(echo "$API_PERF" | sort -n | tail -1)
    echo "    📊 GET /api/monitor:"
    echo "       调用次数: $API_COUNT"
    echo "       平均耗时: ${API_AVG}ms"
    echo "       最大耗时: ${API_MAX}ms"
  fi
  
  # GitHub Issues 获取耗时
  GH_ISSUES_PERF=$(grep '\[PERF\].*getGitHubIssues' "$LOG_FILE" 2>/dev/null | grep -oE '\([0-9]+ms\)' | tr -d '()ms' || echo "")
  if [ -n "$GH_ISSUES_PERF" ]; then
    GH_COUNT=$(echo "$GH_ISSUES_PERF" | wc -l)
    GH_AVG=$(echo "$GH_ISSUES_PERF" | awk '{sum+=$1} END {if(NR>0) print int(sum/NR); else print 0}')
    GH_MAX=$(echo "$GH_ISSUES_PERF" | sort -n | tail -1)
    echo ""
    echo "    🐙 GitHub Issues 获取:"
    echo "       调用次数: $GH_COUNT"
    echo "       平均耗时: ${GH_AVG}ms"
    echo "       最大耗时: ${GH_MAX}ms"
  fi
  
  # Docker 状态检查耗时
  DOCKER_PERF=$(grep '\[PERF\].*getDockerStatus' "$LOG_FILE" 2>/dev/null | grep -oE '\([0-9]+ms\)' | tr -d '()ms' || echo "")
  if [ -n "$DOCKER_PERF" ]; then
    DOCKER_COUNT=$(echo "$DOCKER_PERF" | wc -l)
    DOCKER_AVG=$(echo "$DOCKER_PERF" | awk '{sum+=$1} END {if(NR>0) print int(sum/NR); else print 0}')
    DOCKER_MAX=$(echo "$DOCKER_PERF" | sort -n | tail -1)
    echo ""
    echo "    🐳 Docker 状态检查:"
    echo "       调用次数: $DOCKER_COUNT"
    echo "       平均耗时: ${DOCKER_AVG}ms"
    echo "       最大耗时: ${DOCKER_MAX}ms"
  fi
else
  echo "  暂无性能数据"
fi
echo ""

# ═══════════════ 缓存统计 ═══════════════
echo -e "${COLOR_CYAN}💾 缓存使用统计${COLOR_RESET}"
echo "─────────────────────────────────────────"

CACHE_HITS=$(grep '使用缓存' "$LOG_FILE" 2>/dev/null | wc -l || echo 0)
echo "  缓存命中次数: $CACHE_HITS"

if [ "$CACHE_HITS" -gt 0 ]; then
  ISSUES_CACHE=$(grep 'Issues 使用缓存' "$LOG_FILE" 2>/dev/null | wc -l || echo 0)
  COMMITS_CACHE=$(grep 'Commits 使用缓存' "$LOG_FILE" 2>/dev/null | wc -l || echo 0)
  echo "    - Issues 缓存: $ISSUES_CACHE 次"
  echo "    - Commits 缓存: $COMMITS_CACHE 次"
fi
echo ""

# ═══════════════ 错误和警告 ═══════════════
if [ "$ERROR_COUNT" -gt 0 ] || [ "$WARN_COUNT" -gt 0 ]; then
  echo -e "${COLOR_RED}⚠️  错误和警告${COLOR_RESET}"
  echo "─────────────────────────────────────────"
  
  if [ "$ERROR_COUNT" -gt 0 ]; then
    echo -e "  ${COLOR_RED}❌ 错误 ($ERROR_COUNT 个):${COLOR_RESET}"
    grep '\[ERROR\]' "$LOG_FILE" 2>/dev/null | tail -5 | while read line; do
      TIME=$(echo "$line" | grep -oE '\[.*?\]' | head -1 | tr -d '[]' | cut -d' ' -f2)
      MSG=$(echo "$line" | sed 's/.*\[ERROR\]//')
      echo "    [$TIME] $MSG"
    done
    echo ""
  fi
  
  if [ "$WARN_COUNT" -gt 0 ]; then
    echo -e "  ${COLOR_YELLOW}⚠️  警告 ($WARN_COUNT 个):${COLOR_RESET}"
    grep '\[WARN\]' "$LOG_FILE" 2>/dev/null | tail -5 | while read line; do
      TIME=$(echo "$line" | grep -oE '\[.*?\]' | head -1 | tr -d '[]' | cut -d' ' -f2)
      MSG=$(echo "$line" | sed 's/.*\[WARN\]//')
      echo "    [$TIME] $MSG"
    done
    echo ""
  fi
fi

# ═══════════════ Docker 和 Gateway 状态 ═══════════════
echo -e "${COLOR_CYAN}🐳 容器和服务状态${COLOR_RESET}"
echo "─────────────────────────────────────────"

DOCKER_CHECKS=$(grep 'Docker 状态获取' "$LOG_FILE" 2>/dev/null | wc -l || echo 0)
GATEWAY_CHECKS=$(grep 'Gateway.*健康检查' "$LOG_FILE" 2>/dev/null | wc -l || echo 0)
GATEWAY_SUCCESS=$(grep 'Gateway.*健康检查通过' "$LOG_FILE" 2>/dev/null | wc -l || echo 0)
GATEWAY_FAILED=$(grep 'Gateway.*健康检查失败' "$LOG_FILE" 2>/dev/null | wc -l || echo 0)

echo "  Docker 状态检查: $DOCKER_CHECKS 次"
echo "  Gateway 健康检查:"
echo "    - 总次数: $GATEWAY_CHECKS"
echo -e "    - ${COLOR_GREEN}成功: $GATEWAY_SUCCESS${COLOR_RESET}"
echo -e "    - ${COLOR_RED}失败: $GATEWAY_FAILED${COLOR_RESET}"

if [ "$GATEWAY_CHECKS" -gt 0 ]; then
  LATEST_GATEWAY=$(grep 'Gateway.*健康检查' "$LOG_FILE" 2>/dev/null | tail -1)
  if [ -n "$LATEST_GATEWAY" ]; then
    echo ""
    echo "  最近检查: $(echo "$LATEST_GATEWAY" | grep -oE '\[.*?\]' | head -1 | tr -d '[]')"
    if echo "$LATEST_GATEWAY" | grep -q "通过"; then
      echo -e "    ${COLOR_GREEN}状态: 正常 ✅${COLOR_RESET}"
    else
      echo -e "    ${COLOR_RED}状态: 异常 ❌${COLOR_RESET}"
    fi
  fi
fi
echo ""

# ═══════════════ 建议 ═══════════════
echo -e "${COLOR_CYAN}💡 优化建议${COLOR_RESET}"
echo "─────────────────────────────────────────"

if [ "$ERROR_COUNT" -gt 10 ]; then
  echo -e "  ${COLOR_RED}⚠️  错误数量较多 ($ERROR_COUNT 个)，建议检查日志并修复问题${COLOR_RESET}"
fi

if [ "$GATEWAY_FAILED" -gt "$GATEWAY_SUCCESS" ]; then
  echo -e "  ${COLOR_YELLOW}⚠️  Gateway 健康检查失败率较高，请检查 OpenClaw 服务${COLOR_RESET}"
fi

if [ -n "$API_AVG" ] && [ "$API_AVG" -gt 1000 ]; then
  echo -e "  ${COLOR_YELLOW}⚠️  API 平均响应时间较慢 (${API_AVG}ms)，可能影响用户体验${COLOR_RESET}"
fi

if [ "$CACHE_HITS" -lt 10 ] && [ "$API_TOTAL" -gt 20 ]; then
  echo -e "  ${COLOR_YELLOW}💡 缓存命中率较低，考虑增加缓存时间${COLOR_RESET}"
fi

if [ "$ERROR_COUNT" -eq 0 ] && [ "$WARN_COUNT" -lt 5 ]; then
  echo -e "  ${COLOR_GREEN}✅ 系统运行良好，无明显问题${COLOR_RESET}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
