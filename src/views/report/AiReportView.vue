<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../../api/client.js'
import { getToken, getUser } from '../../utils/token.js'
import RadarChart from '../../components/RadarChart.vue'
import { questions } from '../../../shared/questions.js'
import { dimensions, dimensionMap } from '../../../shared/dimensions.js'
import { levels } from '../../../shared/levels.js'

// ===== 腾讯元器智能体「API 嵌入」：站内免登录对话（密钥仅存于服务端）=====
// Yuanqi 的 user_id 用登录用户的稳定标识（手机号），保证每人独立记忆、不串数据
function getChatUid() {
  const u = getUser()
  return String(u?.phone || u?.id || '')
}

// 仅 UI 用的开场白，标记为本地消息，永远不发给元器（元器要求 messages 以 user 起头且交替）
const WELCOME_CONTENT = '👋 你好！我是你的 AI 报告深度解读专家。我已经收到了你的测评报告，可以直接开始聊。'
const messages = ref([
  { role: 'assistant', content: WELCOME_CONTENT, isLocal: true }
])
const input = ref('')
const sending = ref(false)
const chatError = ref('')
const chatBody = ref(null)

watch(
  messages,
  async () => {
    await nextTick()
    if (chatBody.value) chatBody.value.scrollTop = chatBody.value.scrollHeight
  },
  { deep: true }
)

// ===== 把当前用户的报告上下文注入元器（每次请求都注入，确保 agent 始终有数据；Yuanqi user_id 由服务端哈希保证跨会话记忆）=====
function buildCoachContext() {
  const u = getUser()
  const lv = overallLevelObj.value
  const dimLines = dims.value
    .map((d) => `- ${d.short}：${d.avg.toFixed(2)}`)
    .join('\n')
  const weakTop = weakItems.value.slice(0, 5)
  const weakLines = weakTop.length
    ? weakTop
        .map(
          (q) =>
            `- (${dimensionMap[q.dim]?.short || q.dim}) ${q.text}：${q.score}分`
        )
        .join('\n')
    : '（无）'
  return {
    name: u?.name || '学员',
    phone: u?.phone || '',
    resultId: resultId || '',
    overall: result.value?.overall?.toFixed?.(2) || '',
    levelShort: lv.short,
    levelName: lv.name,
    dimsText: dimLines,
    weakText: weakLines,
    weakCount: weakItems.value.length
  }
}

async function sendChat() {
  const text = input.value.trim()
  if (!text || sending.value) return
  chatError.value = ''
  input.value = ''

  messages.value.push({ role: 'user', content: text })
  // pending 标记用于过滤掉这条还没填内容的占位助手消息；
  // 不能用引用比较 m !== assistantMsg——push 后 Vue 会把它包成 Proxy，与原始引用永远不等
  const assistantMsg = { role: 'assistant', content: '', pending: true }
  messages.value.push(assistantMsg)
  sending.value = true

  // 发送给元器的是真实对话历史：跳过本地的 UI 开场白 + 当前这条 pending 占位助手
  // content 先传字符串，由服务端统一转换成元器要求的 [{type:'text',text}] 数组格式
  const history = messages.value
    .filter((m) => !m.isLocal && !m.pending)
    .map((m) => ({ role: m.role, content: m.content }))

  try {
    const token = getToken()
    // 兜底：先按相对路径走，绝大多数情况（前后端同源）就成功了。
    // 如果服务端返回 4xx（典型情况：浏览器所在 host 没有 /api/coach/chat，比如老 tab 还指向
    // 以前的 XAMPP(3001) 或 vite dev proxy(5001)），再用绝对地址 location.origin 重试一次，
    // 强制落到当前页面真实所在的后端上，无需用户调整地址栏 / 清理缓存。
    const chatUrl = window.location.origin
      ? window.location.origin + '/api/coach/chat'
      : '/api/coach/chat'
    let res
    try {
      res = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: (() => {
          const uid = getChatUid()
          const payload = { messages: history, userId: uid, context: buildCoachContext() }
          return JSON.stringify(payload)
        })()
      })
      if (!res.ok && res.status >= 400 && res.status < 500) {
        // 第一次失败（同源服务不响应 / 路径被其它中间件吃了）→ 用绝对地址重试
        const retryUrl = (window.location.origin || '') + '/api/coach/chat'
        if (retryUrl && retryUrl !== chatUrl) {
          res = await fetch(retryUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: (() => {
              const uid = getChatUid()
              const payload = { messages: history, userId: uid, context: buildCoachContext() }
              return JSON.stringify(payload)
            })()
          })
        }
      }
    } catch (e) {
      throw new Error('连接本地服务失败：' + (e?.message || 'unknown') + ' (origin=' + (window.location.origin || '?') + ')')
    }
    if (!res.ok || !res.body) {
      // 优先用服务端返回的 JSON.error；拿不到就 fallback 到原始文本，
      // 避免"请求失败 (404)"这种笼统提示掩盖真正的根因
      // （线上常见：Nginx/前置网关把 JSON body 替换为 HTML，会让 res.json() 抛错）
      let srvMsg = ''
      try {
        const j = await res.clone().json()
        srvMsg = j?.error || j?.message || ''
      } catch {
        try {
          srvMsg = (await res.text()).slice(0, 240)
        } catch {}
      }
      throw new Error(srvMsg || `请求失败 (${res.status})`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buf = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() // 保留半行
      for (const line of lines) {
        const t = line.trim()
        if (!t.startsWith('data:')) continue
        const payload = t.slice(5).trim()
        if (payload === '[DONE]') continue
        try {
          const json = JSON.parse(payload)
          const delta = json.choices?.[0]?.delta?.content
          if (delta) {
            if (assistantMsg.pending) assistantMsg.pending = false
            assistantMsg.content += delta
          }
        } catch {
          /* 跳过非 JSON 的控制行 */
        }
      }
    }
  } catch (e) {
    chatError.value = e?.message || '对话请求失败，请稍后重试'
    if (!assistantMsg.content) assistantMsg.content = '（连接出错，请稍后重试）'
  } finally {
    sending.value = false
  }
}

