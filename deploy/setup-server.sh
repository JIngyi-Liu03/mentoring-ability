#!/usr/bin/env bash
# ============================================================================
# 导师辅导能力成熟度自评 —— 服务器端一键部署脚本
#
# 在目标 Ubuntu 服务器上以 root（或用 sudo）执行本脚本即可完成：
#   git 拉取代码 → 装依赖 → 构建 dist → 生成生产 .env（自动随机密钥）
#   → 建独立低权限账户 → 注册 systemd 服务 → 放行 3001 → 健康检查
#
# 与“职场基因检测”旧站点的隔离：
#   - 旧站点是 Docker 栈，本脚本完全不碰 docker / 旧站点 compose / nginx / PostgreSQL；
#   - 本工具是独立 systemd 进程，监听 3001，数据在 server/data/mentor.db（独立 SQLite）。
#
# 用法：
#   sudo bash setup-server.sh
#   # 自定义仓库地址： REPO_URL=https://github.com/你的名/仓库.git sudo bash setup-server.sh
# ============================================================================
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/JIngyi-Liu03/mentoring-ability.git}"
INSTALL_DIR="/opt/mentor-ability"
APP_USER="mentor"

echo "==> [1/9] 检查基础环境（git / node / npm / openssl）"
for c in git node npm openssl; do
  command -v "$c" >/dev/null 2>&1 || { echo "ERROR: 缺少命令 $c，请先安装"; exit 1; }
done
NODE_VER=$(node -v)
echo "    Node 版本: $NODE_VER（需 >= 22.5，启动脚本会自动兼容 22/24）"

echo "==> [2/9] 克隆代码到 $INSTALL_DIR"
if [ -d "$INSTALL_DIR/.git" ]; then
  echo "    目录已存在，执行 git pull 更新"
  git -C "$INSTALL_DIR" pull --ff-only
else
  rm -rf "$INSTALL_DIR"
  git clone "$REPO_URL" "$INSTALL_DIR"
fi
cd "$INSTALL_DIR"

echo "==> [3/9] 安装依赖并构建前端 dist"
npm install
npm --prefix server install
npm run build
echo "    dist 构建完成：$(ls dist | head)"

echo "==> [4/9] 生成生产 .env（自动随机安全密钥）"
cp .env.production .env
AUTH_SECRET="$(openssl rand -hex 32)"
ADMIN_PASSWORD="$(openssl rand -base64 12 | tr -dc 'A-Za-z0-9' | head -c 16)"
# 替换模板占位符
sed -i "s#__CHANGE_ME_auth_secret_generate_with_openssl_rand_hex_32__#${AUTH_SECRET}#" .env
sed -i "s#__CHANGE_ME_admin_password__#${ADMIN_PASSWORD}#" .env
echo "    ⚠️  请妥善保存以下管理员凭据（仅此显示一次）："
echo "    管理员账号: admin"
echo "    管理员密码: ${ADMIN_PASSWORD}"

echo "==> [5/9] 设置启动脚本权限"
chmod +x server/start.sh

echo "==> [6/9] 创建独立低权限运行账户 $APP_USER"
if ! id "$APP_USER" >/dev/null 2>&1; then
  useradd -r -s /usr/sbin/nologin -d "$INSTALL_DIR" "$APP_USER"
fi
chown -R "$APP_USER:$APP_USER" "$INSTALL_DIR"

echo "==> [7/9] 注册 systemd 服务并启动"
cp deploy/mentor-ability.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now mentor-ability
sleep 2
systemctl is-active --quiet mentor-ability && echo "    systemd 服务状态: active (running)" || echo "    ⚠️ 服务未运行，请查看: journalctl -u mentor-ability -n 50"

echo "==> [8/9] 放行防火墙端口 3001（仅新增规则，不动旧站点 8080/8081）"
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow 3001/tcp
  echo "    ufw 已放行 3001"
else
  echo "    ufw 未启用或不存在，跳过（请确认腾讯云安全组已放行 3001 入站）"
fi
echo "    ⚠️  请到腾讯云控制台 → 防火墙/安全组 → 新增 TCP:3001 入站规则"

echo "==> [9/9] 健康检查"
HEALTH=$(curl -s http://localhost:3001/api/health || true)
echo "    GET /api/health => $HEALTH"
if echo "$HEALTH" | grep -q '"ok":true'; then
  echo ""
  echo "✅ 部署完成！访问地址： http://<服务器公网IP>:3001/"
  echo "   管理后台登录：账号 admin / 上面生成的密码"
else
  echo "⚠️ 健康检查未通过，请排查："
  echo "   journalctl -u mentor-ability -n 100"
  echo "   cat /opt/mentor-ability/.env"
fi
