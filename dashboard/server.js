const express = require('express');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();

const IS_WIN = process.platform === 'win32';
const DEVNULL = IS_WIN ? '2>nul' : '2>/dev/null';
const HOME = os.homedir();
const LOG_FILE = path.join(HOME, '.openclaw/logs/gateway.log');

// ════════════════ 日志工具 ════════════════
const DASHBOARD_LOG_DIR = path.join(__dirname, 'logs');
const DASHBOARD_LOG_FILE = path.join(DASHBOARD_LOG_DIR, 'dashboard.log');
const DASHBOARD_CACHE_DIR = path.join(__dirname, '.cache');

// 日志配置（先设置默认值，后面从配置文件读取）
let LOGGING_CONFIG = {
  enabled: true,      // 默认开启日志
  level: 'INFO',      // 日志级别: DEBUG/INFO/WARN/ERROR
  file: true,         // 是否写入文件
  console: true       // 是否输出到控制台
};

// 日志级别优先级
const LOG_LEVEL_PRIORITY = {
  DEBUG: 0,
  INFO: 1,
  SUCCESS: 1,
  PERF: 1,
  WARN: 2,
  ERROR: 3
};

// 确保日志目录存在
if (!fs.existsSync(DASHBOARD_LOG_DIR)) {
  fs.mkdirSync(DASHBOARD_LOG_DIR, { recursive: true });
}
// 确保缓存目录存在
if (!fs.existsSync(DASHBOARD_CACHE_DIR)) {
  fs.mkdirSync(DASHBOARD_CACHE_DIR, { recursive: true });
}

// 日志级别颜色
const LOG_COLORS = {
  INFO: '\x1b[36m',    // 青色
  SUCCESS: '\x1b[32m', // 绿色
  WARN: '\x1b[33m',    // 黄色
  ERROR: '\x1b[31m',   // 红色
  DEBUG: '\x1b[90m',   // 灰色
  PERF: '\x1b[35m',    // 紫色
  RESET: '\x1b[0m'
};

// 格式化时间戳
function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 23);
}

// 检查日志级别是否应该输出
function shouldLog(level) {
  if (!LOGGING_CONFIG.enabled) return false;
  const currentPriority = LOG_LEVEL_PRIORITY[LOGGING_CONFIG.level] || 1;
  const messagePriority = LOG_LEVEL_PRIORITY[level] || 1;
  return messagePriority >= currentPriority;
}

// 通用日志函数
function log(level, category, message, data = null) {
  // 检查是否应该记录此级别的日志
  if (!shouldLog(level)) return;
  
  const color = LOG_COLORS[level] || '';
  const reset = LOG_COLORS.RESET;
  const ts = timestamp();
  const icon = {
    INFO: 'ℹ️',
    SUCCESS: '✅',
    WARN: '⚠️',
    ERROR: '❌',
    DEBUG: '🔍',
    PERF: '⏱️'
  }[level] || '📝';
  
  let logLine = `[${ts}] ${icon} [${level}] [${category}] ${message}`;
  if (data) {
    logLine += ` | ${typeof data === 'object' ? JSON.stringify(data) : data}`;
  }
  
  // 控制台输出（带颜色）
  if (LOGGING_CONFIG.console) {
    console.log(`${color}${logLine}${reset}`);
  }
  
  // 文件输出（无颜色）
  if (LOGGING_CONFIG.file) {
    try {
      fs.appendFileSync(DASHBOARD_LOG_FILE, logLine + '\n');
    } catch (err) {
      console.error('写入日志文件失败:', err.message);
    }
  }
}

// 便捷日志函数
const logger = {
  info: (category, message, data) => log('INFO', category, message, data),
  success: (category, message, data) => log('SUCCESS', category, message, data),
  warn: (category, message, data) => log('WARN', category, message, data),
  error: (category, message, data) => log('ERROR', category, message, data),
  debug: (category, message, data) => log('DEBUG', category, message, data),
  perf: (category, message, duration) => log('PERF', category, `${message} (${duration}ms)`, null)
};

// 性能监控装饰器
function perf(category, operation) {
  const start = Date.now();
  return {
    end: (details = '') => {
      const duration = Date.now() - start;
      logger.perf(category, `${operation}${details ? ' - ' + details : ''}`, duration);
      return duration;
    }
  };
}

logger.info('系统', '🦞 AI Team Dashboard 正在初始化...');
logger.info('系统', `操作系统: ${os.platform()} ${os.release()}`);
logger.info('系统', `Node.js: ${process.version}`);
logger.info('系统', `工作目录: ${__dirname}`);

// 缓存配置
const CACHE = {
  commits: new Map(),
  skills: new Map(),
  installedSkills: new Map(),
  issues: null,
  issuesTime: 0,
  issuesInflight: null,
  commitsInflight: new Map(),
  skillsInflight: new Map(),
};
const CACHE_TTL = 30000; // 30秒缓存
const DISK_CACHE_TTL = 300000; // 5分钟磁盘缓存
const DISK_REFRESH_INTERVAL = 10000; // 10秒内只刷新一次

function readDiskCache(key) {
  try {
    const file = path.join(DASHBOARD_CACHE_DIR, `${key}.json`);
    if (!fs.existsSync(file)) return null;
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (!data || !data.updatedAt) return null;
    const ageMs = Date.now() - new Date(data.updatedAt).getTime();
    return { value: data.value, ageMs };
  } catch { return null; }
}

function writeDiskCache(key, value) {
  try {
    const file = path.join(DASHBOARD_CACHE_DIR, `${key}.json`);
    fs.writeFileSync(file, JSON.stringify({ updatedAt: new Date().toISOString(), value }, null, 2), 'utf-8');
  } catch {}
}

const CONFIG_PATH = path.join(__dirname, 'config.json');
let userConfig = {};
try {
  logger.info('配置', '正在加载配置文件...', { path: CONFIG_PATH });
  const configTimer = perf('配置', '加载配置文件');
  userConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  configTimer.end();
  
  // 更新日志配置
  if (userConfig.dashboard?.logging) {
    const loggingConfig = userConfig.dashboard.logging;
    LOGGING_CONFIG.enabled = loggingConfig.enabled !== undefined ? loggingConfig.enabled : true;
    LOGGING_CONFIG.level = loggingConfig.level || 'INFO';
    LOGGING_CONFIG.file = loggingConfig.file !== undefined ? loggingConfig.file : true;
    LOGGING_CONFIG.console = loggingConfig.console !== undefined ? loggingConfig.console : true;
    
    logger.info('配置', '日志配置已更新', LOGGING_CONFIG);
  } else {
    logger.info('配置', '使用默认日志配置', LOGGING_CONFIG);
  }
  
  logger.success('配置', '配置文件加载成功', {
    owner: userConfig.github?.owner,
    taskRepo: userConfig.github?.taskRepo,
    port: userConfig.dashboard?.port || 3800
  });
} catch (err) {
  logger.error('配置', '配置文件加载失败', { error: err.message });
  console.error('⚠️  未找到 config.json，请复制 config.json.example 为 config.json 并填入你的配置');
  process.exit(1);
}

const GITHUB_OWNER = userConfig.github?.owner || 'your-github-username';
const TASK_REPO = userConfig.github?.taskRepo || `${GITHUB_OWNER}/ai-team-tasks`;
const PORT = userConfig.dashboard?.port || 3800;
const POLL_INTERVAL = userConfig.pollInterval || 5;

logger.info('配置', 'Bot 配置初始化完成', {
  githubOwner: GITHUB_OWNER,
  taskRepo: TASK_REPO,
  port: PORT,
  pollInterval: POLL_INTERVAL
});

const BOTS = [
  {
    id: 'leader', name: '大龙虾', container: null, role: '项目经理 + 总指挥', type: 'host',
    avatar: '🦞', color: '#FF6B35',
    capabilities: ['理解用户需求', '自动拆分任务', '调度其他 AI', '汇总结果交付', '管理进度判断完成', '解答 Bot 提问'],
    label: null, pollInterval: null,
    codeRepo: userConfig.bots?.leader?.codeRepo || `${GITHUB_OWNER}/ai-team-leader-code`,
    skillsRepo: userConfig.bots?.leader?.skillsRepo || `${GITHUB_OWNER}/ai-team-leader-skills`,
  },
  {
    id: 'qianwen', name: '全栈高手', container: 'ai-team-qianwen', role: '全能开发主力', type: 'docker',
    avatar: '⚡', color: '#4ECDC4',
    capabilities: ['产品需求分析', 'UI/前端开发', '后端/数据库开发', '测试用例编写', '文案文档撰写', '部署和运维'],
    label: 'role:qianwen-worker', pollInterval: POLL_INTERVAL,
    codeRepo: userConfig.bots?.qianwen?.codeRepo || `${GITHUB_OWNER}/ai-team-fullstack-code`,
    skillsRepo: userConfig.bots?.qianwen?.skillsRepo || `${GITHUB_OWNER}/ai-team-fullstack-skills`,
  },
  {
    id: 'kimi', name: '智囊团', container: 'ai-team-kimi', role: '深度分析专家', type: 'docker',
    avatar: '🔬', color: '#A78BFA',
    capabilities: ['大型代码库分析', '复杂架构设计', '深度代码审查', '技术报告撰写', '跨模块依赖分析', '长文档生成'],
    label: 'role:kimi-worker', pollInterval: POLL_INTERVAL,
    codeRepo: userConfig.bots?.kimi?.codeRepo || `${GITHUB_OWNER}/ai-team-thinktank-code`,
    skillsRepo: userConfig.bots?.kimi?.skillsRepo || `${GITHUB_OWNER}/ai-team-thinktank-skills`,
  },
];

