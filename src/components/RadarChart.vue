<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  indicators: { type: Array, required: true }, // [{ name, max }]
  values: { type: Array, required: true },     // [number...]
  color: { type: String, default: '#6c8cff' }
})

const el = ref(null)
let chart = null

function render() {
  if (!chart) return
  chart.setOption({
    tooltip: {},
    radar: {
      indicator: props.indicators,
      radius: '70%',
      axisName: { color: '#6b7280', fontSize: 12 },
      splitArea: { areaStyle: { color: ['rgba(99,102,241,0.04)', 'rgba(99,102,241,0.08)'] } },
      splitLine: { lineStyle: { color: 'rgba(31,37,51,0.10)' } },
      axisLine: { lineStyle: { color: 'rgba(31,37,51,0.10)' } }
    },
    series: [{
      type: 'radar',
      data: [{ value: props.values, name: '能力得分' }],
      areaStyle: { color: props.color + '55' },
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
  <div ref="el" style="width: 100%; height: 320px;"></div>
</template>
