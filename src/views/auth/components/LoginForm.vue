<script setup>
// ============================================================
// 登录表单：手机号 + 密码。提交成功后 emit('success', data)，
// 不负责页面跳转（由容器 LoginView 处理）。
// ============================================================
import { ref, watch } from 'vue'
import { api } from '../../../api/client.js'
import { isValidPhone } from '../../../utils/validate.js'

const emit = defineEmits(['success', 'switch'])
const props = defineProps({
  prefillPhone: { type: String, default: '' }
})

const loginPhone = ref('')
const loginPwd = ref('')
const loginPwdVisible = ref(false)
const error = ref('')
const loading = ref(false)

// 找回密码成功后由容器预填手机号
watch(() => props.prefillPhone, (v) => {
  if (v) loginPhone.value = v
})

async function doLogin() {
  error.value = ''
  if (!isValidPhone(loginPhone.value)) { error.value = '请输入正确的手机号'; return }
  if (!loginPwd.value) { error.value = '请输入密码'; return }
  loading.value = true
  try {
    const data = await api.post('/auth/login', { phone: loginPhone.value, password: loginPwd.value })
    emit('success', data)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <div v-if="error" class="alert">{{ error }}</div>

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
      <a @click="emit('switch', 'reset')">忘记密码？</a>
      <span class="sep">|</span>
      <a @click="emit('switch', 'register')">没有账号？去注册</a>
    </p>
  </div>
</template>

<style scoped>
.pwd-row { display: flex; align-items: center; }
.pwd-row input { flex: 1; }
.pwd-toggle { margin-left: 8px; cursor: pointer; user-select: none; font-size: 18px; }
.links { font-size: 13px; color: var(--text-dim); }
.links a { color: var(--primary); cursor: pointer; }
.links .sep { margin: 0 8px; color: var(--text-dim); }
</style>
