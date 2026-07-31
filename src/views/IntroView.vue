<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAssessmentStore } from '../stores/assessment.js'
import { api } from '../api/client.js'
import { dimensions } from '../../shared/dimensions.js'
import { questions } from '../../shared/questions.js'
import { levels } from '../../shared/levels.js'
import { getLevel } from '../../shared/levels.js'

const router = useRouter()
const store = useAssessmentStore()

const totalQuestions = questions.length
const totalDims = dimensions.length

function start() {
  try {
    store.resetAnswers()
    router.push('/assessment')
  } catch (e) {
    console.error('start failed:', e)
    router.push('/assessment')
  }
}

// 历史测试记录
const history = ref([])
const histLoading = ref(false)
const histError = ref('')
const fmt = (n) => (n == null ? '0.00' : Number(n).toFixed(2))
const levelOf = (overall) => { const l = getLevel(overall); return `L${l.level} · ${l.name}` }
function fmtTime(s) {
  if (!s) return ''
  const d = new Date(s.replace(' ', 'T') + 'Z')
  if (isNaN(d.getTime())) return s
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
function openResult(id) { router.push('/result/' + id) }

onMounted(async () => {
  histLoading.value = true
  try {
    const { results } = await api.get('/assessment/history')
    history.value = results || []
  } catch (e) {
    histError.value = e.message || '加载失败'
  } finally {
    histLoading.value = false
  }
})
</script>

<template>
  <div class="intro">
    <!-- Hero -->
    <section class="hero card">
      <div class="badge">12 维度 · 81 题 · 5 级量表</div>
      <h1>导师辅导能力成熟度自评</h1>
      <p class="lead">
        一套结构化、可复用的自评工具，帮助你客观看清自己作为导师的辅导能力处在哪一能级，
        定位优势与短板，并获得可立即落地的提升建议。
      </p>
      <div class="cta-row">
        <button class="btn btn-primary" @click="start">免费开始测评</button>
        <span class="est muted">约 8–12 分钟 · 无需付费 · 即时出报告</span>
      </div>
    </section>

    <!-- 价值主张 -->
    <section class="values">
      <div class="value">
        <div class="v-icon">🎯</div>
        <h3>看清真实能级</h3>
        <p>用统一量表把「凭感觉」的辅导能力量化，给出助理级 / 专业级 / 高级 / 大师级四档判定。</p>
      </div>
      <div class="value">
        <div class="v-icon">🧩</div>
        <h3>12 维度全覆盖</h3>
        <p>从关系建立、倾听理解到边界伦理、持续精进，覆盖导师辅导的关键能力域。</p>
      </div>
    </section>

    <!-- 适用人群 -->
    <section class="card block">
      <h2>谁适合用</h2>
      <div class="audience">
        <span class="chip">企业内导师 / 带教老师</span>
        <span class="chip">管理者与团队 Leader</span>
        <span class="chip">HR / 培训负责人</span>
        <span class="chip">教练与顾问</span>
        <span class="chip">想成为更好导师的任何人</span>
      </div>
    </section>

    <!-- 12 维度 -->
    <section class="block">
      <div class="block-head">
        <h2>测评覆盖的 12 个能力维度</h2>
        <span class="muted">共 {{ totalQuestions }} 道自评题</span>
      </div>
      <div class="grid grid-3">
        <div v-for="(d, i) in dimensions" :key="d.id" class="card dim">
          <div class="dim-top">
            <span class="idx" :style="{ background: d.color + '1a', color: d.color }">{{ i + 1 }}</span>
            <span class="tag" :style="{ background: d.color + '1a', color: d.color }">{{ d.short }}</span>
          </div>
          <h3 style="margin:12px 0 6px">{{ d.name }}</h3>
          <p class="muted" style="font-size:13px;line-height:1.6;margin:0">{{ d.desc }}</p>
        </div>
      </div>
    </section>

    <!-- 成熟度等级 -->
    <section class="block">
      <div class="block-head">
        <h2>你的成熟度将被分为四档</h2>
      </div>
      <div class="levels">
        <div v-for="lv in levels" :key="lv.level" class="card level" :style="{ borderLeftColor: lv.color }">
          <div class="lv-head">
            <span class="lv-name" :style="{ color: lv.color }">{{ lv.name }}</span>
            <span class="lv-range muted">{{ lv.min }}–{{ lv.max }} 分</span>
          </div>
          <p class="muted" style="font-size:13px;line-height:1.6;margin:8px 0 0">{{ lv.desc }}</p>
        </div>
      </div>
    </section>

    <!-- 说明 -->
    <section class="card block note">
      <h2>测评说明</h2>
      <ul>
        <li>采用 5 级李克特量表：<b>1 从不 · 2 很少 · 3 有时 · 4 经常 · 5 总是</b>，请按真实情况作答。</li>
        <li>题目逐题呈现，可自由前后切换；结果仅用于自我觉察与发展，不作任何评判。</li>
        <li>提交后即生成个人能力雷达图与分维度提升建议，可随时重新测评对照成长。</li>
      </ul>
    </section>

    <!-- 历史测试记录 -->
    <section class="card block history">
      <div class="block-head">
        <h2>历史测试记录</h2>
        <span class="muted">共 {{ history.length }} 次测评</span>
      </div>
      <div v-if="histLoading" class="muted center">加载中…</div>
      <div v-else-if="histError" class="muted center">{{ histError }}</div>
      <ul v-else-if="history.length" class="hist-list">
        <li v-for="r in history" :key="r.id" class="hist-item" @click="openResult(r.id)">
          <div class="hist-main">
            <div class="hist-date">{{ fmtTime(r.created_at) }}</div>
            <div class="hist-sub muted">总分 {{ fmt(r.overall) }} · {{ levelOf(r.overall) }}</div>
          </div>
          <div class="hist-arrow"></div>
        </li>
      </ul>
      <p v-else class="muted center">还没有测评记录，点击上方按钮开始第一次测评吧。</p>
    </section>

    <div class="bottom-cta">
      <button class="btn btn-primary btn-block" @click="start">开始我的测评</button>
    </div>
  </div>
</template>

<style scoped>
.intro { max-width: 1080px; margin: 0 auto; }
.hero { text-align: center; padding: 28px 20px; }
.badge { display: inline-block; font-size: 13px; font-weight: 700; color: var(--primary); background: var(--bg-soft); padding: 5px 14px; border-radius: 999px; margin-bottom: 14px; border: 1px solid var(--border); }
.hero h1 { font-size: 32px; margin: 0 0 12px; color: var(--text); }
.lead { color: var(--text-dim); line-height: 1.8; max-width: 640px; margin: 0 auto; font-size: 16px; }
.cta-row { margin-top: 22px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.est { font-size: 13px; }

.values { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin: 26px 0; }
.value { background: #fff; border: 1px solid var(--border); border-radius: var(--radius); padding: 22px; box-shadow: var(--shadow); }
.v-icon { font-size: 28px; }
.value h3 { margin: 10px 0 6px; font-size: 17px; }
.value p { margin: 0; color: var(--text-dim); font-size: 14px; line-height: 1.65; }

.block { margin-top: 28px; }
.block-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 14px; }
.block-head h2 { margin: 0; font-size: 20px; color: var(--text); }

.audience { display: flex; flex-wrap: wrap; gap: 10px; }
.chip { background: var(--card-2); border: 1px solid var(--border); color: var(--text-dim); font-size: 13px; padding: 7px 14px; border-radius: 999px; }

.dim { padding: 18px; }
.dim-top { display: flex; align-items: center; justify-content: space-between; }
.idx { width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; font-weight: 700; font-size: 13px; }

.levels { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.level { border-left: 4px solid var(--border); padding: 18px 20px; }
.lv-head { display: flex; align-items: baseline; justify-content: space-between; }
.lv-name { font-weight: 700; font-size: 16px; }
.lv-range { font-size: 13px; }

.note ul { margin: 8px 0 0; padding-left: 20px; color: var(--text-dim); line-height: 1.9; font-size: 14px; }
.note b { color: var(--text); }

.bottom-cta { margin: 30px 0 10px; }

.history { padding: 22px 20px; }
.hist-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.hist-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border: 1px solid var(--border); border-radius: 12px;
  background: #fff; cursor: pointer; transition: border-color .15s, box-shadow .15s;
}
.hist-item:hover { border-color: var(--primary); }
.hist-date { font-size: 15px; font-weight: 600; color: var(--text); }
.hist-sub { font-size: 13px; margin-top: 2px; }
.hist-arrow { font-size: 24px; color: var(--text-dim); line-height: 1; }
.center { text-align: center; }

@media (max-width: 720px) {
  .values, .levels { grid-template-columns: 1fr; }
}
</style>
