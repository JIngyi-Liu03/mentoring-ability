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

// 圆圈直径随分值递增：分值越大圆圈越大，形成“度量/强度”的视觉梯度
function sizeOf(v) {
  return 30 + (v - 1) * 9 // 30,39,48,57,66 px
}
</script>

<template>
  <div class="qcard">
    <div class="qtext">{{ question.text }}</div>
    <div class="scale" role="radiogroup" :aria-label="question.text">
      <button
        v-for="o in options"
        :key="o.v"
        class="opt"
        :class="{ active: modelValue === o.v }"
        role="radio"
        :aria-checked="modelValue === o.v"
        @click="emit('update:modelValue', o.v)"
      >
        <span
          class="bubble"
          :style="{ width: sizeOf(o.v) + 'px', height: sizeOf(o.v) + 'px' }"
        >
          <span class="num">{{ o.v }}</span>
        </span>
        <span class="lbl">{{ o.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.qcard { padding: 20px 0; border-bottom: 1px solid var(--border); }
.qtext { font-size: 16px; margin-bottom: 18px; line-height: 1.55; }

.scale {
  display: flex;
  gap: 8px;
  align-items: flex-end;      /* 圆圈从同一基线向上“长高”，像量尺/柱状 */
  justify-content: space-between;
}
.opt {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-dim);
  padding: 4px 0;
  transition: transform .15s;
}
.opt:hover { transform: translateY(-2px); }

.bubble {
  border-radius: 50%;
  display: grid;
  place-items: center;
  border: 2px solid var(--border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-dim);
  transition: all .18s ease;
}
.bubble .num { font-size: 13px; font-weight: 700; }

.opt:hover .bubble { border-color: var(--primary); }

.opt.active .bubble {
  border-color: transparent;
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  color: #fff;
  box-shadow: 0 6px 18px rgba(99, 102, 241, 0.45);
}
.opt.active .lbl { color: var(--text); font-weight: 700; }
.lbl { font-size: 12px; }
</style>
