// ============================================================
// server/src/routes/auth.js —— 认证路由（薄层）
//
// 职责：接收请求 → 参数校验 → 调用 services/user.service.js
//       → 返回结果。不包含业务逻辑与 SQL。
// ============================================================

import { Router } from 'express'
import * as userService from '../services/user.service.js'
import * as userRepo from '../repositories/user.repo.js'
import { createSession, destroySession, requireAuth } from '../middleware/auth.js'

const router = Router()

// ========== 通用 ==========

// 检查手机号是否已注册
router.post('/check-phone', (req, res) => {
  const { phone } = req.body || {}
  if (!phone || !userService.PHONE_RE.test(phone)) return res.status(400).json({ error: '手机号格式不正确' })
  res.json({ exists: userService.isPhoneRegistered(phone) })
})

// 发送短信验证码 —— purpose: login | register | reset
router.post('/sms/send', async (req, res) => {
  const { phone, purpose } = req.body || {}
  if (!phone || !userService.PHONE_RE.test(phone)) return res.status(400).json({ error: '请输入正确的手机号' })
  try {
    await userService.sendCode({ phone, purpose })
    res.json({ ok: true })
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message || '短信发送失败' })
  }
})

// ========== 密码登录（手机号 + 密码 或 用户名 + 密码） ==========

router.post('/login', (req, res) => {
  const { phone, username, password } = req.body || {}
  const isPhone = !!phone
  const identifier = phone || username
  if (!identifier || !password) {
    return res.status(400).json({ error: isPhone ? '请输入手机号和密码' : '请输入用户名和密码' })
  }

  const user = userService.loginByIdentifier({ phone, username, password })
  if (!user) {
    return res.status(401).json({ error: isPhone ? '手机号或密码错误' : '用户名或密码错误' })
  }
  const token = createSession(user.id)
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, phone: user.phone, name: user.name } })
})

// ========== 验证码登录（手机号必须已注册） ==========

router.post('/sms/login', (req, res) => {
  const { phone, code } = req.body || {}
  if (!phone || !userService.PHONE_RE.test(phone)) return res.status(400).json({ error: '请输入正确的手机号' })
  if (!code) return res.status(400).json({ error: '请输入验证码' })

  const user = userRepo.findFullByPhone(phone)
  if (!user) return res.status(400).json({ error: '该手机号未注册，请先注册账号' })

  const result = userService.consumeCode(phone, code)
  if (!result.ok) return res.status(400).json({ error: result.error })

  const token = createSession(user.id)
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, phone: user.phone, name: user.name } })
})

// ========== 注册（手机号 + 验证码 + 密码 + 姓名） ==========

router.post('/sms/register', (req, res) => {
  const { phone, code, password, name } = req.body || {}
  if (!phone || !userService.PHONE_RE.test(phone)) return res.status(400).json({ error: '请输入正确的手机号' })
  if (!code) return res.status(400).json({ error: '请输入验证码' })
  if (!password || String(password).length < 6) return res.status(400).json({ error: '密码至少 6 个字符' })
  if (!name || !String(name).trim()) return res.status(400).json({ error: '请输入姓名' })

  // 手机号必须未注册
  if (userRepo.findIdByPhone(phone)) return res.status(409).json({ error: '该手机号已注册，请直接登录' })

  try {
    const user = userService.registerWithSms({ phone, code, password, name })
    const token = createSession(user.id)
    res.json({ token, user })
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message })
  }
})

// ========== 找回密码（手机号 + 验证码 + 新密码 —— 仅更新密码，保留全部历史数据） ==========

router.post('/sms/reset-password', (req, res) => {
  const { phone, code, password } = req.body || {}
  if (!phone || !userService.PHONE_RE.test(phone)) return res.status(400).json({ error: '请输入正确的手机号' })
  if (!code) return res.status(400).json({ error: '请输入验证码' })
  if (!password || String(password).length < 6) return res.status(400).json({ error: '新密码至少 6 个字符' })

  if (!userRepo.findIdByPhone(phone)) return res.status(400).json({ error: '该手机号未注册' })

  try {
    userService.resetPasswordWithSms({ phone, code, password })
    res.json({ ok: true })
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message })
  }
})

// ========== 登出 / 会话 ==========

router.post('/logout', requireAuth, (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  destroySession(token)
  res.json({ ok: true })
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

export default router
