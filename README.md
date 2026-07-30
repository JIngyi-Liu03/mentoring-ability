# 导师辅导能力成熟度自评

一个「登录 → 答题 → 可视化报告 + 建议」的导师辅导能力测评系统，模仿职场基因检测类测评产品的交互形态。

- 前端：**Vue 3 + Vite + Pinia + Vue Router + ECharts（雷达图）**
- 后端：**Node.js (Express) + 内置 `node:sqlite`**（零原生编译依赖，需 Node ≥ 22.5）**
- 能力模型：6 个维度 × 约 24 题，5 级成熟度（CMMI 风格）
- 附加：**管理看板**（团队整体成熟度、各维度均值、等级分布、用户与测评记录）

## 目录结构

```
mentor-ability001/
├── package.json            # 前端依赖 + 一键启动脚本
├── vite.config.js
├── index.html
├── .env                    # 后端配置（端口/管理员/密钥）
├── shared/                 # 前后端共用的数据模型（维度/题目/等级/建议）
│   ├── dimensions.js
│   ├── questions.js
│   ├── levels.js
│   └── suggestions.js
├── server/                 # 后端（Express + SQLite）
│   ├── package.json
│   └── src/
│       ├── index.js        # 入口
│       ├── db.js           # 建库、建表、种子管理员
│       ├── scoring.js      # 计分逻辑
│       ├── crypto-hash.js  # 密码哈希（Node 内置 scrypt）
│       ├── middleware/auth.js
│       └── routes/         # auth / meta / assessment / admin
└── src/                    # 前端
    ├── main.js / App.vue / router / stores / api / styles
    ├── components/         # QuestionCard / StepProgress / RadarChart / ...
    └── views/              # Login / Intro / Assessment / Result / Admin
```

## 本地开发

要求 Node.js ≥ 22.5（用到内置 `node:sqlite` 与 `--env-file`）。

```bash
# 1. 安装依赖（前端 + 后端）
npm run install:all
# 或分别： npm install   &&   npm --prefix server install

# 2. 同时启动前后端（前端 5173，后端 3001）
npm run dev
```

打开 http://localhost:5173 即可。默认管理员账号见 `.env`（`admin / admin123`）。

> 说明：开发时前端通过 Vite 代理把 `/api` 转发到后端 3001；生产构建后由后端直接托管 `dist`。

## 生产构建与运行

```bash
npm run build          # 生成 dist/
# 让后端托管 dist 并读取 .env
SERVE_DIST=true npm run server
```

此时访问 `http://localhost:3001` 即为完整应用（前后端同源）。

## 部署到腾讯云（与「职场基因检测」旧站点共存，且互不影响）

> ### 你的两点硬性要求（本方案已满足）
> 1. **绝不改动旧网站**：旧站点是 Docker 栈（docker compose 管理，PostgreSQL 在 docker 卷 `pgdata`），
>    本工具**完全不进 Docker、不碰旧站点的任何配置文件/数据库**，旧站点的 `deploy.sh` 永远碰不到它。
> 2. **同服务器共存**：两个应用只是共用同一台 Ubuntu 操作系统，代码目录、进程、端口、数据库文件全部独立。

### 隔离对照表

| 维度 | 旧站点（职场基因检测） | 本工具（导师辅导自评） |
|---|---|---|
| 代码目录 | 旧仓库目录 / Docker 卷 | `/opt/mentor-ability`（新建，独立） |
| 运行方式 | Docker 容器（docker compose） | **独立 systemd 服务** `mentor-ability` |
| 监听端口 | `8080` / `8081`（nginx 反代到内网 `3000`） | `3001`（独立） |
| 数据库 | PostgreSQL（docker 卷 `pgdata`） | `server/data/mentor.db`（**独立 SQLite 文件**） |
| 部署入口 | 旧仓库 `deploy.sh` | 本工具的 systemd 服务（互不调用） |

二者唯一共享的是操作系统与防火墙；本工具仅**新增**一条 `3001` 入站规则，不动旧站点的 `8080/8081`。

### 逐步操作手册（在服务器 `124.221.158.216` 上执行）

