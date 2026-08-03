<script setup>
// ============================================================
// 完成页：测评提交成功后的确认页，引导用户查看报告。
// 未来扩展：埋点统计、商业转化入口（生成建议 / 联系导师）。
// ============================================================
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="completion">
    <div class="card">
      <div class="check">✓</div>
      <h1>测评完成</h1>
      <p class="sub">你的导师辅导能力测评已成功提交，我们正在为你生成专属诊断报告。</p>
      <button class="btn btn-primary" @click="router.push('/result')">查看报告</button>
    </div>
  </div>
</template>

<style scoped>
.completion { max-width: 560px; margin: 0 auto; padding: 60px 16px; display: flex; justify-content: center; }
.card {
  width: 100%; text-align: center; background: #fff; border: 1px solid var(--border, #e5e7eb);
  border-radius: 12px; padding: 48px 28px; box-shadow: var(--shadow);
}
.check {
  width: 72px; height: 72px; margin: 0 auto 22px; border-radius: 50%;
  background: var(--primary); color: #fff;
  font-size: 38px; line-height: 72px; font-weight: 700;
}
h1 { font-size: 24px; margin: 0 0 12px; color: var(--text, #0f172a); }
.sub { color: var(--text-dim, #64748b); font-size: 15px; line-height: 1.7; margin: 0 0 28px; }
</style>
