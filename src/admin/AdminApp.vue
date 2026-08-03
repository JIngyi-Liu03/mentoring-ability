<script setup>
import { computed } from 'vue'
import { useUserStore } from '../stores/user.js'
import { useRouter, useRoute } from 'vue-router'
import logo from '../assets/logo.webp'

const user = useUserStore()
const router = useRouter()
const route = useRoute()
const hideBrand = computed(() => route.name === 'login')

function logout() {
  user.logout()
  router.push('/login')
}
</script>

<template>
  <div class="app-shell">
    <!-- 商标：始终在页面左上角（使用用户提供的原图），登录页隐藏 -->
    <div v-if="!hideBrand" class="brand-link" aria-label="MentoringCo">
      <img :src="logo" class="brand-logo" alt="MentoringCo" />
    </div>

    <header class="topbar">
      <div class="topbar-inner">
        <div class="nav" v-if="user.isLoggedIn">
          <span class="who">你好，{{ user.user?.name || user.user?.username }}</span>
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

<style scoped>
.brand-link {
  display: inline-flex;
  align-items: center;
  padding: 12px 20px 4px;
}
.brand-logo { height: 40px; width: auto; display: block; }

.topbar { border-bottom: 1px solid var(--border); background: #fff; }
.topbar-inner { max-width: 1080px; margin: 0 auto; padding: 10px 12px; display: flex; justify-content: flex-end; align-items: center; }
.nav { display: flex; gap: 16px; align-items: center; }
.who { color: var(--text-dim); font-size: 13px; }
.btn-sm { padding: 6px 12px; font-size: 13px; }
.foot { text-align: center; padding: 18px; color: var(--text-dim); font-size: 12px; border-top: 1px solid var(--border); background: #fff; }

@media (max-width: 720px) {
  .topbar { padding-left: 0; }
  .topbar-inner { justify-content: center; }
  .brand-logo { height: 36px; }
}
</style>