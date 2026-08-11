// ============================================================
// server/src/routes/yuanqi.js —— 腾讯元器智能体「API 嵌入」代理
//
// 作用：浏览器调用本站 /api/coach/chat，本站用服务端持有的
//   YUANQI_TOKEN（仅服务端，绝不暴露给前端）去请求元器 OpenAPI，
//   并把 SSE 流原样转发回浏览器。
// 效果：终端用户免登录即可在站内与智能体对话，密钥不出后端，
//   智能体的人设 / 知识库仍由元器后台托管（本站只透传用户的问题）。
// ============================================================

import { Router } from 'express'
import { createHash, randomUUID } from 'node:crypto'
import { writeFileSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'

const router = Router()

const YUANQI_API = 'https://yuanqi.tencent.com/openapi/v1/agent/chat/completions'
const YUANQI_TOKEN = process.env.YUANQI_TOKEN
const YUANQI_ASSISTANT_ID = process.env.YUANQI_ASSISTANT_ID || '2085321723640736832'

// 把前端传上来的"报告上下文"拼成给 agent 的前置 user 消息文本
function formatContextUser(c) {
  return (
    '【系统上下文 - 专属数据，请记住，作为我的"个人数据"使用】\n' +
    `用户：${c.name || '学员'}${c.phone ? `（${c.phone}）` : ''}\n` +
    `测评编号：${c.resultId || '-'}\n` +
    `综合得分：${c.overall || '-'} / 5，等级：${c.levelShort || '-'}（${c.levelName || '-'}）\n\n` +
    '各维度均分（满分5）：\n' +
    `${c.dimsText || '（无）'}\n\n` +
    `最薄弱题目（≤2分，共 ${c.weakCount || 0} 道，前 5 道）：\n` +
    `${c.weakText || '（无）'}\n\n` +
    '以上是该用户的专属测评数据。请确认收到，并表示你将基于这些数据为其提供一对一的报告深度解读。'
  )
}

router.post('/chat', async (req, res) => {
  // ===== 真实诊断日志（每次请求都打）=====
  // 不打 body 避免噪音，只打请求身份：用户刷新一次我们就能从日志看到真实 host/origin/UA，
  // 判定他到底落到的是 3001(我们的服务) 还是 5001/别的 还在跑的旧实例
  console.log('[yuanqi/chat] hit',
    'host=', req.headers.host,
    'origin=', req.headers.origin,
    'referer=', req.headers.referer,
    'ua=', req.headers['user-agent'],
    'hasToken=', !!req.headers.authorization
  )
  // 把路由内任何同步/异步异常都落到磁盘，便于排查
  const logToFile = (payload) => {
    try {
      writeFileSync(
        join(process.cwd(), 'yuanqi-debug.log'),
        JSON.stringify({ ts: new Date().toISOString(), ...payload }, null, 2),
        'utf8'
      )
    } catch {}
  }

  try {
    if (!YUANQI_TOKEN) {
      // 不要伪装一个含糊的 503/404——线上经常看到"请求失败(404)"就是因为这里被
      // 前端用 res.status 兜底成了 `请求失败 (404)`。直接给出明确文案 + 准确 503，
      // 调用方一眼能看出是部署配置问题而不是路由问题。
      console.error('[yuanqi] YUANQI_TOKEN 未配置，请检查服务器 .env / 部署脚本 secrets.env')
      return res.status(503).json({
        error: 'AI 解读功能未启用：服务端缺少 YUANQI_TOKEN，请在部署目录 .env 中配置',
        code: 'YUANQI_TOKEN_MISSING'
      })
    }
    if (!YUANQI_ASSISTANT_ID) {
      return res.status(503).json({
        error: 'AI 解读功能未启用：服务端缺少 YUANQI_ASSISTANT_ID，请在部署目录 .env 中配置',
        code: 'YUANQI_ASSISTANT_ID_MISSING'
      })
    }

  const { messages, userId, context } = req.body || {}
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages 不能为空' })
  }

  // 仅保留 role/content 并做基本清洗，避免把奇怪字段透传给元器
  // 注意：元器 openapi 要求 messages[n].content 是 list（每项 {type, text}），不是字符串
  const safeMessages = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-20)
    .map((m) => ({
      role: m.role,
      content: [{ type: 'text', text: m.content.slice(0, 4000) }]
    }))
  if (safeMessages.length === 0) {
    return res.status(400).json({ error: 'messages 格式不合法' })
  }

  // 把本次会话注入的用户报告上下文（仅首条消息携带）作为前置消息传给元器，
  // 让 agent 知道该用户的姓名 + 测评数据，并按 user_id 记忆实现"专属专家"
  const contextMessages = []
  if (context && typeof context === 'object') {
    const ctxUserText = formatContextUser(context)
    const ctxAsstText =
      '好的，我已收到你的专属测评数据。从此刻起，我会基于你的个人数据为你提供一对一的报告深度解读与成长建议。'
    contextMessages.push(
      { role: 'user', content: [{ type: 'text', text: ctxUserText }] },
      { role: 'assistant', content: [{ type: 'text', text: ctxAsstText }] }
    )
  }
  const finalMessages = [...contextMessages, ...safeMessages]

  // 把 user_id 做 sha256 哈希再发给元器：脱敏（不传明文手机号）但保持同一人跨会话同 id → 记忆连续
  // 缺省或非字符串则随机生成（一次性匿名会话）
  const uid = (() => {
    if (typeof userId === 'string' && userId.trim()) {
      return createHash('sha256').update(userId.trim()).digest('hex').slice(0, 32)
    }
    return 'anon_' + randomUUID()
  })()

  // 浏览器真正断开（响应未正常结束）时才中止上游请求，避免悬挂连接；
  // 不能用 req.on('close')——它在请求读完 body 后就会触发，会导致上游被过早 abort
  const controller = new AbortController()
  res.on('close', () => {
    if (!res.writableEnded) controller.abort()
  })

  try {
    const upstream = await fetch(YUANQI_API, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'X-Source': 'openapi',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${YUANQI_TOKEN}`
      },
      body: JSON.stringify({
        assistant_id: YUANQI_ASSISTANT_ID,
        user_id: uid,
        stream: true,
        messages: finalMessages
      })
    })

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => '')
      console.error('[yuanqi] upstream error', upstream.status, text)
      console.error('[yuanqi] sent body was', JSON.stringify({
        assistant_id: YUANQI_ASSISTANT_ID,
        user_id: uid,
        stream: true,
        messages: finalMessages
      }))
      // 把详情落到磁盘，方便排查（不论服务怎么起的都能读到）
      try {
        writeFileSync(
          join(process.cwd(), 'yuanqi-debug.log'),
          JSON.stringify({
            ts: new Date().toISOString(),
            status: upstream.status,
            upstreamText: text,
            sentBody: {
              assistant_id: YUANQI_ASSISTANT_ID,
              user_id: uid,
              stream: true,
              messages: finalMessages
            }
          }, null, 2),
          'utf8'
        )
      } catch {}
      if (!res.headersSent) {
        // 把元器真实状态码塞进错误文案，前端就能区分 "上游 404 / 401 / 429" 等
        return res.status(502).json({
          error: `元器接口返回 ${upstream.status}：${text.slice(0, 200) || 'no body'}`,
          code: 'YUANQI_UPSTREAM_ERROR',
          upstreamStatus: upstream.status
        })
      }
      return res.end()
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    const reader = upstream.body.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(Buffer.from(value))
      }
    } finally {
      res.end()
    }
  } catch (e) {
    console.error('[yuanqi] proxy error', e)
    if (!res.headersSent) res.status(502).json({ error: '代理元器请求失败' })
    else res.end()
  }
  } catch (e) {
    // 整个路由的兜底：任何同步/异步异常都记录到磁盘
    console.error('[yuanqi] route error', e)
    logToFile({
      kind: 'route-error',
      message: e?.message,
      stack: e?.stack,
      hasContext: !!(req.body && req.body.context),
      msgCount: Array.isArray(req.body?.messages) ? req.body.messages.length : 0
    })
    if (!res.headersSent) res.status(500).json({ error: `服务器内部错误：${e?.message || 'unknown'}` })
  }
})

export default router
