import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { build } from 'esbuild'
import { createServer } from 'vite'

const require = createRequire(import.meta.url)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const directory = await mkdtemp(join(tmpdir(), 'petmate-farm-life-lab-'))
let server,
    child,
    closing = false
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child?.kill())
async function cleanup() {
    if (closing) return
    closing = true
    await server?.close()
    // One shell/runtime end-to-end; only our verified temporary directory can be deleted.
    if (
        dirname(resolve(directory)) === resolve(tmpdir()) &&
        basename(directory).startsWith('petmate-farm-life-lab-')
    )
        await rm(directory, { recursive: true, force: true, maxRetries: 6, retryDelay: 300 })
}
try {
    const common = {
        bundle: true,
        platform: 'node',
        format: 'cjs',
        external: ['electron'],
        logLevel: 'warning'
    }
    await build({
        ...common,
        entryPoints: [join(root, 'tools/farm-life-lab/main.ts')],
        outfile: join(directory, 'main.cjs')
    })
    await build({
        ...common,
        entryPoints: [join(root, 'tools/farm-life-lab/preload.ts')],
        outfile: join(directory, 'preload.cjs')
    })
    server = await createServer({
        configFile: false,
        root: join(root, 'tools/farm-life-lab'),
        plugins: [vue()],
        resolve: { alias: { '@': join(root, 'src/renderer') } },
        server: { host: '127.0.0.1', port: 0, fs: { allow: [root] } },
        // Match production: Phaser's SVG loader expects file URLs, not Vite's percent data URIs.
        build: { assetsInlineLimit: 0 },
        // Prebundle the deferred scene dependency before windows mount; avoid an HMR reload mid-visit.
        optimizeDeps: { include: ['phaser'] },
        cacheDir: join(directory, 'vite-cache'),
        define: { __VUE_PROD_DEVTOOLS__: 'false' },
        clearScreen: false
    })
    await server.listen()
    const address = server.httpServer.address()
    const url = `http://127.0.0.1:${address.port}/`
    const env = { ...process.env }
    delete env.ELECTRON_RUN_AS_NODE
    if (process.argv.includes('--smoke')) env.FARM_LAB_SMOKE = '1'
    env.FARM_LAB_EVIDENCE = join(root, 'spec/008-farm-pet-life/verification')
    console.log('启动独立农场验收控制器；不读取玩家存档，不连接 Steam。')
    console.log('关闭控制器即可退出。测试存档：' + join(directory, 'farm-lab.json'))
    child = spawn(require('electron'), [join(directory, 'main.cjs'), directory, url], {
        cwd: root,
        env,
        stdio: 'inherit',
        // Electron is the requested interactive app. Hiding its startup hides the first controller window.
        windowsHide: false
    })
    const code = await new Promise((done, reject) => {
        child.once('error', reject)
        child.once('exit', done)
    })
    if (process.argv.includes('--smoke')) {
        const report = JSON.parse(await readFile(join(directory, 'smoke-result.json'), 'utf8'))
        if (!report.ok) throw Error(report.message)
        console.log('PASS Electron 验收控制器：' + report.checks.join('；'))
    }
    process.exitCode = code ?? 1
} catch (error) {
    console.error(error)
    process.exitCode = 1
} finally {
    await cleanup()
}
