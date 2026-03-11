---
name: web-search
description: 免费全网搜索技能。使用 DuckDuckGo 搜索引擎，无需 API Key。支持搜索 + 网页抓取 + 内容提取。
metadata: { "openclaw": { "emoji": "🌐", "requires": { "bins": ["curl", "node"] } } }
---

# Web Search — 免费全网搜索

无需任何 API Key 即可搜索互联网并提取网页内容。

## 1. 搜索（DuckDuckGo）

```bash
node {baseDir}/scripts/search.mjs "搜索关键词"
node {baseDir}/scripts/search.mjs "搜索关键词" -n 10
node {baseDir}/scripts/search.mjs "搜索关键词" --region cn-zh
```

### 搜索参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| 第一个参数 | 搜索关键词（必填） | - |
| `-n <数量>` | 返回结果数量 | 10 |
| `--region <区域>` | 搜索区域，如 `cn-zh`（中国）、`us-en`（美国） | `wt-wt`（全球） |

### 搜索示例

```bash
# 基础搜索
node {baseDir}/scripts/search.mjs "加密货币钱包泄露"

# 限定区域和数量
node {baseDir}/scripts/search.mjs "crypto wallet leak 2026" -n 15 --region us-en

# 搜索特定网站内容
node {baseDir}/scripts/search.mjs "site:github.com wallet private key exposed"
```

## 2. 网页内容抓取

```bash
node {baseDir}/scripts/fetch.mjs "https://example.com/article"
node {baseDir}/scripts/fetch.mjs "https://example.com" --raw
```

### 抓取参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| 第一个参数 | 目标 URL（必填） | - |
| `--raw` | 输出原始 HTML 而非提取的文本 | false |
| `--max <字数>` | 最大输出字数 | 5000 |

## 典型工作流

对于需要全网调查的任务，按以下步骤执行：

1. **搜索**：用 `search.mjs` 搜索相关关键词，获取 URL 列表
2. **抓取**：用 `fetch.mjs` 逐个读取感兴趣的页面内容
3. **分析**：综合所有信息，给出结论
4. **多轮搜索**：如果第一轮结果不够，换关键词再搜

### 完整示例：调查加密钱包泄露

```bash
# 第一步：搜索
node {baseDir}/scripts/search.mjs "crypto wallet private key leaked 2026"

# 第二步：针对找到的 URL 抓取详情
node {baseDir}/scripts/fetch.mjs "https://example.com/security-report"

# 第三步：换个关键词继续搜
node {baseDir}/scripts/search.mjs "数字钱包 私钥泄露 安全事件"
```

## 注意事项

- 此技能完全免费，无需配置任何 API Key
- DuckDuckGo 搜索可能有速率限制，如遇到限制请稍等片刻重试
- 网页抓取不执行 JavaScript，部分动态页面可能无法获取完整内容
- 建议使用英文关键词获得更全面的搜索结果
