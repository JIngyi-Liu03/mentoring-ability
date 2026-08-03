import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user.js'
import AdminLoginView from './views/AdminLoginView.vue'
import AdminView from '../views/AdminView.vue'

const routes = [
  { path: '/', redirect: '/admin' },
  { path: '/login', name: 'login', component: AdminLoginView },
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