const route = useRoute()
const router = useRouter()
const resultId = route.params.id

const result = ref(null)
const loading = ref(false)
const error = ref('')

// 题号 -> 维度（用于 81 题下钻）
const qid2dim = Object.fromEntries(questions.map((q) => [q.id, q.dim]))
const qid2text = Object.fromEntries(questions.map((q) => [q.id, q.text]))

const overallLevelObj = computed(() => {
  const lv = result.value?.overallLevel ?? 0
  return levels.find((l) => l.level === lv) || levels[0]
})

// 维度得分（按真实 dimensionScores），保留 short/name/avg/level/desc
const dims = computed(() =>
  (result.value?.dimensionScores || []).map((d) => ({
    id: d.id,
    short: d.short || dimensionMap[d.id]?.short || d.id,
    name: d.name || dimensionMap[d.id]?.name || d.id,
    desc: d.desc || dimensionMap[d.id]?.desc || '',
    avg: d.avg ?? 0,
    level: d.level ?? 1
  }))
)

// 雷达图：标签与数值必须保持同一顺序（这是之前“对不上”的根因）
const radarIndicators = computed(() =>
  dims.value.map((d) => ({ name: d.short, max: 5 }))
)
const radarValues = computed(() => dims.value.map((d) => d.avg))

// 优势能力：均分 >= 4 视为优秀（用户标准），没有则不展示该模块
const advantageDims = computed(() =>
  [...dims.value].filter((d) => d.avg >= 4).sort((a, b) => b.avg - a.avg)
)
// 更上一层楼（劣势）：均分 < 3 属于不太理想，没有则不展示该模块
const improveDims = computed(() =>
  [...dims.value].filter((d) => d.avg < 3).sort((a, b) => a.avg - b.avg)
)
// 矩阵布局：根据能力项数量自动适配列数（尽量方正，最多 3 列）
function matrixCols(n) {
  if (n <= 1) return 1
  if (n <= 4) return 2
  return 3
}

// 81 题作答（用于“最薄弱问题”下钻）
const answeredQuestions = computed(() => {
  const answers = result.value?.answers || {}
  return questions
    .map((q) => ({ qid: q.id, text: q.text, dim: q.dim, score: Number(answers[q.id]) || 0 }))
    .filter((q) => q.score > 0)
})

// 最薄弱的 x 个问题：81 题中得分 ≤ 2 的题目（按得分升序），根据题目 + 低分给出解读
const weakItems = computed(() =>
  [...answeredQuestions.value].filter((q) => q.score <= 2).sort((a, b) => a.score - b.score)
)

function pct(avg) {
  return Math.max(4, Math.round((avg / 5) * 100))
}

