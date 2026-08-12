<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { api } from '../api/client.js'
import RadarChart from '../components/RadarChart.vue'

const overview = ref(null)
const users = ref([])
const results = ref([])
const loading = ref(true)
const error = ref('')

// 解锁码相关
const unlockCodes = ref([])
const genPhone = ref('')
const genResult = ref(null)
const genError = ref('')
const genLoading = ref(false)

// 定时刷新解锁码历史（每 10 秒），让管理员能看到用户解锁后的状态更新
let unlockTimer = null
async function refreshUnlockCodes() {
  try {
    const uc = await api.get('/admin/unlock-codes')
    unlockCodes.value = uc.codes || []
  } catch { /* 静默忽略 */ }
}
onMounted(() => { unlockTimer = setInterval(refreshUnlockCodes, 10000) })
onUnmounted(() => { clearInterval(unlockTimer) })

onMounted(async () => {
  try {
    const [o, u, r, uc] = await Promise.all([
      api.get('/admin/overview'),
      api.get('/admin/users'),
      api.get('/admin/results'),
      api.get('/admin/unlock-codes')
    ])
    overview.value = o
    users.value = u.users
    results.value = r.results
    unlockCodes.value = uc.codes || []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

async function generateCode() {
  const phone = genPhone.value.trim()
  if (!phone || phone.length < 11) {
    genError.value = '请输入正确的手机号'
    return
  }
  genError.value = ''
  genLoading.value = true
  try {
    const res = await api.post('/admin/generate-unlock-code', { phone })
    genResult.value = res
    genPhone.value = ''
    // 刷新历史
    const uc = await api.get('/admin/unlock-codes')
    unlockCodes.value = uc.codes || []
  } catch (e) {
    genError.value = e?.message || '生成失败'
  } finally {
    genLoading.value = false
  }
}

async function copyCode(code) {
  try {
    await navigator.clipboard.writeText(code)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = code; ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.select()
    try { document.execCommand('copy') } catch {}
    document.body.removeChild(ta)
  }
}

function unlockStatusLabel(u) {
  if (u.ai_unlocked_at) return '已解锁'
  return '未解锁'
}
function unlockStatusClass(u) {
  return u.ai_unlocked_at ? 'badge-unlocked' : 'badge-locked'
}

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
            <tr><th>手机号</th><th>姓名</th><th>角色</th><th>测评次数</th><th>最新得分</th><th>等级</th><th>AI 解锁状态</th></tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>{{ u.username }}</td>
              <td>{{ u.name || '—' }}</td>
              <td><span class="tag">{{ u.role }}</span></td>
              <td>{{ u.assessments }}</td>
              <td>{{ u.latest_overall ?? '—' }}</td>
              <td>{{ u.latest_level ? levelName(u.latest_level) : '—' }}</td>
              <td><span class="badge" :class="unlockStatusClass(u)">{{ unlockStatusLabel(u) }}</span></td>
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
            <tr><th>手机号</th><th>姓名</th><th>综合得分</th><th>等级</th><th>时间</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in results" :key="r.id">
              <td>{{ r.username }}</td>
              <td>{{ r.name || '—' }}</td>
              <td>{{ r.overall }}</td>
              <td>{{ levelName(r.overall_level) }}</td>
              <td class="muted">{{ r.created_at }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 生成解锁码 -->
      <div class="gen-section">
        <h4 class="gen-title">&#128273; 生成解锁码</h4>
        <div class="gen-row">
          <div class="gen-field">
            <label>用户手机号</label>
            <input v-model="genPhone" type="text" placeholder="输入手机号" maxlength="11" @keydown.enter="generateCode" />
          </div>
          <button class="gen-btn" @click="generateCode" :disabled="genLoading">{{ genLoading ? '生成中…' : '生成解锁码' }}</button>
        </div>
        <p v-if="genError" class="gen-err">{{ genError }}</p>
        <div v-if="genResult" class="gen-result">
          <p class="gen-result-head">&#9989; 已为用户生成专属解锁码：</p>
          <div class="gen-code">{{ genResult.code }}</div>
          <div class="gen-meta">
            <span>手机号：<b>{{ genResult.phone }}</b></span>
            <span>有效期：<b>7 天</b></span>
            <span>生成时间：<b>{{ genResult.createdAt }}</b></span>
          </div>
          <div class="gen-actions">
            <button @click="copyCode(genResult.code)">&#128203; 复制解锁码</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 解锁码历史 -->
    <div class="spacer"></div>
    <div class="card">
      <h3 style="margin-top:0">&#128203; 解锁码历史</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>姓名</th><th>手机号</th><th>解锁码</th><th>生成时间</th><th>使用时间</th></tr>
          </thead>
          <tbody>
            <tr v-for="c in unlockCodes" :key="c.id">
              <td>{{ c.name }}</td>
              <td>{{ c.phone }}</td>
              <td class="code-cell">{{ c.code || '—' }}</td>
              <td class="muted">{{ c.createdAt }}</td>
              <td class="muted">{{ c.usedAt || '—' }}</td>
            </tr>
            <tr v-if="!unlockCodes.length">
              <td colspan="5" class="muted" style="text-align:center">暂无记录</td>
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

/* 解锁状态标签 */
.badge {
  display: inline-block; padding: 2px 8px; border-radius: 999px;
  font-size: 11px; font-weight: 600;
}
.badge-unlocked { background: #e8f5e9; color: #2e7d32; }
.badge-locked   { background: #fff3e0; color: #c07a3e; }

/* 生成解锁码区域 */
.gen-section {
  margin-top: 18px; padding-top: 16px;
  border-top: 2px dashed var(--border);
}
.gen-title { font-size: 14px; font-weight: 700; margin: 0 0 12px; color: var(--primary); }
.gen-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.gen-field { display: flex; flex-direction: column; gap: 4px; }
.gen-field label { font-size: 11px; font-weight: 600; color: var(--text-dim); }
.gen-field input {
  width: 220px; padding: 9px 12px; font-size: 13px;
  border: 1.5px solid #e3e7ec; border-radius: 8px; outline: none;
}
.gen-field input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(47,107,143,0.1); }
.gen-btn {
  padding: 9px 18px; font-size: 13px; font-weight: 600;
  background: var(--primary); color: #fff;
  border: none; border-radius: 8px;
}
.gen-btn:hover:not(:disabled) { background: #265a78; }
.gen-btn:disabled { background: #b7c4cd; }
.gen-err { color: #c07a3e; font-size: 12px; margin: 8px 0 0; }

.gen-result {
  margin-top: 16px;
  background: #f7f9fb; border: 1px solid #d0e0ec;
  border-radius: 10px; padding: 18px 20px;
}
.gen-result-head { font-size: 12px; color: var(--text-dim); margin: 0 0 8px; }
.gen-code {
  font-size: 28px; font-weight: 800; letter-spacing: 6px;
  font-family: 'Courier New', monospace; color: var(--primary);
  margin: 0 0 10px;
}
.gen-meta { font-size: 11px; color: #8b9099; display: flex; gap: 20px; flex-wrap: wrap; }
.gen-actions { margin-top: 12px; }
.gen-actions button {
  padding: 6px 14px; font-size: 12px;
  border: 1px solid #d0e0ec; background: #fff;
  border-radius: 6px; transition: all 0.15s ease;
}
.gen-actions button:hover { background: #f0f2f5; }

.code-cell { font-family: 'Courier New', monospace; font-weight: 700; color: var(--primary); letter-spacing: 2px; }
.status-used   { color: #2e7d32; font-weight: 600; }
.status-expired { color: #c07a3e; font-weight: 600; }
.status-active  { color: var(--primary); font-weight: 600; }
</style>
