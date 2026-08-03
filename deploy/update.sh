#!/usr/bin/env bash
# ============================================================
# deploy/update.sh —— 日常一键更新脚本
#
# 职责：
#   1. git pull 拉取最新代码
#   2. npm install 安装依赖
#   3. npm run build:all 构建前端（dist/user + dist/admin）
#   4. systemctl restart mentor-ability 重启服务
#   5. 健康检查
#
# 用法（在服务器上）：
#   sudo bash /opt/mentor-ability/deploy/update.sh
# ============================================================
set -euo pipefail

APP_DIR="/opt/mentor-ability"

if [ ! -d "$APP_DIR/.git" ]; then
  echo "ERROR: $APP_DIR 不是 git 仓库，请先执行 setup-server.sh 完成首次部署" >&2
  exit 1
fi

cd "$APP_DIR"

echo "==> [1/5] 拉取最新代码"
git -c http.version=HTTP/1.1 pull --ff-only origin main

echo "==> [2/5] 安装/更新依赖"
npm install
npm --prefix server install

echo "==> [3/5] 构建前端"
npm run build:all

echo "==> [4/5] 重启服务"
systemctl restart mentor-ability

echo "==> [5/5] 健康检查"
sleep 2
HEALTH=$(curl -s --max-time 5 http://127.0.0.1:3001/api/health || true)
echo "    GET /api/health => $HEALTH"
if echo "$HEALTH" | grep -q '"ok":true'; then
  echo ""
  echo "✅ 更新完成！"
else
  echo "⚠️ 健康检查未通过，请排查："
  echo "   journalctl -u mentor-ability -n 100"
  exit 1
fi
