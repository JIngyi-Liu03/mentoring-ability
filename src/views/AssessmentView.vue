<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAssessmentStore } from '../stores/assessment.js'
import QuestionCard from '../components/QuestionCard.vue'
import { questions } from '../../shared/questions.js'
import { dimensionMap } from '../../shared/dimensions.js'

const router = useRouter()
const store = useAssessmentStore()

const total = questions.length
const idx = computed(() => Math.min(store.currentIndex, total - 1))
const q = computed(() => questions[idx.value])
const dim = computed(() => dimensionMap[q.value.dim])
const progress = computed(() => Math.round(((idx.value + 1) / total) * 100))

const answeredCount = computed(() => store.answers.filter(a => a.value !== null).length)
const canPrev = computed(() => idx.value > 0)

function prev() {
  if (canPrev.value) store.currentIndex = idx.value - 1
}
function next() {
  if (idx.value < total - 1) {
    store.currentIndex = idx.value + 1
  } else {
    submit()
  }
}
async function submit() {
  await store.submit()
  router.push('/result')
}

// 选中选项后自动进入下一题（最后一题不自动提交，避免误交）
let advanceTimer = null
function onAnswer(v) {
  store.setAnswer(idx.value, v)
  if (v == null) return                       // 取消选择不前进
  if (idx.value >= total - 1) return          // 最后一题仅记录答案
  if (advanceTimer) clearTimeout(advanceTimer)
  advanceTimer = setTimeout(() => {
    advanceTimer = null
    next()
  }, 350)
}
</script>

<template>
  <div class="assess">
    <!-- 顶部进度 -->
    <div class="progress-head">
      <button class="link-btn" @click="router.push('/intro')">← 退出</button>
      <div class="progress-meta">
        <span class="q-counter">第 {{ idx + 1 }} / {{ total }} 题</span>
        <span class="answered">已答 {{ answeredCount }}</span>
      </div>
    </div>
    <div class="progress-track">
      <div class="progress-fill" :style="{ width: progress + '%' }"></div>
    </div>

    <!-- 单题卡片 -->
    <div class="q-card-wrap">
      <div class="dim-tag" :style="{ background: dim.color + '1a', color: dim.color }">
        {{ dim.short }}
      </div>
      <h2 class="q-text">{{ q.text }}</h2>

      <QuestionCard
        :modelValue="store.answers[idx]?.value ?? null"
        :dimColor="dim.color"
        @update:modelValue="onAnswer"
      />
    </div>

    <!-- 底部导航 -->
    <div class="nav-row">
      <button class="btn btn-ghost" :disabled="!canPrev" @click="prev">上一题</button>
      <button v-if="idx === total - 1" class="btn btn-primary" :disabled="answeredCount < total" @click="submit">
        提交测评
      </button>
    </div>
  </div>
</template>

<style scoped>
.assess { max-width: 820px; margin: 0 auto; padding: 12px 10px 28px; }
.progress-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.progress-meta { display: flex; gap: 14px; align-items: baseline; }
.q-counter { font-weight: 700; color: var(--text); font-size: 15px; }
.answered { font-size: 13px; color: var(--text-dim); }
.link-btn { background: none; border: none; color: var(--text-dim); cursor: pointer; font-size: 14px; padding: 4px 0; }
.link-btn:hover { color: var(--primary); }
.progress-track { height: 8px; border-radius: 999px; background: #eef0f4; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--primary), var(--primary-2)); transition: width .25s ease; }

.q-card-wrap {
  margin-top: 18px; background: #fff; border: 1px solid var(--border);
  border-radius: 18px; padding: 20px 16px; box-shadow: 0 6px 24px rgba(20,30,60,.06);
}
.dim-tag { display: inline-block; font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 999px; margin-bottom: 14px; }
.q-text { font-size: 20px; line-height: 1.6; color: var(--text); margin: 0 0 26px; font-weight: 600; }

.nav-row { display: flex; gap: 12px; margin-top: 22px; }
.nav-row .btn { flex: 1; }
.hint { text-align: center; margin-top: 12px; font-size: 13px; }
</style>
