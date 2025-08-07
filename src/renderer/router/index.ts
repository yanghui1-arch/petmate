import { createRouter, createWebHashHistory } from 'vue-router'

// 导入你的页面组件
import Home from '@/views/Home.vue'
import Shop from '@/views/Shop.vue'
import Wish from '@/views/Wish.vue'
import Activity from '@/views/Activity.vue'
import Card from '@/views/Card.vue'
import Log from '@/views/Log.vue'
import Settings from '@/views/Settings.vue'
import Chat from '@/views/Chat.vue'
import Config from '@/views/Config.vue'

const routes = [
  { path: '/', name: 'Root', component: () => import('@/views/Petmate.vue') }, // 根路径显示Petmate页面
  { path: '/petmate', name: 'Petmate', component: () => import('@/views/Petmate.vue') }, // 专门的Petmate路由
  { path: '/home', name: 'Home', component: Home },
  { path: '/shop', name: 'Shop', component: Shop },
  { path: '/activity', name: 'Activity', component: Activity },
  { path: '/wish', name: 'Wish', component: Wish },
  { path: '/card', name: 'Card', component: Card },
  { path: '/log', name: 'Log', component: Log },
  { path: '/settings', name: 'Settings', component: Settings },
  { path: '/chat', name: 'Chat', component: Chat },
  { path: '/config', name: 'Config', component: Config },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