function exec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: 15000, shell: IS_WIN ? 'cmd.exe' : '/bin/sh', windowsHide: true }).trim();
  } catch { return ''; }
}

function execDetailed(cmd, timeout = 30000) {
  try {
    const stdout = execSync(cmd, {
      encoding: 'utf-8',
      timeout,
      shell: IS_WIN ? 'cmd.exe' : '/bin/sh',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    return { ok: true, code: 0, stdout, stderr: '' };
  } catch (error) {
    return {
      ok: false,
      code: typeof error.status === 'number' ? error.status : 1,
      stdout: String(error.stdout || '').trim(),
      stderr: String(error.stderr || '').trim(),
      message: error.message || 'Command failed',
    };
  }
}

function restartBot(bot) {
  if (bot.type === 'docker' && bot.container) {
    return execDetailed(`docker restart ${bot.container}`, 60000);
  }

  const restart = execDetailed('openclaw gateway restart', 60000);
  if (restart.ok) return restart;

  const start = execDetailed('openclaw gateway start', 60000);
  if (start.ok) {
    return {
      ok: true,
      code: 0,
      stdout: [restart.stdout, restart.stderr, start.stdout].filter(Boolean).join('\n'),
      stderr: start.stderr || '',
    };
  }
  return {
    ok: false,
    code: start.code || restart.code || 1,
    stdout: [restart.stdout, start.stdout].filter(Boolean).join('\n'),
    stderr: [restart.stderr, start.stderr].filter(Boolean).join('\n'),
    message: start.message || restart.message || 'Restart failed',
  };
}

function getDockerStatus() {
  const timer = perf('Docker', 'getDockerStatus');
  const composeDir = path.join(__dirname, '..');
  const raw = exec(`docker compose -f "${composeDir}/docker-compose.yml" ps --format json ${DEVNULL}`);
  if (!raw) {
    logger.warn('Docker', 'Docker 状态获取失败或无容器运行');
    return {};
  }
  const statuses = {};
  let containerCount = 0;
  for (const line of raw.split('\n')) {
    try { 
      const c = JSON.parse(line); 
      statuses[c.Name] = { state: c.State, status: c.Status, health: c.Health || 'N/A', running: c.State === 'running' };
      containerCount++;
    } catch {}
  }
  timer.end(`检查了 ${containerCount} 个容器`);
  return statuses;
}

function getPollMeta(containerName) {
  if (!containerName) return null;
  try {
    const meta = exec(`docker exec ${containerName} cat /tmp/poll-meta.json ${DEVNULL}`);
    const lastPoll = exec(`docker exec ${containerName} cat /tmp/last-poll.txt ${DEVNULL}`);
    if (!meta) return null;
    const parsed = JSON.parse(meta);
    logger.debug('Docker', `轮询元数据 [${containerName}]`, { interval: `${parsed.interval}s` });
    return { startedAt: parsed.startedAt, interval: parsed.interval, lastPollAt: lastPoll ? parseInt(lastPoll, 10) : null };
  } catch { return null; }
}

function getHostGatewayStatus() {
  const start = Date.now();
  const nullDev = IS_WIN ? 'nul' : '/dev/null';
  const health = exec(`curl -s -o ${nullDev} -w "%{http_code}" http://127.0.0.1:18789/healthz ${DEVNULL}`);
  const latency = Date.now() - start;
  const isHealthy = health === '200';
  if (isHealthy) {
    logger.debug('Gateway', `健康检查通过`, { latency: `${latency}ms` });
  } else {
    logger.warn('Gateway', `健康检查失败`, { code: health, latency: `${latency}ms` });
  }
  return { state: isHealthy ? 'running' : 'stopped', status: isHealthy ? 'Up (主机)' : 'Down', health: isHealthy ? 'healthy' : 'unhealthy', running: isHealthy, latencyMs: latency };
}

function getGitHubIssues(limit = 100) {
  // 使用缓存
  const now = Date.now();
  if (CACHE.issues && (now - CACHE.issuesTime < CACHE_TTL)) {
    logger.debug('GitHub', `Issues 使用缓存`, { age: `${now - CACHE.issuesTime}ms` });
    return CACHE.issues;
  }

  const diskKey = `issues-${limit}`;
  const diskCached = readDiskCache(diskKey);
  if (diskCached && diskCached.value !== undefined) {
    CACHE.issues = diskCached.value;
    CACHE.issuesTime = now;
    const shouldRefresh = diskCached.ageMs > DISK_REFRESH_INTERVAL;
    const isStale = diskCached.ageMs > DISK_CACHE_TTL;
    if ((shouldRefresh || isStale) && !CACHE.issuesInflight) {
      CACHE.issuesInflight = true;
      setImmediate(() => {
        try { refreshGitHubIssues(limit); } finally { CACHE.issuesInflight = null; }
      });
    }
    return diskCached.value;
  }

  if (CACHE.issuesInflight) {
    return CACHE.issues || [];
  }
  CACHE.issuesInflight = true;
  const data = refreshGitHubIssues(limit);
  CACHE.issuesInflight = null;
  return data;
}

function refreshGitHubIssues(limit) {
  const now = Date.now();
  
  const timer = perf('GitHub', 'getGitHubIssues');
  const q = IS_WIN ? '"."' : "'.'";
  const raw = exec(`gh issue list -R ${TASK_REPO} --state all --limit ${limit} --json number,title,body,labels,state,createdAt,updatedAt,comments -q ${q} ${DEVNULL}`);
  if (!raw) {
    logger.warn('GitHub', 'Issues 获取失败，返回缓存', { repo: TASK_REPO });
    return CACHE.issues || [];
  }
  try {
    const data = JSON.parse(raw);
    CACHE.issues = data;
    CACHE.issuesTime = now;
    writeDiskCache(`issues-${limit}`, data);
    timer.end(`成功获取 ${data.length} 个 Issues`);
    return data;
  } catch (err) {
    logger.error('GitHub', 'Issues 解析失败', { error: err.message });
    return CACHE.issues || [];
  }
}

function getCronJobs() {
  try {
    const cronPath = path.join(HOME, '.openclaw/cron/jobs.json');
    const data = fs.readFileSync(cronPath, 'utf-8');
    const parsed = JSON.parse(data);
    return (parsed.jobs || []).map((j) => ({
      id: j.id, name: j.name, description: j.description, enabled: j.enabled, schedule: j.schedule,
      lastRunAt: j.state?.lastRunAtMs, nextRunAt: j.state?.nextRunAtMs, lastStatus: j.state?.lastStatus,
      lastDuration: j.state?.lastDurationMs, errors: j.state?.consecutiveErrors || 0,
    }));
  } catch { return []; }
}

function getRepoCommits(repoFullName, limit = 15) {
  // 使用缓存
  const cacheKey = `${repoFullName}:${limit}`;
  const cached = CACHE.commits.get(cacheKey);
  if (cached && (Date.now() - cached.time < CACHE_TTL)) {
    logger.debug('GitHub', `Commits 使用缓存 [${repoFullName}]`, { age: `${Date.now() - cached.time}ms` });
    return cached.data;
  }

  const diskKey = `commits-${repoFullName.replace(/[^a-zA-Z0-9._-]/g, '_')}-${limit}`;
  const diskCached = readDiskCache(diskKey);
  if (diskCached && diskCached.value !== undefined) {
    CACHE.commits.set(cacheKey, { data: diskCached.value, time: Date.now() });
    const shouldRefresh = diskCached.ageMs > DISK_REFRESH_INTERVAL;
    const isStale = diskCached.ageMs > DISK_CACHE_TTL;
    if ((shouldRefresh || isStale) && !CACHE.commitsInflight.get(cacheKey)) {
      CACHE.commitsInflight.set(cacheKey, true);
      setImmediate(() => {
        try { refreshRepoCommits(repoFullName, limit, cacheKey, diskKey); } finally { CACHE.commitsInflight.delete(cacheKey); }
      });
    }
    return diskCached.value;
  }

  if (CACHE.commitsInflight.get(cacheKey)) {
    return cached ? cached.data : [];
  }
  CACHE.commitsInflight.set(cacheKey, true);
  const data = refreshRepoCommits(repoFullName, limit, cacheKey, diskKey);
  CACHE.commitsInflight.delete(cacheKey);
  return data;
}

function refreshRepoCommits(repoFullName, limit, cacheKey, diskKey) {
  const cached = CACHE.commits.get(cacheKey);
  
  const timer = perf('GitHub', `getRepoCommits [${repoFullName}]`);
  const raw = exec(`gh api repos/${repoFullName}/commits?per_page=${limit} ${DEVNULL}`);
  if (!raw) {
    logger.warn('GitHub', `Commits 获取失败 [${repoFullName}]`);
    return cached ? cached.data : [];
  }
  try {
    const data = JSON.parse(raw);
    const result = data.map(c => ({ sha: c.sha?.substring(0, 7), fullSha: c.sha, message: c.commit?.message, author: c.commit?.author?.name, date: c.commit?.author?.date, url: c.html_url }));
    CACHE.commits.set(cacheKey, { data: result, time: Date.now() });
    writeDiskCache(diskKey, result);
    timer.end(`成功获取 ${result.length} 个 Commits`);
    return result;
  } catch (err) {
    logger.error('GitHub', `Commits 解析失败 [${repoFullName}]`, { error: err.message });
    return cached ? cached.data : [];
  }
}

function getRepoSkills(repoFullName) {
  // 使用缓存
  const cached = CACHE.skills.get(repoFullName);
  if (cached && (Date.now() - cached.time < CACHE_TTL)) {
    return cached.data;
  }

  const diskKey = `skills-${repoFullName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const diskCached = readDiskCache(diskKey);
  if (diskCached && diskCached.value !== undefined) {
    CACHE.skills.set(repoFullName, { data: diskCached.value, time: Date.now() });
    const shouldRefresh = diskCached.ageMs > DISK_REFRESH_INTERVAL;
    const isStale = diskCached.ageMs > DISK_CACHE_TTL;
    if ((shouldRefresh || isStale) && !CACHE.skillsInflight.get(repoFullName)) {
      CACHE.skillsInflight.set(repoFullName, true);
      setImmediate(() => {
        try { refreshRepoSkills(repoFullName, diskKey); } finally { CACHE.skillsInflight.delete(repoFullName); }
      });
    }
    return diskCached.value;
  }

  if (CACHE.skillsInflight.get(repoFullName)) {
    return cached ? cached.data : [];
  }
  CACHE.skillsInflight.set(repoFullName, true);
  const data = refreshRepoSkills(repoFullName, diskKey);
  CACHE.skillsInflight.delete(repoFullName);
  return data;
}

function refreshRepoSkills(repoFullName, diskKey) {
  const cached = CACHE.skills.get(repoFullName);
  
  const raw = exec(`gh api repos/${repoFullName}/contents ${DEVNULL}`);
  if (!raw) return cached ? cached.data : [];
  try {
    const data = JSON.parse(raw);
    const result = data.filter(f => f.name?.endsWith('.md') && f.name !== 'README.md').map(f => ({ name: f.name, path: f.path, url: f.html_url, sha: f.sha?.substring(0, 7) }));
    CACHE.skills.set(repoFullName, { data: result, time: Date.now() });
    writeDiskCache(diskKey, result);
    return result;
  } catch {
    return cached ? cached.data : [];
  }
}

function getInstalledSkills(bot) {
  const cacheKey = bot.id || bot.container || bot.name || 'unknown';
  const cached = CACHE.installedSkills.get(cacheKey);
  if (cached && (Date.now() - cached.time < CACHE_TTL)) {
    return cached.data;
  }

  const mcps = [];
  const skills = [];
  if (bot.type === 'host') {
    const skillsDir = path.join(HOME, '.openclaw/workspace/skills');
    try {
      const entries = fs.readdirSync(skillsDir);
      for (const entry of entries) {
        const fullPath = path.join(skillsDir, entry);
        const stat = fs.statSync(fullPath);
        let content = '';
        if (stat.isDirectory()) {
          const skillFile = path.join(fullPath, 'SKILL.md');
          if (fs.existsSync(skillFile)) content = fs.readFileSync(skillFile, 'utf-8');
        } else if (entry.endsWith('.md') && entry !== 'README.md') {
          content = fs.readFileSync(fullPath, 'utf-8');
        } else continue;
        const meta = parseSkillMeta(content);
        const item = { name: meta.name || entry.replace('.md', ''), version: meta.version || '', description: meta.description || '', path: entry };
        if (meta.isMcp) mcps.push(item); else skills.push(item);
      }
    } catch {}
    const ocJson = path.join(HOME, '.openclaw/openclaw.json');
    try {
      const cfg = JSON.parse(fs.readFileSync(ocJson, 'utf-8'));
      const plugins = cfg.plugins?.entries || {};
      for (const [id, pl] of Object.entries(plugins)) {
        mcps.push({ name: id, version: '', description: typeof pl === 'string' ? 'Plugin' : (pl.description || 'Plugin'), path: '', type: 'plugin' });
      }
    } catch {}
  } else if (bot.container) {
    // Worker Bot: 从 .openclaw-config/skills 读取 Skills
    const skillFiles = [];
    
    // 1. 读取 .md 文件
    const mdFiles = (exec(`docker exec ${bot.container} find /home/node/.openclaw-config/skills -maxdepth 1 -name "*.md" -type f ${DEVNULL}`) || '').trim().split('\n').filter(Boolean);
    skillFiles.push(...mdFiles);
    
    // 2. 读取子目录的 SKILL.md
    const dirs = (exec(`docker exec ${bot.container} find /home/node/.openclaw-config/skills -maxdepth 1 -type d ${DEVNULL}`) || '').trim().split('\n').filter(Boolean);
    for (const dir of dirs) {
      if (dir === '/home/node/.openclaw-config/skills') continue;
      const skillMd = `${dir}/SKILL.md`;
      const exists = (exec(`docker exec ${bot.container} test -f "${skillMd}" && echo "1" ${DEVNULL}`) || '').trim();
      if (exists === '1') {
        skillFiles.push(skillMd);
      }
    }
    
    // 3. 读取每个文件内容
    for (const filepath of skillFiles) {
      if (!filepath) continue;
      const content = exec(`docker exec ${bot.container} head -30 "${filepath}" ${DEVNULL}`) || '';
      if (!content) continue;
      
      const meta = parseSkillMeta(content);
      
      // 优先使用 frontmatter 的 name，否则从路径提取
      let realName = meta.name;
      if (!realName) {
        const parts = filepath.split('/');
        const filename = parts[parts.length - 1];
        const parentDir = parts[parts.length - 2];
        if (filename === 'SKILL.md' && parentDir && parentDir !== 'skills') {
          realName = parentDir;
        } else {
          realName = filename.replace('.md', '');
        }
      }
      
      if (realName === 'README' || realName === '') continue;
      
      const item = { name: realName, version: meta.version || '', description: meta.description || '', path: filepath };
      if (meta.isMcp) mcps.push(item); else skills.push(item);
    }
    
    // Worker Bot: 从 openclaw.json 读取 MCP 插件
    const jsonRaw = exec(`docker exec ${bot.container} cat /home/node/.openclaw/openclaw.json ${DEVNULL}`);
    if (jsonRaw) {
      try {
        const cfg = JSON.parse(jsonRaw);
        const plugins = cfg.plugins?.entries || {};
        for (const [id, pl] of Object.entries(plugins)) {
          mcps.push({ name: id, version: '', description: typeof pl === 'string' ? 'MCP Plugin' : (pl.description || 'MCP Plugin'), path: '', type: 'plugin' });
        }
      } catch {}
    }
  }
  const result = { mcps, skills };
  CACHE.installedSkills.set(cacheKey, { data: result, time: Date.now() });
  return result;
}

function parseSkillMeta(content) {
  const meta = { isMcp: false };
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const fm = fmMatch[1];
    const nameMatch = fm.match(/name:\s*(.+)/);
    const verMatch = fm.match(/version:\s*(.+)/);
    const descMatch = fm.match(/description:\s*"?([^"\n]+)"?/);
    if (nameMatch) meta.name = nameMatch[1].trim();
    if (verMatch) meta.version = verMatch[1].trim();
    if (descMatch) meta.description = descMatch[1].trim();
    // 只有明确标记为 MCP 的才算 MCP
    if (/primaryEnv|user-invocable:\s*true/i.test(fm)) meta.isMcp = true;
  }
  if (!meta.name) {
    const h1 = content.match(/^#\s+(.+)/m);
    if (h1) meta.name = h1[1].trim();
  }
  return meta;
}

function formatIssue(issue) {
  const labels = (issue.labels || []).map((l) => l.name);
  let status = 'unknown';
  if (labels.includes('status:done')) status = 'done';
  else if (labels.includes('status:in-progress')) status = 'in-progress';
  else if (labels.includes('status:blocked')) status = 'blocked';
  else if (labels.includes('status:pending')) status = 'pending';
  let assignedTo = 'unassigned';
  if (labels.includes('role:qianwen-worker')) assignedTo = 'qianwen';
  else if (labels.includes('role:kimi-worker')) assignedTo = 'kimi';
  return { number: issue.number, title: issue.title, status, assignedTo, labels, state: issue.state, createdAt: issue.createdAt, updatedAt: issue.updatedAt, commentCount: issue.comments?.length || 0, body: issue.body || '' };
}

// ── 实时监控 API ──
function getGatewayProcess() {
  if (IS_WIN) {
    const raw = exec('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH');
    if (!raw) return null;
    const lines = raw.split('\n').filter(l => l.includes('node'));
    if (!lines.length) return null;
    const cols = lines[0].replace(/"/g, '').split(',');
    return { pid: cols[1]?.trim(), cpu: 0, mem: 0, vsz: 0, rss: parseInt(cols[4]?.replace(/[^\d]/g, '') || '0', 10) * 1024, started: '', time: '' };
  }
  const raw = exec("ps aux | grep 'openclaw-gateway\\|openclaw gateway' | grep -v grep | head -1");
  if (!raw) return null;
  const parts = raw.split(/\s+/);
  return { pid: parts[1], cpu: parseFloat(parts[2]), mem: parseFloat(parts[3]), vsz: parseInt(parts[4], 10), rss: parseInt(parts[5], 10), started: parts[8], time: parts[9] };
}

function getRecentLogs(lines = 80) {
  try {
    const data = fs.readFileSync(LOG_FILE, 'utf-8');
    const allLines = data.split('\n').filter(Boolean);
    const recent = allLines.slice(-lines);
    const result = [];
    let pendingMsg = null;
    for (const line of recent) {
      const entry = { raw: line, type: 'system', time: null, content: line };
      const tsMatch = line.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+[Z+-\d:]*)/);
      if (tsMatch) entry.time = tsMatch[1];

      if (line.includes('DM from')) {
        const dmMatch = line.match(/DM from [^:]+:\s*(.+)$/);
        if (dmMatch) {
          entry.type = 'incoming';
          entry.content = dmMatch[1].substring(0, 150);
          pendingMsg = entry.content;
        }
      } else if (line.includes('received message') && !line.includes('DM from')) {
        continue;
      } else if (line.includes('dispatching to agent')) {
        entry.type = 'processing';
        entry.content = '正在思考...';
      } else if (line.includes('dispatch complete')) {
        entry.type = 'complete';
        const repliesMatch = line.match(/replies=(\d+)/);
        entry.content = `回复完成 (${repliesMatch ? repliesMatch[1] : '?'} 条)`;
      } else if (line.includes('Started streaming')) {
        entry.type = 'streaming';
        entry.content = '正在流式输出...';
      } else if (line.includes('Closed streaming')) {
        entry.type = 'stream_done';
        entry.content = '流式输出结束';
      } else if (line.includes('WebSocket client started') || line.includes('ws client ready')) {
        entry.type = 'warn';
        entry.content = 'WebSocket 连接/重连';
      } else if (line.includes('reconnect')) {
        entry.type = 'warn';
        entry.content = 'WebSocket 重连中...';
      } else if (line.includes('error') || line.includes('Error')) {
        entry.type = 'error';
      } else {
        continue;
      }
      result.push(entry);
    }
    return result;
  } catch { return []; }
}

function getConversationTimeline(logs) {
  const timeline = [];
  let currentMsg = null;
  for (const log of logs) {
    if (log.type === 'incoming') {
      if (currentMsg && currentMsg.status !== 'done') {
        timeline.push({ ...currentMsg });
      }
      currentMsg = { receivedAt: log.time, message: log.content, status: 'received', respondedAt: null, durationSec: null };
    } else if (log.type === 'complete' && currentMsg) {
      currentMsg.respondedAt = log.time;
      currentMsg.status = 'done';
      if (currentMsg.receivedAt && currentMsg.respondedAt) {
        const d = new Date(currentMsg.respondedAt) - new Date(currentMsg.receivedAt);
        currentMsg.durationSec = Math.round(d / 1000);
      }
      timeline.push({ ...currentMsg });
      currentMsg = null;
    } else if (log.type === 'processing' && currentMsg) {
      currentMsg.status = 'thinking';
    } else if (log.type === 'streaming' && currentMsg) {
      currentMsg.status = 'streaming';
    }
  }
  if (currentMsg) {
    if (currentMsg.status === 'received') currentMsg.status = 'queued';
    const nowMs = Date.now();
    if (currentMsg.receivedAt) {
      const elapsed = Math.round((nowMs - new Date(currentMsg.receivedAt).getTime()) / 1000);
      currentMsg.elapsedSec = elapsed;
    }
    timeline.push(currentMsg);
  }
  return timeline.slice(-10);
}

function getSystemLoad() {
  const loadAvg = os.loadavg();
  const totalMB = Math.round(os.totalmem() / 1048576);
  const freeMB = Math.round(os.freemem() / 1048576);
  const usedMB = totalMB - freeMB;

  return {
    load: loadAvg.map(v => Math.round(v * 100) / 100),
    cpuCores: os.cpus().length,
    memory: {
      totalMB,
      usedMB,
      free: freeMB,
      active: 0,
      inactive: 0,
      wired: 0,
      speculative: 0,
      usedPct: Math.round(usedMB / totalMB * 100),
    },
  };
}

// ════════════════ 请求日志中间件 ════════════════
logger.info('中间件', '初始化请求日志中间件');
app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  
  // 拦截 res.send 来记录响应时间
  res.send = function(data) {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 500 ? 'ERROR' : 
                       res.statusCode >= 400 ? 'WARN' : 
                       'INFO';
    
    // 只记录 API 请求，跳过静态资源
    if (req.path.startsWith('/api/')) {
      log(statusColor, 'API', `${req.method} ${req.path}`, { 
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip || req.connection.remoteAddress
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

function getLastTurnStatus() {
  const sessionId = getActiveSessionId();
  if (!sessionId) return null;
  const filePath = path.join(SESSIONS_DIR, `${sessionId}.jsonl`);
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    const lines = data.split('\n').filter(Boolean);
    const entries = [];
    for (const line of lines) {
      try { entries.push(JSON.parse(line)); } catch {}
    }
    let lastAssistant = null;
    let hadToolResultBefore = false;
    let totalToolCalls = 0;
    let lastUserTs = null;

    for (let i = entries.length - 1; i >= 0; i--) {
      const e = entries[i];
      if (e.type !== 'message') continue;
      const role = e.message?.role;
      if (role === 'user') {
        lastUserTs = e.timestamp;
        break;
      }
      if (role === 'toolResult') hadToolResultBefore = true;
      if (role === 'assistant' && !lastAssistant) {
        const content = e.message?.content;
        let tc = 0;
        if (Array.isArray(content)) {
          tc = content.filter(c => c.type === 'toolCall' || c.type === 'tool_use').length;
        }
        totalToolCalls += tc;
        lastAssistant = {
          stopReason: e.message?.stopReason || '',
          hasToolCalls: tc > 0,
          toolCallCount: tc,
          timestamp: e.timestamp,
        };
      }
      if (role === 'assistant') {
        const content = e.message?.content;
        if (Array.isArray(content)) {
          totalToolCalls += content.filter(c => c.type === 'toolCall' || c.type === 'tool_use').length;
        }
      }
    }

    if (!lastAssistant) return { status: 'idle', detail: '空闲' };

    const sr = lastAssistant.stopReason;
    if (lastAssistant.hasToolCalls || sr === 'toolUse') {
      return { status: 'working', detail: `正在执行工具 (${totalToolCalls} 次调用)`, toolCalls: totalToolCalls };
    }
    if (hadToolResultBefore) {
      return { status: 'final', detail: `已完成 (执行了 ${totalToolCalls} 次工具调用)`, toolCalls: totalToolCalls };
    }
    return { status: 'text_only', detail: '仅文字回复，未执行任何操作', toolCalls: 0 };
  } catch { return null; }
}

app.get('/api/monitor', (req, res) => {
  const timer = perf('API', 'GET /api/monitor');
  logger.debug('监控', '开始获取监控数据');
  
  const t1 = Date.now();
  const gateway = getHostGatewayStatus();
  logger.debug('监控', `Gateway 状态获取完成`, { duration: `${Date.now() - t1}ms` });
  
  const t2 = Date.now();
  const gwProcess = getGatewayProcess();
  logger.debug('监控', `Gateway 进程信息获取完成`, { duration: `${Date.now() - t2}ms` });
  
  const t3 = Date.now();
  const logs = getRecentLogs(60);
  logger.debug('监控', `日志获取完成`, { count: logs.length, duration: `${Date.now() - t3}ms` });
  
  const timeline = getConversationTimeline(logs);
  const system = getSystemLoad();
  const cronJobs = getCronJobs();
  const turnStatus = getLastTurnStatus();

  const t4 = Date.now();
  const dockerStatuses = getDockerStatus();
  logger.debug('监控', `Docker 状态获取完成`, { duration: `${Date.now() - t4}ms` });
  
  const workers = BOTS.filter(b => b.type === 'docker').map(b => {
    const st = dockerStatuses[b.container] || { state: 'unknown', running: false };
    const pollMeta = getPollMeta(b.container);
    const nowSec = Math.floor(Date.now() / 1000);
    let nextPoll = null;
    if (pollMeta) {
      if (pollMeta.lastPollAt) nextPoll = (pollMeta.lastPollAt + pollMeta.interval) * 1000;
      else {
        const fp = pollMeta.startedAt + 30;
        if (nowSec < fp) nextPoll = fp * 1000;
        else { const cyc = Math.floor((nowSec - fp) / pollMeta.interval) + 1; nextPoll = (fp + cyc * pollMeta.interval) * 1000; }
      }
    }
    return { id: b.id, name: b.name, avatar: b.avatar, container: b.container, ...st, nextPoll, pollInterval: b.pollInterval };
  });

  const displayLogs = logs.filter(l => ['incoming', 'processing', 'complete', 'streaming', 'stream_done', 'warn', 'error'].includes(l.type)).slice(-20);

  let currentStatus = 'idle';
  if (timeline.length) {
    const last = timeline[timeline.length - 1];
    if (last.status === 'thinking' || last.status === 'streaming') currentStatus = last.status;
    else if (last.status === 'queued') currentStatus = 'queued';
  }

  const duration = timer.end();
  logger.info('监控', '监控数据返回成功', {
    workers: workers.length,
    logs: displayLogs.length,
    timeline: timeline.length,
    gatewayStatus: gateway.running ? 'online' : 'offline'
  });

  res.json({
    timestamp: new Date().toISOString(),
    leader: {
      gateway, process: gwProcess, currentStatus,
      lastActivity: displayLogs.length ? displayLogs[displayLogs.length - 1].time : null,
      turnStatus,
    },
    timeline,
    logs: displayLogs,
    cronJobs,
    workers,
    system,
  });
});

app.get('/api/status', (req, res) => {
  const timer = perf('API', 'GET /api/status');
  logger.debug('状态', '开始获取总览数据');
  const lite = req.query?.lite === '1' || req.query?.lite === 'true';
  
  const t1 = Date.now();
  const dockerStatuses = getDockerStatus();
  const hostStatus = getHostGatewayStatus();
  logger.debug('状态', `容器状态获取完成`, { duration: `${Date.now() - t1}ms` });
  
  const t2 = Date.now();
  const issues = lite ? [] : getGitHubIssues(50);
  if (!lite) {
    logger.debug('状态', `GitHub Issues 获取完成`, { count: issues.length, duration: `${Date.now() - t2}ms` });
  }
  
  const cronJobs = lite ? [] : getCronJobs();
  const allFormatted = lite ? [] : issues.map(formatIssue);

  const t3 = Date.now();
  const bots = BOTS.map((bot) => {
    const status = bot.type === 'host' ? hostStatus : (dockerStatuses[bot.container] || { state: 'unknown', status: 'Unknown', health: 'unknown', running: false });
    let tasks;
    if (lite) {
      tasks = bot.id === 'leader'
        ? { dispatched: [], pending: [], accepted: [], done: [], blocked: [], total: 0 }
        : { pending: [], inProgress: [], done: [], blocked: [], total: 0 };
    } else if (bot.id === 'leader') {
      const dispatched = allFormatted.filter((t) => t.assignedTo !== 'unassigned');
      tasks = { dispatched, pending: dispatched.filter((t) => t.status === 'pending'), accepted: dispatched.filter((t) => t.status === 'in-progress'), done: dispatched.filter((t) => t.status === 'done'), blocked: dispatched.filter((t) => t.status === 'blocked'), total: dispatched.length };
    } else {
      const botIssues = allFormatted.filter((t) => t.labels.includes(bot.label));
      tasks = { pending: botIssues.filter((t) => t.status === 'pending'), inProgress: botIssues.filter((t) => t.status === 'in-progress'), done: botIssues.filter((t) => t.status === 'done'), blocked: botIssues.filter((t) => t.status === 'blocked'), total: botIssues.length };
    }
    let botCron = [];
    if (!lite && bot.id === 'leader') { botCron = cronJobs; }
    else if (!lite && bot.pollInterval) {
      const pollMeta = getPollMeta(bot.container);
      const nowSec = Math.floor(Date.now() / 1000);
      let nextRunAt = null, lastRunAt = null;
      if (pollMeta) {
        lastRunAt = pollMeta.lastPollAt ? pollMeta.lastPollAt * 1000 : null;
        if (pollMeta.lastPollAt) nextRunAt = (pollMeta.lastPollAt + pollMeta.interval) * 1000;
        else { const fp = pollMeta.startedAt + 30; if (nowSec < fp) nextRunAt = fp * 1000; else { const e = nowSec - fp; nextRunAt = (fp + (Math.floor(e / pollMeta.interval) + 1) * pollMeta.interval) * 1000; } }
      }
      botCron = [{ id: `poll-${bot.id}`, name: '任务轮询', description: `每 ${bot.pollInterval} 分钟检查 GitHub 新任务`, enabled: status.running, schedule: { kind: 'every', everyMs: bot.pollInterval * 60000 }, lastRunAt, nextRunAt, lastStatus: status.running ? 'ok' : 'stopped', lastDuration: null, errors: 0 }];
    }
    const commits = lite ? [] : getRepoCommits(bot.codeRepo, 5);
    const skills = lite ? [] : getRepoSkills(bot.skillsRepo);
    const { mcps, skills: localSkills } = lite ? { mcps: [], skills: [] } : getInstalledSkills(bot);
    return { ...bot, status, tasks, cron: botCron, commits, skills, mcps, installedSkills: localSkills };
  });
  logger.debug('状态', `Bot 数据组装完成`, { duration: `${Date.now() - t3}ms` });
  
  timer.end();
  logger.info('状态', '总览数据返回成功', {
    bots: bots.length,
    totalTasks: allFormatted.length,
    openTasks: allFormatted.filter((t) => t.state === 'OPEN').length
  });
  
  const stats = lite
    ? { totalTasks: 0, openTasks: 0, doneTasks: 0 }
    : { totalTasks: allFormatted.length, openTasks: allFormatted.filter((t) => t.state === 'OPEN').length, doneTasks: allFormatted.filter((t) => t.status === 'done').length };
  res.json({ timestamp: new Date().toISOString(), bots, stats, lite });
});

app.get('/api/bot/:id', (req, res) => {
  const bot = BOTS.find((b) => b.id === req.params.id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });
  const lite = req.query?.lite === '1' || req.query?.lite === 'true';
  const dockerStatuses = getDockerStatus();
  const hostStatus = getHostGatewayStatus();
  const status = bot.type === 'host' ? hostStatus : (dockerStatuses[bot.container] || { state: 'unknown', status: 'Unknown', health: 'unknown', running: false });
  const issues = lite ? [] : getGitHubIssues(200);
  const allFormatted = lite ? [] : issues.map(formatIssue);
  let tasks = [];
  if (!lite) {
    tasks = bot.id === 'leader'
      ? allFormatted.filter((t) => t.assignedTo !== 'unassigned')
      : allFormatted.filter((t) => t.labels.includes(bot.label));
  }
  const commits = lite ? [] : getRepoCommits(bot.codeRepo, 50);
  const skills = lite ? [] : getRepoSkills(bot.skillsRepo);
  const { mcps, skills: localSkills } = getInstalledSkills(bot);
  res.json({ ...bot, status, tasks, commits, skills, mcps, installedSkills: localSkills, lite, timestamp: new Date().toISOString() });
});

// ── 对话内容 API（读取 OpenClaw 会话 JSONL）──
const SESSIONS_DIR = path.join(HOME, '.openclaw/agents/main/sessions');
const STATS_DIR = path.join(HOME, '.openclaw/stats');
const MEMORY_DIR = path.join(HOME, '.openclaw/workspace/memory'); // 使用 OpenClaw 原生记忆目录

// 确保统计目录存在
if (!fs.existsSync(STATS_DIR)) {
  fs.mkdirSync(STATS_DIR, { recursive: true });
}

// API 统计辅助函数
function getStatsFile(botId, date = null) {
  const d = date || new Date().toISOString().split('T')[0];
  return path.join(STATS_DIR, `${botId}-${d}.json`);
}

function loadBotStats(botId, date = null) {
  try {
    const file = getStatsFile(botId, date);
    if (!fs.existsSync(file)) {
      return { date: date || new Date().toISOString().split('T')[0], botId, apiCalls: 0, totalTokens: 0, inputTokens: 0, outputTokens: 0, totalCost: 0, breakdown: {} };
    }
    const cached = JSON.parse(fs.readFileSync(file, 'utf-8'));
    // 如果缓存时间在 5 分钟内，直接返回
    if (cached.lastUpdated && (Date.now() - new Date(cached.lastUpdated).getTime() < 300000)) {
      return cached;
    }
    return cached;
  } catch {
    return { date: date || new Date().toISOString().split('T')[0], botId, apiCalls: 0, totalTokens: 0, inputTokens: 0, outputTokens: 0, totalCost: 0, breakdown: {} };
  }
}

function saveBotStats(botId, stats) {
  try {
    const file = getStatsFile(botId, stats.date);
    fs.writeFileSync(file, JSON.stringify(stats, null, 2), 'utf-8');
  } catch (err) {
    console.error('保存统计失败:', err);
  }
}

// 从会话文件中分析统计数据
function analyzeSessionStats(botId) {
  const stats = loadBotStats(botId);
  
  // 如果缓存在 5 分钟内，直接返回
  if (stats.lastUpdated && (Date.now() - new Date(stats.lastUpdated).getTime() < 300000)) {
    return stats;
  }
  
  // Leader Bot - 从主机会话文件
  if (botId === 'leader') {
    const sessionId = getActiveSessionId();
    if (!sessionId) return stats;
    
    const filePath = path.join(SESSIONS_DIR, `${sessionId}.jsonl`);
    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      const lines = data.split('\n').filter(Boolean);
      
      let apiCalls = 0;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.type === 'message' && entry.message?.role === 'assistant') {
            const usage = entry.message?.usage;
            if (usage) {
              apiCalls++;
              // 支持多种字段名
              const inputTokens = usage.input || usage.inputTokens || usage.input_tokens || 0;
              const outputTokens = usage.output || usage.outputTokens || usage.output_tokens || 0;
              totalInputTokens += inputTokens;
              totalOutputTokens += outputTokens;
            }
          }
        } catch {}
      }
      
      // 成本计算 (基于通义千问定价)
      const inputCost = (totalInputTokens / 1000) * 0.004;  // $0.004/1K tokens
      const outputCost = (totalOutputTokens / 1000) * 0.016; // $0.016/1K tokens
      
      stats.apiCalls = apiCalls;
      stats.inputTokens = totalInputTokens;
      stats.outputTokens = totalOutputTokens;
      stats.totalTokens = totalInputTokens + totalOutputTokens;
      stats.totalCost = inputCost + outputCost;
      stats.lastUpdated = new Date().toISOString();
      
      saveBotStats(botId, stats);
    } catch (err) {
      console.error('分析会话统计失败:', err);
    }
  }
  
  // Worker Bot - 从 Docker 容器内的会话文件
  else {
    const bot = BOTS.find(b => b.id === botId);
    if (!bot || !bot.container) return stats;
    
    try {
      // 获取容器内所有会话文件
      const filesCmd = `docker exec ${bot.container} find /home/node/.openclaw/agents/main/sessions -name "*.jsonl" -type f ${DEVNULL}`;
      const filesRaw = exec(filesCmd);
      if (!filesRaw) return stats;
      
      const files = filesRaw.split('\n').filter(Boolean);
      
      let apiCalls = 0;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      
      // 分析每个会话文件
      for (const file of files) {
        try {
          // 读取文件内容
          const catCmd = `docker exec ${bot.container} cat "${file}" ${DEVNULL}`;
          const content = exec(catCmd);
          if (!content) continue;
          
          const lines = content.split('\n').filter(Boolean);
          
          for (const line of lines) {
            try {
              const entry = JSON.parse(line);
              if (entry.type === 'message' && entry.message?.role === 'assistant') {
                const usage = entry.message?.usage;
                if (usage) {
                  apiCalls++;
                  const inputTokens = usage.input || usage.inputTokens || usage.input_tokens || 0;
                  const outputTokens = usage.output || usage.outputTokens || usage.output_tokens || 0;
                  totalInputTokens += inputTokens;
                  totalOutputTokens += outputTokens;
                }
              }
            } catch {}
          }
        } catch (err) {
          console.error(`分析文件失败 ${file}:`, err.message);
        }
      }
      
      // 成本计算
      const inputCost = (totalInputTokens / 1000) * 0.004;
      const outputCost = (totalOutputTokens / 1000) * 0.016;
      
      stats.apiCalls = apiCalls;
      stats.inputTokens = totalInputTokens;
      stats.outputTokens = totalOutputTokens;
      stats.totalTokens = totalInputTokens + totalOutputTokens;
      stats.totalCost = inputCost + outputCost;
      stats.lastUpdated = new Date().toISOString();
      
      saveBotStats(botId, stats);
    } catch (err) {
      console.error(`分析 ${botId} 统计失败:`, err);
    }
  }
  
  return stats;
}

// 获取所有 Bot 的统计汇总
function getAllStats() {
  const today = new Date().toISOString().split('T')[0];
  const stats = {};
  
  for (const bot of BOTS) {
    stats[bot.id] = analyzeSessionStats(bot.id);
  }
  
  const total = {
    apiCalls: 0,
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalCost: 0,
  };
  
  for (const botId in stats) {
    const s = stats[botId];
    total.apiCalls += s.apiCalls || 0;
    total.totalTokens += s.totalTokens || 0;
    total.inputTokens += s.inputTokens || 0;
    total.outputTokens += s.outputTokens || 0;
    total.totalCost += s.totalCost || 0;
  }
  
  return { date: today, bots: stats, total, timestamp: new Date().toISOString() };
}

// ── 每日记忆模块 ──
function getMemoryFile(date = null) {
  const d = date || new Date().toISOString().split('T')[0];
  return path.join(MEMORY_DIR, `${d}.md`);
}

// 解析 Markdown 格式的记忆文件
function parseMarkdownMemory(content, date) {
  const memory = {
    date,
    content: content,
    summary: '',
    sections: {},
    tasksCompleted: 0,
    events: [],
    learnings: [],
    notes: [],
    dailySummary: '',
    reflections: []
  };
  
  // 提取摘要（第一个---之前的内容）
  const summaryMatch = content.match(/^#[^\n]+\n\n([\s\S]*?)\n---/);
  if (summaryMatch) {
    memory.summary = summaryMatch[1].trim();
  }
  
  // 按章节分割
  const sections = content.split(/\n## /);
  for (const section of sections) {
    if (!section.trim()) continue;
    
    const lines = section.split('\n');
    const title = lines[0].replace(/^## /, '').trim();
    const sectionContent = lines.slice(1).join('\n').trim();
    
    memory.sections[title] = sectionContent;
    
    // 提取特定内容
    if (title.includes('今日事件') || title.includes('📝')) {
      const eventMatches = sectionContent.match(/###[^\n]+/g);
      if (eventMatches) {
        memory.events = eventMatches.map(e => e.replace(/^### /, '').trim());
      }
    }
    
    if (title.includes('学习笔记') || title.includes('🧠')) {
      const learningItems = sectionContent.split(/\n### /).filter(s => s.trim() && s !== '无');
      memory.learnings = learningItems.map(s => {
        const lines = s.split('\n');
        return {
          title: lines[0].trim(),
          content: lines.slice(1).join('\n').trim()
        };
      });
    }
    
    // 新增：每日总结
    if (title.includes('每日总结') || title.includes('今日总结') || title.includes('📌') || title.includes('💡')) {
      memory.dailySummary = sectionContent;
    }
    
    // 新增：教训与反思
    if (title.includes('教训') || title.includes('反思') || title.includes('经验') || title.includes('⚠️') || title.includes('🎯')) {
      // 提取子项（### 开头的）
      const reflectionItems = sectionContent.split(/\n### /).filter(s => s.trim() && s !== '无');
      if (reflectionItems.length > 0) {
        memory.reflections = reflectionItems.map(s => {
          const lines = s.split('\n');
          return {
            title: lines[0].trim(),
            content: lines.slice(1).join('\n').trim()
          };
        });
      } else {
        // 如果没有子项，整段作为一个反思
        if (sectionContent.trim() && sectionContent.trim() !== '无') {
          memory.reflections = [{
            title: '教训与反思',
            content: sectionContent
          }];
        }
      }
    }
    
    if (title.includes('待跟进') || title.includes('🔄')) {
      const todoItems = sectionContent.match(/- \[[ x]\][^\n]+/g);
      if (todoItems) {
        memory.notes = todoItems.map(t => t.replace(/^- \[[ x]\] /, '').trim());
      }
    }
  }
  
  // 统计任务数（从内容中查找复选框）
  const checkboxes = content.match(/- \[x\]/g);
  memory.tasksCompleted = checkboxes ? checkboxes.length : 0;
  
  return memory;
}

function loadBotMemory(botId, date = null) {
  // OpenClaw 的记忆是全局的，不区分 Bot
  // 但为了保持 API 兼容，我们返回相同的内容
  const d = date || new Date().toISOString().split('T')[0];
  const file = getMemoryFile(d);
  
  try {
    if (!fs.existsSync(file)) {
      return {
        date: d,
        botId,
        content: '',
        summary: `${d} 暂无记录`,
        sections: {},
        tasksCompleted: 0,
        events: [],
        learnings: [],
        notes: [],
        isEmpty: true
      };
    }
    
    const content = fs.readFileSync(file, 'utf-8');
    const memory = parseMarkdownMemory(content, d);
    memory.botId = botId;
    memory.isEmpty = false;
    
    return memory;
  } catch (err) {
    console.error('读取记忆失败:', err);
    return {
      date: d,
      botId,
      content: '',
      summary: '读取失败',
      sections: {},
      tasksCompleted: 0,
      events: [],
      learnings: [],
      notes: [],
      isEmpty: true,
      error: err.message
    };
  }
}

function saveBotMemory(botId, memory) {
  // OpenClaw 的记忆系统不支持从 Dashboard 直接写入
  // 这个功能保留但不实现
  return { ok: false, error: 'Memory is read-only from OpenClaw workspace' };
}

// 获取所有 Bot 的记忆（实际上是同一份）
function getAllMemories(date = null) {
  const d = date || new Date().toISOString().split('T')[0];
  const memory = loadBotMemory('shared', d);
  
  // 为了保持 API 兼容性，每个 Bot 返回相同的内容
  const memories = {};
  for (const bot of BOTS) {
    memories[bot.id] = { ...memory, botId: bot.id };
  }
  
  return { date: d, bots: memories, timestamp: new Date().toISOString() };
}

// 获取历史记忆列表
function getMemoryHistory(botId, days = 7) {
  const history = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const memory = loadBotMemory(botId, dateStr);
    if (!memory.isEmpty) {
      history.push(memory);
    }
  }
  
  return history;
}

function getActiveSessionId() {
  try {
    const sessData = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, 'sessions.json'), 'utf-8'));
    for (const [key, val] of Object.entries(sessData)) {
      if (key.includes('feishu:direct:ou_')) return val.sessionId;
    }
  } catch {}
  try {
    const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.jsonl.lock'));
    if (files.length) return files[0].replace('.jsonl.lock', '');
  } catch {}
  return null;
}

function getSessionMessages(sessionId, limit = 20) {
  if (!sessionId) return [];
  const filePath = path.join(SESSIONS_DIR, `${sessionId}.jsonl`);
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    const lines = data.split('\n').filter(Boolean);
    const msgs = [];
    const allEntries = [];

    for (const line of lines) {
      try { allEntries.push(JSON.parse(line)); } catch {}
    }

    for (let i = 0; i < allEntries.length; i++) {
      const entry = allEntries[i];
      if (entry.type !== 'message') continue;
      const role = entry.message?.role;
      if (role !== 'user' && role !== 'assistant') continue;
      let rawText = '';
      const content = entry.message?.content;
      let hasToolCalls = false;
      let toolCallCount = 0;
      let thinkingText = '';
      if (Array.isArray(content)) {
        rawText = content.filter(c => c.type === 'text').map(c => c.text).join('\n');
        toolCallCount = content.filter(c => c.type === 'toolCall' || c.type === 'tool_use').length;
        hasToolCalls = toolCallCount > 0;
        for (const c of content) {
          if (c.type === 'thinking' && c.thinking) thinkingText += c.thinking + '\n';
        }
      } else if (typeof content === 'string') {
        rawText = content;
      }
      if (!rawText && !hasToolCalls && !thinkingText) continue;

      const stopReason = entry.message?.stopReason || '';

      let thinking = thinkingText.trim() || null, reply = rawText;
      if (role === 'assistant' && !thinking) {
        const lastThinkIdx = rawText.lastIndexOf('</think>');
        if (lastThinkIdx !== -1) {
          let thinkContent = rawText.substring(0, lastThinkIdx);
          thinkContent = thinkContent.replace(/<think>/g, '').trim();
          reply = rawText.substring(lastThinkIdx + 8).trim();
          if (thinkContent) thinking = thinkContent;
        }
      }
      if (role === 'user') {
        const msgIdMatch = rawText.match(/\[message_id:[^\]]+\]\n([^:]+):\s*([\s\S]+)$/);
        if (msgIdMatch) {
          reply = msgIdMatch[2].trim();
        } else {
          const dmMatch = rawText.match(/ou_[a-f0-9]+:\s*([\s\S]+)$/);
          if (dmMatch) reply = dmMatch[1].trim();
          else {
            const textLines = rawText.split('\n').filter(Boolean);
            const lastNonJson = [...textLines].reverse().find(l => !l.trim().startsWith('{') && !l.trim().startsWith('```') && !l.trim().startsWith('"'));
            reply = lastNonJson || textLines[textLines.length - 1] || rawText;
          }
        }
      }

      let turnStatus = null;
      if (role === 'assistant') {
        if (hasToolCalls) {
          turnStatus = 'working';
        } else if (stopReason === 'stop' || stopReason === 'endTurn' || stopReason === '') {
          let hasToolResultBefore = false;
          for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
            const prev = allEntries[j];
            if (prev?.type === 'message') {
              const prevRole = prev.message?.role;
              if (prevRole === 'user') break;
              if (prevRole === 'toolResult') { hasToolResultBefore = true; break; }
            }
          }
          turnStatus = hasToolResultBefore ? 'final' : 'text_only';
        } else if (stopReason === 'toolUse') {
          turnStatus = 'working';
        }
      }

      msgs.push({
        id: entry.id,
        role,
        thinking: thinking ? thinking.substring(0, 2000) : null,
        content: reply.substring(0, 3000),
        timestamp: entry.timestamp || (entry.message?.timestamp ? new Date(entry.message.timestamp).toISOString() : null),
        turnStatus,
        hasToolCalls,
        toolCallCount,
        stopReason: role === 'assistant' ? stopReason : undefined,
      });
    }
    return msgs.slice(-limit);
  } catch { return []; }
}

