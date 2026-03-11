# Dashboard 日志配置 - 快速指南

## 🚀 5 分钟配置指南

### 1️⃣ 打开配置文件

```bash
cd /Users/fang/Desktop/ai-team/dashboard
vim config.json
```

### 2️⃣ 添加日志配置

在 `dashboard` 部分添加 `logging` 配置：

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

### 3️⃣ 重启 Dashboard

```bash
./stop-dashboard.sh
./start-with-log.sh
```

### 4️⃣ 验证配置

```bash
tail -20 logs/dashboard.log | grep "日志配置"
```

应该看到：
```
[时间] ℹ️ [INFO] [配置] 日志配置已更新 | {"enabled":true,"level":"INFO",...}
```

## ⚙️ 常用配置

### 场景 1：开发调试（看所有详细日志）
```json
"logging": {
  "enabled": true,
  "level": "DEBUG",
  "file": true,
  "console": true
}
```

### 场景 2：生产环境（推荐）
```json
"logging": {
  "enabled": true,
  "level": "INFO",
  "file": true,
  "console": false
}
```

### 场景 3：只看错误
```json
"logging": {
  "enabled": true,
  "level": "ERROR",
  "file": true,
  "console": true
}
```

### 场景 4：关闭日志（不推荐）
```json
"logging": {
  "enabled": false,
  "level": "INFO",
  "file": false,
  "console": false
}
```

## 📊 配置说明

| 配置项 | 值 | 说明 |
|--------|-------|------|
| `enabled` | `true` / `false` | 是否启用日志 |
| `level` | `"DEBUG"` | 最详细，所有调试信息 |
|  | `"INFO"` | 一般信息（推荐）⭐ |
|  | `"WARN"` | 只记录警告和错误 |
|  | `"ERROR"` | 只记录错误 |
| `file` | `true` / `false` | 是否写入日志文件 |
| `console` | `true` / `false` | 是否输出到控制台 |

## 🎯 推荐配置

**默认配置（已配置好）：**
- ✅ 日志已启用
- ✅ INFO 级别
- ✅ 写入文件
- ✅ 输出控制台

**无需修改即可使用！**

## 📚 更多信息

- 完整配置说明：`cat LOGGING_CONFIG.md`
- 使用指南：`cat LOGGING_GUIDE.md`
- 测试配置：`./test-logging-config.sh`
