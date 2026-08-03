// ============================================================
// src/utils/validate.js —— 输入校验工具
//
// 职责：
//   - 手机号格式校验（中国大陆 11 位）
//   - 密码长度校验
//   - 各表单共用，避免 LoginView 等页面重复写校验逻辑
// ============================================================

export const PHONE_RE = /^1[3-9]\d{9}$/

export function isValidPhone(phone) {
  return PHONE_RE.test(phone)
}

export function isValidPassword(pwd) {
  return typeof pwd === 'string' && pwd.length >= 6
}
