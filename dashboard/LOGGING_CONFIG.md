# Dashboard 日志配置说明

## 📋 概述

Dashboard 支持通过 `config.json` 配置日志功能，可以灵活控制日志的记录行为。

## ⚙️ 配置项

在 `config.json` 中添加 `dashboard.logging` 配置：

```json
{
  "dashboard": {
    "port": 3800,
    "logging": {
      "enabled": true,
      "level": "INFO",
      "file": true,
      "console": true
    }
  }
}
```

### 配置项说明

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `enabled` | boolean | `true` | 是否启用日志系统 |
| `level` | string | `"INFO"` | 日志级别，可选值：`DEBUG` / `INFO` / `WARN` / `ERROR` |
| `file` | boolean | `true` | 是否写入日志文件 |
| `console` | boolean | `true` | 是否输出到控制台 |

## 📊 日志级别说明

日志级别按优先级从低到高排列：

### DEBUG（调试）
最详细的日志，包含所有运行细节：
- 缓存命中情况
- 组件加载详情
- 详细的数据获取过程

**何时使用：** 开发调试时，需要查看详细运行过程

### INFO（信息）⭐ 默认
一般信息日志，记录重要的运行状态：
- API 请求记录
- 数据加载完成
- 配置更新
- 监控数据返回

**何时使用：** 生产环境推荐，平衡详细度和性能

### WARN（警告）
警告信息，需要关注但不影响运行：
- 缓存获取失败（使用旧缓存）
- Docker 状态获取失败
- Gateway 健康检查失败

**何时使用：** 只关注潜在问题时

### ERROR（错误）
错误信息，操作失败需要处理：
- 配置文件加载失败
- API 调用失败
- 数据解析错误
- 未捕获异常

**何时使用：** 只记录严重错误时

### 特殊级别

- **SUCCESS**：成功操作（与 INFO 同级）
- **PERF**：性能监控（与 INFO 同级）

## 🎯 使用场景

### 场景 1：生产环境（推荐配置）
```json
{
  "logging": {
    "enabled": true,
    "level": "INFO",
    "file": true,
    "console": true
  }
}
```
**说明：** 记录重要信息，平衡性能和可观测性

### 场景 2：开发调试
```json
{
  "logging": {
    "enabled": true,
    "level": "DEBUG",
    "file": true,
    "console": true
  }
}
```
**说明：** 记录所有详细信息，方便排查问题

### 场景 3：性能优先
```json
{
  "logging": {
    "enabled": true,
    "level": "WARN",
    "file": true,
    "console": false
  }
}
```
**说明：** 只记录警告和错误，减少日志开销，控制台不输出

### 场景 4：只记录错误
```json
{
  "logging": {
    "enabled": true,
    "level": "ERROR",
    "file": true,
    "console": true
  }
}
```
**说明：** 只记录严重错误，最小化日志量

### 场景 5：完全关闭日志
```json
{
  "logging": {
    "enabled": false,
    "level": "INFO",
    "file": false,
    "console": false
  }
}
```
**说明：** 完全关闭日志（不推荐，排查问题会很困难）

### 场景 6：只输出到控制台
```json
{
  "logging": {
    "enabled": true,
    "level": "INFO",
    "file": false,
    "console": true
  }
}
```
**说明：** 不写入日志文件，节省磁盘空间

### 场景 7：只写入文件
```json
{
  "logging": {
    "enabled": true,
    "level": "INFO",
    "file": true,
    "console": false
  }
}
```
**说明：** 不在控制台输出，保持终端干净

## 📝 各级别输出内容对比

| 日志内容 | ERROR | WARN | INFO | DEBUG |
|----------|-------|------|------|-------|
| 严重错误 | ✅ | ✅ | ✅ | ✅ |
| 警告信息 | ❌ | ✅ | ✅ | ✅ |
| API 请求 | ❌ | ❌ | ✅ | ✅ |
| 成功操作 | ❌ | ❌ | ✅ | ✅ |
| 性能统计 | ❌ | ❌ | ✅ | ✅ |
| 缓存命中 | ❌ | ❌ | ❌ | ✅ |
| 详细调试 | ❌ | ❌ | ❌ | ✅ |

## 🔄 动态修改配置

修改 `config.json` 后，需要重启 Dashboard 才能生效：