// ===== 导师辅导能力画像：12 维度标准参考说法（对应 5 分满分）=====
// adv：优势维度（≥4）的标准参考说法；imp：劣势维度（<3）的补强措辞（按得分进一步分级）
const dimRef = {
  self: {
    name: '自我认知',
    adv: '具备持续而真诚的自我觉察能力，能够敏锐识别自身的信念、情绪、优势与局限，并以此为起点引导学员也发展出同样的反思习惯。导师通过反思性实践，既帮助学员深入探索自身的信念、价值观与情感，也推动自己在辅导过程中不断成长。',
    imp: '在真实辅导中对自身信念、情绪、优势与盲点的觉察还不够敏锐，反思习惯有待养成。建议坚持每辅导 3-5 次做一次自我复盘，先看见自己的状态，再引导学员学会反思。'
  },
  goal: {
    name: '目标设定',
    adv: '善于与学员共同确立清晰、可衡量的发展目标，并严格遵循 SMART 框架（Specific、Measurable、Achievable、Relevant、Time-bound）构建目标体系，将目标分解为可执行的步骤并建立问责机制，让学员在看见自身进步的过程中保持动力。',
    imp: '在真实辅导中与学员共同设定的目标还不够清晰、可衡量，缺少 SMART 框架与问责机制。建议每次辅导前用一句话写清「本次要解决什么、怎样算解决」，把目标拆成可执行步骤并跟进。'
  },
  relationship: {
    name: '关系建立',
    adv: '以信任、尊重和共情为基石，构建安全而开放的辅导空间，确保每位学员「感到被看见、被听到、被重视」，通过展示情感、专业与时间投入传递对学员长期发展的承诺，并营造包容性文化让学员敢于坦诚分享。',
    imp: '在真实辅导中关系建立偏慢或偏正式，学员可能不愿敞开。建议在前 3 次辅导刻意做非工作话题的连接与确认，用信任、尊重和共情营造更安全的辅导空间。'
  },
  coaching: {
    name: '教练技术',
    adv: '熟练运用 GROW 模型（Goals→Reality→Options→Will）等结构化框架，以开放式提问、积极倾听和建设性反馈为核心工具，通过精准提问激发学员的自我觉察与内在动力，而非直接给出答案。',
    imp: '在真实辅导中容易直接给建议，剥夺学员的思考空间。建议刻意练习 GROW 模型与「先问 3 个问题再给方案」的节奏，让学员自己找到答案。'
  },
  resource: {
    name: '资源激活',
    adv: '擅长识别并激活学员身边的各类资源——人脉网络、学习机会、跨部门协作和职业发展平台，将自身经验与关系网转化为学员可触及的「发展资本」，并引导学员学会自主调动资源。',
    imp: '在真实辅导中容易把辅导局限在谈话，缺少对内外部资源与机会的链接。建议每次辅导额外问一句「还有谁能帮上忙」，主动为学员盘活身边可用的资源。'
  },
  knowledge: {
    name: '知识传承',
    adv: '不仅是经验的分享者，更是知识的转化者，能把隐性知识（实践智慧、职业判断、组织文化）以学员能吸收的方式有效传递，且不越俎代庖，最终导向学员从「接收者」成长为「独立实践者」。',
    imp: '在真实辅导中容易只讲结论，不讲「为什么」与「怎么避坑」。建议每讲一个经验，配套讲一个反例与一个避坑点，帮助学员从「接收者」走向「独立实践者」。'
  },
  tool: {
    name: '工具应用',
    adv: '能够灵活运用各类辅导工具与技术提升辅导效能——从数字化辅导平台、在线评估工具到 AI 辅助系统，再到实体工具如学习风格档案、反思日志和成长档案袋，审慎选择适合学员情境的工具，使技术服务于关系而非替代关系。',
    imp: '在真实辅导中方法偏单一，缺少模型与工具支撑。建议选 1-2 个教练模型（如 GROW）和 1 个记录工具（如反思日志）刻意练习，让技术服务于关系。'
  },
  outcome: {
    name: '成果检验',
    adv: '建立系统化的成果评估机制，以关键绩效指标（KPI）和行为指标（KBI）追踪学员成长轨迹，通过基线测评、定期复盘和多方反馈，持续检验辅导成效并调整方法，确保辅导过程「有据可循」。',
    imp: '在真实辅导中容易聊完就散，缺少行动与检验。建议建立简单的成果追踪机制，每次辅导必出 1-2 个下周可验证的具体行动，用基线复盘检验成效。'
  },
  communication: {
    name: '沟通推广',
    adv: '不仅是辅导者，更是辅导文化的倡导者与传播者，在组织内积极主张导师制的价值，推动营造「以真相与勇气为核心」的辅导文化，通过示范、分享和倡导提升整个组织对辅导和教练的认同感与参与度。',
    imp: '在真实辅导中成效不易被看见，缺少对外沟通与倡导。建议每月做一次辅导成果简报给相关方，示范并分享你的辅导故事，带动更多同事加入辅导队伍。'
  },
  reflection: {
    name: '评估反思',
    adv: '将系统的评估与批判性反思贯穿辅导全程，不仅评估学员的进步，也持续审视自身的辅导策略，通过结构化反思、同伴讨论和循环改进不断优化方法，使评估「系统性且迭代」。',
    imp: '在真实辅导中缺少复盘，方法迭代慢。建议每辅导 3-5 次做一次「过程-结果-改进」三段式复盘，用多源数据支撑方法优化。'
  },
  system: {
    name: '系统思维',
    adv: '具备系统思维能力，能够将学员置于其所在的组织生态、文化背景和人际关系网络中加以理解，采取整体性视角，帮助学员识别多层面的过程与制约因素，理解改变一个环节可能带来的连锁反应，从而做出更明智的发展决策。',
    imp: '在真实辅导中容易只看当下问题，缺少全局视角。建议辅导时多问「这件事在学员一年成长里处于什么位置」，帮助学员看见更大的系统与制约。'
  },
  ethic: {
    name: '职业道德',
    adv: '以最高的伦理标准约束自身行为，视保密性为指引关系的基石，遵循伦理守则：不利用关系牟利、不越界干涉、不破坏信任，意识到自身能力边界并持续提升专业胜任力，秉持「首先不造成伤害」的理念安全有效地赋能学员。',
    imp: '在真实辅导中边界感偏弱，容易卷入学员的工作或情绪，在保密与越界上存在隐患。建议明确辅导范畴与越界处理规则，守住保密与伦理底线。'
  }
}

