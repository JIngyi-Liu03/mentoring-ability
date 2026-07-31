<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  modelValue: { type: [Number, null], default: null },
  dimColor: { type: String, default: '#1c8a8b' }
})
const emit = defineEmits(['update:modelValue'])

// 5 级李克特量表：1 从不 / 2 很少 / 3 有时 / 4 经常 / 5 总是
const options = [
  { value: 1, label: '从不' },
  { value: 2, label: '很少' },
  { value: 3, label: '有时' },
  { value: 4, label: '经常' },
  { value: 5, label: '总是' }
]

const selected = computed(() => props.modelValue)
const trackEl = ref(null)
// 选中点在滑轨上的 0 基索引
const selectedIndex = computed(() =>
  options.findIndex(o => o.value === selected.value)
)

// 滑轨从 10% 延伸到 90%（两端留出节点空间）
const fillWidth = computed(() =>
  selectedIndex.value < 0 ? 0 : (selectedIndex.value / (options.length - 1)) * 80
)

function pick(v) {
  emit('update:modelValue', v === selected.value ? null : v)
}

// 点击滑轨空白处，按位置就近吸附到最近的刻度
function pickByClientX(e, trackEl) {
  const rect = trackEl.getBoundingClientRect()
  const ratio = (e.clientX - rect.left) / rect.width
  const idx = Math.round(ratio * (options.length - 1))
  const clamped = Math.max(0, Math.min(options.length - 1, idx))
  pick(options[clamped].value)
}
</script>

<template>
  <div class="scale" role="radiogroup" aria-label="符合程度">
    <!-- 滑轨 -->
    <div
      ref="trackEl"
      class="rail"
      :style="{ '--dim': dimColor }"
      @click="pickByClientX($event, trackEl)"
    >
      <div class="rail-line"></div>
      <div class="rail-fill" :style="{ width: fillWidth + '%' }"></div>
      <button
        v-for="(o, i) in options"
        :key="o.value"
        class="node"
        :class="{ on: selected === o.value }"
        :style="{ left: (10 + i * 20) + '%' }"
        role="radio"
        :aria-checked="selected === o.value"
        :aria-label="o.label"
        @click.stop="pick(o.value)"
      >
        <span class="dot"></span>
      </button>
    </div>

    <!-- 刻度标签 -->
    <div class="labels">
      <button
        v-for="o in options"
        :key="o.value"
        class="lbl"
        :class="{ on: selected === o.value }"
        :style="{ '--dim': dimColor }"
        @click="pick(o.value)"
      >
        {{ o.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.scale { width: 100%; padding: 8px 4px 0; }
/* 横向滑轨容器 */
.rail {
  position: relative;
  height: 36px;
  margin: 0 4px;
  cursor: pointer;
}
.rail-line {
  position: absolute;
  left: 10%;
  top: 50%;
  width: 80%;
  height: 6px;
  transform: translateY(-50%);
  background: #eef0f4;
  border-radius: 999px;
}
.rail-fill {
  position: absolute;
  left: 10%;
  top: 50%;
  height: 6px;
  transform: translateY(-50%);
  background: linear-gradient(90deg, var(--dim), color-mix(in srgb, var(--dim) 70%, #ffffff));
  border-radius: 999px;
  transition: width .25s ease;
}
.node {
  position: absolute;
  top: 50%;
  width: 24px;
  height: 24px;
  transform: translate(-50%, -50%);
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
}
.node .dot {
  display: block;
  width: 18px;
  height: 18px;
  margin: 3px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #dfe3ea;
  transition: all .18s ease;
}
.node:hover .dot { border-color: var(--dim); transform: scale(1.12); }
.node.on .dot {
  width: 24px;
  height: 24px;
  margin: 0;
  background: var(--dim);
  border-color: var(--dim);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--dim) 40%, transparent);
}
/* 标签一行，列中心与节点对齐 */
.labels {
  display: flex;
  margin-top: 10px;
}
.lbl {
  flex: 1;
  border: none;
  background: none;
  padding: 6px 0;
  font-size: 14px;
  color: var(--text-dim);
  cursor: pointer;
  transition: color .18s, font-weight .18s, transform .18s;
}
.lbl.on {
  color: var(--dim);
  font-weight: 700;
  transform: translateY(-2px);
}
</style>
