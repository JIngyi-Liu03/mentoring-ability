<script setup>
import { useUserStore } from '../stores/assessment.js'
import { useRouter } from 'vue-router'

const user = useUserStore()
const router = useRouter()

function logout() {
  user.logout()
  router.push('/login')
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand">🧭 管理后台</div>
        <div class="nav" v-if="user.isLoggedIn">
          <span class="who">你好，{{ user.user?.username }}</span>
          <button class="btn btn-ghost btn-sm" @click="logout">退出登录</button>
        </div>
      </div>
    </header>
    <main class="app-main">
      <router-view />
    </main>
    <footer class="foot">导师辅导能力成熟度自评 · 管理后台</footer>
  </div>
</template>
