// 使用 Node 内置 crypto（scrypt）做密码哈希，零额外原生依赖。
import crypto from 'node:crypto'

function hash(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = crypto.scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${derived}`
}

function verify(password, stored) {
  if (!stored || !stored.startsWith('scrypt$')) return false
  const [, salt, derived] = stored.split('$')
  const check = crypto.scryptSync(password, salt, 64).toString('hex')
  // 定长时间比较，防止时序攻击
  const a = Buffer.from(derived, 'hex')
  const b = Buffer.from(check, 'hex')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export default { hash, verify }