```bash
# 停止服务
./stop-dashboard.sh

# 修改 config.json
vim config.json

# 重新启动
./start-with-log.sh
```

## 💡 推荐配置

### 开发环境
```json
{
  "logging": {
    "enabled": true,
    "level": "DEBUG",
    "file": true,
    "console": true
  }
}
```

### 测试环境
```json
{
  "logging": {
    "enabled": true,
    "level": "INFO",
    "file": true,
    "console": true
  }
}
```

### 生产环境
```json
{
  "logging": {
    "enabled": true,
    "level": "INFO",
    "file": true,
    "console": false
  }
}
```

## 🔍 验证配置

启动 Dashboard 后，查看日志输出：

```bash
# 查看配置是否生效
tail -20 logs/dashboard.log | grep "日志配置"
```

应该能看到类似输出：
```
[2026-03-11 10:30:15.180] ℹ️ [INFO] [配置] 日志配置已更新 | {"enabled":true,"level":"INFO","file":true,"console":true}
```

如果没有配置 `logging` 项，会看到：
```
[2026-03-11 10:30:15.180] ℹ️ [INFO] [配置] 使用默认日志配置 | {"enabled":true,"level":"INFO","file":true,"console":true}
```

## ⚠️ 注意事项

1. **日志文件大小**
   - 日志会持续写入 `logs/dashboard.log`
   - 建议定期清理或使用日志轮转
   - 可以设置 `"file": false` 避免文件增长

2. **性能影响**
   - `DEBUG` 级别会产生大量日志，可能影响性能
   - 生产环境推荐使用 `INFO` 或 `WARN` 级别

3. **磁盘空间**
   - 启用文件日志会占用磁盘空间
   - 定期检查 `logs/` 目录大小

4. **日志敏感信息**
   - 日志中可能包含 IP 地址、请求路径等信息
   - 注意保护日志文件的访问权限

## 🛠️ 故障排查

### 问题 1：配置不生效
**检查：**
```bash
# 1. 确认配置文件格式正确
cat config.json | python -m json.tool

# 2. 重启服务
./stop-dashboard.sh && ./start-with-log.sh

# 3. 查看启动日志
tail -50 logs/dashboard.log
```

### 问题 2：日志文件不更新
**检查：**
```bash
# 1. 确认 file 配置为 true
grep -A 4 '"logging"' config.json

# 2. 检查文件权限
ls -la logs/dashboard.log

# 3. 检查磁盘空间
df -h .
```

### 问题 3：控制台无输出
**检查：**
```bash
# 1. 确认 console 配置为 true
grep -A 4 '"logging"' config.json

# 2. 确认 enabled 为 true
grep "enabled" config.json
```

## 📚 相关文档

- `LOGGING_GUIDE.md` - 日志功能完整使用指南
- `logs/README.md` - 日志文件说明
- `monitor-logs.sh --help` - 监控工具帮助
- `analyze-logs.sh` - 日志分析工具

## 🔗 配置模板

完整的配置文件模板（包含日志配置）：

```json
{
  "github": {
    "owner": "your-github-username",
    "token": "ghp_xxx",
    "taskRepo": "your-github-username/ai-team-tasks"
  },
  "ai": {
    "apiKey": "sk-xxx",
    "provider": "coding-plan",
    "baseUrl": "https://coding.dashscope.aliyuncs.com/v1"
  },
  "bots": {
    "leader": {
      "codeRepo": "your-github-username/ai-team-leader-code",
      "skillsRepo": "your-github-username/ai-team-leader-skills"
    },
    "qianwen": {
      "codeRepo": "your-github-username/ai-team-fullstack-code",
      "skillsRepo": "your-github-username/ai-team-fullstack-skills"
    },
    "kimi": {
      "codeRepo": "your-github-username/ai-team-thinktank-code",
      "skillsRepo": "your-github-username/ai-team-thinktank-skills"
    }
  },
  "feishu": {
    "enabled": true,
    "qianwen": {
      "appId": "cli_xxx",
      "appSecret": "xxx"
    },
    "kimi": {
      "appId": "cli_xxx",
      "appSecret": "xxx"
    }
  },
  "pollInterval": 5,
  "dashboard": {
    "port": 3800,
    "logging": {
      "enabled": true,
      "level": "INFO",
      "file": true,
      "console": true
    }
  }
}
```
