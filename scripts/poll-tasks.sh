#!/bin/bash
# GitHub 任务轮询 — 迭代循环模式
# 每次轮询只处理 checklist 中的一项，直到全部完成

REPO="$GITHUB_REPO"
BOT="$BOT_NAME"
ROLE="$BOT_ROLE"
CODE_REPO_DIR="/home/node/code-repo"
SKILLS_REPO_DIR="/home/node/skills-repo"
WORKSPACE="/home/node/.openclaw/workspace"
SKILLS_DIR="/home/node/.openclaw/skills"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[$TIMESTAMP] $BOT 开始轮询任务..."

health=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:18789/healthz 2>/dev/null)
if [ "$health" != "200" ]; then
  echo "⚠️ Gateway 未就绪 (HTTP $health), 跳过本轮"
  exit 0
fi

# ── 同步技能仓的新技能 ──
if [ -d "$SKILLS_REPO_DIR/.git" ]; then
  cd "$SKILLS_REPO_DIR" && git pull --rebase 2>/dev/null
  for f in "$SKILLS_REPO_DIR"/*.md; do
    [ -f "$f" ] && cp "$f" "$SKILLS_DIR/" 2>/dev/null
  done
fi

# ── 1. 先找 in-progress 的任务（上次没做完的） ──
issue_json=$(gh issue list -R "$REPO" -l "status:in-progress" -l "role:${BOT}" \
  --json number,title,body -q '.[0]' 2>/dev/null)

# ── 2. 没有 in-progress 就找 pending 的 ──
if [ -z "$issue_json" ] || [ "$issue_json" = "null" ]; then
  issue_json=$(gh issue list -R "$REPO" -l "status:pending" -l "role:${BOT}" \
    --json number,title,body -q '.[0]' 2>/dev/null)

  if [ -z "$issue_json" ] || [ "$issue_json" = "null" ]; then
    echo "📭 没有待处理任务"
    exit 0
  fi

  number=$(echo "$issue_json" | jq -r '.number')
  gh issue edit "$number" -R "$REPO" \
    --remove-label "status:pending" \
    --add-label "status:in-progress" 2>/dev/null
  echo "📋 领取新任务 #$number"
else
  echo "🔄 继续处理进行中任务"
fi

number=$(echo "$issue_json" | jq -r '.number')
title=$(echo "$issue_json" | jq -r '.title')
body=$(echo "$issue_json" | jq -r '.body')

echo "📋 任务 #$number: $title"

# ── 3. 确定当前阶段 ──
current_phase="unknown"
if echo "$body" | grep -qi 'phase:design'; then
  current_phase="design"
elif echo "$body" | grep -qi 'phase:coding'; then
  current_phase="coding"
elif echo "$body" | grep -qi 'phase:review'; then
  current_phase="review"
fi

# ── 3b. 扫描 body 中所有 checklist（兼容有编号和无编号格式） ──
next_item=""
next_item_num=0
section_item_num=0
total_items=0
done_items=0
global_count=0

while IFS= read -r line; do
  # 兼容两种 checkbox 格式:
  #   - [ ] 1. 任务描述   (有编号)
  #   - [ ] 任务描述       (无编号)
  if echo "$line" | grep -qE '^\- \[[ x]\] '; then
    global_count=$((global_count + 1))
    total_items=$((total_items + 1))
    if echo "$line" | grep -qE '^\- \[x\]'; then
      done_items=$((done_items + 1))
    elif [ -z "$next_item" ]; then
      next_item=$(echo "$line" | sed 's/^- \[ \] \([0-9]*\.\s*\)\?//')
      next_item_num=$global_count
      section_item_num=$total_items
    fi
  fi
done <<< "$body"

if [ $total_items -eq 0 ]; then
  echo "⚠️ Issue body 中没有 checklist (- [ ] / - [x])，跳过本轮"
  echo "💡 请大龙虾在 Issue body 中添加 checklist 格式的任务清单"
  exit 0
fi

if [ -z "$next_item" ] && [ $total_items -gt 0 ]; then
  echo "✅ 当前阶段所有项目已完成 ($done_items/$total_items)"

  phase_label="设计"
  [ "$current_phase" = "coding" ] && phase_label="编码"
  [ "$current_phase" = "review" ] && phase_label="测试"

  echo "📌 ${phase_label}阶段全部完成，交接给大龙虾"

  # 移除当前 worker 标签，加上 role:dalongxia，让大龙虾接管
  gh issue edit "$number" -R "$REPO" \
    --remove-label "role:${BOT}" \
    --add-label "role:dalongxia" 2>/dev/null

  tmphandoff=$(mktemp /tmp/issue-handoff-XXXXXX.md)
  cat > "$tmphandoff" << HANDOFF_EOF
🦞 **${phase_label}阶段全部完成** ($done_items/$total_items) — 交接给大龙虾

**执行者**: ${BOT}
**完成阶段**: ${current_phase}
**完成项数**: ${done_items}/${total_items}

请大龙虾（项目经理）：
1. 审查本阶段成果
2. 分析整体项目进度
3. 决定下一步安排（编写下阶段清单、指派执行者）
HANDOFF_EOF
  gh issue comment "$number" -R "$REPO" --body-file "$tmphandoff" 2>/dev/null
  rm -f "$tmphandoff"

  exit 0
fi

echo "🎯 处理第 $section_item_num/$total_items 项: $next_item"

tmpstart=$(mktemp /tmp/issue-start-XXXXXX.md)
cat > "$tmpstart" << START_EOF
🔄 **${BOT}** 开始处理第 **$section_item_num/$total_items** 项：

> $next_item

⏰ $TIMESTAMP
START_EOF
gh issue comment "$number" -R "$REPO" --body-file "$tmpstart" 2>/dev/null
rm -f "$tmpstart"

# ── 4. 构建 prompt 给 bot ──
phase_instruction=""
case "$current_phase" in
  design)
    phase_instruction="你当前处于【设计阶段】。请对以下需求进行详细的技术设计：包括数据模型、API 接口设计、技术方案、架构说明。输出要具体、可执行。"
    ;;
  coding)
    phase_instruction="你当前处于【编码阶段】。请按照设计方案完成以下编码任务。代码必须完整、可运行、有注释。所有代码文件写到工作目录。"
    ;;
  review)
    phase_instruction="你当前处于【测试/审查阶段】。请检查以下测试条目，验证功能是否正确，输出测试报告。如果发现问题，详细说明问题位置和修复建议。"
    ;;
  *)
    phase_instruction="请认真完成以下任务。"
    ;;
esac

task_prompt="你是 ${BOT}，角色是 ${ROLE}。

## 当前任务
项目: ${title} (Issue #${number})
当前阶段: ${current_phase}
当前进度: ${done_items}/${total_items} 已完成

## 本次要处理的项目（第 ${section_item_num} 项）
${next_item}

## 工作指引
${phase_instruction}

## 项目完整背景
${body}

## 重要规则
1. 你只需处理上面【第 ${section_item_num} 项】，不要做其他项
2. 完成后给出完整的交付物
3. 如果遇到问题无法解决，说明具体卡在哪里
4. 如果学到了新技能，在 /home/node/.openclaw/skills/ 创建 .md 记录"

echo "🧠 发送任务到 AI..."
start_time=$(date +%s)

result=$(openclaw agent \
  --message "$task_prompt" \
  --session-id "github-task-$number-item-$next_item_num" \
  --thinking medium \
  --timeout 300 \
  --json 2>&1) || true

end_time=$(date +%s)
duration=$(( end_time - start_time ))

response=$(echo "$result" | jq -r '.response // empty' 2>/dev/null)
if [ -z "$response" ]; then
  response=$(echo "$result" | jq -r '.text // empty' 2>/dev/null)
fi
if [ -z "$response" ]; then
  response=$(echo "$result" | jq -r '.content // empty' 2>/dev/null)
fi
if [ -z "$response" ]; then
  response="$result"
fi

# ── 5. 代码推送 ──
commit_url=""
if [ -d "$CODE_REPO_DIR/.git" ]; then
  task_dir="$CODE_REPO_DIR/task-${number}"
  mkdir -p "$task_dir"

  has_code=false
  for f in "$WORKSPACE"/*.py "$WORKSPACE"/*.js "$WORKSPACE"/*.ts "$WORKSPACE"/*.html \
           "$WORKSPACE"/*.css "$WORKSPACE"/*.json "$WORKSPACE"/*.go "$WORKSPACE"/*.rs \
           "$WORKSPACE"/*.java "$WORKSPACE"/*.swift "$WORKSPACE"/*.sh "$WORKSPACE"/*.md \
           "$WORKSPACE"/*.yaml "$WORKSPACE"/*.yml "$WORKSPACE"/*.toml "$WORKSPACE"/*.sql \
           "$WORKSPACE"/*.jsx "$WORKSPACE"/*.tsx "$WORKSPACE"/*.vue "$WORKSPACE"/*.wxml \
           "$WORKSPACE"/*.wxss; do
    if [ -f "$f" ]; then
      cp "$f" "$task_dir/" 2>/dev/null
      has_code=true
    fi
  done

  for d in "$WORKSPACE"/*/; do
    if [ -d "$d" ] && [ "$(basename "$d")" != "." ]; then
      dname=$(basename "$d")
      case "$dname" in
        node_modules|.git|__pycache__|.openclaw|.cache|plugins) continue ;;
      esac
      cp -r "$d" "$task_dir/" 2>/dev/null
      has_code=true
    fi
  done

  if [ "$has_code" = true ]; then
    cd "$CODE_REPO_DIR"
    git add -A 2>/dev/null
    commit_msg="task-${number} item-${next_item_num}: ${next_item}

