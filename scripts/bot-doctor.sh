#!/bin/bash
# bot-doctor.sh — AI Team 三 Bot 健康监控 & 自动重启
# 用法:
#   ./bot-doctor.sh              一次性检查 + 修复
#   ./bot-doctor.sh --watch      持续监控（每 60 秒）
#   ./bot-doctor.sh --status     仅查看状态，不修复
#   ./bot-doctor.sh --restart all|leader|kimi|qianwen|dashboard  手动重启

COMPOSE_DIR="/Users/fang/Desktop/ai-team"
DASHBOARD_DIR="/Users/fang/Desktop/ai-team/dashboard"
GATEWAY_URL="http://127.0.0.1:18789/healthz"
DASHBOARD_URL="http://localhost:3800"
WATCH_INTERVAL=60
LOG_FILE="/Users/fang/Desktop/ai-team/logs/bot-doctor.log"

mkdir -p "$(dirname "$LOG_FILE")"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'

log() { local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"; echo "$msg" >> "$LOG_FILE"; echo -e "$msg"; }

check_leader() {
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$GATEWAY_URL" 2>/dev/null)
  [ "$code" = "200" ]
}

check_container() {
  local state
  state=$(docker inspect --format='{{.State.Status}}' "$1" 2>/dev/null)
  [ "$state" = "running" ]
}

check_dashboard() {
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "$DASHBOARD_URL" 2>/dev/null)
  [ "$code" = "200" ]
}

restart_leader() {
  log "${YELLOW}🦞 正在重启大龙虾 Gateway...${NC}"
  launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/ai.openclaw.gateway.plist 2>/dev/null
  sleep 2
  launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/ai.openclaw.gateway.plist 2>/dev/null
  sleep 3
  if check_leader; then
    log "${GREEN}✅ 大龙虾 Gateway 重启成功${NC}"
    return 0
  else
    log "${RED}❌ 大龙虾 Gateway 重启失败，尝试 openclaw gateway...${NC}"
    openclaw gateway &>/dev/null &
    sleep 5
    if check_leader; then
      log "${GREEN}✅ 大龙虾 Gateway 通过 openclaw 启动成功${NC}"
      return 0
    fi
    log "${RED}❌ 大龙虾 Gateway 启动失败！${NC}"
    return 1
  fi
}

restart_container() {
  local name="$1" display="$2"
  log "${YELLOW}🔄 正在重启 ${display} (${name})...${NC}"
  docker restart "$name" 2>/dev/null
  sleep 5
  if check_container "$name"; then
    log "${GREEN}✅ ${display} 重启成功${NC}"
    return 0
  else
    log "${YELLOW}尝试 docker compose up...${NC}"
    cd "$COMPOSE_DIR" && docker compose up -d "$name" 2>/dev/null
    sleep 5
    if check_container "$name"; then
      log "${GREEN}✅ ${display} 通过 compose 启动成功${NC}"
      return 0
    fi
    log "${RED}❌ ${display} 启动失败！${NC}"
    return 1
  fi
}

restart_dashboard() {
  log "${YELLOW}📊 正在重启 Dashboard...${NC}"
  lsof -ti :3800 | xargs kill 2>/dev/null
  sleep 1
  cd "$DASHBOARD_DIR" && nohup node server.js >> "$LOG_FILE" 2>&1 &
  sleep 2
  if check_dashboard; then
    log "${GREEN}✅ Dashboard 重启成功${NC}"
    return 0
  fi
  log "${RED}❌ Dashboard 启动失败！${NC}"
  return 1
}

print_status() {
  echo ""
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  🏥 AI Team Bot Doctor  $(date '+%H:%M:%S')${NC}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  if check_leader; then
    echo -e "  🦞 大龙虾 (Gateway)    ${GREEN}● 运行中${NC}"
  else
    echo -e "  🦞 大龙虾 (Gateway)    ${RED}✕ 已停止${NC}"
  fi

  if check_container "ai-team-kimi"; then
    echo -e "  🔬 智囊团 (kimi)       ${GREEN}● 运行中${NC}"
  else
    echo -e "  🔬 智囊团 (kimi)       ${RED}✕ 已停止${NC}"
  fi

  if check_container "ai-team-qianwen"; then
    echo -e "  ⚡ 全栈高手 (qianwen)  ${GREEN}● 运行中${NC}"
  else
    echo -e "  ⚡ 全栈高手 (qianwen)  ${RED}✕ 已停止${NC}"
  fi

  if check_dashboard; then
    echo -e "  📊 Dashboard (:3800)   ${GREEN}● 运行中${NC}"
  else
    echo -e "  📊 Dashboard (:3800)   ${YELLOW}✕ 未运行${NC}"
  fi

  echo ""
}

do_heal() {
  local fixed=0

  if ! check_leader; then
    restart_leader && fixed=$((fixed+1))
  fi

  if ! check_container "ai-team-kimi"; then
    restart_container "ai-team-kimi" "智囊团" && fixed=$((fixed+1))
  fi

  if ! check_container "ai-team-qianwen"; then
    restart_container "ai-team-qianwen" "全栈高手" && fixed=$((fixed+1))
  fi

  if ! check_dashboard; then
    restart_dashboard && fixed=$((fixed+1))
  fi

  if [ $fixed -eq 0 ]; then
    log "${GREEN}✅ 所有 Bot 运行正常，无需修复${NC}"
  else
    log "${CYAN}🔧 本次修复了 ${fixed} 个服务${NC}"
  fi
}

case "${1:-}" in
  --status|-s)
    print_status
    ;;
  --watch|-w)
    log "🏥 Bot Doctor 持续监控模式启动（间隔 ${WATCH_INTERVAL}s）"
    while true; do
      print_status
      do_heal
      echo -e "\n${CYAN}  下次检查: ${WATCH_INTERVAL}s 后 (Ctrl+C 退出)${NC}\n"
      sleep "$WATCH_INTERVAL"
    done
    ;;
  --restart|-r)
    target="${2:-all}"
    case "$target" in
      all)
        restart_leader; restart_container "ai-team-kimi" "智囊团"; restart_container "ai-team-qianwen" "全栈高手"; restart_dashboard ;;
      leader|dalongxia)
        restart_leader ;;
      kimi)
        restart_container "ai-team-kimi" "智囊团" ;;
      qianwen)
        restart_container "ai-team-qianwen" "全栈高手" ;;
      dashboard)
        restart_dashboard ;;
      *)
        echo "用法: $0 --restart [all|leader|kimi|qianwen|dashboard]"; exit 1 ;;
    esac
    print_status
    ;;
  --help|-h)
    echo "🏥 AI Team Bot Doctor"
    echo ""
    echo "用法:"
    echo "  $0                 一次性检查 + 自动修复"
    echo "  $0 --status        仅查看状态"
    echo "  $0 --watch         持续监控（每 ${WATCH_INTERVAL}s）"
    echo "  $0 --restart all   手动重启所有"
    echo "  $0 --restart kimi  手动重启指定 bot"
    echo ""
    echo "支持的 bot: leader, kimi, qianwen, dashboard, all"
    ;;
  *)
    print_status
    do_heal
    ;;
esac