// 获取 Worker Bot 对话数据
function getWorkerBotConversation(container, limit = 20) {
  try {
    const cmd = `docker exec ${container} find /home/node/.openclaw/agents/main/sessions -name "*.jsonl" ! -name "*.lock" -type f -printf "%T@ %p\\n" 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-`;
    const latestSession = exec(cmd);
    if (!latestSession) return { sessionId: null, messages: [] };
    
    const sessionFile = latestSession.trim();
    const sessionId = sessionFile.split('/').pop().replace('.jsonl', '');
    
    const readCmd = `docker exec ${container} cat "${sessionFile}" 2>/dev/null`;
    const data = exec(readCmd);
    if (!data) return { sessionId, messages: [] };
    
    const lines = data.split('\n').filter(Boolean);
    const msgs = [];
    const allEntries = [];
    
    for (const line of lines) {
      try { allEntries.push(JSON.parse(line)); } catch {}
    }
    
    for (let i = 0; i < allEntries.length; i++) {
      const entry = allEntries[i];
      if (entry.type !== 'message') continue;
      const role = entry.message?.role;
      if (role !== 'user' && role !== 'assistant') continue;
      
      let rawText = '';
      const content = entry.message?.content;
      let hasToolCalls = false;
      let toolCallCount = 0;
      let thinkingText = '';
      
      if (Array.isArray(content)) {
        rawText = content.filter(c => c.type === 'text').map(c => c.text).join('\n');
        toolCallCount = content.filter(c => c.type === 'toolCall' || c.type === 'tool_use').length;
        hasToolCalls = toolCallCount > 0;
        for (const c of content) {
          if (c.type === 'thinking' && c.thinking) thinkingText += c.thinking + '\n';
        }
      } else if (typeof content === 'string') {
        rawText = content;
      }
      
      if (!rawText && !hasToolCalls && !thinkingText) continue;
      
      const stopReason = entry.message?.stopReason || '';
      let thinking = thinkingText.trim() || null;
      let reply = rawText;
      
      if (role === 'assistant' && !thinking) {
        const lastThinkIdx = rawText.lastIndexOf('</think>');
        if (lastThinkIdx !== -1) {
          let thinkContent = rawText.substring(0, lastThinkIdx);
          thinkContent = thinkContent.replace(/<think>/g, '').trim();
          reply = rawText.substring(lastThinkIdx + 8).trim();
          if (thinkContent) thinking = thinkContent;
        }
      }
      
      if (role === 'user') {
        const msgIdMatch = rawText.match(/\[message_id:[^\]]+\]\n([^:]+):\s*([\s\S]+)$/);
        if (msgIdMatch) {
          reply = msgIdMatch[2].trim();
        } else {
          const dmMatch = rawText.match(/ou_[a-f0-9]+:\s*([\s\S]+)$/);
          if (dmMatch) reply = dmMatch[1].trim();
          else {
            const textLines = rawText.split('\n').filter(Boolean);
            const lastNonJson = [...textLines].reverse().find(l => !l.trim().startsWith('{') && !l.trim().startsWith('```') && !l.trim().startsWith('"'));
            reply = lastNonJson || textLines[textLines.length - 1] || rawText;
          }
        }
      }
      
      let turnStatus = null;
      if (role === 'assistant') {
        if (hasToolCalls) {
          turnStatus = 'working';
        } else if (stopReason === 'stop' || stopReason === 'endTurn' || stopReason === '') {
          let hasToolResultBefore = false;
          for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
            const prev = allEntries[j];
            if (prev?.type === 'message') {
              const prevRole = prev.message?.role;
              if (prevRole === 'user') break;
              if (prevRole === 'toolResult') { hasToolResultBefore = true; break; }
            }
          }
          turnStatus = hasToolResultBefore ? 'final' : 'text_only';
        } else if (stopReason === 'toolUse') {
          turnStatus = 'working';
        }
      }
      
      msgs.push({
        id: entry.id,
        role,
        thinking: thinking ? thinking.substring(0, 2000) : null,
        content: reply.substring(0, 3000),
        timestamp: entry.timestamp || (entry.message?.timestamp ? new Date(entry.message.timestamp).toISOString() : null),
        turnStatus,
        hasToolCalls,
        toolCallCount,
        stopReason: role === 'assistant' ? stopReason : undefined,
      });
    }
    
    return { sessionId, messages: msgs.slice(-limit) };
  } catch (err) {
    console.error(`Error getting worker bot conversation for ${container}:`, err.message);
    return { sessionId: null, messages: [] };
  }
}

