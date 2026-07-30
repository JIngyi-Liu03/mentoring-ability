import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/assessment.js'
import LoginView from '../views/LoginView.vue'
import AdminView from '../views/AdminView.vue'
import ForgotPasswordView from '../views/ForgotPasswordView.vue'

const routes = [
  { path: '/', redirect: '/admin' },
  { path: '/login', name: 'login', component: LoginView, props: { hideRegister: true } },
  { path: '/forgot', name: 'forgot', component: ForgotPasswordView, meta: { public: true } },
  { path: '/admin', name: 'admin', component: AdminView, meta: { requiresAuth: true, role: 'admin' } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const user = useUserStore()
  if (to.meta.requiresAuth) {
    if (!user.isLoggedIn) return next({ path: '/login', query: { redirect: to.fullPath } })
    if (to.meta.role && user.user?.role !== to.meta.role) {
      return next(user.user?.role === 'admin' ? '/admin' : '/intro')
    }
  }
  next()
})

export default router
