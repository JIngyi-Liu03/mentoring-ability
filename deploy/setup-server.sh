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

# 允许 root 操作后续会被 chown 给低权限账户 $APP_USER 的仓库，
# 避免 re-run 时 git 报 “detected dubious ownership” 而中断（set -e 下会退出）。
git config --global --add safe.directory "$INSTALL_DIR" 2>/dev/null || true

echo "==> [1/9] 检查基础环境（git / node / npm / openssl）"
for c in git node npm openssl; do
  command -v "$c" >/dev/null 2>&1 || { echo "ERROR: 缺少命令 $c，请先安装"; exit 1; }
done
NODE_VER=$(node -v)
echo "    Node 版本: $NODE_VER（需 >= 22.5，启动脚本会自动兼容 22/24）"

echo "==> [2/9] 获取代码到 $INSTALL_DIR"
# 说明：部分国内服务器访问 github.com 的 git 智能 HTTP 接口会被限流（GnuTLS recv error），
# 因此优先用 HTTP/1.1 克隆；若失败则回退到 codeload 的 tarball 下载（该通道通常可用）。
if [ -d "$INSTALL_DIR/.git" ]; then
  echo "    目录已是 git 仓库，执行 git pull 更新"
  git -C "$INSTALL_DIR" -c http.version=HTTP/1.1 pull --ff-only
else
  rm -rf "$INSTALL_DIR"
  if git -c http.version=HTTP/1.1 clone "$REPO_URL" "$INSTALL_DIR" 2>/dev/null; then
    echo "    git clone 成功"
  else
    echo "    git clone 失败，改用 tarball 方式获取"
    curl -fsSL "${REPO_URL%.git}/archive/refs/heads/main.tar.gz" -o /tmp/mentor.tar.gz
    mkdir -p "$INSTALL_DIR"
    tar -xzf /tmp/mentor.tar.gz -C /tmp
    # 防御性解除数据库与依赖目录的 immutable（若存在），避免覆盖失败
    chattr -i -R "$INSTALL_DIR/server/data" 2>/dev/null || true
    chattr -i -R "$INSTALL_DIR/node_modules" 2>/dev/null || true
    cp -a /tmp/mentoring-ability-main/. "$INSTALL_DIR"/ 2>/dev/null || true
    rm -rf /tmp/mentoring-ability-main /tmp/mentor.tar.gz
    # 初始化 git 以便将来可 git pull 更新
    git -C "$INSTALL_DIR" init -q 2>/dev/null || true
    git -C "$INSTALL_DIR" remote add origin "$REPO_URL" 2>/dev/null || true
    echo "    tarball 解压完成"
  fi
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
