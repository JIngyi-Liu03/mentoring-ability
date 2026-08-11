<script setup>
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'

const router = useRouter()
const user = useUserStore()

function start() {
  if (user.isLoggedIn) router.push('/intro')
  else router.push('/login')
}
</script>

<template>
  <div class="home">
    <section class="hero">
      <h1>导师辅导能力自测</h1>
      <p class="lead">
        一套简洁的线上自评工具，帮助你快速了解自己在导师辅导方面的能力水平。
      </p>
      <div class="cta">
        <button class="btn btn-primary" @click="start">开始自测</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  max-width: 720px;
  margin: 0 auto;
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero {
  text-align: center;
  padding: 20px;
}

.hero h1 {
  font-size: 34px;
  margin: 0 0 16px;
  color: var(--text);
  letter-spacing: 0.5px;
}

.lead {
  color: var(--text-dim);
  font-size: 16px;
  line-height: 1.9;
  margin: 0 0 30px;
  max-width: 460px;
  margin-left: auto;
  margin-right: auto;
}

.cta .btn-primary {
  font-size: 16px;
  padding: 13px 40px;
}

@media (max-width: 720px) {
  .hero h1 { font-size: 26px; }
  .lead { font-size: 15px; }
}
</style>