```bash
# ── 0. 前置：确认 Node 版本（服务器已装 Node 22；本工具用内置 node:sqlite）──
node -v        # 需 >= 22.5；start.sh 会自动兼容 22（加 --experimental-sqlite）与 24+

# ── 1. 建独立目录（不碰旧站点任何目录）──
sudo mkdir -p /opt/mentor-ability
sudo chown -R $USER:$USER /opt/mentor-ability

# ── 2. 传代码（用 Git 拉取，或本地 scp/rsync；不要包含 node_modules / .git / dist）──
#   方式 A（推荐）：在服务器上直接拉取本仓库
#     git clone <你的仓库地址> /opt/mentor-ability
#   方式 B：本地把项目传上去（排除大目录）
#     rsync -av --exclude node_modules --exclude dist --exclude .git \
#       ./ d:/app/code/code/mentor-ability001/ 用户@124.221.158.216:/opt/mentor-ability/
cd /opt/mentor-ability

# ── 3. 装依赖 + 构建前端 dist（dist 由后端直接托管）──
npm install && npm --prefix server install
npm run build

# ── 4. 生成生产 .env（复制模板并改密码/密钥；模板已提交，不会带真实密钥）──
cp .env.production .env
# 用编辑器把 .env 里的 ADMIN_PASSWORD、AUTH_SECRET 改成你自己的值：
#   AUTH_SECRET 生成： openssl rand -hex 32
nano .env

# ── 5. 给启动脚本加可执行权限 ──
chmod +x server/start.sh

# ── 6. 建独立低权限账户运行（进一步隔离，可选但推荐）──
sudo useradd -r -s /usr/sbin/nologin -d /opt/mentor-ability mentor
sudo chown -R mentor:mentor /opt/mentor-ability

# ── 7. 注册并启动 systemd 服务（开机自启 + 崩溃自动重启）──
sudo cp deploy/mentor-ability.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now mentor-ability

# ── 8. 放行端口（仅“新增”规则，不动旧站点 8080/8081）──
#    a) 腾讯云控制台 → 防火墙/安全组 → 入站规则 → 新增 TCP:3001
#    b) 若系统开了 ufw： sudo ufw allow 3001

# ── 9. 验证 ──
curl http://localhost:3001/api/health     # 返回 {"ok":true,...} 即成功
sudo systemctl status mentor-ability       # 确认 Active: active (running)
journalctl -u mentor-ability -n 50         # 看日志
```

启动成功后，用户即可访问：**http://124.221.158.216:3001/**
管理后台登录用 `.env` 里设置的 `ADMIN_USERNAME` / `ADMIN_PASSWORD`。

### 日常运维

```bash
# 更新代码后重启
sudo systemctl restart mentor-ability

# 看日志
journalctl -u mentor-ability -f

# 停止 / 禁用
sudo systemctl stop mentor-ability
sudo systemctl disable mentor-ability
```

### 备份（只需拷一个文件）

数据库就是 `server/data/mentor.db` 这一个独立 SQLite 文件（WAL 模式会附带 `-wal`/`-shm`，
备份时建议先停服务或一并拷贝）。建议定时：

```bash
cp /opt/mentor-ability/server/data/mentor.db /你的备份目录/mentor-$(date +%F).db
```

### 以后接正式域名 / HTTPS（可选，现在不用做）

等你想让本工具也走正式域名时，把 `deploy/nginx-mentor.conf` 里的片段（独立 server 块）
追加到旧站点的 Nginx 配置中并 `reload`，反代目标 `127.0.0.1:3001` 即可；
**只新增配置、不改动旧站点任何已有 server/location**，依旧互不影响。

> 数据库文件在 `server/data/mentor.db`（Node 内置 `node:sqlite`，WAL 模式），备份时直接拷贝该文件即可。
> 数据量增大或需高并发时，可把 `server/src/db.js` 换成 PostgreSQL/MySQL 连接（注意那会与旧站点同用 PostgreSQL，需新建独立库/用户）。

## 主要接口

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/register` | 注册普通用户 |
| POST | `/api/auth/login` | 登录，返回 token |
| GET | `/api/meta` | 获取维度/题目/等级（公开） |
| POST | `/api/assessment/submit` | 提交测评并计分（需登录） |
| GET | `/api/assessment/history` | 我的测评历史 |
| GET | `/api/admin/overview` | 团队概览（需管理员） |
| GET | `/api/admin/users` | 用户列表（需管理员） |
| GET | `/api/admin/results` | 全部测评记录（需管理员） |

## 自定义内容

所有题目、维度、成熟度等级与建议都集中在 `shared/` 目录，前后端自动同步，
直接改这里即可调整测评模型，无需改动业务代码。