app.get('/api/monitor/conversation', (req, res) => {
  const limit = parseInt(req.query.limit || '20', 10);
  const botId = req.query.botId || 'leader';
  
  if (botId === 'leader') {
    const sessionId = getActiveSessionId();
    if (!sessionId) return res.json({ messages: [], sessionId: null, botId });
    const messages = getSessionMessages(sessionId, Math.min(limit, 50));
    const lockExists = fs.existsSync(path.join(SESSIONS_DIR, `${sessionId}.jsonl.lock`));
    return res.json({ sessionId, active: lockExists, messages, timestamp: new Date().toISOString(), botId });
  }
  
  // Worker Bot 对话数据
  const bot = BOTS.find(b => b.id === botId);
  if (!bot || !bot.container) {
    return res.json({ messages: [], sessionId: null, botId, timestamp: new Date().toISOString() });
  }
  
  const { sessionId, messages } = getWorkerBotConversation(bot.container, Math.min(limit, 50));
  res.json({ sessionId, active: false, messages, timestamp: new Date().toISOString(), botId });
});

app.get('/api/bot/:id/logs', (req, res) => {
  const bot = BOTS.find(b => b.id === req.params.id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });
  const lines = parseInt(req.query.lines || '60', 10);
  if (bot.type === 'host') {
    const logs = getRecentLogs(lines);
    const filtered = logs.filter(l => ['incoming', 'processing', 'complete', 'streaming', 'stream_done', 'warn', 'error'].includes(l.type)).slice(-30);
    return res.json({ id: bot.id, logs: filtered, timestamp: new Date().toISOString() });
  }
  if (!bot.container) return res.json({ id: bot.id, logs: [], timestamp: new Date().toISOString() });
  const stderrRedir = IS_WIN ? '2>&1' : '2>&1';
  const raw = exec(`docker logs ${bot.container} --tail ${lines} ${stderrRedir}`);
  const entries = [];
  if (raw) {
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      let type = 'system', content = line;
      if (/开始轮询/.test(line)) { type = 'poll'; content = '开始轮询任务'; }
      else if (/没有待处理/.test(line)) { type = 'idle'; content = '📭 无待处理任务'; }
      else if (/继续处理|领取新/.test(line)) { type = 'processing'; content = line.replace(/^.*?\]\s*/, ''); }
      else if (/开始处理第/.test(line)) { type = 'working'; content = line.replace(/^.*?\]\s*/, ''); }
      else if (/已勾选|项处理完成/.test(line)) { type = 'complete'; content = line.replace(/^.*?\]\s*/, ''); }
      else if (/阶段.*完成|交接/.test(line)) { type = 'handoff'; content = line.replace(/^.*?\]\s*/, ''); }
      else if (/⚠️|失败|error/i.test(line)) { type = 'error'; content = line.replace(/^.*?\]\s*/, ''); }
      else if (/Gateway|跳过/.test(line)) { type = 'warn'; content = line.replace(/^.*?\]\s*/, ''); }
      else if (/━━━/.test(line)) continue;
      else if (/📦|🧠|📋|🎯|🧠/.test(line)) { type = 'info'; content = line.replace(/^.*?\]\s*/, ''); }
      else continue;
      const tsMatch = line.match(/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]/);
      entries.push({ type, content, time: tsMatch ? tsMatch[1] : null });
    }
  }
  const pollMeta = getPollMeta(bot.container);
  const dockerStatuses = getDockerStatus();
  const st = dockerStatuses[bot.container] || { state: 'unknown', running: false };
  res.json({ id: bot.id, logs: entries.slice(-30), status: st, pollMeta, timestamp: new Date().toISOString() });
});

