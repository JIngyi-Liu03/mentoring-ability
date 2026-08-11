#!/usr/bin/env bash
# ============================================================================
# mentor 两个域名：HTTP 预配 + certbot 一条命令申请证书 + 自动 80→443 跳转 + 续期
#
# 前提（已满足）：
#   - mentor.empowerdf.com 与 mentor-admin.empowerdf.com 的 DNS A 记录已指向本机
#   - 本机 3001/3002 已跑起来（setup-server.sh 已执行过、/api/health 通）
#   - nginx 已安装（未装会自动 apt 安装）
#
# 用法：在 /opt/mentor-ability 下（nginx-mentor-live.conf 与本脚本同目录）执行
#   sudo bash deploy/setup-https.sh
# ============================================================================
set -euo pipefail

DOMAINS_USER="mentor.empowerdf.com"
DOMAINS_ADMIN="mentor-admin.empowerdf.com"
CONF="nginx-mentor-live.conf"

echo "==> [1/6] 检查后端健康（3001 / 3002）"
for port in 3001 3002; do
  if curl -sf "http://127.0.0.1:${port}/api/health" >/dev/null 2>&1; then
    echo "    端口 ${port} 健康 ✅"
  else
    echo "    ⚠️ 端口 ${port} 不通。请先确认 mentor 服务已启动（systemctl status mentor-ability）"
  fi
done

echo "==> [2/6] 检查/安装 nginx 与 certbot"
if ! command -v nginx >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y nginx
fi
if ! command -v certbot >/dev/null 2>&1; then
  apt-get install -y certbot python3-certbot-nginx
fi

echo "==> [3/6] 放置 HTTP 预配配置"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
install -o root -g root -m 644 "${SCRIPT_DIR}/${CONF}" "/etc/nginx/sites-available/${CONF}"
ln -sf "/etc/nginx/sites-available/${CONF}" "/etc/nginx/sites-enabled/${CONF}"

echo "==> [4/6] 测试并重载 nginx"
nginx -t
systemctl reload nginx
sleep 1
# 确认 80 端口配置已就绪
echo "    80 端口 HTTP 配置已生效（certbot 待改造）"

echo "==> [5/6] certbot 一条命令申请证书并改写为 HTTPS"
# -d 两个域名一起；--redirect 自动加 80→443；--non-interactive 免交互
# set -e 下不能因 certbot 失败中断整个脚本，故用 || true 继续到验证步骤暴露真实状态
certbot --nginx \
  -d "${DOMAINS_USER}" -d "${DOMAINS_ADMIN}" \
  --agree-tos --non-interactive --redirect --keep-until-expiring \
  -m "admin@${DOMAINS_USER}" || {
    echo "    ⚠️ certbot 申请失败，请看上方日志；可能原因：DNS 未生效 / 80 端口被占 / 防火墙未放行 80"
    echo "      常见排查：dig ${DOMAINS_USER}  /  sudo netstat -tlnp | grep :80"
  }

echo "==> [6/6] 验证"
sleep 1
echo "    -- 证书 & 443 --"
for d in "${DOMAINS_USER}" "${DOMAINS_ADMIN}"; do
  code=$(curl -sk -o /dev/null -w "%{http_code}" "https://${d}/api/health" || echo "000")
  echo "    https://${d}  => HTTP ${code}"
done
echo "    -- 80→443 跳转 --"
for d in "${DOMAINS_USER}" "${DOMAINS_ADMIN}"; do
  loc=$(curl -sI "http://${d}" | awk 'tolower($1)=="location:"{print $2}' | tr -d '\r')
  echo "    http://${d}   => Location: ${loc}"
done

echo ""
echo "✅ 完成。浏览器访问："
echo "   用户端： https://${DOMAINS_USER}"
echo "   后台端： https://${DOMAINS_ADMIN}"
echo "续期任务： certbot renew 已注册为 systemd timer（certbot.timer），自动续期，无需手动。"
