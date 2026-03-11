# Dashboard 运行日志使用指南

## 📋 概述

Dashboard 现已集成完整的运行日志系统，可以实时监控：
- ✅ 启动状态和配置加载
- 📡 API 请求详情和耗时
- ⏱️ 各组件加载性能
- 💾 缓存使用情况
- 🐳 Docker 和 Gateway 状态
- ⚠️ 错误和警告信息

**日志功能默认开启**，可以通过 `config.json` 配置来控制日志行为。

## ⚙️ 日志配置

在 `config.json` 中添加 `dashboard.logging` 配置：

```json
{
  "dashboard": {
    "port": 3800,
    "logging": {
      "enabled": true,     // 是否启用日志（默认：true）
      "level": "INFO",     // 日志级别：DEBUG/INFO/WARN/ERROR（默认：INFO）
      "file": true,        // 是否写入文件（默认：true）
      "console": true      // 是否输出到控制台（默认：true）
    }
  }
}
```

### 日志级别说明

- **DEBUG** - 最详细，包含所有调试信息（开发时使用）
- **INFO** - 一般信息，记录重要运行状态（生产推荐）⭐
- **WARN** - 警告信息，需要关注但不影响运行
- **ERROR** - 只记录错误信息

详细配置说明请查看 `LOGGING_CONFIG.md`

## 🚀 快速开始

### 1. 启动 Dashboard（带日志记录）

```bash
cd /Users/fang/Desktop/ai-team/dashboard

# 使用带日志的方式启动
./start-with-log.sh
```

启动成功后，你会看到类似输出：
```
✅ Dashboard 启动成功！
   PID: 12345
   访问: http://localhost:3800
   
💡 查看日志：
   实时日志: tail -f logs/dashboard.log
   错误日志: tail -f logs/dashboard-error.log
   停止服务: ./stop-dashboard.sh
```

### 2. 实时监控运行日志

```bash
# 方式 1：查看所有日志
./monitor-logs.sh

# 方式 2：只看 API 请求
./monitor-logs.sh --api

# 方式 3：只看性能统计
./monitor-logs.sh --perf

# 方式 4：只看错误和警告
./monitor-logs.sh --error
```

### 3. 查看分析报告

```bash
# 生成完整的日志分析报告
./analyze-logs.sh
```

报告包含：
- 📊 基础统计（各级别日志数量）
- 🚀 启动信息和配置加载状态
- 📡 API 请求分布和频率
- ⏱️ 性能统计（平均/最大耗时）
- 💾 缓存命中率
- ⚠️ 错误和警告汇总
- 💡 优化建议

## 📊 日志内容详解

### 启动阶段日志

Dashboard 启动时会记录以下信息：

```
[2026-03-11 10:30:15.123] ℹ️ [INFO] [系统] 🦞 AI Team Dashboard 正在初始化...
[2026-03-11 10:30:15.125] ℹ️ [INFO] [系统] 操作系统: darwin 25.2.0
[2026-03-11 10:30:15.127] ℹ️ [INFO] [系统] Node.js: v20.11.0
[2026-03-11 10:30:15.129] ℹ️ [INFO] [系统] 工作目录: /Users/fang/Desktop/ai-team/dashboard
[2026-03-11 10:30:15.150] ℹ️ [INFO] [配置] 正在加载配置文件...
[2026-03-11 10:30:15.175] ⏱️ [PERF] [配置] 加载配置文件 (25ms)
[2026-03-11 10:30:15.180] ✅ [SUCCESS] [配置] 配置文件加载成功
[2026-03-11 10:30:15.200] ✅ [SUCCESS] [系统] 🦞 AI Team Dashboard 启动成功!
[2026-03-11 10:30:15.205] ✅ [SUCCESS] [系统] 访问地址: http://localhost:3800
```

### API 请求日志

每个 API 请求都会记录：

```
[2026-03-11 10:30:20.456] ℹ️ [INFO] [API] GET /api/monitor | {"status":200,"duration":"245ms","ip":"::1"}
[2026-03-11 10:30:25.678] ℹ️ [INFO] [API] GET /api/status | {"status":200,"duration":"512ms","ip":"::1"}
[2026-03-11 10:30:30.890] ℹ️ [INFO] [API] GET /api/bot/leader | {"status":200,"duration":"123ms","ip":"::1"}
```

### 性能监控日志

详细记录各组件的加载耗时：

