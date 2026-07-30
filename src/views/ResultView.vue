<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAssessmentStore } from '../stores/assessment.js'
import { useUserStore } from '../stores/assessment.js'
import { api } from '../api/client.js'
import { getSuggestion } from '../../shared/suggestions.js'
import RadarChart from '../components/RadarChart.vue'
import DimensionBar from '../components/DimensionBar.vue'
import SuggestionCard from '../components/SuggestionCard.vue'

const router = useRouter()
const store = useAssessmentStore()
const user = useUserStore()
const loading = ref(false)

onMounted(async () => {
  if (store.lastResult) return
  // 刷新后 store 清空，从后端取最近一次结果
  loading.value = true
  try {
    const { results } = await api.get('/assessment/history')
    if (results && results.length) {
      const detail = await api.get('/assessment/' + results[0].id)
      store.restoreResult(detail)
    }
  } finally {
    loading.value = false
  }
})

const result = computed(() => store.lastResult)

const indicators = computed(() =>
  (result.value?.dimensionScores || []).map(d => ({ name: d.name, max: 5 }))
)
const values = computed(() => (result.value?.dimensionScores || []).map(d => d.avg))

const levelInfo = computed(() => {
  if (!result.value) return null
  return { level: result.value.overallLevel, name: result.value.overallLevelName, overall: result.value.overall }
})

function retake() {
  store.resetAnswers()
  router.push('/assessment')
}
</script>

<template>
  <div v-if="loading" class="muted center">加载中…</div>
  <div v-else-if="!result" class="card center">
    <p class="muted">还没有测评记录。</p>
    <button class="btn btn-primary" @click="retake">去测评</button>
  </div>

  <div v-else>
    <div class="card hero">
      <div class="tag">成熟度等级</div>
      <h1 style="margin:10px 0 4px">
        L{{ levelInfo.level }} · {{ levelInfo.name }}
      </h1>
      <p>综合得分 <strong style="color:var(--accent)">{{ levelInfo.overall }}</strong> / 5　·
        你处于「{{ levelInfo.name }}」，对照下方各维度表现与建议持续精进。</p>
    </div>

    <div class="spacer"></div>
    <div class="grid grid-2">
      <div class="card">
        <h3 style="margin-top:0">能力维度雷达图</h3>
        <RadarChart :indicators="indicators" :values="values" />
      </div>
      <div class="card">
        <h3 style="margin-top:0">各维度得分</h3>
        <DimensionBar
          v-for="d in result.dimensionScores"
          :key="d.id"
          :name="d.name"
          :avg="d.avg"
        />
      </div>
    </div>

    <div class="spacer"></div>
    <div class="card">
      <h3 style="margin-top:0">针对性提升建议</h3>
      <div class="grid" style="margin-top:10px">
        <SuggestionCard
          v-for="d in result.dimensionScores"
          :key="d.id"
          :name="d.name"
          :avg="d.avg"
          :level-name="d.levelName"
          :text="getSuggestion(d.id, d.avg)"
        />
      </div>
    </div>

    <div class="spacer"></div>
    <div class="row between wrap">
      <button class="btn btn-ghost" @click="retake">重新测评</button>
      <button class="btn btn-primary" @click="router.push(user.isAdmin ? '/admin' : '/intro')">
        {{ user.isAdmin ? '查看管理看板' : '返回首页' }}
      </button>
    </div>
  </div>
</template>
