<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: [Number, null], default: null },
  dimColor: { type: String, default: '#6366f1' }
})
const emit = defineEmits(['update:modelValue'])

// 5 级李克特量表：1 从不 / 2 很少 / 3 有时 / 4 经常 / 5 总是
// 圆圈直径随分值递增（30 → 66px），形成强度度量梯度
const options = [
  { value: 1, label: '从不', size: 30 },
  { value: 2, label: '很少', size: 39 },
  { value: 3, label: '有时', size: 48 },
  { value: 4, label: '经常', size: 57 },
  { value: 5, label: '总是', size: 66 }
]

const selected = computed(() => props.modelValue)

function pick(v) {
  emit('update:modelValue', v === selected.value ? null : v)
}
</script>

<template>
  <div class="scale" role="radiogroup" aria-label="符合程度">
    <button
      v-for="o in options"
      :key="o.value"
      class="bubble"
      role="radio"
      :aria-checked="selected === o.value"
      :class="{ active: selected === o.value }"
      :style="{
        width: o.size + 'px',
        height: o.size + 'px',
        '--dim': dimColor
      }"
      @click="pick(o.value)"
    >
      <span class="num">{{ o.value }}</span>
    </button>
    <div class="labels">
      <span v-for="o in options" :key="o.value" class="lab" :class="{ on: selected === o.value }">
        {{ o.value }}.{{ o.label }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.scale { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.scale .bubble {
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%; border: 2px solid var(--border); background: #fff;
  cursor: pointer; transition: all .18s ease; padding: 0;
}
.scale .bubble .num { font-size: 13px; color: var(--text-dim); font-weight: 700; transition: color .18s; }
.scale .bubble:hover { border-color: var(--dim); transform: translateY(-2px); }
.scale .bubble.active {
  border-color: var(--dim);
  background: linear-gradient(135deg, var(--dim), color-mix(in srgb, var(--dim) 70%, #ffffff));
  box-shadow: 0 6px 16px color-mix(in srgb, var(--dim) 35%, transparent);
}
.scale .bubble.active .num { color: #fff; }
.labels { display: flex; justify-content: space-between; width: 100%; max-width: 360px; gap: 4px; }
.labels .lab { font-size: 12px; color: var(--text-dim); flex: 1; text-align: center; }
.labels .lab.on { color: var(--text); font-weight: 700; }
</style>