```
# 监控数据获取
[2026-03-11 10:30:20.100] 🔍 [DEBUG] [监控] 开始获取监控数据
[2026-03-11 10:30:20.115] 🔍 [DEBUG] [监控] Gateway 状态获取完成 | {"duration":"15ms"}
[2026-03-11 10:30:20.123] 🔍 [DEBUG] [监控] Gateway 进程信息获取完成 | {"duration":"8ms"}
[2026-03-11 10:30:20.135] 🔍 [DEBUG] [监控] 日志获取完成 | {"count":60,"duration":"12ms"}
[2026-03-11 10:30:20.170] 🔍 [DEBUG] [监控] Docker 状态获取完成 | {"duration":"35ms"}
[2026-03-11 10:30:20.345] ⏱️ [PERF] [API] GET /api/monitor (245ms)
[2026-03-11 10:30:20.350] ℹ️ [INFO] [监控] 监控数据返回成功 | {"workers":2,"logs":20,"timeline":5,"gatewayStatus":"online"}

# GitHub 数据获取
[2026-03-11 10:30:25.100] ⏱️ [PERF] [GitHub] getGitHubIssues - 成功获取 15 个 Issues (234ms)
[2026-03-11 10:30:25.500] ⏱️ [PERF] [GitHub] getRepoCommits [owner/repo] - 成功获取 10 个 Commits (178ms)

# Docker 状态检查
[2026-03-11 10:30:30.100] ⏱️ [PERF] [Docker] getDockerStatus - 检查了 2 个容器 (45ms)
```

### 缓存日志

记录缓存命中情况，帮助优化性能：

```
[2026-03-11 10:30:35.123] 🔍 [DEBUG] [GitHub] Issues 使用缓存 | {"age":"5000ms"}
[2026-03-11 10:30:40.456] 🔍 [DEBUG] [GitHub] Commits 使用缓存 [owner/repo] | {"age":"10000ms"}
```

### 健康检查日志

定期检查服务状态：

```
# Gateway 健康检查通过
[2026-03-11 10:30:45.100] 🔍 [DEBUG] [Gateway] 健康检查通过 | {"latency":"15ms"}

# Gateway 健康检查失败
[2026-03-11 10:31:00.200] ⚠️ [WARN] [Gateway] 健康检查失败 | {"code":"000","latency":"30ms"}
```

### 错误和警告日志

```
# 警告
[2026-03-11 10:35:00.123] ⚠️ [WARN] [GitHub] Issues 获取失败，返回缓存 | {"repo":"owner/repo"}
[2026-03-11 10:35:05.456] ⚠️ [WARN] [Docker] Docker 状态获取失败或无容器运行

# 错误
[2026-03-11 10:40:00.789] ❌ [ERROR] [GitHub] Issues 解析失败 | {"error":"Unexpected token"}
[2026-03-11 10:40:05.012] ❌ [ERROR] [配置] 配置文件加载失败 | {"error":"ENOENT: no such file"}
```

## 🔍 常见使用场景

### 场景 1：排查启动失败

```bash
# 1. 清空旧日志
> logs/dashboard.log
> logs/dashboard-error.log

# 2. 启动服务
./start-with-log.sh

# 3. 如果启动失败，脚本会自动显示错误
# 或者手动查看错误日志
./view-logs.sh -e
```

### 场景 2：监控运行性能

```bash
# 打开三个终端

# 终端 1：监控所有日志
./monitor-logs.sh

# 终端 2：只监控性能
./monitor-logs.sh --perf

# 终端 3：只监控错误
./monitor-logs.sh --error
```

### 场景 3：分析慢请求

```bash
# 1. 查看分析报告
./analyze-logs.sh

# 2. 查找耗时超过 500ms 的请求
grep '\[PERF\]' logs/dashboard.log | grep -E '\([5-9][0-9]{2,}ms\)'

# 3. 统计各 API 平均耗时
grep '\[PERF\].*GET /api/monitor' logs/dashboard.log | \
  grep -oE '\([0-9]+ms\)' | tr -d '()ms' | \
  awk '{sum+=$1; count++} END {print "平均:", sum/count "ms"}'
```

### 场景 4：检查缓存效率

```bash
# 查看缓存命中次数
grep '使用缓存' logs/dashboard.log | wc -l

# 查看缓存详情
grep '使用缓存' logs/dashboard.log | tail -20

# 查看缓存未命中（直接获取）的情况
grep '\[PERF\].*getGitHubIssues' logs/dashboard.log
```

### 场景 5：监控 API 请求频率

```bash
# 实时监控 API 请求
./monitor-logs.sh --api

# 统计各 API 调用次数
grep '\[API\]' logs/dashboard.log | \
  grep -oE 'GET /api/[^ ]+|POST /api/[^ ]+' | \
  sort | uniq -c | sort -rn

# 查看最近 10 次请求
grep '\[API\]' logs/dashboard.log | tail -10
```

### 场景 6：排查 Docker 问题

```bash
# 只看 Docker 相关日志
./monitor-logs.sh --docker

# 查看 Docker 状态检查历史
grep '\[Docker\]' logs/dashboard.log

# 查看容器数量变化
grep 'getDockerStatus - 检查了' logs/dashboard.log
```

### 场景 7：检查 GitHub API 状态

```bash
# 只看 GitHub 相关日志
./monitor-logs.sh --github

# 查看 Issues 获取情况
grep 'getGitHubIssues' logs/dashboard.log

# 查看 Commits 获取情况
grep 'getRepoCommits' logs/dashboard.log
```

