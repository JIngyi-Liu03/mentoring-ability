// ============================================================
// server/src/services/user.service.js —— 用户认证业务服务
//
// 职责：
//   - 短信验证码发送 / 消费的业务流程
//   - 注册 / 登录 / 找回密码的业务流程
//   - 路由只负责收参、校验、调用本层、返回结果
// ============================================================

import crypto from 'node:crypto'
import db from '../db.js'
import cryptoHash from '../crypto-hash.js'
import { sendSmsCode } from './sms.service.js'
import * as userRepo from '../repositories/user.repo.js'
import * as smsCodeRepo from '../repositories/smsCode.repo.js'

// 手机号格式：中国大陆 11 位
export const PHONE_RE = /^1[3-9]\d{9}$/
const CODE_TTL = Number(process.env.SMS_CODE_TTL || 5) * 60 * 1000
const SEND_INTERVAL = Number(process.env.SMS_SEND_INTERVAL || 60) * 1000

function genCode() {
  return String(crypto.randomInt(100000, 1000000))
}

// 校验验证码，消费后返回 { ok } 或 { ok:false, error }
export function consumeCode(phone, code) {
  const row = smsCodeRepo.getLatestByPhone(phone)
  if (!row) return { ok: false, error: '请先获取验证码' }
  if (row.consumed) return { ok: false, error: '验证码已使用，请重新获取' }
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, error: '验证码已过期，请重新获取' }
  if (row.code !== String(code)) return { ok: false, error: '验证码错误' }
  smsCodeRepo.markConsumed(row.id)
  return { ok: true }
}

// 发送验证码：校验手机号场景 + 限频，返回 { ok } 或抛错
export async function sendCode({ phone, purpose }) {
  const user = userRepo.findIdByPhone(phone)

  // 按场景校验手机号是否存在
  if (purpose === 'login' || purpose === 'reset') {
    if (!user) {
      const err = new Error('该手机号未注册，请先注册账号')
      err.status = 400
      throw err
    }
  } else if (purpose === 'register') {
    if (user) {
      const err = new Error('该手机号已注册，请直接登录')
      err.status = 400
      throw err
    }
  }

  // 限频
  const recent = smsCodeRepo.getLatestByPhone(phone)
  if (recent) {
    const createdMs = new Date(recent.created_at.replace(' ', 'T') + 'Z').getTime()
    if (Date.now() - createdMs < SEND_INTERVAL) {
      const err = new Error('发送过于频繁，请稍后再试')
      err.status = 429
      throw err
    }
  }

  const code = genCode()
  await sendSmsCode(phone, code)
  const expiresAt = new Date(Date.now() + CODE_TTL).toISOString()
  smsCodeRepo.create({ phone, code, expiresAt })
}

// 检查手机号是否已注册
export function isPhoneRegistered(phone) {
  return !!userRepo.findIdByPhone(phone)
}

// 登录（手机号+密码 或 用户名+密码）→ 用户记录或 null
export function loginByIdentifier({ phone, username, password }) {
  const identifier = phone || username
  let user = null
  if (phone) {
    user = userRepo.findFullByPhone(phone)
  }
  if (!user && username) {
    user = userRepo.findFullByUsername(identifier)
  }
  if (!user || !cryptoHash.verify(password, user.password_hash)) return null
  return user
}

// 注册（手机号 + 验证码 + 密码 + 姓名）→ 新用户记录
export function registerWithSms({ phone, code, password, name }) {
  const result = consumeCode(phone, code)
  if (!result.ok) {
    const err = new Error(result.error)
    err.status = 400
    throw err
  }
  const id = userRepo.create({
    username: phone,
    passwordHash: cryptoHash.hash(password),
    role: 'user',
    phone,
    name: String(name).trim()
  })
  return userRepo.findById(id)
}

// 找回密码（仅更新密码）
export function resetPasswordWithSms({ phone, code, password }) {
  const result = consumeCode(phone, code)
  if (!result.ok) {
    const err = new Error(result.error)
    err.status = 400
    throw err
  }
  const user = userRepo.findFullByPhone(phone)
  userRepo.updatePassword(user.id, cryptoHash.hash(password))
}

export default {
  PHONE_RE,
  sendCode,
  consumeCode,
  isPhoneRegistered,
  loginByIdentifier,
  registerWithSms,
  resetPasswordWithSms
}
