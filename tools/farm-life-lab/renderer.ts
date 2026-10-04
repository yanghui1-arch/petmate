import '../../src/renderer/assets/style/cursor.scss'

import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'

import zhCN from '../../src/renderer/i18n/locales/zh-CN'
import Farm from '../../src/renderer/views/Farm.vue'
import Controller from './Controller.vue'
import Desktop from './Desktop.vue'
const surface = new URLSearchParams(location.search).get('surface')
document.title =
    surface === 'controller'
        ? '尤美农场 · 验收控制器'
        : surface === 'desktop'
          ? '隔离测试桌宠'
          : '农场 · 隔离验收'
const i18n = createI18n({ legacy: false, locale: 'zh-CN', messages: { 'zh-CN': zhCN } })
const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/farm', component: Farm }]
})
await router.push('/farm')
createApp(surface === 'farm' ? Farm : surface === 'desktop' ? Desktop : Controller)
    .use(i18n)
    .use(router)
    .mount('#app')
