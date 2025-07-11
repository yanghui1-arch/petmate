import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import 'animate.css'
import './assets/style/global.scss'
import './assets/style/fonts.scss'
createApp(App)
    .use(router)
    .mount('#app')
