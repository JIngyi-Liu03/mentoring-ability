<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/assessment.js'
import { api } from '../api/client.js'

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

// ===== 已登录用户自动跳转 =====
onMounted(() => {
  if (userStore.isLoggedIn) router.push('/intro')
})

// ===== mode: login | register | reset =====
const mode = ref('login')
const error = ref('')
const loading = ref(false)

// ---- 登录 ----
const loginPhone = ref('')
const loginPwd = ref('')
const loginPwdVisible = ref(false)

// ---- 共用手机号 & 验证码（注册/找回密码共用） ----
const phone = ref('')
const code = ref('')
const sending = ref(false)
const countdown = ref(0)
const phoneExists = ref(null)
let timer = null
let checkTimer = null

// ---- 注册 ----
const regName = ref('')
const regPwd = ref('')
const regPwd2 = ref('')
const regPwdVisible = ref(false)
const regPwd2Visible = ref(false)

// ---- 找回密码 ----
const resetPwd = ref('')
const resetPwd2 = ref('')
const resetPwdVisible = ref(false)
const resetPwd2Visible = ref(false)

const isLogin = computed(() => mode.value === 'login')
const isRegister = computed(() => mode.value === 'register')
const isReset = computed(() => mode.value === 'reset')

function setMode(m) {
  mode.value = m
  error.value = ''
  phoneExists.value = null
  if (timer) { clearInterval(timer); timer = null; countdown.value = 0 }
  if (checkTimer) { clearTimeout(checkTimer); checkTimer = null }
}

// ===== 手机号已注册检测 =====
function checkPhoneExists() {
  if (!/^1[3-9]\d{9}$/.test(phone.value)) return
  api.post('/auth/check-phone', { phone: phone.value })
    .then(data => { phoneExists.value = data.exists })
    .catch(() => { phoneExists.value = null })
}
watch(phone, () => {
  if (checkTimer) clearTimeout(checkTimer)
  phoneExists.value = null
  if (phone.value.length === 11 && /^1[3-9]\d{9}$/.test(phone.value)) {
    checkTimer = setTimeout(checkPhoneExists, 500)
  }
})

// ===== 发送验证码 =====
async function sendCode() {
  error.value = ''
  if (!/^1[3-9]\d{9}$/.test(phone.value)) { error.value = '请输入正确的手机号'; return }
  const purpose = isRegister.value ? 'register' : 'reset'
  sending.value = true
  try {
    await api.post('/auth/sms/send', { phone: phone.value, purpose })
    countdown.value = 60
    timer = setInterval(() => { countdown.value--; if (countdown.value <= 0) { clearInterval(timer); timer = null } }, 1000)
  } catch (e) {
    error.value = e.message
  } finally {
    sending.value = false
  }
}

