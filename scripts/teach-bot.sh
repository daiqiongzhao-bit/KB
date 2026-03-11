#!/bin/bash
# 教主 bot 创建 GitHub Issue

OPENCLAW=/opt/homebrew/bin/openclaw
GH=/opt/homebrew/bin/gh
REPO="fangxingyu123/ai-team-tasks"

MAX_RETRIES=15
WAIT_AFTER_SEND=60

check_success() {
    $GH issue list -R "$REPO" --state all --json number,title --jq '.[] | select(.title | contains("教学验证")) | .number' 2>/dev/null | head -1
}

echo "=========================================="
echo "  🦞 教学循环开始 [$(date '+%H:%M:%S')]"
echo "=========================================="

for i in $(seq 1 $MAX_RETRIES); do
    echo ""
    echo ">>> 第 ${i}/${MAX_RETRIES} 次 [$(date '+%H:%M:%S')]"

    EXISTING=$(check_success)
    if [ -n "$EXISTING" ]; then
        echo "✅ Bot 成功创建了 Issue #${EXISTING}！"
        echo "清理..."
        $GH issue close "$EXISTING" -R "$REPO" 2>/dev/null
        echo "=========================================="
        echo "  ✅ 教学成功！"
        echo "=========================================="
        exit 0
    fi

    echo "发送教学消息（独立 session，无历史干扰）..."
    # 用 --session-id 创建全新 session，避免旧上下文干扰
    RESULT=$($OPENCLAW agent --agent main --session-id "teach-$(date +%s)" --timeout 120 \
      --message '你需要立刻执行一条 shell 命令。使用 exec 工具执行以下命令：

gh issue create -R fangxingyu123/ai-team-tasks --title "教学验证：创建Issue测试" --body "教学验证" --label "status:pending" --label "role:qianwen-worker"

只需要执行这条命令，不需要做其他事情。不要用 message 工具。直接用 exec 工具执行上面的 gh 命令。' 2>&1)

    echo "Bot 返回: $(echo "$RESULT" | grep -v "Config warn" | grep -v "^\[" | grep -v "^│" | grep -v "^├" | grep -v "^◇" | grep -v "^$" | head -5)"

    echo "等 ${WAIT_AFTER_SEND}s 检查..."
    sleep $WAIT_AFTER_SEND

    EXISTING=$(check_success)
    if [ -n "$EXISTING" ]; then
        echo "✅ Bot 成功创建了 Issue #${EXISTING}！"
        echo "清理..."
        $GH issue close "$EXISTING" -R "$REPO" 2>/dev/null
        echo "=========================================="
        echo "  ✅ 教学成功！"
        echo "=========================================="
        exit 0
    fi

    echo "❌ 还没创建，继续..."
done

echo "⚠️ 达到最大重试次数"
exit 1
