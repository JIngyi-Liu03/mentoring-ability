// ============================================================
// src/utils/format.js —— 展示格式化工具
//
// 职责：
//   - 时间格式化（历史记录时间 YYYY-MM-DD HH:mm）
//   - 等级名映射（1=助理级 / 2=专业级 / 3=高级 / 4=大师级）
//   - 从 IntroView / AdminView 等页面抽出的共用格式化函数
// ============================================================

export function fmtTime(s) {
  if (!s) return ''
  const d = new Date(s.replace(' ', 'T') + 'Z')
  if (isNaN(d.getTime())) return s
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export const LEVEL_NAMES = { 1: '助理级', 2: '专业级', 3: '高级', 4: '大师级' }

export function levelName(l) {
  return LEVEL_NAMES[l] || l
}