// ===== 登录（手机号 + 密码） =====
async function doLogin() {
  error.value = ''
  if (!/^1[3-9]\d{9}$/.test(loginPhone.value)) { error.value = '请输入正确的手机号'; return }
  if (!loginPwd.value) { error.value = '请输入密码'; return }
  loading.value = true
  try {
    const data = await api.post('/auth/login', { phone: loginPhone.value, password: loginPwd.value })
    userStore.setSession(data.token, data.user)
    const redirect = route.query.redirect
    if (redirect) router.push(redirect)
    else router.push(userStore.user?.role === 'admin' ? '/admin' : '/intro')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// ===== 注册 =====
async function doRegister() {
  error.value = ''
  if (!/^1[3-9]\d{9}$/.test(phone.value)) { error.value = '请输入正确的手机号'; return }
  if (!code.value) { error.value = '请输入验证码'; return }
  if (!regName.value.trim()) { error.value = '请输入姓名'; return }
  if (!regPwd.value || regPwd.value.length < 6) { error.value = '密码至少 6 个字符'; return }
  if (regPwd.value !== regPwd2.value) { error.value = '两次输入的密码不一致'; return }
  if (phoneExists.value === true) { error.value = '该手机号已注册，请直接登录'; return }
  loading.value = true
  try {
    const data = await api.post('/auth/sms/register', {
      phone: phone.value, code: code.value, password: regPwd.value, name: regName.value.trim()
    })
    userStore.setSession(data.token, data.user)
    const redirect = route.query.redirect
    if (redirect) router.push(redirect)
    else router.push('/intro')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// ===== 找回密码 =====
async function doResetPassword() {
  error.value = ''
  if (!/^1[3-9]\d{9}$/.test(phone.value)) { error.value = '请输入正确的手机号'; return }
  if (!code.value) { error.value = '请输入验证码'; return }
  if (!resetPwd.value || resetPwd.value.length < 6) { error.value = '新密码至少 6 个字符'; return }
  if (resetPwd.value !== resetPwd2.value) { error.value = '两次输入的新密码不一致'; return }
  loading.value = true
  try {
    await api.post('/auth/sms/reset-password', { phone: phone.value, code: code.value, password: resetPwd.value })
    error.value = ''
    alert('密码重置成功，请使用新密码登录')
    loginPhone.value = phone.value
    setMode('login')
    phone.value = ''
    code.value = ''
    resetPwd.value = ''
    resetPwd2.value = ''
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (checkTimer) clearTimeout(checkTimer)
})
</script>

<template>
  <div class="login-wrap">
    <div class="card login-card">
      <div class="hero">
        <div class="logo">🧭</div>
        <h1>导师辅导能力成熟度自评</h1>
        <p>用一套成熟模型，看清你的辅导能力处在哪一能级，并获得可执行的提升建议。</p>
      </div>

      <div v-if="error" class="alert">{{ error }}</div>

      <!-- ==================== 登录（手机号 + 密码） ==================== -->
      <template v-if="isLogin">
        <div class="field">
          <label>手机号</label>
          <input v-model="loginPhone" placeholder="请输入手机号" maxlength="11" @keyup.enter="doLogin" />
        </div>
        <div class="field">
          <label>密码</label>
          <div class="pwd-row">
            <input v-model="loginPwd" :type="loginPwdVisible ? 'text' : 'password'" placeholder="请输入密码" @keyup.enter="doLogin" />
            <span class="pwd-toggle" @click="loginPwdVisible = !loginPwdVisible">{{ loginPwdVisible ? '🙈' : '👁' }}</span>
          </div>
        </div>
        <button class="btn btn-primary btn-block" :disabled="loading" @click="doLogin">
          {{ loading ? '登录中…' : '登录' }}
        </button>
        <p class="links center" style="margin-top:14px">
          <a @click="setMode('reset')">忘记密码？</a>
          <span class="sep">|</span>
          <a @click="setMode('register')">没有账号？去注册</a>
        </p>
      </template>

      <!-- ==================== 注册 ==================== -->
      <template v-if="isRegister">
        <div class="mode-header">
          <span class="back-link" @click="setMode('login')">返回登录</span>
          <h3 class="mode-title">注册账号</h3>
        </div>
        <div class="field">
          <label>手机号</label>
          <input v-model="phone" placeholder="请输入手机号" maxlength="11" />
          <p v-if="phoneExists === true" class="hint warn">该手机号已注册，请直接<a @click="setMode('login')">登录</a></p>
        </div>
        <div class="field">
          <label>验证码</label>
          <div class="code-row">
            <input v-model="code" placeholder="6 位验证码" maxlength="6" inputmode="numeric" />
            <button class="btn btn-outline" :disabled="sending || countdown > 0 || phoneExists === true" @click="sendCode">
              {{ countdown > 0 ? countdown + 's' : (sending ? '发送中…' : '发送验证码') }}
            </button>
          </div>
        </div>
        <div class="field">
          <label>姓名</label>
          <input v-model="regName" placeholder="请输入真实姓名" />
        </div>
        <div class="field">
          <label>密码</label>
          <div class="pwd-row">
            <input v-model="regPwd" :type="regPwdVisible ? 'text' : 'password'" placeholder="至少 6 位" />
            <span class="pwd-toggle" @click="regPwdVisible = !regPwdVisible">{{ regPwdVisible ? '🙈' : '👁' }}</span>
          </div>
        </div>
        <div class="field">
          <label>确认密码</label>
          <div class="pwd-row">
            <input v-model="regPwd2" :type="regPwd2Visible ? 'text' : 'password'" placeholder="请再次输入密码" @keyup.enter="doRegister" />
            <span class="pwd-toggle" @click="regPwd2Visible = !regPwd2Visible">{{ regPwd2Visible ? '🙈' : '👁' }}</span>
          </div>
        </div>
        <button class="btn btn-primary btn-block" :disabled="loading || phoneExists === true" @click="doRegister">
          {{ loading ? '注册中…' : '注册' }}
        </button>
      </template>

      <!-- ==================== 找回密码 ==================== -->
      <template v-if="isReset">
        <div class="mode-header">
          <span class="back-link" @click="setMode('login')">返回登录</span>
          <h3 class="mode-title">找回密码</h3>
        </div>
        <p class="muted" style="margin-bottom:14px;font-size:13px">
          重置后仅更新密码，您的测评记录与全部历史数据不受任何影响。
        </p>
        <div class="field">
          <label>已注册的手机号</label>
          <input v-model="phone" placeholder="请输入已注册的手机号" maxlength="11" />
          <p v-if="phoneExists === false" class="hint warn">该手机号未注册，请先<a @click="setMode('register')">注册账号</a></p>
        </div>
        <div class="field">
          <label>验证码</label>
          <div class="code-row">
            <input v-model="code" placeholder="6 位验证码" maxlength="6" inputmode="numeric" />
            <button class="btn btn-outline" :disabled="sending || countdown > 0 || phoneExists === false" @click="sendCode">
              {{ countdown > 0 ? countdown + 's' : (sending ? '发送中…' : '发送验证码') }}
            </button>
          </div>
        </div>
        <div class="field">
          <label>新密码</label>
          <div class="pwd-row">
            <input v-model="resetPwd" :type="resetPwdVisible ? 'text' : 'password'" placeholder="至少 6 位" />
            <span class="pwd-toggle" @click="resetPwdVisible = !resetPwdVisible">{{ resetPwdVisible ? '🙈' : '👁' }}</span>
          </div>
        </div>
        <div class="field">
          <label>确认新密码</label>
          <div class="pwd-row">
            <input v-model="resetPwd2" :type="resetPwd2Visible ? 'text' : 'password'" placeholder="请再次输入新密码" @keyup.enter="doResetPassword" />
            <span class="pwd-toggle" @click="resetPwd2Visible = !resetPwd2Visible">{{ resetPwd2Visible ? '🙈' : '👁' }}</span>
          </div>
        </div>
        <button class="btn btn-primary btn-block" :disabled="loading || phoneExists === false" @click="doResetPassword">
          {{ loading ? '重置中…' : '重置密码' }}
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.login-wrap { min-height: 80vh; display: grid; place-items: center; }
.login-card { width: 100%; max-width: 420px; }
.logo { font-size: 40px; }

/* 模式标题 */
.mode-header { margin-bottom: 16px; }
.back-link { font-size: 13px; color: var(--primary); cursor: pointer; }
.mode-title { font-size: 18px; margin-top: 6px; color: var(--text, #1f2433); }

/* 密码可见切换 */
.pwd-row { display: flex; align-items: center; }
.pwd-row input { flex: 1; }
.pwd-toggle { margin-left: 8px; cursor: pointer; user-select: none; font-size: 18px; }

/* 验证码行 */
.code-row { display: flex; gap: 10px; }
.code-row input { flex: 1; }
.code-row .btn-outline { white-space: nowrap; padding: 0 14px; }

/* 提示小字 */
.hint { font-size: 12px; margin-top: 4px; }
.hint.warn { color: var(--primary); }
.hint a { color: var(--primary); text-decoration: underline; cursor: pointer; }

/* 底部链接 */
.links { font-size: 13px; color: var(--text-dim); }
.links a { color: var(--primary); cursor: pointer; }
.links .sep { margin: 0 8px; color: var(--text-dim); }
</style>
