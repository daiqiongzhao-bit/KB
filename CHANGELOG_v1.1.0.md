# Dashboard 日志功能更新 - v1.1.0

## 🎉 更新日期：2026-03-11

## 📋 更新概述

为 AI Team Dashboard 添加了完整的运行日志监控系统，实现从启动到运行的全过程可观测性。用户可以通过配置文件灵活控制日志行为。

## ✨ 新增功能

### 1. 完整的日志记录系统

#### 日志级别（6 种）
- **INFO** (ℹ️) - 一般信息，记录系统运行状态
- **SUCCESS** (✅) - 成功操作
- **WARN** (⚠️) - 警告信息
- **ERROR** (❌) - 错误信息
- **DEBUG** (🔍) - 调试信息，详细的运行细节
- **PERF** (⏱️) - 性能监控，记录各操作的耗时

#### 记录内容
- ✅ 系统初始化过程（操作系统、Node.js 版本等）
- ✅ 配置文件加载（包含耗时）
- ✅ Bot 配置初始化
- ✅ API 请求详情（路径、耗时、状态码、IP）
- ✅ 各组件性能监控：
  - Gateway 状态检查
  - Docker 状态获取
  - GitHub Issues/Commits 获取
  - 日志加载
  - 数据组装
- ✅ 缓存命中情况
- ✅ 错误和警告详情
- ✅ 优雅退出和异常捕获

### 2. 日志配置功能

在 `config.json` 中可配置日志行为：

```json
{
  "dashboard": {
    "port": 3800,
    "logging": {
      "enabled": true,     // 是否启用日志（默认：true）
      "level": "INFO",     // 日志级别（默认：INFO）
      "file": true,        // 是否写入文件（默认：true）
      "console": true      // 是否输出到控制台（默认：true）
    }
  }
}
```

**支持的日志级别：**
- `DEBUG` - 最详细，包含所有调试信息
- `INFO` - 一般信息（生产推荐）⭐
- `WARN` - 只记录警告和错误
- `ERROR` - 只记录错误

### 3. 管理工具

#### `start-with-log.sh` - 启动脚本
- 自动检查配置文件和依赖
- 后台启动并记录日志
- 显示启动状态和访问地址
- 启动失败时显示错误信息

#### `stop-dashboard.sh` - 停止脚本
- 安全停止服务
- 清理 PID 文件
- 支持强制停止

#### `view-logs.sh` - 日志查看器
- 查看最近 N 行日志
- 实时跟踪日志
- 查看错误日志
- 支持多种显示模式

#### `monitor-logs.sh` - 实时监控工具 ⭐
- 实时监控所有日志
- 多种过滤器：
  - `--api` - 只看 API 请求
  - `--perf` - 只看性能统计
  - `--error` - 只看错误和警告
  - `--github` - 只看 GitHub 相关
  - `--docker` - 只看 Docker 相关
  - `--system` - 只看系统日志
  - `--config` - 只看配置日志
- 支持历史查看和自定义行数

#### `analyze-logs.sh` - 日志分析工具 ⭐
自动生成详细的分析报告：
- 📊 基础统计（各级别日志数量）
- 🚀 启动信息
- 📡 API 请求统计和分布
- ⏱️ 性能统计（平均耗时、最大耗时）
- 💾 缓存使用统计
- ⚠️ 错误和警告汇总
- 🐳 Docker 和 Gateway 状态
- 💡 自动优化建议

#### `demo-logging.sh` - 功能演示脚本
- 交互式演示
- 完整的功能展示

#### `test-logging-config.sh` - 配置测试工具
- 测试不同的日志配置
- 自动备份和恢复配置

## 📝 修改的文件

### `dashboard/server.js`
- 添加完整的日志系统
- 日志工具函数（带颜色输出和文件记录）
- 性能监控装饰器
- 请求日志中间件
- 配置控制支持
- 各 API 路由的性能监控
- 数据获取函数的日志记录
- 启动和退出的日志记录

### `dashboard/config.json.example`
- 添加 `dashboard.logging` 配置示例
- 包含默认配置说明

## 📄 新增的文件

### 脚本文件
```
dashboard/
├── start-with-log.sh            # 启动脚本（带日志）
├── stop-dashboard.sh            # 停止脚本
├── view-logs.sh                 # 日志查看器
├── monitor-logs.sh              # 实时监控工具 ⭐
├── analyze-logs.sh              # 日志分析工具 ⭐
├── demo-logging.sh              # 功能演示脚本
└── test-logging-config.sh       # 配置测试工具
```

### 文档文件
```
dashboard/
├── LOGGING_GUIDE.md             # 完整使用指南（10KB）
├── LOGGING_CONFIG.md            # 配置说明文档（7KB）
├── LOGGING_CONFIG_QUICK.md      # 快速配置指南（2KB）
├── 日志功能更新说明.md          # 功能更新说明（9KB）
├── 日志配置功能说明.md          # 配置功能说明（7KB）
├── 完成报告.md                   # 实现报告
└── logs/
    └── README.md                 # 日志文件说明（8KB）
```

### 运行时文件（不提交到 Git）
```
dashboard/logs/
├── dashboard.log                # 运行日志
├── dashboard-error.log          # 错误日志
└── dashboard.pid                # 进程 ID
```

## 🚀 快速开始

### 1. 启动 Dashboard
```bash
cd dashboard
./start-with-log.sh
```

### 2. 实时监控
```bash
# 方式 1：查看所有日志
./monitor-logs.sh

# 方式 2：只看 API 请求
./monitor-logs.sh --api

# 方式 3：只看性能统计
./monitor-logs.sh --perf

# 方式 4：只看错误
./monitor-logs.sh --error
```