// 矩阵单元格描述：优势维度直接展示标准参考说法（卡片头部已显示分数，无需重复）；
// 劣势维度按得分调整语气措辞。
function matrixText(d, type) {
  const info = dimRef[d.id]
  if (type === 'adv') {
    return info?.adv || '建议在带教与沟通中持续发挥这一优势。'
  }
  const avg = d.avg
  const tone =
    avg >= 2
      ? '尚有一定基础，但发挥不够稳定，有较大提升空间。'
      : '目前较为薄弱，值得优先重点补强。'
  const imp = info?.imp || '建议围绕该维度的具体场景刻意练习。'
  return tone + ' ' + imp
}
// 最薄弱题目的解读：根据题目 + 低分（1 分几乎没做 / 2 分很少做）给出解读，措辞按序轮换，避免多条雷同
const weakTemplates = [
  (q) =>
    q.score <= 1
      ? `你自评仅 ${q.score} 分（「${q.text}」），说明实际辅导中几乎没有做到这一点，是当前最明显的空白，建议优先补齐。`
      : `你自评仅 ${q.score} 分（「${q.text}」），说明实际辅导中较少做到这一点，是比较薄弱的环节，建议在下次辅导中有意识地练习。`,
  (q) =>
    q.score <= 1
      ? `在「${q.text}」上你只给了 ${q.score} 分，几乎从未主动去做，属于需要从零补起的一项。`
      : `在「${q.text}」上你只给了 ${q.score} 分，做得不多、也不够稳定，是值得重点补强的一环。`,
  (q) =>
    q.score <= 1
      ? `「${q.text}」你自评 ${q.score} 分，几乎是空白项，建议把它列进下一次辅导的必做清单。`
      : `「${q.text}」你自评 ${q.score} 分，略显薄弱，建议围绕该场景做一次刻意练习，把它从「知道」变成「做到」。`
]
function weakNote(q, i) {
  return weakTemplates[(i || 0) % weakTemplates.length](q)
}

