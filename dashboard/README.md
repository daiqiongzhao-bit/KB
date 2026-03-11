# AI Team Dashboard

一个给 AI 开发团队用的本地调度中心面板。

它会把 GitHub Issues、各 Bot 的代码仓库提交、技能仓库、Docker Worker 状态，以及主机侧 OpenClaw 运行情况汇总成一个网页，方便你一眼看清谁在工作、任务卡在哪、最近交付了什么。

## 能看到什么

- 任务仓库里的 Issue 状态
- 每个 Bot 最近的代码提交
- 每个 Bot 绑定的技能仓库和本地已安装技能
- Docker Worker 的运行状态、轮询状态和最近日志
- Leader Bot 的实时对话、日志和主机资源

## 适合谁用

如果你的 AI Team 已经有下面这些东西，这个项目就能直接接上：

- 一个任务仓库，例如 `yourname/ai-team-tasks`
- 多个 Bot 的代码仓库和技能仓库
- 主机上运行的 OpenClaw Leader
- Docker 中运行的 Worker 容器

## 目录结构

```text
dashboard/
├── README.md
├── config.json.example
├── config.json
├── package.json
├── server.js
└── public/
    ├── index.html
    └── monitor.html
```

## 3 分钟上手

### 1. 安装依赖

```bash
cd dashboard
npm install
```

### 2. 复制配置模板

```bash
cp config.json.example config.json
```

### 3. 填写你的仓库和令牌

至少把下面这些字段改成你自己的：

- `github.owner`
- `github.token`
- `github.taskRepo`
- `bots.leader.codeRepo`
- `bots.leader.skillsRepo`
- `bots.qianwen.codeRepo`
- `bots.qianwen.skillsRepo`
- `bots.kimi.codeRepo`
- `bots.kimi.skillsRepo`
- `dashboard.port`

### 4. 启动

```bash
npm start
```

开发时可用：

```bash
npm run dev
```

### 5. 打开页面

- 总览页：`http://localhost:3800`
- 监控页：`http://localhost:3800/monitor.html`

如果你改过 `dashboard.port`，就用你自己的端口。

## 最小配置示例

下面是一份最小可运行配置，你只需要替换成自己的仓库名和 token：

```json
{
  "github": {
    "owner": "your-github-name",
    "token": "ghp_xxx",
    "taskRepo": "your-github-name/ai-team-tasks"
  },
  "bots": {
    "leader": {
      "codeRepo": "your-github-name/ai-team-leader-code",
      "skillsRepo": "your-github-name/ai-team-leader-skills"
    },
    "qianwen": {
      "codeRepo": "your-github-name/ai-team-fullstack-code",
      "skillsRepo": "your-github-name/ai-team-fullstack-skills"
    },
    "kimi": {
      "codeRepo": "your-github-name/ai-team-thinktank-code",
      "skillsRepo": "your-github-name/ai-team-thinktank-skills"
    }
  },
  "pollInterval": 5,
  "dashboard": {
    "port": 3800
  }
}
```

如果你启用了飞书，再继续补：

- `feishu.enabled`
- `feishu.qianwen.appId`
- `feishu.qianwen.appSecret`
- `feishu.kimi.appId`
- `feishu.kimi.appSecret`

## 运行前确认

为了避免页面空白或一直离线，建议先确认：

1. 已安装 [Node.js](https://nodejs.org/)
2. 已安装并登录 [GitHub CLI](https://cli.github.com/)
3. 如果要看 Worker 状态，Docker 已启动
4. 如果要看 Leader 实时监控，OpenClaw 已在主机上运行
5. 相关仓库都能被当前 GitHub 账号访问

## 这个项目默认依赖的环境约定

这个项目不是纯静态页面，它会直接从本机环境取数据，所以有几个默认约定：

- `dashboard` 上一级目录下存在 `docker-compose.yml`
- Worker 容器名默认是 `ai-team-qianwen` 和 `ai-team-kimi`
- OpenClaw 网关健康检查地址是 `http://127.0.0.1:18789/healthz`
- OpenClaw 会话、日志、定时任务数据都在当前用户主目录下

如果你的命名或目录结构不同，需要同步修改 `server.js`。

## 页面数据从哪里来

服务启动后，后端会从这些来源取数：

- GitHub Issues：读取 `github.taskRepo`
- GitHub Commits：读取每个 Bot 的 `codeRepo`
- GitHub 仓库目录：读取每个 Bot 的 `skillsRepo`
- Docker：读取 Worker 容器状态和日志
- OpenClaw 本地目录：读取 Leader 会话、网关日志和 cron 信息

所以页面能打开，不代表所有模块一定都有数据。某个依赖没启动时，对应区域会显示为空或离线。

## 推荐启动顺序

1. 先执行 `gh auth status`，确认 GitHub 已登录
2. 填好 `config.json`
3. 启动主机侧 OpenClaw Leader
4. 启动 Worker 容器
5. 启动 Dashboard
6. 到任务仓库创建一个带标签的 Issue，观察数据是否刷新

## 常见问题

### 页面打开了，但没有任务

检查：

- `github.taskRepo` 是否写对
- `github.token` 是否有仓库读取权限
- `gh` 当前登录账号是否就是你的目标账号

### Worker 一直离线

检查：

- Docker 是否正常运行
- 容器名是否还是 `ai-team-qianwen` 和 `ai-team-kimi`
- `docker-compose.yml` 是否在 `dashboard` 的上一级目录

### Leader 监控没有内容

检查：

- OpenClaw 是否已启动
- `http://127.0.0.1:18789/healthz` 是否返回 `200`
- 本机是否已有 OpenClaw 会话和日志文件

### 技能列表为空

检查：

- 对应技能仓库是否可访问
- 本地或容器里的技能目录是否已经挂载/安装

## API

主要接口如下：

- `/api/status`：总览页数据
- `/api/monitor`：监控页数据
- `/api/monitor/conversation`：Leader 最近对话
- `/api/bot/:id`：单个 Bot 详情
- `/api/bot/:id/logs`：单个 Bot 日志
- `/api/task/:number`：单个任务详情
