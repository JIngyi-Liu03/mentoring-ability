<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../../stores/user.js'
import { api } from '../../api/client.js'
import logo from '../../assets/logo.webp'

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

const username = ref('')
const password = ref('')
const pwdVisible = ref(false)
const error = ref('')
const loading = ref(false)

async function doLogin() {
  error.value = ''
  if (!username.value.trim()) { error.value = '请输入用户名'; return }
  if (!password.value) { error.value = '请输入密码'; return }
  loading.value = true
  try {
    const data = await api.post('/auth/login', {
      username: username.value.trim(),
      password: password.value
    })
    userStore.setSession(data.token, data.user)
    const redirect = route.query.redirect
    router.push(redirect || '/admin')
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
        <img :src="logo" class="logo" alt="MentoringCo" />
        <h1>导师能力评估管理系统</h1>
        <p>管理人员专用后台</p>
      </div>

      <div v-if="error" class="alert">{{ error }}</div>

      <div class="field">
        <label>用户名</label>
        <input v-model="username" placeholder="请输入用户名" @keyup.enter="doLogin" />
      </div>
      <div class="field">
        <label>密码</label>
        <div class="pwd-row">
          <input
            v-model="password"
            :type="pwdVisible ? 'text' : 'password'"
            placeholder="请输入密码"
            @keyup.enter="doLogin"
          />
          <span class="pwd-toggle" @click="pwdVisible = !pwdVisible">
            {{ pwdVisible ? '🙈' : '👁' }}
          </span>
        </div>
      </div>
      <button class="btn btn-primary btn-block" :disabled="loading" @click="doLogin">
        {{ loading ? '登录中…' : '登 录' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.login-wrap { min-height: 80vh; display: grid; place-items: center; background: #f5f6fa; }
.login-card { width: 100%; max-width: 400px; }
/* 用品牌 LOGO 取代 emoji，保持足够大且居中 */
.logo { height: 90px; width: auto; display: block; margin: 0 auto 14px; }

@media (max-width: 720px) {
  .logo { height: 70px; }
}

.pwd-row { display: flex; align-items: center; }
.pwd-row input { flex: 1; }
.pwd-toggle { margin-left: 8px; cursor: pointer; user-select: none; font-size: 18px; }
</style>
