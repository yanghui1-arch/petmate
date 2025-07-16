import { createRouter, createWebHistory } from 'vue-router'

// 导入你的页面组件
import Home from '@/views/Home.vue'
import Shop from '@/views/Shop.vue'
import Wish from '@/views/Wish.vue'
import Activity from '@/views/Activity.vue'
import Card from '@/views/Card.vue'
import Log from '@/views/Log.vue'
import Settings from '@/views/Settings.vue'
import Chat from '@/views/Chat.vue'

const routes = [
  { path: '/', name: 'App', component: Home }, // name不能重复，否则路由匹配会出错
  { path: '/home', name: 'Home', component: Home },
  { path: '/shop', name: 'Shop', component: Shop },
  { path: '/activity', name: 'Activity', component: Activity },
  { path: '/wish', name: 'Wish', component: Wish },
  { path: '/card', name: 'Card', component: Card },
  { path: '/log', name: 'Log', component: Log },
  { path: '/settings', name: 'Settings', component: Settings },
  { path: '/chat', name: 'Chat', component: Chat },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
