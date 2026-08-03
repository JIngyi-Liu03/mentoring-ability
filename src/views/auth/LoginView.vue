<script setup>
// ============================================================
// 登录区容器：只负责 mode 切换与登录/注册成功后的跳转决策，
// 具体表单逻辑在 components/ 下三个子组件中（通过 emit 上报结果）。
// ============================================================
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../../stores/user.js'
import logo from '../../assets/logo.webp'
import LoginForm from './components/LoginForm.vue'
import RegisterForm from './components/RegisterForm.vue'
import ResetPasswordForm from './components/ResetPasswordForm.vue'

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

// ===== mode: login | register | reset =====
const mode = ref('login')
// 找回密码成功后，预填到登录表单的手机号
const prefillPhone = ref('')

function setMode(m) {
  mode.value = m
}

// 登录成功 → 由容器决定跳转
function onLoginSuccess(data) {
  userStore.setSession(data.token, data.user)
  const redirect = route.query.redirect
  if (redirect) router.push(redirect)
  else router.push(userStore.user?.role === 'admin' ? '/admin' : '/intro')
}

// 注册成功 → 由容器决定跳转
function onRegisterSuccess(data) {
  userStore.setSession(data.token, data.user)
  const redirect = route.query.redirect
  if (redirect) router.push(redirect)
  else router.push('/intro')
}

// 找回密码成功 → 切回登录并预填手机号
function onResetSuccess(phone) {
  alert('密码重置成功，请使用新密码登录')
  prefillPhone.value = phone
  setMode('login')
}
</script>

<template>
  <div class="login-wrap">
    <div class="card login-card">
      <div class="hero">
        <img :src="logo" class="logo" alt="MentoringCo" />
        <h1>导师辅导能力成熟度自评</h1>
        <p>用一套成熟模型，看清你的辅导能力处在哪一能级，并获得可执行的提升建议。</p>
      </div>

      <LoginForm
        v-if="mode === 'login'"
        :prefillPhone="prefillPhone"
        @success="onLoginSuccess"
        @switch="setMode"
      />
      <RegisterForm
        v-else-if="mode === 'register'"
        @success="onRegisterSuccess"
        @switch="setMode"
      />
      <ResetPasswordForm
        v-else
        @success="onResetSuccess"
        @switch="setMode"
      />
    </div>
  </div>
</template>

<style scoped>
.login-wrap { min-height: 80vh; display: grid; place-items: center; }
.login-card { width: 100%; max-width: 420px; }
.logo { height: 110px; width: auto; display: block; margin: 0 auto 14px; }

@media (max-width: 720px) {
  .logo { height: 80px; }
}
</style>
