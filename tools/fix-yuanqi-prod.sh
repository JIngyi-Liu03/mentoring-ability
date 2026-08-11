#!/usr/bin/env bash
# =============================================================================
# 一键修复脚本：给生产服务器填写 YUANQI_TOKEN + YUANQI_ASSISTANT_ID 并重启
#   * 新 token 与 assistant_id 已留空，使用前请按下面【必须修改】两处填入新值
#   * 适用：服务器 OS=Ubuntu/Debian/CentOS，Node 服务由 systemd 或 pm2 守护
#   * 使用：
#       1) 把脚本 scp 到服务器 /tmp/fix-yuanqi.sh
#       2) 编辑脚本填入 YUANQI_TOKEN / YUANQI_ASSISTANT_ID
#       3) bash /tmp/fix-yuanqi.sh
# =============================================================================

set -euo pipefail

# ====== 【必须修改】↓↓↓↓↓↓↓↓↓↓ 填入从腾讯元器后台拿到的真实值 ↓↓↓↓↓↓↓↓↓↓ ======
YUANQI_TOKEN='PASTE_NEW_TOKEN_HERE'
YUANQI_ASSISTANT_ID='2085321723640736832'
# ====== 【必须修改】↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑ ======

APP_DIR="/opt/mentor-ability"
ENV_FILE="$APP_DIR/.env"

if [[ ! -d "$APP_DIR" ]]; then
  echo "[ERR] 找不到 $APP_DIR，请先确认部署路径" >&2
  exit 1
fi

if [[ "$YUANQI_TOKEN" == "PASTE_NEW_TOKEN_HERE" || -z "$YUANQI_TOKEN" ]]; then
  echo "[ERR] 请先在脚本顶部填入真实的 YUANQI_TOKEN 与 YUANQI_ASSISTANT_ID" >&2
  exit 1
fi

cd "$APP_DIR"

echo "[1/4] 备份现有 .env ..."
cp -f "$ENV_FILE" "$ENV_FILE.bak.$(date +%Y%m%d%H%M%S)" || true

echo "[2/4] 写入 YUANQI_* ..."
# 删除已有的 YUANQI_* 行，再追加新值
sed -i '/^YUANQI_TOKEN=/d; /^YUANQI_ASSISTANT_ID=/d' "$ENV_FILE" || true
cat >> "$ENV_FILE" <<EOF
YUANQI_TOKEN=$YUANQI_TOKEN
YUANQI_ASSISTANT_ID=$YUANQI_ASSISTANT_ID
EOF

echo "[3/4] 拉取最新代码并重新构建前端（让"AI 请求失败显示真实错误"修复生效）..."
git pull --rebase --autostash || true
# 重建前端：依赖 npm run build:user，输出到 dist/user/，由 server 托管
if grep -q '"build:user"' package.json 2>/dev/null; then
  npm run build:user
fi

echo "[4/4] 重启 Node 服务 ..."
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart mentor-ability || pm2 restart all
elif command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files | grep -q mentor-ability; then
  systemctl restart mentor-ability
else
  echo "[WARN] 没找到 pm2 / systemd unit，请手动重启 Node 服务"
fi

echo "[OK] 完成。请回 124.221.158.216:3001/report/2 刷新后再试'你好'"
