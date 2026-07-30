import { createApp } from 'vue'
import { createPinia } from 'pinia'
import AdminApp from './AdminApp.vue'
import router from './router.js'
import '../styles/main.css'

createApp(AdminApp).use(router).use(createPinia()).mount('#app')
