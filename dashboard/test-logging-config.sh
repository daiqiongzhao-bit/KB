#!/bin/bash

# 测试不同的日志配置
# 展示各种配置的效果

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

clear
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${CYAN}🧪 Dashboard 日志配置测试${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 备份当前配置
if [ -f "config.json" ]; then
  echo -e "${YELLOW}备份当前配置...${NC}"
  cp config.json config.json.backup
  echo -e "${GREEN}✅ 已备份到 config.json.backup${NC}"
  echo ""
fi

# 测试配置函数
test_config() {
  local config_name=$1
  local config_json=$2
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e "${CYAN}测试配置: $config_name${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "配置内容:"
  echo "$config_json" | python3 -m json.tool 2>/dev/null || echo "$config_json"
  echo ""
  
  read -p "是否测试此配置？(y/N) " response
  if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo "跳过此配置"
    echo ""
    return
  fi
  
  # 更新 config.json 中的 logging 配置
  if [ -f "config.json.backup" ]; then
    cp config.json.backup config.json
  fi
  
  # 使用 Python 更新 JSON（如果没有 Python 就手动提示）
  if command -v python3 &> /dev/null; then
    python3 << EOF
import json
with open('config.json', 'r') as f:
    config = json.load(f)
config['dashboard']['logging'] = json.loads('''$config_json''')
with open('config.json', 'w') as f:
    json.dump(config, f, indent=2, ensure_ascii=False)
EOF
    echo -e "${GREEN}✅ 配置已更新${NC}"
  else
    echo -e "${YELLOW}⚠️  请手动更新 config.json 中的 dashboard.logging 配置${NC}"
    read -p "按 Enter 继续..." dummy
  fi
  
  # 重启服务
  echo ""
  echo "重启 Dashboard..."
  ./stop-dashboard.sh > /dev/null 2>&1
  sleep 2
  
  # 清空旧日志
  > logs/dashboard.log 2>/dev/null
  
  ./start-with-log.sh
  
  echo ""
  echo "等待 3 秒..."
  sleep 3
  
  # 显示日志
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e "${CYAN}日志输出:${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if [ -f "logs/dashboard.log" ]; then
    head -30 logs/dashboard.log
  else
    echo "日志文件不存在"
  fi
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  read -p "按 Enter 继续下一个测试..." dummy
  echo ""
}

# 配置 1: 默认配置（INFO 级别）
test_config "默认配置 (INFO 级别)" '{
  "enabled": true,
  "level": "INFO",
  "file": true,
  "console": true
}'

# 配置 2: DEBUG 级别
test_config "调试模式 (DEBUG 级别)" '{
  "enabled": true,
  "level": "DEBUG",
  "file": true,
  "console": true
}'

# 配置 3: 只记录警告和错误
test_config "只记录警告 (WARN 级别)" '{
  "enabled": true,
  "level": "WARN",
  "file": true,
  "console": true
}'

# 配置 4: 只记录错误
test_config "只记录错误 (ERROR 级别)" '{
  "enabled": true,
  "level": "ERROR",
  "file": true,
  "console": true
}'

# 配置 5: 关闭日志
test_config "关闭日志" '{
  "enabled": false,
  "level": "INFO",
  "file": false,
  "console": false
}'

# 恢复配置
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 测试完成！${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "config.json.backup" ]; then
  read -p "是否恢复原始配置？(Y/n) " response
  if [[ ! "$response" =~ ^[Nn]$ ]]; then
    mv config.json.backup config.json
    echo -e "${GREEN}✅ 已恢复原始配置${NC}"
    echo ""
    echo "重启 Dashboard 使配置生效："
    echo "  ./stop-dashboard.sh && ./start-with-log.sh"
  else
    echo -e "${YELLOW}保留测试配置，备份文件: config.json.backup${NC}"
  fi
fi

echo ""
echo "📚 更多信息："
echo "  cat LOGGING_CONFIG.md    查看完整配置说明"
echo "  cat LOGGING_GUIDE.md     查看使用指南"
echo ""