执行者: ${BOT} (${ROLE})
进度: ${next_item_num}/${total_items}
耗时: ${duration}s"
    git commit -m "$commit_msg" 2>/dev/null
    git push origin main 2>/dev/null && echo "📦 代码已推送"
    commit_hash=$(git rev-parse --short HEAD 2>/dev/null)
    commit_url="https://github.com/${GITHUB_OWNER}/${CODE_REPO}/commit/${commit_hash}"
  fi
fi

# ── 6. 技能推送 ──
skills_url=""
if [ -d "$SKILLS_REPO_DIR/.git" ]; then
  has_new_skills=false
  for f in "$SKILLS_DIR"/*.md; do
    if [ -f "$f" ]; then
      fname=$(basename "$f")
      if [ "$fname" = "github-task-worker.md" ]; then continue; fi
      if [ ! -f "$SKILLS_REPO_DIR/$fname" ] || ! diff -q "$f" "$SKILLS_REPO_DIR/$fname" >/dev/null 2>&1; then
        cp "$f" "$SKILLS_REPO_DIR/" 2>/dev/null
        has_new_skills=true
      fi
    fi
  done

  if [ "$has_new_skills" = true ]; then
    cd "$SKILLS_REPO_DIR"
    git add -A 2>/dev/null
    git commit -m "skill: 新增/更新技能 (task-${number} item-${next_item_num})" 2>/dev/null
    git push origin main 2>/dev/null && echo "🧠 技能已推送"
    skill_hash=$(git rev-parse --short HEAD 2>/dev/null)
    skills_url="https://github.com/${GITHUB_OWNER}/${SKILLS_REPO}/commit/${skill_hash}"
  fi
fi

# ── 7. 更新 Issue body：勾选已完成项 + 更新当前阶段进度 ──
new_done=$((done_items + 1))

# 用全局 item_num 定位要勾选的行（兼容有编号和无编号格式）
updated_body=$(echo "$body" | awk -v item_num="$next_item_num" '
  BEGIN { count = 0 }
  /^- \[[ x]\] / {
    count++
    if (count == item_num) {
      sub(/^- \[ \]/, "- [x]")
    }
  }
  { print }
')

# 更新进度计数（兼容多种格式）
updated_body=$(echo "$updated_body" | sed "s/进度: [0-9]*\/[0-9]*/进度: ${new_done}\/${total_items}/")
if [ "$current_phase" = "design" ]; then
  updated_body=$(echo "$updated_body" | sed "s/设计: [0-9]*\/[0-9]*/设计: ${new_done}\/${total_items}/")
