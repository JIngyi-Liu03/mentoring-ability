import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '../stores/assessment.js'

const routes = [
  { path: '/', redirect: '/login' },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true }
  },
  {
    path: '/forgot',
    name: 'forgot',
    component: () => import('../views/ForgotPasswordView.vue'),
    meta: { public: true }
  },
  { path: '/intro', name: 'intro', component: () => import('../views/IntroView.vue') },
  { path: '/assessment', name: 'assessment', component: () => import('../views/AssessmentView.vue') },
  { path: '/thanks', name: 'thanks', component: () => import('../views/ThankYouView.vue') },
  { path: '/result/:id?', name: 'result', component: () => import('../views/ResultView.vue') },
  { path: '/admin', name: 'admin', component: () => import('../views/AdminView.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/login' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 全局守卫：未登录跳登录；非管理员不能进管理页
router.beforeEach((to) => {
  const user = useUserStore()
  const loggedIn = user.isLoggedIn
  if (to.meta.public) return true
  if (!loggedIn) return { name: 'login', query: { redirect: to.fullPath } }
  if (to.name === 'admin' && !user.isAdmin) return { name: 'intro' }
  return true
})

export default router
