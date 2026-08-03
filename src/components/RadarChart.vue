<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  indicators: { type: Array, required: true }, // [{ name, max }]
  values: { type: Array, required: true },     // [number...]
  color: { type: String, default: '#6c8cff' },
  fill: { type: String, default: '' },          // 面积填充色（默认 = color+55 半透明）
  shape: { type: String, default: 'polygon' },  // polygon | circle
  radius: { type: String, default: '70%' },
  axisColor: { type: String, default: '#6b7280' },
  height: { type: String, default: '320px' }
})

const el = ref(null)
let chart = null

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
      axisName: { color: props.axisColor, fontSize: 12 },
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

onMounted(() => {
  chart = echarts.init(el.value)
  render()
  window.addEventListener('resize', resize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  chart && chart.dispose()
})
watch(() => [props.values, props.indicators], render, { deep: true })
</script>

<template>
  <div ref="el" :style="{ width: '100%', height }"></div>
</template>