elif [ "$current_phase" = "coding" ]; then
  updated_body=$(echo "$updated_body" | sed "s/编码: [0-9]*\/[0-9]*/编码: ${new_done}\/${total_items}/")
elif [ "$current_phase" = "review" ]; then
  updated_body=$(echo "$updated_body" | sed "s/测试: [0-9]*\/[0-9]*/测试: ${new_done}\/${total_items}/")
fi

tmpbody=$(mktemp /tmp/issue-body-XXXXXX.md)
printf '%s' "$updated_body" > "$tmpbody"
gh issue edit "$number" -R "$REPO" --body-file "$tmpbody" 2>/dev/null
edit_rc=$?
rm -f "$tmpbody"
if [ $edit_rc -ne 0 ]; then
  echo "⚠️ Issue body 更新失败 (rc=$edit_rc)"
fi
echo "📝 已勾选第 $section_item_num 项，进度: $new_done/$total_items"

# ── 8. 评论交付结果 ──
max_len=60000
if [ ${#response} -gt $max_len ]; then
  response="${response:0:$max_len}

...(输出过长，已截断)"
fi

finish_time=$(date '+%Y-%m-%d %H:%M:%S')

extra_section=""
if [ -n "$commit_url" ]; then
  extra_section="
**📦 代码已提交**: [查看 commit](${commit_url})"
fi
if [ -n "$skills_url" ]; then
  extra_section="${extra_section}
**🧠 技能已更新**: [查看 commit](${skills_url})"
fi

tmpcomment=$(mktemp /tmp/issue-comment-XXXXXX.md)
cat > "$tmpcomment" << COMMENT_EOF
## ✅ 第 ${section_item_num}/${total_items} 项完成

**执行者**: ${BOT} (${ROLE})
**完成项**: ${next_item}
**进度**: ${new_done}/${total_items}
**耗时**: ${duration} 秒
**完成时间**: ${finish_time}${extra_section}

---

${response}
COMMENT_EOF
gh issue comment "$number" -R "$REPO" --body-file "$tmpcomment" 2>/dev/null
comment_rc=$?
rm -f "$tmpcomment"
if [ $comment_rc -ne 0 ]; then
  echo "⚠️ 完成评论发布失败 (rc=$comment_rc)"
fi

# ── 9. 判断是否全部完成 → 交接给大龙虾 ──
if [ $new_done -ge $total_items ]; then
  echo "🎉 当前阶段所有项目已完成！交接给大龙虾"

  phase_label="设计"
  [ "$current_phase" = "coding" ] && phase_label="编码"
  [ "$current_phase" = "review" ] && phase_label="测试"

  # 移除当前 worker 标签，加上 role:dalongxia
  gh issue edit "$number" -R "$REPO" \
    --remove-label "role:${BOT}" \
    --add-label "role:dalongxia" 2>/dev/null

  tmphandoff=$(mktemp /tmp/issue-handoff-XXXXXX.md)
  cat > "$tmphandoff" << HANDOFF_EOF
🦞 **${phase_label}阶段全部完成** ($total_items/$total_items) — 交接给大龙虾

**执行者**: ${BOT}
**完成阶段**: ${current_phase}
**完成项数**: ${total_items}/${total_items}

请大龙虾（项目经理）：
1. 审查本阶段成果
2. 分析整体项目进度
3. 决定下一步安排（编写下阶段清单、指派执行者）
HANDOFF_EOF
  gh issue comment "$number" -R "$REPO" --body-file "$tmphandoff" 2>/dev/null
  rm -f "$tmphandoff"
else
  echo "📌 还剩 $((total_items - new_done)) 项未完成，等待下次轮询"
fi

echo "✅ 第 $section_item_num/$total_items 项处理完成 (耗时 ${duration}s)"
