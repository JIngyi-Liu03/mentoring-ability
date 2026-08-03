#!/usr/bin/env bash
# ============================================================================
# 诊断/修复 3002 端口 502 (Bad Gateway) —— 在目标服务器上以 root 运行
#
# 背景：3001 正常、3002 报 502。由于 3001/3002 是同一个 Node 进程的两个 listen，
#       进程若存活则两端口必同时在监听，因此 502 几乎一定来自 3002 前面的
#       反向代理（nginx / 宝塔 / 腾讯云网关）连不上上游。
#
# 用法：
#   sudo bash fix-3002.sh            # 仅诊断，打印根因
#   sudo bash fix-3002.sh --fix      # 自动把 nginx 里 3002 的 proxy_pass 修正为
#                                     # 127.0.0.1:3002 并 reload（修改前自动备份）
# ============================================================================
set -u

echo "===== A. 3001 / 3002 端口监听情况 ====="
(ss -ltnp 2>/dev/null || netstat -ltnp 2>/dev/null) | grep -E ':3001|:3002' \
  || echo "  (未检测到 3001/3002 监听 —— 若 ss/netstat 无权限请加 sudo)"

echo
echo "===== B. 本地直连 Node（绕过任何前置代理） ====="
for p in 3001 3002; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://127.0.0.1:$p/api/health" 2>/dev/null)
  echo "  127.0.0.1:$p/api/health -> HTTP ${code:-无响应}"
done

echo
echo "===== C. nginx 中涉及 3002 的反代配置 ====="
if command -v nginx >/dev/null 2>&1; then
  nginx -T 2>/dev/null | grep -n -E ':3002|proxy_pass' | head -50 || echo "  (nginx 配置中未发现 3002)"
else
  echo "  未检测到 nginx（502 可能来自宝塔 / 腾讯云 CLB / 其他网关，请到对应控制台检查 3002 上游）"
fi

echo
echo "===== D. 结论 ====="
echo "  • 若 B 中 3002 返回 200，而外网仍 502：Node 正常，问题在 3002 前面的代理。"
echo "  • 请确认代理（nginx/宝塔/网关）中 3002 的 proxy_pass 指向 127.0.0.1:3002。"
echo "  • 若需要本脚本自动修正 nginx，请执行： sudo bash $0 --fix"

# ---------------------------------------------------------------------------
# --fix：自动修正 nginx 里 3002 的反代（仅处理“只含 3002、不含 3001”的配置文件，
#         避免误伤同文件中 3001 的 server 块；修改前自动备份）
# ---------------------------------------------------------------------------
if [ "${1:-}" = "--fix" ]; then
  echo
  echo "===== 进入 --fix 自动修复 ====="
  if ! command -v nginx >/dev/null 2>&1; then
    echo "  未安装 nginx，无法自动修复，请手动检查宝塔/网关的 3002 上游。"
    exit 1
  fi
  files=$(grep -rl '3002' /etc/nginx 2>/dev/null || true)
  if [ -z "$files" ]; then
    echo "  未在 /etc/nginx 中找到含 3002 的配置，无法自动修复。"
    exit 1
  fi
  for f in $files; do
    if grep -q '3001' "$f"; then
      echo "  [跳过·需手工] $f 同时含 3001/3002，请手动核对 proxy_pass 指向 127.0.0.1:3002"
      continue
    fi
    cp -a "$f" "$f.bak-$(date +%s)"
    sed -i -E 's#proxy_pass[[:space:]]+http://[^;]+;#proxy_pass http://127.0.0.1:3002;#' "$f"
    echo "  [已修复] $f  (备份: $f.bak-*)"
  done
  if nginx -t 2>/dev/null; then
    systemctl reload nginx 2>/dev/null && echo "  nginx 已 reload，请再次访问 3002 验证。"
  else
    echo "  nginx -t 校验失败，请用 .bak-* 备份恢复后手动调整。"
  fi
fi