const portrait = computed(() => {
  const o = result.value?.overall ?? 0
  const lv = overallLevelObj.value
  const strongNames = advantageDims.value.map((d) => d.short).join('、') || '暂无明显突出维度'
  const weakNames = improveDims.value.map((d) => d.short).join('、') || '暂无明显短板维度'

  const balance =
    dims.value.length >= 2
      ? Math.max(...dims.value.map((d) => d.avg)) - Math.min(...dims.value.map((d) => d.avg))
      : 0
  let balanceText
  if (balance <= 0.6) balanceText = '各维度发展较为均衡，没有明显偏科。'
  else if (balance <= 1.2) balanceText = '各维度发展基本均衡，存在局部差异。'
  else balanceText = '各维度发展不均衡，强弱分化明显。'

  const summary =
    `你的导师辅导能力综合得分 ${o.toFixed(2)}，处于「${lv.short}」（${lv.name}）水平。` +
    `相对突出的能力为「${strongNames}」；需重点提升的是「${weakNames}」。${balanceText}`

  // 一个行动建议：聚焦最弱维度 + 最薄弱题目
  const low = improveDims.value[0] || null
  const lowItem = weakItems.value[0] || null
  let suggestion
  if (low && lowItem) {
    suggestion = `建议优先补强「${low.short}」：可从「${lowItem.text}」这类你自评较低的场景入手，在下次辅导中有意识地练习，先把最薄弱的环节补起来。`
  } else if (low) {
    suggestion = `建议优先补强「${low.short}」：围绕该维度的具体辅导场景做刻意练习，逐步抬升短板。`
  } else if (lowItem) {
    suggestion = `建议从「${lowItem.text}」这类你自评较低的场景入手，在下次辅导中有意识地练习。`
  } else {
    suggestion = '当前各维度表现均衡且良好，建议选定一个方向做深度专精，形成个人辅导特色。'
  }

  return { summary, suggestion }
})

