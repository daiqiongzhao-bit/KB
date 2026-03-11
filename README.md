# AI Team Dashboard

> 一个功能强大的 AI 开发团队协作平台，支持 GitHub Issues 任务管理、Bot 监控和实时日志系统。

## 🌟 特性

### 核心功能
- 📊 **Dashboard 仪表盘** - 实时监控所有 Bot 的运行状态
- 📋 **GitHub Issues 集成** - 自动管理任务分配和进度跟踪
- 🤖 **多 Bot 协作** - Leader Bot + Worker Bots 协同工作
- 🐳 **Docker 支持** - 容器化部署，易于扩展
- 📡 **实时监控** - 完整的日志系统和性能分析

### v1.1.0 新增功能 ✨

#### 完整的日志监控系统
- ✅ **6 种日志级别**（INFO/SUCCESS/WARN/ERROR/DEBUG/PERF）
- ✅ **性能监控**：自动记录各操作耗时
- ✅ **智能过滤**：7 种过滤器快速定位问题
- ✅ **分析报告**：一键生成性能和统计报告
- ✅ **配置化**：通过 config.json 灵活控制

#### 管理工具
- 🚀 `start-with-log.sh` - 启动脚本（带日志记录）
- 🛑 `stop-dashboard.sh` - 停止脚本
- 📄 `view-logs.sh` - 日志查看器
- 📡 `monitor-logs.sh` - 实时监控工具（⭐ 推荐）
- 📊 `analyze-logs.sh` - 日志分析工具（⭐ 推荐）
- 🎬 `demo-logging.sh` - 功能演示
- 🧪 `test-logging-config.sh` - 配置测试

## 🚀 快速开始

### 1. 安装依赖

```bash
cd dashboard
npm install
```

### 2. 配置

复制配置模板并填写你的信息：

```bash
cp config.json.example config.json
vim config.json
```

**重要提示**：`config.json` 包含敏感信息（Token、密钥等），已加入 `.gitignore`，请勿提交到 Git。

### 3. 启动 Dashboard

```bash
# 方式 1：带日志记录（推荐）
./start-with-log.sh

# 方式 2：直接启动
npm start
```

### 4. 访问

打开浏览器访问：`http://localhost:3800`

## 📊 日志功能使用

### 实时监控

```bash
# 查看所有日志
./monitor-logs.sh

# 只看 API 请求
./monitor-logs.sh --api

# 只看性能统计
./monitor-logs.sh --perf

# 只看错误和警告
./monitor-logs.sh --error
```

### 分析报告

```bash
# 生成完整的分析报告
./analyze-logs.sh
```

报告包含：
- 📊 基础统计
- 📡 API 请求分布
- ⏱️ 性能统计（平均/最大耗时）
- 💾 缓存使用率
- 💡 自动优化建议

### 日志配置

在 `config.json` 中配置日志行为：

```json
{
  "dashboard": {
    "port": 3800,
    "logging": {
      "enabled": true,     // 是否启用日志
      "level": "INFO",     // 日志级别：DEBUG/INFO/WARN/ERROR
      "file": true,        // 是否写入文件
      "console": true      // 是否输出到控制台
    }
  }
}
```

## 📚 文档

- [完整使用指南](dashboard/LOGGING_GUIDE.md) - 日志功能详细说明
- [配置说明](dashboard/LOGGING_CONFIG.md) - 日志配置详解
- [快速配置](dashboard/LOGGING_CONFIG_QUICK.md) - 5 分钟配置指南
- [更新日志](CHANGELOG_v1.1.0.md) - v1.1.0 版本更新详情
- [Dashboard README](dashboard/README.md) - Dashboard 详细说明

## 🏗️ 架构

```
ai-team/
├── dashboard/              # Dashboard 仪表盘
│   ├── server.js          # 后端服务
│   ├── public/            # 前端页面
│   ├── *.sh               # 管理脚本
│   └── logs/              # 日志目录（运行时生成）
├── bots/                  # Bot 配置
│   ├── qianwen-worker/    # 全栈高手
│   └── kimi-worker/       # 智囊团
├── scripts/               # 工具脚本
└── docker-compose.yml     # Docker 编排
```

## 🎯 使用场景

### 开发调试
```json
{"logging": {"level": "DEBUG", "console": true}}
```
查看所有详细信息，方便排查问题

### 生产环境
```json
{"logging": {"level": "INFO", "console": false}}
```
只记录重要信息到文件，控制台保持干净

### 性能优化
```bash
# 查看分析报告
./analyze-logs.sh

# 查找慢请求
grep '\[PERF\]' logs/dashboard.log | grep -E '\([5-9][0-9]{2,}ms\)'
```

## 🔒 安全

- ✅ `config.json`（含 Token、密钥）已加入 `.gitignore`
- ✅ 日志文件不提交到 Git
- ✅ 示例配置使用占位符
- ✅ 文档中不包含真实凭证

## 🛠️ 开发

### 运行测试

```bash
# 测试语法
node -c server.js

# 测试日志配置
./test-logging-config.sh
```

### 查看日志

```bash
# 查看最近 50 行
tail -50 logs/dashboard.log

# 实时跟踪
tail -f logs/dashboard.log

# 搜索错误
grep ERROR logs/dashboard.log
```

## 📈 性能

- **INFO 级别**：对性能影响极小（< 1%）
- **DEBUG 级别**：会产生更多日志，建议只在开发时使用
- **文件写入**：异步追加，不阻塞主进程
- **缓存优化**：30 秒缓存，减少重复操作

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📝 更新日志

### v1.1.0 (2026-03-11)

- ✨ 添加完整的日志监控系统
- ✨ 添加日志配置功能
- ✨ 添加 7 个管理工具脚本
- 📚 添加完整的文档和使用指南
- 🔒 添加 .gitignore 保护敏感信息

详见 [CHANGELOG_v1.1.0.md](CHANGELOG_v1.1.0.md)

## 📞 支持

如有问题或建议，请查看文档或提交 Issue。

## 📄 许可证

ISC

---

**Made with ❤️ for AI Team**
