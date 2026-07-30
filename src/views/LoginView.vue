<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/assessment.js'
import { api } from '../api/client.js'

const props = defineProps({ hideRegister: { type: Boolean, default: false } })

const user = useUserStore()
const router = useRouter()
const route = useRoute()

const mode = ref('login') // login | register
const username = ref('')
const password = ref('')
const email = ref('')
const error = ref('')
const loading = ref(false)

const isLogin = computed(() => mode.value === 'login')

function switchMode(m) { mode.value = m; error.value = '' }
function goForgot() { router.push('/forgot') }

async function submit() {
  error.value = ''
  if (!username.value || !password.value) { error.value = '请输入用户名和密码'; return }
  loading.value = true
  try {
    const data = isLogin.value
      ? await api.post('/auth/login', { username: username.value, password: password.value })
      : await api.post('/auth/register', { username: username.value, password: password.value, email: email.value.trim() })
    user.setSession(data.token, data.user)
    const redirect = route.query.redirect
    if (redirect) router.push(redirect)
    else router.push(data.user.role === 'admin' ? '/admin' : '/intro')
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
        <div class="logo">🧭</div>
        <h1>导师辅导能力成熟度自评</h1>
        <p>用一套成熟模型，看清你的辅导能力处在哪一能级，并获得可执行的提升建议。</p>
      </div>

      <div class="tabs" v-if="!hideRegister">
        <div class="tab" :class="{ active: isLogin }" @click="switchMode('login')">登录</div>
        <div class="tab" :class="{ active: !isLogin }" @click="switchMode('register')">注册</div>
      </div>

      <div v-if="error" class="alert">{{ error }}</div>

      <div class="field">
        <label>用户名</label>
        <input v-model="username" placeholder="请输入用户名" @keyup.enter="submit" />
      </div>
      <div class="field">
        <label>密码</label>
        <input v-model="password" type="password" placeholder="至少 6 位" @keyup.enter="submit" />
      </div>
      <div class="field" v-if="!isLogin">
        <label>邮箱（用于找回密码）</label>
        <input v-model="email" type="email" placeholder="用于找回密码，可选" />
      </div>

      <button class="btn btn-primary btn-block" :disabled="loading" @click="submit">
        {{ loading ? '处理中…' : (isLogin ? '登录' : '注册并进入') }}
      </button>

      <p class="muted center" style="margin-top:14px;font-size:13px">
        <a style="color:var(--primary);cursor:pointer" @click="goForgot">忘记密码？</a>
      </p>

      <p class="muted center" style="margin-top:6px;font-size:13px">
        管理员账号：admin / mentoringco2026（可在 .env 修改）
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-wrap { min-height: 80vh; display: grid; place-items: center; }
.login-card { width: 100%; max-width: 420px; }
.logo { font-size: 40px; }
</style>
