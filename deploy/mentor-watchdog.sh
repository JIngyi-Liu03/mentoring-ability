#!/usr/bin/env bash
# ============================================================================
# 导师辅导能力成熟度自评 —— 健康检查看门狗
#
# 作用：补足 systemd Restart=always 的盲区。
#   systemd 只会在“进程退出”时重启服务；如果进程还活着但对 /api/health
#   无响应（假死/事件循环卡住），systemd 不会重启。本脚本每分钟探测一次，
#   任一不通就重启服务，确保 3001/3002 始终可访问。
#
# 安装（在服务器上，二选一）：
#   方式 A（cron，最简单）：
#     sudo cp deploy/mentor-watchdog.sh /opt/mentor-ability/deploy/
#     sudo chmod +x /opt/mentor-ability/deploy/mentor-watchdog.sh
#     (sudo crontab -l; echo '* * * * * /opt/mentor-ability/deploy/mentor-watchdog.sh') | sudo crontab -
#
#   方式 B（systemd timer，更规范）：另建 mentor-watchdog.timer / .service，
#     见文末注释。
# ============================================================================
set -u

HEALTH_URL="http://127.0.0.1:3001/api/health"
LOG="/var/log/mentor-watchdog.log"

if curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null 2>&1; then
  exit 0
fi

echo "$(date '+%F %T') [watchdog] 健康检查失败，重启 mentor-ability" >> "$LOG"
# 用 systemd 重启（忽略单次失败，避免连环重启风暴）
systemctl restart mentor-ability >> "$LOG" 2>&1 || true

# ---------------------------------------------------------------------------
# 方式 B 示例（如用 systemd timer，将上面 cron 一行替换为以下两个文件）：
#
# /etc/systemd/system/mentor-watchdog.service
#   [Unit]
#   Description=mentor-ability 健康检查看门狗
#   [Service]
#   Type=oneshot
#   ExecStart=/bin/bash /opt/mentor-ability/deploy/mentor-watchdog.sh
#
# /etc/systemd/system/mentor-watchdog.timer
#   [Unit]
#   Description=每分钟检查 mentor-ability 健康
#   [Timer]
#   OnCalendar=*-*-* *:*:00
#   Persistent=true
#   [Install]
#   WantedBy=timers.target
#
# 启用：sudo systemctl daemon-reload && sudo systemctl enable --now mentor-watchdog.timer
# ---------------------------------------------------------------------------
