<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  indicators: { type: Array, required: true }, // [{ name, max }]
  values: { type: Array, required: true },     // [number...]
  color: { type: String, default: '#6c8cff' },
  fill: { type: String, default: '' },          // 面积填充色（默认 = color+55 半透明）
  shape: { type: String, default: 'polygon' },  // polygon | circle
  radius: { type: String, default: '70%' },
  axisColor: { type: String, default: '#6b7280' },
  height: { type: [String, Number], default: '320px' }  // 兼容 '320px' 与 320
})

const el = ref(null)
let chart = null
let resizeObs = null

function render() {
  if (!chart) return
  const areaStyle = props.fill
    ? { color: props.fill }
    : { color: props.color + '55' }
  chart.setOption({
    tooltip: {},
    radar: {
      indicator: props.indicators,
      radius: props.radius,
      shape: props.shape,
      axisName: {
        color: props.axisColor,
        fontSize: 12,
        lineHeight: 15,
        formatter: (name, indicator) => {
          // echarts radar axisName formatter 签名：(value, indicator={name,max,textStyle})
          // 通过 indicator.name 在 indicators 中找对应 index，再从 values 取分数
          const indicatorName = indicator?.name ?? name
          const idx = props.indicators.findIndex((it) => (it.name ?? it) === indicatorName)
          const v = idx >= 0 ? props.values[idx] : undefined
          if (v == null) return name
          return `${Number(v).toFixed(1)}\n${name}`
        }
      },
      splitArea: { areaStyle: { color: ['rgba(31,37,51,0.03)', 'rgba(31,37,51,0.06)'] } },
      splitLine: { lineStyle: { color: 'rgba(31,37,51,0.10)' } },
      axisLine: { lineStyle: { color: 'rgba(31,37,51,0.10)' } }
    },
    series: [{
      type: 'radar',
      data: [{ value: props.values, name: '能力得分' }],
      areaStyle,
      lineStyle: { color: props.color, width: 2 },
      itemStyle: { color: props.color }
    }]
  })
}

function resize() { chart && chart.resize() }

// 统一把 height 归一为 CSS 字符串：'320' → '320px'，'320px' 原样保留
const heightStyle = computed(() => {
  const h = props.height
  if (h == null) return '320px'
  if (typeof h === 'number') return `${h}px`
  return /^\d+(\.\d+)?$/.test(String(h).trim()) ? `${h}px` : h
})

onMounted(async () => {
  chart = echarts.init(el.value)
  render()
  window.addEventListener('resize', resize)
  // 等 grid/flex 父布局稳定后再 resize 一次，避免初始化瞬间容器为 0 导致图表绘制到错位置/错尺寸
  await nextTick()
  resize()
  // 监听自身容器尺寸变化（grid 列宽、wrap 拉宽、窗口变化等），随时重新 resize
  if (typeof ResizeObserver !== 'undefined' && el.value) {
    resizeObs = new ResizeObserver(() => resize())
    resizeObs.observe(el.value)
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  resizeObs && resizeObs.disconnect()
  chart && chart.dispose()
})
watch(() => [props.values, props.indicators], render, { deep: true })
</script>

<template>
  <div ref="el" :style="{ width: '100%', height: heightStyle, minWidth: 0 }"></div>
</template>