function normalize(r) {
  let dimensionScores = r.dimensionScores
  if (typeof dimensionScores === 'string') {
    try { dimensionScores = JSON.parse(dimensionScores) } catch { dimensionScores = [] }
  }
  let answers = r.answers
  if (typeof answers === 'string') {
    try { answers = JSON.parse(answers) } catch { answers = {} }
  }
  return { ...r, dimensionScores, answers }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const r = await api.get(`/assessment/${resultId}`)
    result.value = normalize(r)
  } catch (e) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="report" v-if="result">
    <!-- 顶栏 -->
    <header class="topbar">
      <button class="back" @click="router.push(`/result/${resultId}`)">基础报告</button>
      <span class="title">AI 深度解读</span>
      <span class="level-chip">{{ overallLevelObj.short }}</span>
    </header>

    <main class="wrap">
      <!-- Ⅰ 总等级：级别名在前（大字号），分数在后（小字号），整体居中 -->
      <section class="card hero">
        <div class="hero-level">{{ overallLevelObj.short }}</div>
        <div class="score">
          <span class="num">{{ result.overall.toFixed(2) }}</span>
          <span class="den">/ 5</span>
        </div>
      </section>

      <!-- 雷达图 + 画像 并排 -->
      <div class="report-row">
        <section class="card">
          <h3 class="sec-title">能力维度雷达图</h3>
          <RadarChart :indicators="radarIndicators" :values="radarValues" height="320px" />
        </section>
        <section class="card portrait">
          <h3 class="sec-title">导师辅导能力画像</h3>
          <p class="portrait-summary">{{ portrait.summary }}</p>
          <h4 class="sub-title">一个行动建议</h4>
          <ul class="suggest">
            <li>{{ portrait.suggestion }}</li>
          </ul>
        </section>
      </div>

      <!-- Ⅲ 优势能力：仅展示均分 >= 4 的维度，矩阵布局，套用标准参考说法并按得分描述 -->
      <section class="card" v-if="advantageDims.length">
        <h3 class="sec-title">优势能力</h3>
        <p class="note">以下是你导师辅导中具备优势的能力维度（均分 ≥ 4，满分 5 分）。</p>
        <div class="dim-grid" :style="{ '--cols': matrixCols(advantageDims.length) }">
          <div class="dim-cell top" v-for="d in advantageDims" :key="d.id">
            <div class="cell-head">
              <span class="dim-name">{{ d.short }}</span>
              <span class="dim-val top-val">{{ d.avg.toFixed(2) }}</span>
            </div>
            <p class="dim-analysis">{{ matrixText(d, 'adv') }}</p>
          </div>
        </div>
      </section>

      <!-- Ⅳ 更上一层楼（劣势）：仅展示均分 < 3 的维度，矩阵布局，按得分调整语气 -->
      <section class="card" v-if="improveDims.length">
        <h3 class="sec-title">更上一层楼</h3>
        <p class="note">以下维度均分 &lt; 3，是相对薄弱、建议优先补强的短板。</p>
        <div class="dim-grid" :style="{ '--cols': matrixCols(improveDims.length) }">
          <div class="dim-cell weak" v-for="d in improveDims" :key="d.id">
            <div class="cell-head">
              <span class="dim-name">{{ d.short }}</span>
              <span class="dim-val weak-val">{{ d.avg.toFixed(2) }}</span>
            </div>
            <span class="track"><span class="fill weak-fill" :style="{ width: pct(d.avg) + '%' }"></span></span>
            <p class="dim-analysis">{{ matrixText(d, 'imp') }}</p>
          </div>
        </div>
      </section>

      <!-- Ⅴ 最薄弱的 x 个问题：81 题中得分 ≤ 2 -->
      <section class="card" v-if="weakItems.length">
        <h3 class="sec-title">最薄弱的 {{ weakItems.length }} 个问题</h3>
        <p class="note">以下来自 81 题自评中得分 ≤ 2 的题目，按得分由低到高排列，是实际辅导中较少做到、比较薄弱的环节。</p>
        <ul class="weak-q">
          <li v-for="(q, i) in weakItems" :key="q.qid" class="weak-item">
            <div class="weak-q-head">
              <span class="wq-score low">{{ q.score }}</span>
              <span class="wq-text">{{ q.text }}</span>
              <span class="wq-dim">{{ dimensionMap[q.dim]?.short }}</span>
            </div>
            <p class="weak-note">{{ weakNote(q, i) }}</p>
          </li>
        </ul>
      </section>

      <!-- Ⅵ 导师辅导能力画像已移至顶部与雷达图并排，此处不再重复 -->

      <p v-if="error" class="err">{{ error }}</p>

      <!-- Ⅶ AI 深度解读（API 嵌入腾讯元器智能体，免登录，密钥不出服务端） -->
      <section class="card coach-card">
        <div class="coach-head">
          <div class="coach-head-text">
            <h3 class="sec-title coach-title">AI深度解读专家</h3>
          </div>
        </div>

        <div class="chat">
          <div class="chat-body" ref="chatBody">
            <div
              v-for="(m, i) in messages"
              :key="i"
              class="bubble"
              :class="m.role === 'user' ? 'bubble-user' : 'bubble-ai'"
            >
              <div class="bubble-inner">{{ m.content || '正在深度思考……请耐心等待' }}</div>
            </div>
            <p v-if="chatError" class="chat-err">{{ chatError }}</p>
          </div>
          <form class="chat-input" @submit.prevent="sendChat">
            <textarea
              v-model="input"
              class="chat-text"
              rows="1"
              placeholder="向报告专家提问，例如：我的优势能力该怎么发挥？"
              @keydown.enter.exact.prevent="sendChat"
            ></textarea>
            <button class="chat-send" type="submit" :disabled="sending || !input.trim()">
              {{ sending ? '深度思考中' : '发送' }}
            </button>
          </form>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.report {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: #f7f8fa;
  color: #1f2430;
  min-height: 100vh;
}
.topbar {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; gap: 12px;
  padding: 12px 20px; background: rgba(247, 248, 250, 0.92);
  border-bottom: 1px solid #eceef2;
}
.back { background: none; border: none; color: #5b6472; font-size: 13px; cursor: pointer; }
.title { font-size: 14px; font-weight: 600; }
.level-chip {
  margin-left: auto; font-size: 12px; color: #2f6b8f;
  border: 1px solid rgba(47, 107, 143, 0.15); background: rgba(47, 107, 143, 0.08);
  padding: 3px 10px; border-radius: 999px;
}
.wrap { max-width: 1200px; margin: 0 auto; padding: 24px 20px 80px; }
.card {
  background: #fff; border: 1px solid #eceef2; border-radius: 12px;
  padding: 20px; margin-top: 16px;
}
.sec-title { font-size: 15px; font-weight: 700; margin: 0 0 14px; color: #1f2430; }
.sub-title { font-size: 13px; font-weight: 600; color: #5b6472; margin: 18px 0 8px; }
.note { font-size: 13px; color: #5b6472; margin: 0 0 14px; }
.note b { color: #2f6b8f; }

.hero { display: flex; align-items: baseline; justify-content: center; gap: 14px; }
.score { display: flex; align-items: baseline; gap: 4px; flex-wrap: nowrap; white-space: nowrap; }
.hero-level { font-size: 46px; font-weight: 700; color: #2f6b8f; line-height: 1; }
.num { font-size: 22px; font-weight: 600; color: #5b6472; line-height: 1; }
.den { font-size: 12px; color: #9aa1ad; }
.desc { margin: 6px 0 0; color: #5b6472; font-size: 13px; line-height: 1.6; }

/* 雷达图 + 画像 并排：宽屏左右分栏（画像占更多空间），两卡片等高；窄屏堆叠 */
.report-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr);
  gap: 16px;
  margin-top: 16px;
}
.report-row > .card { margin-top: 0; min-width: 0; }
@media (max-width: 900px) {
  .report-row { grid-template-columns: 1fr; }
}

/* ===== 优势/待补足能力：矩阵布局（按数量自动适配列数） ===== */
.dim-grid {
  display: grid;
  grid-template-columns: repeat(var(--cols, 2), minmax(0, 1fr));
  gap: 14px;
  align-items: stretch;
}
.dim-cell {
  display: flex;
  flex-direction: column;
  border: 1px solid #eceef2;
  border-radius: 10px;
  padding: 14px;
  background: #fff;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}
.dim-cell.top { border-top: 3px solid #2f6b8f; }
.dim-cell.weak { border-top: 3px solid #c07a3e; }
.dim-cell:hover { box-shadow: 0 4px 14px rgba(31, 36, 48, 0.06); transform: translateY(-1px); }
.cell-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.dim-name { font-size: 14px; font-weight: 700; }
.dim-val { font-size: 17px; font-weight: 700; color: #2f6b8f; font-variant-numeric: tabular-nums; }
.top-val { color: #2f6b8f; }
.weak-val { color: #c07a3e; }
.track { display: block; height: 8px; background: #f1f3f6; border-radius: 999px; overflow: hidden; margin: 10px 0 2px; }
.fill { display: block; height: 100%; background: #2f6b8f; border-radius: 999px; }
.weak-fill { background: #c07a3e; }
.dim-analysis { margin: 8px 0 0; font-size: 12.5px; color: #3a3f4a; line-height: 1.65; background: #f7f9fb; border-left: 3px solid #2f6b8f; padding: 8px 10px; border-radius: 0 8px 8px 0; flex: 1 1 auto; }
.dim-cell.weak .dim-analysis { border-left-color: #c07a3e; background: #fbf6f1; }

/* ===== AI 深度解读（API 嵌入元器：站内聊天） ===== */
.coach-card { padding: 20px 20px 16px; }
.coach-head {
  display: flex; align-items: flex-start; gap: 12px;
  margin-bottom: 12px;
}
.coach-head-text { flex: 1 1 auto; min-width: 0; }
.coach-title { margin: 0; }
.coach-sub { margin: 6px 0 0; font-size: 12px; color: #5b6472; line-height: 1.6; }
.coach-open {
  flex: 0 0 auto;
  background: #2f6b8f; color: #fff;
  border: none; border-radius: 999px;
  padding: 8px 14px; font-size: 13px; cursor: pointer;
  white-space: nowrap; text-decoration: none;
  transition: background 0.15s ease;
}
.coach-open:hover { background: #265a78; }

.chat {
  border: 1px solid #eceef2; border-radius: 10px; overflow: hidden;
  display: flex; flex-direction: column;
  height: 520px; background: #f7f8fa;
}
.chat-body {
  flex: 1 1 auto; overflow-y: auto;
  padding: 16px; display: flex; flex-direction: column; gap: 12px;
}
.bubble { display: flex; }
.bubble-user { justify-content: flex-end; }
.bubble-ai { justify-content: flex-start; }
.bubble-inner {
  max-width: 82%; padding: 10px 13px; font-size: 13px; line-height: 1.7;
  white-space: pre-wrap; word-break: break-word; border-radius: 12px;
}
.bubble-ai .bubble-inner {
  background: #fff; color: #3a3f4a; border: 1px solid #eceef2;
  border-top-left-radius: 3px;
}
.bubble-user .bubble-inner {
  background: #2f6b8f; color: #fff; border-top-right-radius: 3px;
}
.chat-err { font-size: 12px; color: #c07a3e; margin: 0; }

.chat-input {
  flex: 0 0 auto; display: flex; gap: 8px; align-items: flex-end;
  padding: 10px; border-top: 1px solid #eceef2; background: #fff;
}
.chat-text {
  flex: 1 1 auto; resize: none; max-height: 120px;
  border: 1px solid #e3e7ec; border-radius: 10px;
  padding: 9px 12px; font-size: 13px; line-height: 1.5; font-family: inherit;
  outline: none; color: #1f2430;
}
.chat-text:focus { border-color: #2f6b8f; }
.chat-send {
  flex: 0 0 auto; background: #2f6b8f; color: #fff;
  border: none; border-radius: 10px; padding: 9px 16px; font-size: 13px;
  cursor: pointer; white-space: nowrap; transition: background 0.15s ease;
}
.chat-send:hover:not(:disabled) { background: #265a78; }
.chat-send:disabled { background: #b7c4cd; cursor: not-allowed; }

@media (max-width: 640px) {
  .chat { height: 70vh; min-height: 460px; }
  .coach-head { flex-direction: column; }
  .coach-open { align-self: flex-start; }
  /* 移动端矩阵降为单列，保证可读性 */
  .dim-grid { grid-template-columns: 1fr !important; }
}

.bar-row { display: flex; align-items: center; gap: 10px; margin: 9px 0; }
.name { width: 44px; font-size: 12px; color: #5b6472; flex-shrink: 0; }
.val { width: 34px; text-align: right; font-size: 12px; color: #5b6472; font-variant-numeric: tabular-nums; flex-shrink: 0; }

.dist { display: flex; align-items: flex-end; gap: 14px; height: 150px; padding: 0 8px; }
.dist-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
.d-num { font-size: 12px; font-weight: 700; color: #5b6472; }
.d-bar { width: 60%; background: linear-gradient(180deg, #2f6b8f, #a9c6d6); border-radius: 6px 6px 0 0; min-height: 2px; }
.d-label { font-size: 11px; color: #8b9099; margin-top: 6px; text-align: center; }
.dist-legend { font-size: 11px; color: #a39e95; margin-top: 8px; }

.weak-q { list-style: none; margin: 0; padding: 0; }
.weak-item { padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
.weak-item:last-child { border-bottom: none; }
.weak-q-head { display: flex; align-items: center; gap: 10px; }
.weak-note { margin: 8px 0 0 34px; font-size: 13px; color: #5b6472; line-height: 1.65; }
.wq-score {
  flex-shrink: 0; width: 24px; height: 24px; border-radius: 6px; background: #eef3f7; color: #2f6b8f;
  font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center;
}
.wq-score.low { background: #fbeede; color: #c07a3e; }
.wq-text { flex: 1; font-size: 13px; color: #3a3f4a; line-height: 1.5; }
.wq-dim { flex-shrink: 0; font-size: 11px; color: #8b9099; background: #f3f4f6; padding: 2px 8px; border-radius: 999px; }

.drill { margin-bottom: 16px; }
.drill-title { font-size: 13px; font-weight: 600; color: #c07a3e; margin: 0 0 8px; }
.drill-list { list-style: none; margin: 0; padding: 0; }
.drill-list li { display: flex; align-items: flex-start; gap: 10px; padding: 5px 0; }
.dl-score {
  flex-shrink: 0; width: 22px; height: 22px; border-radius: 6px; background: #eef3f7; color: #2f6b8f;
  font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-top: 1px;
}
.dl-score.low { background: #fbeede; color: #c07a3e; }
.dl-score.mid { background: #fdf3e3; color: #b08a3e; }
.dl-text { flex: 1; font-size: 12.5px; color: #4a4f59; line-height: 1.5; }

.portrait-summary { font-size: 14px; line-height: 1.75; color: #3a3f4a; margin: 0; }
.portrait-block { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; }
.pb-tag { flex-shrink: 0; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px; }
.top-tag { color: #2f6b8f; background: rgba(47, 107, 143, 0.1); }
.weak-tag { color: #c07a3e; background: rgba(192, 122, 62, 0.1); }
.pb-text { font-size: 13px; color: #5b6472; line-height: 1.6; }
.suggest { margin: 0; padding-left: 18px; }
.suggest li { font-size: 13px; color: #3a3f4a; line-height: 1.7; margin-bottom: 6px; }

.err { color: #c07a3e; font-size: 13px; margin-top: 16px; }
</style>
