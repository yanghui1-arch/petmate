import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { build } from 'esbuild'

// Test the actual dev window/IPC installer without accessing player saves or Steam.
const windows = [],
    handlers = new Map(),
    shortcuts = new Map()
let id = 0,
    triggers = 0,
    recalls = 0
const edits = []
class Window extends EventEmitter {
    constructor(options = {}) {
        super()
        this.id = ++id
        this.options = options
        this.webContents = { id: this.id * 10, getURL: () => this.url ?? '', openDevTools() {} }
        windows.push(this)
    }
    static getAllWindows() {
        return windows.filter((window) => !window.destroyed)
    }
    isDestroyed() {
        return !!this.destroyed
    }
    loadURL(url) {
        this.url = url
        this.emit('ready-to-show')
        return Promise.resolve()
    }
    loadFile(path, options) {
        this.file = { path, options }
        return Promise.resolve()
    }
    show() {
        this.visible = true
    }
    focus() {
        this.focused = true
    }
    close() {
        this.destroyed = true
        this.emit('closed')
    }
}
const app = Object.assign(new EventEmitter(), { isPackaged: false })
const screen = Object.assign(new EventEmitter(), {
    getCursorScreenPoint: () => ({ x: 0, y: 0 }),
    getDisplayNearestPoint: () => ({ workAreaSize: { width: 1920, height: 1080 } })
})
globalThis.farmDevelopmentTest = {
    is: { dev: false },
    app,
    BrowserWindow: Window,
    screen,
    globalShortcut: {
        register: (key, action) => {
            shortcuts.set(key, action)
            return true
        },
        unregister: (key) => shortcuts.delete(key)
    },
    ipcMain: {
        handle: (key, action) => handlers.set(key, action),
        removeHandler: (key) => handlers.delete(key)
    },
    farmLife: {
        developmentState: () => ({
            life: { enabled: true, visit: null },
            choices: [],
            reason: '',
            daily: null
        }),
        triggerForDevelopment: () => triggers++,
        editForDevelopment: (action) => edits.push(action),
        recall: () => recalls++,
        tick() {}
    }
}
try {
    const bundle = await build({
        stdin: {
            contents: `export { installFarmLifeDevelopmentController, farmLifeDevelopmentShortcut } from './src/main/modules/farm/developmentController';
            export { isDevelopmentWindow } from './src/main/developmentWindows';
            export { registerHelperWindow } from './src/main/helperWindows';
            export { openPageWindow } from './src/main/page-window';`,
            resolveDir: process.cwd()
        },
        bundle: true,
        platform: 'node',
        format: 'esm',
        write: false,
        define: { __dirname: JSON.stringify(process.cwd() + '/out/main') },
        plugins: [
            {
                name: 'isolated-live-controller',
                setup(builder) {
                    builder.onLoad({ filter: /startupDiagnostics\.ts$/ }, () => ({
                        contents: 'export function observeWindowStartup() {}', loader: 'js'
                    }))
                    builder.onResolve(
                        { filter: /^(electron|@electron-toolkit\/utils)$|\/runtime$|\/log$/ },
                        (args) => ({ path: args.path, namespace: 'mock' })
                    )
                    builder.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
                        contents:
                            args.path === 'electron'
                                ? 'export const {app,BrowserWindow,screen,globalShortcut,ipcMain}=globalThis.farmDevelopmentTest'
                                : args.path === '@electron-toolkit/utils'
                                  ? 'export const is=globalThis.farmDevelopmentTest.is'
                                  : args.path.endsWith('/runtime')
                                    ? 'export const farmLife=globalThis.farmDevelopmentTest.farmLife; export const registerFarmWindow=()=>{}'
                                    : 'export default {info(){},error(){}}',
                        loader: 'js'
                    }))
                }
            }
        ]
    })
    const {
        installFarmLifeDevelopmentController: install,
        farmLifeDevelopmentShortcut: shortcut,
        isDevelopmentWindow,
        registerHelperWindow,
        openPageWindow
    } = await import(
        'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')
    )
    const pet = new Window()
    install(() => pet, '/actual/preload.js')
    assert.equal(handlers.size, 0, 'non-development startup exposes no IPC or shortcut')
    globalThis.farmDevelopmentTest.is.dev = true
    app.isPackaged = true
    install(() => pet, '/actual/preload.js')
    assert.equal(handlers.size, 0, 'packaged startup cannot install the controller')
    app.isPackaged = false
    install(() => pet, '/actual/preload.js')
    assert.equal(shortcuts.has(shortcut), true)
    assert.equal(windows.length, 1, 'install does not automatically open a window')
    shortcuts.get(shortcut)()
    const control = windows.at(-1)
    assert.equal(
        control.options.webPreferences.preload,
        '/actual/preload.js',
        'use main entry preload path even if this module is in a chunk'
    )
    assert.ok(control.url.endsWith('/#/farm-life-controller'))
    assert.equal(isDevelopmentWindow(control.id), true)
    shortcuts.get(shortcut)()
    assert.equal(windows.length, 2, 'shortcut focuses the existing controller')
    const get = handlers.get('farm-life-development-get')
    const command = handlers.get('farm-life-development-command')
    assert.equal(get({ sender: pet.webContents }).code, 400)
    assert.equal(command({ sender: pet.webContents }, 'trigger', 'water').code, 400)
    assert.equal(triggers, 0)
    assert.equal(command({ sender: pet.webContents }, 'addCoins').code, 400)
    assert.deepEqual(edits, [])
    const sender = { sender: control.webContents }
    assert.equal(get(sender).code, 200)
    assert.equal(command(sender, 'trigger', '__proto__').code, 400)
    assert.equal(command(sender, 'unknown', 'water').code, 400)
    assert.equal(command(sender, '__proto__').code, 400)
    for (const action of ['clearCrops', 'addCoins', 'matureCrops', 'resetQuota'])
        assert.equal(command(sender, action).code, 200)
    assert.deepEqual(edits, ['clearCrops', 'addCoins', 'matureCrops', 'resetQuota'])
    assert.equal(command(sender, 'trigger', 'water').code, 200)
    assert.equal(triggers, 1)
    assert.equal(windows.length, 2, 'trigger dispatch never opens the farm automatically')
    assert.equal(command(sender, 'recall').code, 200)
    assert.equal(recalls, 1)
    assert.equal(openPageWindow(pet, '/farm').code, 200)
    const farm = windows.at(-1)
    const helper = new Window()
    registerHelperWindow(helper)
    assert.equal(control.isDestroyed(), false, 'farm entry cannot close the control window')
    assert.equal(openPageWindow(pet, '/home').code, 200)
    assert.equal(farm.isDestroyed(), true, 'normal single-page policy remains')
    assert.equal(control.isDestroyed(), false, 'home entry cannot close the control window')
    assert.equal(helper.isDestroyed(), false, 'normal pages cannot close the speech helper')
    assert.equal(pet.isDestroyed(), false)
    app.isPackaged = true
    assert.equal(command(sender, 'addCoins').code, 400)
    assert.equal(edits.length, 4, 'packaged gate prevents currency edits too')
    assert.equal(
        command(sender, 'trigger', 'water').code,
        400,
        'gate every request, not only installation'
    )
    app.isPackaged = false
    control.close()
    assert.equal(isDevelopmentWindow(control.id), false)
    shortcuts.get(shortcut)()
    assert.notEqual(windows.at(-1).id, control.id, 'closed controller can be reopened')
    app.emit('before-quit')
    assert.equal(handlers.size, 0)
    assert.equal(shortcuts.size, 0)
    console.log(
        'Live controller: dev/packaged gates, real IPC dispatch, sender validation, correct preload, manual entry, page coexistence, reopening and cleanup: passed'
    )
} finally {
    delete globalThis.farmDevelopmentTest
}
