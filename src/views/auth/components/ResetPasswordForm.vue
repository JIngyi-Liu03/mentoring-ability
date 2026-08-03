<script setup>
// ============================================================
// 找回密码表单：手机号 + 验证码 + 新密码。
// 提交成功后 emit('success', phone)，由容器决定后续动作。
// ============================================================
import { ref, watch, onUnmounted } from 'vue'
import { api } from '../../../api/client.js'
import { isValidPhone, isValidPassword } from '../../../utils/validate.js'

const emit = defineEmits(['success', 'switch'])

const phone = ref('')
const code = ref('')
const resetPwd = ref('')
const resetPwd2 = ref('')
const resetPwdVisible = ref(false)
const resetPwd2Visible = ref(false)
const sending = ref(false)
const countdown = ref(0)
const phoneExists = ref(null)
const error = ref('')
const loading = ref(false)

let timer = null
let checkTimer = null

// 手机号是否已注册
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
    await api.post('/auth/sms/send', { phone: phone.value, purpose: 'reset' })
    countdown.value = 60
    timer = setInterval(() => { countdown.value--; if (countdown.value <= 0) { clearInterval(timer); timer = null } }, 1000)
  } catch (e) {
    error.value = e.message
  } finally {
    sending.value = false
  }
}

// 重置密码
async function doResetPassword() {
  error.value = ''
  if (!isValidPhone(phone.value)) { error.value = '请输入正确的手机号'; return }
  if (!code.value) { error.value = '请输入验证码'; return }
  if (!isValidPassword(resetPwd.value)) { error.value = '新密码至少 6 个字符'; return }
  if (resetPwd.value !== resetPwd2.value) { error.value = '两次输入的新密码不一致'; return }
  loading.value = true
  try {
    await api.post('/auth/sms/reset-password', { phone: phone.value, code: code.value, password: resetPwd.value })
    emit('success', phone.value)
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
      <h3 class="mode-title">找回密码</h3>
    </div>

    <p class="muted" style="margin-bottom:14px;font-size:13px">
      重置后仅更新密码，您的测评记录与全部历史数据不受任何影响。
    </p>

    <div v-if="error" class="alert">{{ error }}</div>

    <div class="field">
      <label>已注册的手机号</label>
      <input v-model="phone" placeholder="请输入已注册的手机号" maxlength="11" />
      <p v-if="phoneExists === false" class="hint warn">该手机号未注册，请先<a @click="emit('switch', 'register')">注册账号</a></p>
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
