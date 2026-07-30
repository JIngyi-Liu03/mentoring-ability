<script setup>
import { useUserStore } from './stores/assessment.js'
import { useRouter, useRoute } from 'vue-router'
import { computed } from 'vue'

const user = useUserStore()
const router = useRouter()
const route = useRoute()

const showNav = computed(() => user.isLoggedIn)
const onLogin = computed(() => route.name === 'login')

function goHome() {
  router.push(user.isAdmin ? '/admin' : '/intro')
}
function logout() {
  user.logout()
  router.push('/login')
}
</script>

<template>
  <div class="app-shell">
    <header v-if="showNav && !onLogin" class="topbar">
      <div class="topbar-inner">
        <div class="brand" @click="goHome">🧭 导师辅导能力成熟度自评</div>
        <nav class="nav">
          <template v-if="user.isAdmin">
            <router-link to="/admin">管理看板</router-link>
          </template>
          <router-link to="/intro">测评</router-link>
          <span class="who">你好，{{ user.user?.username }}</span>
          <button class="btn btn-ghost btn-sm" @click="logout">退出</button>
        </nav>
      </div>
    </header>

    <main class="app-main">
      <router-view />
    </main>

    <footer class="foot">
      <span>导师辅导能力成熟度自评 · 个人与团队能力发展工具</span>
    </footer>
  </div>
</template>

<style scoped>
.topbar { border-bottom: 1px solid var(--border); background: rgba(255,255,255,0.85); backdrop-filter: blur(8px); }
.topbar-inner { max-width: 960px; margin: 0 auto; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; }
.brand { font-weight: 700; cursor: pointer; color: var(--text); }
.nav { display: flex; gap: 16px; align-items: center; }
.nav a { color: var(--text-dim); font-size: 14px; }
.nav a.router-link-active { color: var(--primary); }
.who { color: var(--text-dim); font-size: 13px; }
.btn-sm { padding: 6px 12px; font-size: 13px; }
.foot { text-align: center; padding: 18px; color: var(--text-dim); font-size: 12px; border-top: 1px solid var(--border); background: #fff; }
</style>