## 📈 性能优化指南

### 根据日志优化缓存

如果你看到大量的缓存未命中：
```bash
# 检查缓存命中率
CACHE_HITS=$(grep '使用缓存' logs/dashboard.log | wc -l)
API_CALLS=$(grep '\[PERF\].*get' logs/dashboard.log | wc -l)
echo "缓存命中率: $(echo "scale=2; $CACHE_HITS/$API_CALLS*100" | bc)%"
```

如果命中率低于 50%，可以考虑：
1. 增加 `server.js` 中的 `CACHE_TTL` 值（默认 30 秒）
2. 减少前端的刷新频率

### 根据日志优化请求

如果看到大量慢请求：
```bash
# 查找耗时超过 1 秒的请求
grep '\[PERF\]' logs/dashboard.log | grep -E '\([0-9]{4,}ms\)'
```

优化建议：
1. 减少单次请求的数据量（如 Issues limit）
2. 增加缓存时间
3. 考虑异步加载非关键数据

### 根据日志优化 Docker 检查

如果 Docker 检查频繁失败：
```bash
# 查看失败率
grep 'Docker 状态获取失败' logs/dashboard.log | wc -l
```

优化建议：
1. 检查 docker-compose.yml 位置
2. 确保 Docker 服务运行
3. 减少容器数量

## 🛠️ 工具命令速查

| 命令 | 功能 | 示例 |
|------|------|------|
| `./start-with-log.sh` | 启动 Dashboard（带日志） | - |
| `./stop-dashboard.sh` | 停止 Dashboard | - |
| `./monitor-logs.sh` | 实时监控所有日志 | - |
| `./monitor-logs.sh --api` | 只监控 API 请求 | - |
| `./monitor-logs.sh --perf` | 只监控性能数据 | - |
| `./monitor-logs.sh --error` | 只监控错误警告 | - |
| `./monitor-logs.sh --github` | 只监控 GitHub 相关 | - |
| `./monitor-logs.sh --docker` | 只监控 Docker 相关 | - |
| `./analyze-logs.sh` | 生成分析报告 | - |
| `./view-logs.sh -f` | 实时查看日志 | - |
| `./view-logs.sh -e` | 查看错误日志 | - |

## 📝 日志示例完整流程

从启动到处理请求的完整日志示例：

```
# 1. 系统初始化
[2026-03-11 10:30:15.123] ℹ️ [INFO] [系统] 🦞 AI Team Dashboard 正在初始化...
[2026-03-11 10:30:15.150] ⏱️ [PERF] [配置] 加载配置文件 (25ms)
[2026-03-11 10:30:15.200] ✅ [SUCCESS] [系统] 🦞 AI Team Dashboard 启动成功!

# 2. 第一个监控请求（无缓存）
[2026-03-11 10:30:20.100] 🔍 [DEBUG] [监控] 开始获取监控数据
[2026-03-11 10:30:20.334] ⏱️ [PERF] [GitHub] getGitHubIssues - 成功获取 15 个 Issues (234ms)
[2026-03-11 10:30:20.390] ⏱️ [PERF] [Docker] getDockerStatus - 检查了 2 个容器 (56ms)
[2026-03-11 10:30:20.456] ⏱️ [PERF] [API] GET /api/monitor (356ms)

# 3. 第二个监控请求（使用缓存，更快）
[2026-03-11 10:30:25.100] 🔍 [DEBUG] [监控] 开始获取监控数据
[2026-03-11 10:30:25.110] 🔍 [DEBUG] [GitHub] Issues 使用缓存 | {"age":"5010ms"}
[2026-03-11 10:30:25.166] ⏱️ [PERF] [Docker] getDockerStatus - 检查了 2 个容器 (56ms)
[2026-03-11 10:30:25.200] ⏱️ [PERF] [API] GET /api/monitor (100ms)

# 4. 状态总览请求
[2026-03-11 10:30:30.100] 🔍 [DEBUG] [状态] 开始获取总览数据
[2026-03-11 10:30:30.110] 🔍 [DEBUG] [GitHub] Issues 使用缓存 | {"age":"10010ms"}
[2026-03-11 10:30:30.612] ⏱️ [PERF] [API] GET /api/status (512ms)
```

## 💡 最佳实践

1. **启动时清空旧日志**：避免日志文件过大
2. **使用过滤功能**：只关注你需要的日志类型
3. **定期查看分析报告**：了解系统运行状况
4. **关注性能日志**：及时发现性能瓶颈
5. **保存重要日志**：在修复问题前备份相关日志

## 🎯 下一步

现在你可以：
1. 启动 Dashboard：`./start-with-log.sh`
2. 打开浏览器访问：`http://localhost:3800`
3. 同时监控日志：`./monitor-logs.sh --api`
4. 查看性能分析：`./analyze-logs.sh`

祝使用愉快！🦞