app.post('/api/bot/:id/restart', (req, res) => {
  const bot = BOTS.find((b) => b.id === req.params.id);
  if (!bot) return res.status(404).json({ ok: false, error: 'Bot not found' });

  const result = restartBot(bot);
  const status = bot.type === 'host'
    ? getHostGatewayStatus()
    : (getDockerStatus()[bot.container] || { state: 'unknown', status: 'Unknown', health: 'unknown', running: false });

  res.status(result.ok ? 200 : 500).json({
    ok: result.ok,
    botId: bot.id,
    name: bot.name,
    message: result.ok ? `${bot.name} 重启命令已发送，请等待几秒刷新状态` : `${bot.name} 重启失败`,
    result,
    status,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/task/:number', (req, res) => {
  const num = req.params.number;
  const q = IS_WIN ? '"."' : "'.'";
  const raw = exec(`gh issue view ${num} -R ${TASK_REPO} --json number,title,body,labels,state,createdAt,updatedAt,comments -q ${q} ${DEVNULL}`);
  if (!raw) return res.status(404).json({ error: 'Task not found' });
  try {
    const issue = JSON.parse(raw);
    const formatted = formatIssue(issue);
    const comments = (issue.comments || []).map((c) => ({ author: c.author?.login || 'unknown', body: c.body, createdAt: c.createdAt }));
    res.json({ ...formatted, body: issue.body, comments, timestamp: new Date().toISOString() });
  } catch { res.status(500).json({ error: 'Parse error' }); }
});

// ── API 统计数据端点 ──
app.get('/api/stats', (req, res) => {
  const stats = getAllStats();
  res.json(stats);
});

app.get('/api/stats/:botId', (req, res) => {
  const botId = req.params.botId;
  const bot = BOTS.find(b => b.id === botId);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });
  
  const stats = analyzeSessionStats(botId);
  res.json(stats);
});

