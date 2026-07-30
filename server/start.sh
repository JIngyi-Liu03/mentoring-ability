#!/usr/bin/env bash
# ============================================================================
# 导师辅导能力成熟度自评 —— 启动脚本（由 systemd 调用）
#
# 职责：
#   1. 兼容 Node 22（node:sqlite 需 --experimental-sqlite 参数）
#      与 Node 24+（无需该参数）两种版本，自动探测选择；
#   2. 显式读取“项目根目录”的 .env（项目只有根目录 .env，
#      server/start.js 里 --env-file=.env 会从 server/ 目录找，故这里用绝对/相对路径指到根 .env）；
#   3. 工作目录切到 server/，使 DB_PATH=./data/mentor.db 正确落到 server/data/。
#
# 注意：本脚本与旧网站（职场基因检测 Docker 栈）完全无关，不读取、不依赖任何
#       旧站点的环境变量、数据库或配置文件。两个应用各跑各的。
# ============================================================================
set -e

# 脚本所在目录 = server/；项目根目录 = server/../
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

cd "$SCRIPT_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: 未找到项目根目录的 .env（$ENV_FILE）。请先复制 .env.production 并填写生产配置。" >&2
  exit 1
fi

# 探测当前 Node 是否需要在 node:sqlite 上加 --experimental-sqlite 参数
if node --experimental-sqlite -e "import('node:sqlite').then(()=>process.exit(0)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
  exec node --experimental-sqlite --env-file="$ENV_FILE" src/index.js
elif node -e "import('node:sqlite').then(()=>process.exit(0)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
  exec node --env-file="$ENV_FILE" src/index.js
else
  echo "ERROR: 当前 Node 版本不支持内置 node:sqlite，请安装 Node >= 22.5（或 24+）。" >&2
  exit 1
fi
