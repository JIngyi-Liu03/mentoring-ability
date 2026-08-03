<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAssessmentStore } from '../stores/assessment.js'
import { api } from '../api/client.js'
import { levels } from '../../shared/levels.js'
import RadarChart from '../components/RadarChart.vue'

// ---- 等级配色：与 shared/levels.js 一致（商标双色调） ----
// 等级 1-3 青蓝深浅；等级 4（最高）橙色强调
const LEVEL_COLORS = {
  1: { main: '#a8dad0', deep: '#7ab8ad', fill: 'rgba(168,218,208,0.32)' },
  2: { main: '#3aa9aa', deep: '#1c8a8b', fill: 'rgba(28,138,139,0.30)' },
  3: { main: '#1c8a8b', deep: '#156a6b', fill: 'rgba(28,138,139,0.35)' },
  4: { main: '#ea7c2a', deep: '#c46517', fill: 'rgba(234,124,42,0.32)' }
}

function levelColor(level) {
  return LEVEL_COLORS[level] || LEVEL_COLORS[1]
}

const route = useRoute()
const router = useRouter()
const store = useAssessmentStore()

const result = ref(null)
const loading = ref(true)
const barsReady = ref(false)

const dimScores = computed(() => {
  if (!result.value || !result.value.dimensionScores) return []
  return [...result.value.dimensionScores]
    .map(d => ({ name: d.short || d.name, avg: d.avg, level: d.level, levelName: d.levelName }))
    .sort((a, b) => b.avg - a.avg)
})

const maxScore = computed(() => {
  if (dimScores.value.length === 0) return 5
  return Math.max(...dimScores.value.map(d => d.avg), 5)
})

const currentLevel = computed(() => {
  if (!result.value) return null
  return levels.find(lv => lv.level === result.value.overallLevel) || null
})

// 当前总体等级对应的配色（驱动总览卡片与雷达图）
const currentLevelColor = computed(() =>
  levelColor(result.value?.overallLevel ?? 1)
)

// 雷达图数据（ECharts 参数化组件）
const radarIndicators = computed(() =>
  dimScores.value.map(d => ({ name: d.name, max: 5 }))
)
const radarValues = computed(() =>
  dimScores.value.map(d => d.avg)
)
const radarColor = computed(() => currentLevelColor.value.main)
const radarFill = computed(() => currentLevelColor.value.fill)

function pct(avg) {
  return Math.round((avg / maxScore.value) * 100)
}

function normalizeResult(data) {
  if (!data) return data
  return {
    ...data,
    overall: data.overall ?? 0,
    overallLevel: data.overallLevel ?? 1,
    overallLevelName: data.overallLevelName || '',
    dimensionScores: (data.dimensionScores || []).map(d => ({
      ...d,
      name: d.name || d.short || '',
      avg: d.avg ?? 0,
      level: d.level ?? 1,
      levelName: d.levelName || ''
    }))
  }
}

async function loadResult() {
  if (store.lastResult) {
    result.value = normalizeResult(store.lastResult)
    loading.value = false
    await nextTick()
    barsReady.value = true
  } else {
    loading.value = true
    barsReady.value = false
  }

  try {
    const resultId = route.params.id
    if (resultId) {
      const data = await api.get(`/assessment/${resultId}`)
      store.restoreResult(data)
      result.value = normalizeResult(data)
    } else {
      const { results } = await api.get('/assessment/history')
      if (results && results.length > 0) {
        const latest = await api.get(`/assessment/${results[0].id}`)
        store.restoreResult(latest)
        result.value = normalizeResult(latest)
      } else if (!store.lastResult) {
        result.value = null
      }
    }
  } catch (e) {
    console.error('加载测评结果失败:', e)
    if (!result.value) result.value = null
  } finally {
    loading.value = false
    setTimeout(() => { barsReady.value = true }, 150)
    await nextTick()
  }
}

onMounted(() => {
  loadResult()
})

onUnmounted(() => {
  // 雷达图由 RadarChart 组件自行销毁
})

watch(() => route.params.id, loadResult)
</script>

