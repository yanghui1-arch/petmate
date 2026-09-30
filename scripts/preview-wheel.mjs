import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../src/renderer', import.meta.url))
const html = `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Petmate Wheel Preview</title>
<style>html,body,#app{height:100%;margin:0}body{background:#e5e8ed;font-family:sans-serif}*{box-sizing:border-box}</style></head>
<body><div id="app"></div><script type="module">
import { createApp, h, ref } from 'vue'
import Wheel from '/components/WheelMenuZhuanpan.vue'
import { i18n } from '/i18n/index.ts'
window.previewActions = []
window.api = {
  openNewWindow: (route) => { window.previewActions.push(route) },
  quitApp: () => { window.previewActions.push('quit') },
  updateSettings: async (settings) => {
    window.previewActions.push(settings.locale)
    return { code: window.previewSaveFails ? 500 : 200 }
  }
}
const wheel = ref()
createApp({ setup: () => () => h(Wheel, { ref: wheel }) }).use(i18n).mount('#app')
window.previewWheel = wheel
window.previewLocale = i18n.global.locale
</script></body></html>`

const server = await createServer({
    configFile: false,
    root,
    plugins: [
        vue(),
        {
            name: 'wheel-preview',
            configureServer(server) {
                server.middlewares.use('/__wheel-preview', async (_request, response) => {
                    response.setHeader('Content-Type', 'text/html; charset=utf-8')
                    response.end(await server.transformIndexHtml('/__wheel-preview', html))
                })
            }
        }
    ],
    resolve: { alias: { '@': root } },
    css: {
        preprocessorOptions: { scss: { additionalData: '@use "@/assets/style/color.scss" as *;' } }
    },
    server: { host: '127.0.0.1', port: 5175, strictPort: true }
})
await server.listen()
console.log('Wheel preview: http://127.0.0.1:5175/__wheel-preview')
