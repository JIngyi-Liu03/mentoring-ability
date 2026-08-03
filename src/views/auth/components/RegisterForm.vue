<script setup>
// ============================================================
// 注册表单：手机号 + 验证码 + 姓名 + 密码。
// 提交成功后 emit('success', data)，不负责页面跳转。
// ============================================================
import { ref, watch, onUnmounted } from 'vue'
import { api } from '../../../api/client.js'
import { isValidPhone, isValidPassword } from '../../../utils/validate.js'

const emit = defineEmits(['success', 'switch'])

const phone = ref('')
const code = ref('')
const regName = ref('')
const regPwd = ref('')
const regPwd2 = ref('')
const regPwdVisible = ref(false)
const regPwd2Visible = ref(false)
const sending = ref(false)
const countdown = ref(0)
const phoneExists = ref(null)
const error = ref('')
const loading = ref(false)

let timer = null
let checkTimer = null

// 手机号已注册检测
function checkPhoneExists() {
  if (!isValidPhone(phone.value)) return
  api.post('/auth/check-phone', { phone: phone.value })
    .then(data => { phoneExists.value = data.exists })
    .catch(() => { phoneExists.value = null })
}
watch(phone, () => {
  if (checkTimer) clearTimeout(checkTimer)
  phoneExists.value = null
  if (phone.value.length === 11 && isValidPhone(phone.value)) {
    checkTimer = setTimeout(checkPhoneExists, 500)
  }
})

// 发送验证码
async function sendCode() {
  error.value = ''
  if (!isValidPhone(phone.value)) { error.value = '请输入正确的手机号'; return }
  sending.value = true
  try {
    await api.post('/auth/sms/send', { phone: phone.value, purpose: 'register' })
    countdown.value = 60
    timer = setInterval(() => { countdown.value--; if (countdown.value <= 0) { clearInterval(timer); timer = null } }, 1000)
  } catch (e) {
    error.value = e.message
  } finally {
    sending.value = false
  }
}

// 注册
async function doRegister() {
  error.value = ''
  if (!isValidPhone(phone.value)) { error.value = '请输入正确的手机号'; return }
  if (!code.value) { error.value = '请输入验证码'; return }
  if (!regName.value.trim()) { error.value = '请输入姓名'; return }
  if (!isValidPassword(regPwd.value)) { error.value = '密码至少 6 个字符'; return }
  if (regPwd.value !== regPwd2.value) { error.value = '两次输入的密码不一致'; return }
  if (phoneExists.value === true) { error.value = '该手机号已注册，请直接登录'; return }
  loading.value = true
  try {
    const data = await api.post('/auth/sms/register', {
      phone: phone.value, code: code.value, password: regPwd.value, name: regName.value.trim()
    })
    emit('success', data)
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
  <div>
    <div class="mode-header">
      <span class="back-link" @click="emit('switch', 'login')">返回登录</span>
      <h3 class="mode-title">注册账号</h3>
    </div>

    <div v-if="error" class="alert">{{ error }}</div>

    <div class="field">
      <label>手机号</label>
      <input v-model="phone" placeholder="请输入手机号" maxlength="11" />
      <p v-if="phoneExists === true" class="hint warn">该手机号已注册，请直接<a @click="emit('switch', 'login')">登录</a></p>
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
  </div>
</template>

<style scoped>
.mode-header { margin-bottom: 16px; }
.back-link { font-size: 13px; color: var(--primary); cursor: pointer; }
.mode-title { font-size: 18px; margin-top: 6px; color: var(--text, #1f2433); }
.pwd-row { display: flex; align-items: center; }
.pwd-row input { flex: 1; }
.pwd-toggle { margin-left: 8px; cursor: pointer; user-select: none; font-size: 18px; }
.code-row { display: flex; gap: 10px; }
.code-row input { flex: 1; }
.code-row .btn-outline { white-space: nowrap; padding: 0 14px; }
.hint { font-size: 12px; margin-top: 4px; }
.hint.warn { color: var(--primary); }
.hint a { color: var(--primary); text-decoration: underline; cursor: pointer; }
</style>
