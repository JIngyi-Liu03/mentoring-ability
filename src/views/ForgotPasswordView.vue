<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api/client.js'

const router = useRouter()

const step = ref(1) // 1: 申请重置码  2: 设置新密码
const username = ref('')
const email = ref('')
const resetToken = ref('')
const newPassword = ref('')
const confirm = ref('')
const error = ref('')
const info = ref('')
const loading = ref(false)

async function requestCode() {
  error.value = ''
  info.value = ''
  if (!username.value || !email.value) { error.value = '请填写用户名和注册邮箱'; return }
  loading.value = true
  try {
    const data = await api.post('/auth/forgot-password', { username: username.value, email: email.value.trim() })
    resetToken.value = data.resetToken || ''
    info.value = data.message || '验证通过'
    step.value = 2
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function doReset() {
  error.value = ''
  if (!resetToken.value || !newPassword.value) { error.value = '请填写重置码和新密码'; return }
  if (newPassword.value.length < 6) { error.value = '新密码至少 6 个字符'; return }
  if (newPassword.value !== confirm.value) { error.value = '两次输入的密码不一致'; return }
  loading.value = true
  try {
    await api.post('/auth/reset-password', { token: resetToken.value, newPassword: newPassword.value })
    step.value = 3
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-wrap">
    <div class="card login-card">
      <div class="hero">
        <div class="logo">🔑</div>
        <h1>找回密码</h1>
        <p>通过用户名与注册邮箱验证身份，重置你的登录密码。</p>
      </div>

      <div v-if="error" class="alert">{{ error }}</div>
      <div v-if="info" class="alert alert-ok">{{ info }}</div>

      <!-- 步骤 1：申请重置码 -->
      <template v-if="step === 1">
        <div class="field">
          <label>用户名</label>
          <input v-model="username" placeholder="请输入用户名" @keyup.enter="requestCode" />
        </div>
        <div class="field">
          <label>注册邮箱</label>
          <input v-model="email" type="email" placeholder="请输入注册时填写的邮箱" @keyup.enter="requestCode" />
        </div>
        <button class="btn btn-primary btn-block" :disabled="loading" @click="requestCode">
          {{ loading ? '处理中…' : '获取重置码' }}
        </button>
      </template>

      <!-- 步骤 2：设置新密码 -->
      <template v-else-if="step === 2">
        <div class="field">
          <label>重置码</label>
          <input v-model="resetToken" placeholder="请输入系统返回的重置码" />
        </div>
        <div class="field">
          <label>新密码</label>
          <input v-model="newPassword" type="password" placeholder="至少 6 位" @keyup.enter="doReset" />
        </div>
        <div class="field">
          <label>确认新密码</label>
          <input v-model="confirm" type="password" placeholder="再次输入新密码" @keyup.enter="doReset" />
        </div>
        <button class="btn btn-primary btn-block" :disabled="loading" @click="doReset">
          {{ loading ? '处理中…' : '重置密码' }}
        </button>
        <p class="muted center" style="margin-top:12px;font-size:13px">
          <a style="color:var(--primary);cursor:pointer" @click="step = 1">重新获取重置码</a>
        </p>
      </template>

      <!-- 步骤 3：完成 -->
      <template v-else>
        <div class="alert alert-ok">密码已重置成功，请使用新密码登录。</div>
        <button class="btn btn-primary btn-block" @click="router.push('/login')">前往登录</button>
      </template>

      <p class="muted center" style="margin-top:16px;font-size:13px">
        <a style="color:var(--primary);cursor:pointer" @click="router.push('/login')">返回登录</a>
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-wrap { min-height: 80vh; display: grid; place-items: center; }
.login-card { width: 100%; max-width: 420px; }
.logo { font-size: 40px; }
.alert-ok { background: #ecfdf3; border: 1px solid #abefc6; color: #067647; }
</style>
