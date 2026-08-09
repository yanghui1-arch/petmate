import { createRouter, createWebHashHistory } from 'vue-router'

// 导入你的页面组件
import Home from '@/views/Home.vue'
import Shop from '@/views/Shop.vue'
import Wish from '@/views/Wish.vue'
import Activity from '@/views/Activity.vue'
import Commission from '@/views/Commission.vue'
import Card from '@/views/Card.vue'
import Log from '@/views/Log.vue'
import Settings from '@/views/Settings.vue'
import Chat from '@/views/Chat.vue'
import DataRecovery from '@/views/DataRecovery.vue'
import Wardrobe from '@/views/Wardrobe.vue'

// meta属性可以为每个路由设置一些自定义属性，在.vue文件中引入useRoute()，通过route.meta.xxx就可以实现一些针对不同页面的逻辑
const routes = [
  { path: '/', name: 'Root', component: () => import('@/views/Petmate.vue'), meta: { hideClosedButton: true, hideNavigator: true, recieveNotification: true } }, // 根路径显示Petmate页面
  { path: '/petmate', name: 'Petmate', component: () => import('@/views/Petmate.vue'), meta: { hideClosedButton: true, hideNavigator: true, recieveNotification: true } }, // 专门的Petmate路由
  { path: '/home', name: 'Home', component: Home },
  { path: '/shop', name: 'Shop', component: Shop },
  { path: '/activity', name: 'Activity', component: Activity },
  { path: '/commission', name: 'Commission', component: Commission },
  { path: '/wardrobe', name: 'Wardrobe', component: Wardrobe },
  { path: '/wish', name: 'Wish', component: Wish },
  { path: '/card', name: 'Card', component: Card },
  { path: '/log', name: 'Log', component: Log },
  { path: '/settings', name: 'Settings', component: Settings },
  { path: '/chat', name: 'Chat', component: Chat },
  { path: '/data-recovery', name: 'DataRecovery', component: DataRecovery },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
