#!/bin/bash

echo "🦞 AI Team Bot [$BOT_NAME] 启动中..."
echo "   角色: $BOT_ROLE"
echo "   仓库: $GITHUB_REPO"
echo "   代码仓: $CODE_REPO"
echo "   技能仓: $SKILLS_REPO"
echo "   轮询: 每 ${POLL_INTERVAL} 分钟"

export GH_TOKEN="$GITHUB_TOKEN"
echo "✅ GitHub 认证已配置"

git config --global user.name "$BOT_NAME"
git config --global user.email "${BOT_NAME}@ai-team.local"
git config --global credential.helper store
echo "https://x-access-token:${GITHUB_TOKEN}@github.com" > /home/node/.git-credentials
echo "✅ Git 已配置"

CODE_REPO_DIR="/home/node/code-repo"
if [ -n "$CODE_REPO" ]; then
  if [ ! -d "$CODE_REPO_DIR/.git" ]; then
    git clone "https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_OWNER}/${CODE_REPO}.git" "$CODE_REPO_DIR" 2>/dev/null
    echo "✅ 代码仓已克隆: $CODE_REPO"
  else
    cd "$CODE_REPO_DIR" && git pull --rebase 2>/dev/null
    echo "✅ 代码仓已更新: $CODE_REPO"
  fi
fi

SKILLS_REPO_DIR="/home/node/skills-repo"
if [ -n "$SKILLS_REPO" ]; then
  if [ ! -d "$SKILLS_REPO_DIR/.git" ]; then
    git clone "https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_OWNER}/${SKILLS_REPO}.git" "$SKILLS_REPO_DIR" 2>/dev/null
    echo "✅ 技能仓已克隆: $SKILLS_REPO"
  else
    cd "$SKILLS_REPO_DIR" && git pull --rebase 2>/dev/null
    echo "✅ 技能仓已更新: $SKILLS_REPO"
  fi
fi

if [ -f /home/node/.openclaw-config/openclaw.json ]; then
  cp /home/node/.openclaw-config/openclaw.json /home/node/.openclaw/openclaw.json
  echo "✅ OpenClaw 配置已复制"
fi

if [ -d /home/node/.openclaw-config/skills ]; then
  cp -r /home/node/.openclaw-config/skills/* /home/node/.openclaw/skills/ 2>/dev/null
  echo "✅ Skills 已复制"
fi

if [ -d "$SKILLS_REPO_DIR" ]; then
  for f in "$SKILLS_REPO_DIR"/*.md; do
    [ -f "$f" ] && cp "$f" /home/node/.openclaw/skills/ 2>/dev/null
  done
  echo "✅ 技能仓 Skills 已加载到 OpenClaw"
fi

mkdir -p /home/node/.openclaw/agents/main/agent

cat > /home/node/.openclaw/agents/main/agent/auth-profiles.json <<EOF
{
  "version": 1,
  "profiles": {
    "coding-plan:default": {
      "type": "api_key",
      "provider": "coding-plan",
      "key": "$CODING_PLAN_API_KEY"
    }
  }
}
EOF
echo "✅ API Key 已写入"

echo "🔄 启动任务轮询 (后台, 每 ${POLL_INTERVAL} 分钟)..."
echo "{\"startedAt\":$(date +%s),\"interval\":$((POLL_INTERVAL * 60))}" > /tmp/poll-meta.json
(
  sleep 30
  echo "[$(date)] 轮询守护进程启动"
  while true; do
    /usr/local/bin/poll-tasks.sh 2>&1 | tee -a /tmp/poll.log || true
    date +%s > /tmp/last-poll.txt
    sleep $((POLL_INTERVAL * 60))
  done
) &

echo "🚀 启动 OpenClaw Gateway..."
exec openclaw gateway --allow-unconfigured
