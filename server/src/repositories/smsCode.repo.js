// ============================================================
// server/src/repositories/smsCode.repo.js —— 短信验证码数据访问层
//
// 职责：sms_codes 表的增查改，仅负责存取数据
// ============================================================

import db from '../db.js'

// 查某手机号最新一条验证码
export function getLatestByPhone(phone) {
  return db.prepare('SELECT * FROM sms_codes WHERE phone = ? ORDER BY id DESC LIMIT 1').get(phone)
}

// 写入验证码
export function create({ phone, code, expiresAt }) {
  db.prepare('INSERT INTO sms_codes (phone, code, expires_at) VALUES (?, ?, ?)').run(phone, code, expiresAt)
}

// 标记已消费
export function markConsumed(id) {
  db.prepare('UPDATE sms_codes SET consumed = 1 WHERE id = ?').run(id)
}