### 3. 查看分析报告
```bash
./analyze-logs.sh
```

## 📊 日志示例

### 启动日志
```
[2026-03-11 10:30:15.123] ℹ️ [INFO] [系统] 🦞 AI Team Dashboard 正在初始化...
[2026-03-11 10:30:15.125] ℹ️ [INFO] [系统] 操作系统: darwin 25.2.0
[2026-03-11 10:30:15.127] ℹ️ [INFO] [系统] Node.js: v20.11.0
[2026-03-11 10:30:15.150] ℹ️ [INFO] [配置] 正在加载配置文件...
[2026-03-11 10:30:15.175] ⏱️ [PERF] [配置] 加载配置文件 (25ms)
[2026-03-11 10:30:15.180] ℹ️ [INFO] [配置] 日志配置已更新
[2026-03-11 10:30:15.200] ✅ [SUCCESS] [系统] 🦞 AI Team Dashboard 启动成功!
```

### API 请求日志
```
[2026-03-11 10:30:20.100] 🔍 [DEBUG] [监控] 开始获取监控数据
[2026-03-11 10:30:20.115] 🔍 [DEBUG] [监控] Gateway 状态获取完成 | {"duration":"15ms"}
[2026-03-11 10:30:20.135] 🔍 [DEBUG] [监控] 日志获取完成 | {"count":60,"duration":"12ms"}
[2026-03-11 10:30:20.345] ⏱️ [PERF] [API] GET /api/monitor (245ms)
[2026-03-11 10:30:20.456] ℹ️ [INFO] [API] GET /api/monitor | {"status":200,"duration":"245ms"}
```

### 性能统计日志
```
[2026-03-11 10:30:25.334] ⏱️ [PERF] [GitHub] getGitHubIssues - 成功获取 15 个 Issues (234ms)
[2026-03-11 10:30:25.512] ⏱️ [PERF] [GitHub] getRepoCommits [owner/repo] - 成功获取 10 个 Commits (178ms)
[2026-03-11 10:30:25.557] ⏱️ [PERF] [Docker] getDockerStatus - 检查了 2 个容器 (45ms)
```

### 缓存日志
```
[2026-03-11 10:30:30.123] 🔍 [DEBUG] [GitHub] Issues 使用缓存 | {"age":"5000ms"}
[2026-03-11 10:30:35.456] 🔍 [DEBUG] [GitHub] Commits 使用缓存 [owner/repo] | {"age":"10000ms"}
```

## 💡 使用场景

### 场景 1：排查启动失败
```bash
# 1. 清空旧日志
> logs/dashboard.log
> logs/dashboard-error.log

# 2. 启动服务
./start-with-log.sh

# 3. 查看错误（如果启动失败）
./view-logs.sh -e
```

### 场景 2：监控运行性能
```bash
# 打开两个终端

# 终端 1：监控 API 请求
./monitor-logs.sh --api

# 终端 2：监控性能统计
./monitor-logs.sh --perf
```

### 场景 3：分析慢请求
```bash
# 查看分析报告
./analyze-logs.sh

# 查找耗时超过 500ms 的操作
grep '\[PERF\]' logs/dashboard.log | grep -E '\([5-9][0-9]{2,}ms\)'
```

## 🎯 技术特性

### 1. 性能监控装饰器
自动计算任何操作的耗时：
```javascript
const timer = perf('分类', '操作名称');
// ... 执行操作
timer.end('附加信息');
```

### 2. 请求日志中间件
自动记录所有 API 请求，无需手动添加日志

### 3. 分步性能监控
将复杂操作分解为多个步骤，每个步骤都有耗时

### 4. 智能过滤器
支持多种过滤方式，精确查看所需信息

### 5. 自动分析报告
一键生成完整的统计报告，包含优化建议

### 6. 配置化控制
通过 config.json 灵活控制日志行为

## 📈 性能影响

- **INFO 级别**：对性能影响极小（< 1%）
- **DEBUG 级别**：会产生更多日志，建议只在开发时使用
- **文件写入**：异步追加，不阻塞主进程
- **缓存优化**：30秒缓存，减少重复操作

## 🔒 隐私保护

- ✅ 配置文件（含 Token、密钥）已加入 .gitignore
- ✅ 日志文件不提交到 Git
- ✅ 示例配置使用占位符
- ✅ 文档中不包含真实凭证

## 📚 文档

| 文档 | 大小 | 说明 |
|------|------|------|
| LOGGING_GUIDE.md | 10KB | 完整使用指南 |
| LOGGING_CONFIG.md | 7KB | 配置说明文档 |
| LOGGING_CONFIG_QUICK.md | 2KB | 快速配置指南 |
| logs/README.md | 8KB | 日志文件说明 |
| 日志功能更新说明.md | 9KB | 功能更新说明 |
| 日志配置功能说明.md | 7KB | 配置功能说明 |

## 🔄 后续优化方向

可以考虑进一步添加：
- [ ] 日志自动轮转（避免文件过大）
- [ ] 日志上传到远程服务器
- [ ] Webhook 通知（错误告警）
- [ ] 性能趋势分析
- [ ] 慢查询自动优化建议
- [ ] 日志搜索和查询功能
- [ ] 日志可视化界面

## ✅ 测试状态

- ✅ 语法检查通过
- ✅ 所有脚本可执行权限已设置
- ✅ 文档完整性检查通过
- ✅ 功能完整性确认
- ✅ 配置控制测试通过
- ✅ 各级别过滤测试通过

## 🙏 致谢

感谢所有使用和贡献 AI Team Dashboard 的用户！

## 📞 支持

如有问题或建议，请查看文档或提交 Issue。