<template>
  <!-- 加载中 -->
  <div v-if="loading" class="container">
    <div class="card message">⏳ 正在加载测评结果…</div>
  </div>

  <!-- 无结果 -->
  <div v-else-if="!result" class="container">
    <div class="card message">❌ 暂无测评结果，请先完成测评。</div>
    <button class="btn btn-primary" style="margin-top:16px" @click="router.push('/assessment')">前往测评</button>
  </div>

  <!-- 结果内容 -->
  <div v-else class="container report">
    <!-- 总览卡片（颜色 = 总体等级色） -->
    <div
      class="hero-card"
      :style="{ background: 'linear-gradient(135deg, ' + currentLevelColor.deep + ' 0%, ' + currentLevelColor.main + ' 100%)' }"
    >
      <div class="hero-badge">{{ currentLevel?.short || '' }}</div>
      <div class="hero-score">{{ result.overall }}</div>
      <div class="hero-divider">/</div>
      <div class="hero-max">5</div>
      <h2 class="hero-title">{{ result.overallLevelName || '' }}</h2>
      <p class="hero-desc">{{ currentLevel?.desc || '' }}</p>
    </div>

    <!-- 雷达图（复用参数化组件） -->
    <div class="chart-card">
      <h3 class="chart-title">能力维度雷达图</h3>
      <RadarChart
        :indicators="radarIndicators"
        :values="radarValues"
        :color="radarColor"
        :fill="radarFill"
        shape="polygon"
        radius="68%"
        axis-color="#0f172a"
        height="420px"
      />
    </div>

    <!-- 各维度横向柱状图 -->
    <div class="chart-card">
      <h3 class="chart-title">各维度得分</h3>
      <div class="chart-list">
        <div
          v-for="(d, i) in dimScores"
          :key="d.name"
          class="chart-row"
          :style="{ animationDelay: (0.08 * i) + 's' }"
          :class="{ ready: barsReady }"
        >
          <div class="chart-label">{{ d.name }}</div>
          <div class="chart-track">
            <div
              class="chart-bar"
              :style="{
                width: pct(d.avg) + '%',
                background: 'linear-gradient(90deg, ' + levelColor(d.level).deep + ', ' + levelColor(d.level).main + ')'
              }"
            ></div>
          </div>
          <div class="chart-value">{{ d.avg }}</div>
        </div>
      </div>
    </div>

    <!-- 底部操作：退出回介绍页 -->
    <div class="actions">
      <button class="btn btn-outline" @click="router.push('/intro')">退出</button>
    </div>
  </div>
</template>

<style scoped>
/* ===== 容器 ===== */
.container { max-width: 720px; margin: 0 auto; padding: 40px 16px 80px; }
.report { display: flex; flex-direction: column; gap: 24px; }
.message { text-align: center; padding: 48px 24px; font-size: 16px; color: var(--text-dim); }
.btn { padding: 10px 22px; border-radius: 10px; font-size: 14px; cursor: pointer; border: none; }
.btn-primary { background: var(--primary, #1c8a8b); color: #fff; }
.btn-outline { background: transparent; border: 1px solid var(--border, #e5e7eb); color: var(--text, #333); }
.btn:hover { opacity: .85; }

/* ===== 总览卡片 ===== */
.hero-card {
  border-radius: 20px; padding: 40px 32px; text-align: center; color: #fff;
  box-shadow: 0 8px 32px rgba(30,41,59,.25);
  transition: background .4s ease;
}
.hero-badge {
  display: inline-block; padding: 5px 18px; border-radius: 20px; font-size: 13px; font-weight: 600;
  background: rgba(255,255,255,.25); margin-bottom: 18px;
}
.hero-score { font-size: 64px; font-weight: 800; line-height: 1; display: inline; }
.hero-divider { display: inline; font-size: 28px; margin: 0 6px; opacity: .6; vertical-align: super; }
.hero-max { display: inline; font-size: 28px; opacity: .6; vertical-align: super; }
.hero-title { font-size: 18px; font-weight: 500; margin: 12px 0 0; opacity: .92; }
.hero-desc { font-size: 14px; line-height: 1.7; margin: 16px 0 0; opacity: .82; text-align: left; }

/* ===== 柱状图区域 ===== */
.chart-card {
  background: #fff; border-radius: 16px; padding: 28px 28px 20px;
  box-shadow: 0 2px 16px rgba(0,0,0,.06); border: 1px solid var(--border, #e5e7eb);
}
.chart-title { font-size: 17px; font-weight: 700; margin: 0 0 20px; color: var(--text, #1f2433); }
.chart-list { display: flex; flex-direction: column; gap: 14px; }

/* 每行：名称 | 进度条 | 分数 */
.chart-row {
  display: flex; align-items: center; gap: 14px;
  opacity: 0; transform: translateX(-12px);
  transition: opacity .35s ease, transform .35s ease;
}
.chart-row.ready { opacity: 1; transform: translateX(0); }

.chart-label {
  width: 80px; flex-shrink: 0; font-size: 13px; font-weight: 600;
  color: var(--text, #374151); text-align: right; white-space: nowrap;
}
.chart-track {
  flex: 1; height: 32px; background: var(--bg-soft); border-radius: 16px; overflow: hidden;
}
.chart-bar {
  height: 100%; border-radius: 16px; min-width: 50px;
  transition: width 0.6s cubic-bezier(.22,.61,.36,1), background .4s ease;
}

.chart-value {
  width: 38px; flex-shrink: 0; font-size: 14px; font-weight: 700;
  color: var(--text, #1f2433); text-align: center;
}

/* ===== 底部操作 ===== */
.actions { display: flex; justify-content: center; gap: 12px; margin-top: 4px; }

/* 移动端适配 */
@media (max-width: 500px) {
  .chart-label { width: 60px; font-size: 12px; }
  .hero-card { padding: 28px 20px; }
  .hero-score { font-size: 48px; }
}
</style>
