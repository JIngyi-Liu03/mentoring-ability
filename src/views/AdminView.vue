<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../api/client.js'
import RadarChart from '../components/RadarChart.vue'

const overview = ref(null)
const users = ref([])
const results = ref([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const [o, u, r] = await Promise.all([
      api.get('/admin/overview'),
      api.get('/admin/users'),
      api.get('/admin/results')
    ])
    overview.value = o
    users.value = u.users
    results.value = r.results
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

function indicators() {
  return (overview.value?.dimensionAverages || []).map(d => ({ name: d.name, max: 5 }))
}
function values() {
  return (overview.value?.dimensionAverages || []).map(d => d.avg)
}
function levelName(l) {
  return { 1: '助理级', 2: '专业级', 3: '高级', 4: '大师级' }[l] || l
}
</script>

<template>
  <div v-if="loading" class="muted center">加载中…</div>
  <div v-else-if="error" class="alert">{{ error }}</div>

  <div v-else>
    <div class="card hero">
      <h1 style="margin:0 0 6px">管理看板</h1>
      <p class="muted" style="margin:0">团队导师辅导能力成熟度整体概览</p>
    </div>

    <div class="spacer"></div>
    <div class="grid grid-3">
      <div class="card stat">
        <div class="num">{{ overview.userCount }}</div>
        <div class="lbl">参与用户</div>
      </div>
      <div class="card stat">
        <div class="num">{{ overview.resultCount }}</div>
        <div class="lbl">测评次数</div>
      </div>
      <div class="card stat">
        <div class="num">{{ overview.overallAvg }}</div>
        <div class="lbl">整体平均得分 / 5</div>
      </div>
    </div>

    <div class="spacer"></div>
    <div class="grid grid-2">
      <div class="card">
        <h3 style="margin-top:0">各维度平均得分</h3>
        <RadarChart :indicators="indicators()" :values="values()" color="#21d4a8" />
      </div>
      <div class="card">
        <h3 style="margin-top:0">成熟度等级分布</h3>
        <div v-for="d in overview.levelDist" :key="d.l" class="ld">
          <span class="ld-name">L{{ d.l }} {{ levelName(d.l) }}</span>
          <span class="ld-cnt">{{ d.c }} 人</span>
        </div>
        <p v-if="!overview.levelDist.length" class="muted">暂无数据</p>
      </div>
    </div>

    <div class="spacer"></div>
    <div class="card">
      <h3 style="margin-top:0">用户列表</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>用户名</th><th>姓名</th><th>角色</th><th>测评次数</th><th>最新得分</th><th>等级</th></tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>{{ u.username }}</td>
              <td>{{ u.name || '—' }}</td>
              <td><span class="tag">{{ u.role }}</span></td>
              <td>{{ u.assessments }}</td>
              <td>{{ u.latest_overall ?? '—' }}</td>
              <td>{{ u.latest_level ? levelName(u.latest_level) : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="spacer"></div>
    <div class="card">
      <h3 style="margin-top:0">测评记录</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>用户</th><th>姓名</th><th>综合得分</th><th>等级</th><th>时间</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in results" :key="r.id">
              <td>#{{ r.id }}</td>
              <td>{{ r.username }}</td>
              <td>{{ r.name || '—' }}</td>
              <td>{{ r.overall }}</td>
              <td>{{ levelName(r.overall_level) }}</td>
              <td class="muted">{{ r.created_at }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stat { text-align: center; padding: 22px; }
.num { font-size: 34px; font-weight: 800; background: linear-gradient(135deg,var(--primary),var(--primary-2)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.lbl { color: var(--text-dim); font-size: 13px; margin-top: 4px; }
.ld { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border); }
.ld:last-child { border-bottom: none; }
.ld-name { color: var(--text); }
.ld-cnt { color: var(--accent); }
.table-wrap { overflow-x: auto; margin-top: 8px; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--border); }
th { color: var(--text-dim); font-weight: 600; }
</style>
