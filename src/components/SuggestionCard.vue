<script setup>
defineProps({
  name: { type: String, required: true },
  avg: { type: Number, required: true },
  levelName: { type: String, default: '' },
  text: { type: String, required: true }
})
</script>

<template>
  <div class="sug">
    <div class="head">
      <span class="dim">{{ name }}</span>
      <span class="score">得分 {{ avg }} <em v-if="levelName">· {{ levelName }}</em></span>
    </div>
    <p class="body">{{ text }}</p>
  </div>
</template>

<style scoped>
.sug { padding: 14px 16px; border-radius: 12px; background: #f7f9fc; border: 1px solid var(--border); }
.head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
.dim { font-weight: 600; color: var(--text); }
.score { font-size: 13px; color: var(--accent); }
.score em { color: var(--text-dim); font-style: normal; }
.body { margin: 0; color: var(--text-dim); line-height: 1.6; font-size: 14px; }
</style>
