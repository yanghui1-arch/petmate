import { createRouter, createWebHistory } from 'vue-router'

// 导入你的页面组件
import Home from '@/views/Home.vue'
import Package from '@/views/Package.vue'
import Shop from '@/views/Shop.vue'
import Wish from '@/views/Wish.vue'
import Settings from '@/views/Settings.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/package', name: 'Package', component: Package },
  { path: '/shop', name: 'Shop', component: Shop },
  { path: '/wish', name: 'Wish', component: Wish },
  { path: '/settings', name: 'Settings', component: Settings },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
