<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAssessmentStore } from '../stores/assessment.js'
import { api } from '../api/client.js'
import QuestionCard from '../components/QuestionCard.vue'
import StepProgress from '../components/StepProgress.vue'

const router = useRouter()
const store = useAssessmentStore()
const submitting = ref(false)
const error = ref('')

onMounted(async () => {
  if (!store.meta) {
    try {
      const meta = await api.get('/meta')
      store.setMeta(meta)
    } catch (e) {
      error.value = e.message
    }
  }
})

const dimensions = computed(() => store.dimensions)
const currentDim = computed(() => dimensions.value[store.step] || null)
const questions = computed(() => {
  if (!currentDim.value || !store.meta?.questionsByDim) return []
  return store.meta.questionsByDim[currentDim.value.id] || []
})
const stepComplete = computed(() => questions.value.every(q => store.answers[q.id]))

function next() {
  if (!stepComplete.value) return
  if (store.step < dimensions.value.length - 1) store.step++
  else submit()
}
function prev() {
  if (store.step > 0) store.step--
}

async function submit() {
  error.value = ''
  const answers = {}
  for (const q of store.meta.questions) {
    if (store.answers[q.id]) answers[q.id] = store.answers[q.id]
  }
  if (Object.keys(answers).length < store.meta.questions.length) {
    error.value = '请完成所有题目后再提交'
    return
  }
  submitting.value = true
  try {
    const res = await api.post('/assessment/submit', { answers })
    store.setResult(res)
    router.push('/result')
  } catch (e) {
    error.value = e.message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div v-if="error && !currentDim" class="alert">{{ error }}</div>
  <div v-else-if="currentDim" class="card">
    <StepProgress :steps="dimensions" :current="store.step" />
    <div class="dim-head">
      <div>
        <div class="tag">{{ currentDim.short }}</div>
        <h2 style="margin:8px 0 4px">{{ currentDim.name }}</h2>
        <p class="muted" style="margin:0;font-size:13px">{{ currentDim.desc }}</p>
      </div>
      <div class="step-no">第 {{ store.step + 1 }} / {{ dimensions.length }} 步</div>
    </div>

    <div class="spacer"></div>
    <QuestionCard
      v-for="q in questions"
      :key="q.id"
      :question="q"
      :model-value="store.answers[q.id] || null"
      @update:model-value="v => store.setAnswer(q.id, v)"
    />

    <div v-if="error" class="alert" style="margin-top:16px">{{ error }}</div>

    <div class="row between" style="margin-top:22px">
      <button class="btn btn-ghost" :disabled="store.step === 0" @click="prev">← 上一步</button>
      <button class="btn btn-primary" :disabled="!stepComplete || submitting" @click="next">
        {{ store.step === dimensions.length - 1 ? (submitting ? '提交中…' : '提交并查看报告') : '下一步 →' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.dim-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.step-no { font-size: 13px; color: var(--text-dim); white-space: nowrap; }
</style>