// ── 每日记忆 API ──
app.get('/api/memory', (req, res) => {
  const date = req.query.date || null;
  const memories = getAllMemories(date);
  res.json(memories);
});

app.get('/api/memory/:botId', (req, res) => {
  const botId = req.params.botId;
  const bot = BOTS.find(b => b.id === botId);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });
  
  const date = req.query.date || null;
  const memory = date ? loadBotMemory(botId, date) : generateDailyMemory(botId);
  res.json(memory);
});

app.get('/api/memory/:botId/history', (req, res) => {
  const botId = req.params.botId;
  const bot = BOTS.find(b => b.id === botId);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });
  
  const days = parseInt(req.query.days || '7', 10);
  const history = getMemoryHistory(botId, days);
  res.json({ botId, history, timestamp: new Date().toISOString() });
});

app.post('/api/memory/:botId', express.json(), (req, res) => {
  const botId = req.params.botId;
  const bot = BOTS.find(b => b.id === botId);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });
  
  const memory = req.body;
  if (!memory.date) memory.date = new Date().toISOString().split('T')[0];
  memory.botId = botId;
  memory.lastUpdated = new Date().toISOString();
  
  const result = saveBotMemory(botId, memory);
  if (result.ok) {
    res.json({ ok: true, memory, timestamp: new Date().toISOString() });
  } else {
    res.status(500).json({ ok: false, error: result.error });
  }
});

