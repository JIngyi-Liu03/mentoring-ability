<script setup>
defineProps({
  steps: { type: Array, required: true }, // [{ name }]
  current: { type: Number, required: true }
})
</script>

<template>
  <div class="stepper">
    <div
      v-for="(s, i) in steps"
      :key="i"
      class="step"
      :class="{ done: i < current, active: i === current }"
    >
      <div class="circle">{{ i < current ? '✓' : i + 1 }}</div>
      <div class="name">{{ s.name }}</div>
    </div>
  </div>
</template>

<style scoped>
.stepper { display: flex; gap: 4px; overflow-x: auto; padding: 6px 0 14px; }
.step { display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1; min-width: 64px; position: relative; }
.step::before {
  content: ''; position: absolute; top: 14px; left: -50%; width: 100%; height: 2px;
  background: var(--border); z-index: 0;
}
.step:first-child::before { display: none; }
.step.done::before { background: var(--primary); }
.circle {
  width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center;
  background: var(--card-2); border: 2px solid var(--border); font-size: 13px; font-weight: 700; z-index: 1;
}
.step.active .circle { border-color: var(--primary); color: var(--primary); }
.step.done .circle { background: var(--primary); border-color: var(--primary); color: #fff; }
.name { font-size: 12px; color: var(--text-dim); white-space: nowrap; }
.step.active .name { color: var(--text); }
</style>
