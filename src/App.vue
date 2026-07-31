<script setup>
import { useUserStore } from './stores/assessment.js'
import { useRouter, useRoute } from 'vue-router'
import { computed } from 'vue'
import logo from './assets/logo.webp'

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
    <!-- 商标：始终在页面左上角（使用用户提供的原图） -->
    <router-link to="/intro" class="brand-link" aria-label="返回首页">
      <img :src="logo" class="brand-logo" alt="MentoringCo" />
    </router-link>

    <header v-if="showNav && !onLogin" class="topbar">
      <div class="topbar-inner">
        <div class="nav">
          <template v-if="user.isAdmin">
            <router-link to="/admin">管理看板</router-link>
          </template>
          <router-link to="/intro">测评</router-link>
          <span class="who">你好，{{ user.user?.name || user.user?.username }}</span>
          <button class="btn btn-ghost btn-sm" @click="logout">退出</button>
        </div>
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
.brand-link {
  position: fixed;
  top: 14px;
  left: 16px;
  z-index: 100;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}
.brand-link:hover { opacity: 0.85; }
.brand-logo { height: 40px; width: auto; display: block; }

.topbar { border-bottom: 1px solid var(--border); background: #fff; padding-left: 176px; }
.topbar-inner { max-width: 1080px; margin: 0 auto; padding: 10px 12px; display: flex; justify-content: flex-end; align-items: center; }
.nav { display: flex; gap: 16px; align-items: center; }
.nav a { color: var(--text-dim); font-size: 14px; }
.nav a.router-link-active { color: var(--text); font-weight: 600; }
.who { color: var(--text-dim); font-size: 13px; }
.btn-sm { padding: 6px 12px; font-size: 13px; }
.foot { text-align: center; padding: 18px; color: var(--text-dim); font-size: 12px; border-top: 1px solid var(--border); background: #fff; }

@media (max-width: 720px) {
  .topbar { padding-left: 0; }
  .topbar-inner { justify-content: center; }
  .brand-logo { height: 36px; }
}
</style>