// ════════════════ 服务器启动 ════════════════
logger.info('系统', '正在启动 Express 服务器...');
app.listen(PORT, () => {
  logger.success('系统', `🦞 AI Team Dashboard 启动成功!`);
  logger.success('系统', `访问地址: http://localhost:${PORT}`);
  logger.info('系统', `日志文件: ${DASHBOARD_LOG_FILE}`);
  logger.info('系统', `配置文件: ${CONFIG_PATH}`);
  logger.info('系统', `PID: ${process.pid}`);
  logger.info('系统', '─'.repeat(60));
  logger.info('系统', '📊 Dashboard 已就绪，等待请求...');
  console.log(`🦞 AI Team Dashboard running at http://localhost:${PORT}`);
});

// 优雅退出
process.on('SIGINT', () => {
  logger.warn('系统', '收到 SIGINT 信号，准备退出...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.warn('系统', '收到 SIGTERM 信号，准备退出...');
  process.exit(0);
});

process.on('exit', (code) => {
  logger.info('系统', `Dashboard 已退出`, { code });
  logger.info('系统', '═'.repeat(60));
});

// 捕获未处理的错误
process.on('uncaughtException', (err) => {
  logger.error('系统', '未捕获的异常', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('系统', '未处理的 Promise 拒绝', { reason: String(reason) });
});
