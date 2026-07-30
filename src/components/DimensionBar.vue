<script setup>
defineProps({
  name: { type: String, required: true },
  avg: { type: Number, required: true }, // 1-5
  max: { type: Number, default: 5 }
})
</script>

<template>
  <div class="bar-row">
    <div class="label">{{ name }}</div>
    <div class="track">
      <div class="fill" :style="{ width: (avg / max * 100) + '%' }"></div>
    </div>
    <div class="val">{{ avg }}</div>
  </div>
</template>

<style scoped>
.bar-row { display: grid; grid-template-columns: 120px 1fr 40px; align-items: center; gap: 10px; margin-bottom: 10px; }
.label { font-size: 13px; color: var(--text-dim); }
.track { height: 10px; border-radius: 999px; background: rgba(255,255,255,0.06); overflow: hidden; }
.fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--primary), var(--primary-2)); }
.val { font-size: 13px; text-align: right; color: var(--text); }
@media (max-width: 560px) { .bar-row { grid-template-columns: 90px 1fr 32px; } }
</style>
