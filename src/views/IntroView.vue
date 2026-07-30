<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAssessmentStore } from '../stores/assessment.js'
import { api } from '../api/client.js'

const router = useRouter()
const store = useAssessmentStore()
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const meta = await api.get('/meta')
    store.setMeta(meta)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

function start() {
  store.resetAnswers()
  router.push('/assessment')
}
</script>

<template>
  <div v-if="loading" class="muted center">加载中…</div>
  <div v-else>
    <div class="card hero">
      <h1>导师辅导能力成熟度自评</h1>
      <p>
        本测评基于成熟的能力成熟度模型（CMMI 风格），从 6 个核心维度评估你的辅导能力，
        并给出从「初始级」到「优化级」的等级判定与针对性提升建议。共
        {{ store.dimensions.length }} 个维度、约 24 道题，预计 5–8 分钟。
      </p>
      <div class="spacer"></div>
      <button class="btn btn-primary" @click="start">开始测评 →</button>
      <p v-if="error" class="alert" style="margin-top:16px">{{ error }}</p>
    </div>

    <div class="spacer"></div>
    <div class="grid grid-3">
      <div v-for="d in store.dimensions" :key="d.id" class="card dim">
        <div class="tag">{{ d.short }}</div>
        <h3 style="margin:10px 0 6px">{{ d.name }}</h3>
        <p class="muted" style="font-size:13px;line-height:1.6;margin:0">{{ d.desc }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dim { padding: 18px; }
</style>
