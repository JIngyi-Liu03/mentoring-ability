<script setup>
const props = defineProps({
  question: { type: Object, required: true },
  modelValue: { type: [Number, null], default: null }
})
const emit = defineEmits(['update:modelValue'])

const options = [
  { v: 1, label: '从不' },
  { v: 2, label: '很少' },
  { v: 3, label: '有时' },
  { v: 4, label: '经常' },
  { v: 5, label: '总是' }
]
</script>

<template>
  <div class="qcard">
    <div class="qtext">{{ question.text }}</div>
    <div class="scale">
      <button
        v-for="o in options"
        :key="o.v"
        class="opt"
        :class="{ active: modelValue === o.v }"
        @click="emit('update:modelValue', o.v)"
      >
        <span class="dot">{{ o.v }}</span>
        <span class="lbl">{{ o.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.qcard { padding: 18px 0; border-bottom: 1px solid var(--border); }
.qtext { font-size: 16px; margin-bottom: 14px; line-height: 1.5; }
.scale { display: flex; gap: 8px; flex-wrap: wrap; }
.opt {
  flex: 1; min-width: 84px; display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 10px 6px; border-radius: 10px; cursor: pointer;
  border: 1px solid var(--border); background: rgba(255,255,255,0.03); color: var(--text-dim);
  transition: all .15s;
}
.opt:hover { border-color: var(--primary); }
.opt.active { background: linear-gradient(135deg, var(--primary), var(--primary-2)); color: #fff; border-color: transparent; }
.dot { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; background: rgba(255,255,255,0.1); font-size: 12px; font-weight: 700; }
.opt.active .dot { background: rgba(255,255,255,0.25); }
.lbl { font-size: 12px; }
</style>
