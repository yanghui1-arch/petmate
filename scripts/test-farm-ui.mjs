import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { basename, dirname } from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { compileScript, parse } from 'vue/compiler-sfc'

const require = createRequire(import.meta.url)
const { createRenderer, nextTick } = require('vue')
const { createI18n } = require('vue-i18n')
const { createMemoryHistory, createRouter } = require('vue-router')

// Compile the actual component and mount it with Vue's in-memory host renderer.
// The Phaser host is replaced only at its event boundary. The real scene runs
// separately in test-farm-scene.mjs; the actual Vue page, art and service run here.
const bundled = await build({
    stdin: {
        contents: `export { default as Farm } from './src/renderer/views/Farm.vue';
      export { FarmService } from './src/main/modules/farm/service.ts';
      export { farmEntrances, farmLayout, hitFarm, insidePlot, plantingSlots, plotPosition } from './src/renderer/game/farmSceneModel.ts';
      export { default as zhCN } from './src/renderer/i18n/locales/zh-CN.ts';
      export { default as zhTW } from './src/renderer/i18n/locales/zh-TW.ts';
      export { default as enUS } from './src/renderer/i18n/locales/en-US.ts';`,
        resolveDir: process.cwd()
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    plugins: [
        {
            name: 'farm-ui-test',
            setup(builder) {
                builder.onResolve({ filter: /^(vue|vue-router|vue-i18n)$/ }, (args) => ({
                    path: pathToFileURL(require.resolve(args.path)).href,
                    external: true
                }))
                builder.onLoad({ filter: /\.vue$/ }, async (args) => {
                    if (basename(args.path) === 'FarmScene.vue')
                        return {
                            contents: `import { h, onMounted } from 'vue'; export default { props: ['state'], emits: ['target','ready','hover'],
            setup(props, { emit }) { onMounted(()=>emit('ready')); return () => h('farm-scene', { state: props.state,
              onTarget: (target, right) => emit('target', target, right), onHover: value => emit('hover',value) }) } };`,
                            loader: 'js'
                        }
                    // CSS transitions are verified by the real Electron scene test.
                    const source = (await readFile(args.path, 'utf8'))
                        .replace(
                            '<Transition name="farm-loading">',
                            '<div class="test-transition">'
                        )
                        .replace('</Transition>', '</div>')
                    const { descriptor, errors } = parse(source, { filename: args.path })
                    assert.deepEqual(errors, [], 'the actual component template must parse cleanly')
                    const script = compileScript(descriptor, {
                        id: 'farm-ui-test',
                        inlineTemplate: true
                    })
                    return {
                        contents: script.content,
                        loader: 'ts',
                        resolveDir: dirname(args.path)
                    }
                })
                builder.onLoad({ filter: /\.(png|svg)$/ }, (args) => ({
                    contents: `export default ${JSON.stringify(`/farm-assets/${basename(args.path)}`)}`,
                    loader: 'js'
                }))
            }
        }
    ]
})
const {
    Farm,
    FarmService,
    zhCN,
    zhTW,
    enUS,
    farmEntrances,
    farmLayout,
    hitFarm,
    insidePlot,
    plantingSlots,
    plotPosition
} = await import(
    `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
)

const node = (type, text = '') => ({
    type,
    text,
    props: {},
    children: [],
    parent: null,
    tagName: type.toUpperCase(),
    addEventListener() {},
    removeEventListener() {},
    clientWidth: 1080,
    clientHeight: 720,
    focus() {},
    querySelector() {
        return { focus() {} }
    },
    querySelectorAll() {
        return []
    },
    getBoundingClientRect() {
        return { x: 20, y: 360, width: 78, height: 78 }
    }
})
const detach = (child) => {
    if (child.parent) {
        const siblings = child.parent.children
        siblings.splice(siblings.indexOf(child), 1)
        child.parent = null
    }
}
const renderer = createRenderer({
    createElement: (type) => node(type),
    createText: (text) => node('#text', text),
    createComment: (text) => node('#comment', text),
    setText: (target, text) => {
        target.text = text
    },
    setElementText: (target, text) => {
        for (const child of [...target.children]) detach(child)
        target.text = text
    },
    patchProp: (target, key, _previous, value) => {
        target.props[key] = value
    },
    insert: (child, parent, anchor = null) => {
        detach(child)
        parent.children.splice(
            anchor ? parent.children.indexOf(anchor) : parent.children.length,
            0,
            child
        )
        child.parent = parent
    },
    remove: detach,
    parentNode: (child) => child.parent,
    nextSibling: (child) => child.parent?.children[child.parent.children.indexOf(child) + 1] ?? null
})
const root = node('root')
const walk = (target) => [target, ...target.children.flatMap(walk)]
const textOf = (target) =>
    target.type === '#comment' ? '' : target.text + target.children.map(textOf).join('')
const findClass = (name) =>
    walk(root).filter((target) =>
        String(target.props.class ?? '')
            .split(' ')
            .includes(name)
    )

const scene = () => walk(root).find((n) => n.type === 'farm-scene')
const seeds = () => findClass('seed-option')
const buttons = (n) => walk(n).filter((n) => n.type === 'button')
const button = (n, label) => buttons(n).find((n) => textOf(n).trim() === label)
const modal = () => findClass('modal')[0]
const settle = async () => {
    for (let i = 0; i < 5; i++) {
        await new Promise((r) => setImmediate(r))
        await nextTick()
    }
}
const click = async (n) => {
    assert.ok(n?.props.onClick, 'clickable target')
    if (!n.props.disabled) n.props.onClick({ stopPropagation() {}, preventDefault() {} })
    await settle()
}
const target = async (value, right = false) => {
    scene().props.onTarget(value, right)
    await settle()
}
const plot = (id) => target({ kind: 'plot', id })
const close = async () => click(findClass('close-button')[0])
let now = 1800000000000,
    sequence = 0,
    diskFail = false,
    gate = null,
    notify,
    checkpointed = false,
    unsubscribed = false
let persisted = { farm: null, cash: 500, revision: 0, receipts: [] }
const commands = []
const service = new FarmService(
    {
        read: () => structuredClone(persisted),
        commit: (snapshot) => {
            if (diskFail) throw Error('模拟磁盘保存失败')
            persisted = structuredClone(snapshot)
        }
    },
    { wall: () => now, monotonic: () => now },
    () => 'ui-' + ++sequence,
    () => 0
)
service.getView()
persisted.farm.seeds.carrot = 0
const previousWindow = globalThis.window,
    previousDocument = globalThis.document,
    previousConfirm = globalThis.confirm,
    previousObserver = globalThis.ResizeObserver
const listeners = new Map()
globalThis.document = { hidden: true, activeElement: null }
globalThis.confirm = () => true
globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
}
globalThis.window = {
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name, fn) => {
        if (listeners.get(name) === fn) listeners.delete(name)
    },
    api: {
        getFarm: async () => ({ code: 200, data: service.getView() }),
        executeFarm: async (command) => {
            commands.push(structuredClone(command))
            if (gate) await gate
            return { code: 200, data: service.execute(command) }
        },
        onGameSaveChanged: (fn) => {
            notify = fn
            return () => {
                unsubscribed = true
            }
        },
        checkpointFarm: async () => {
            checkpointed = true
        },
        exportFarmBackup: async () => ({ code: 200 }),
        selectFarmBackup: async () => ({
            code: 200,
            data: {
                token: 'backup-test',
                createdAt: '2026-10-01',
                level: 1,
                cash: 500,
                scope: 'overall',
                automatic: false
            }
        }),
        getAutomaticFarmBackup: async () => ({ code: 200, data: null }),
        restoreFarmBackup: async () => ({ code: 500, message: '模拟恢复失败' })
    }
}
const i18n = createI18n({
    legacy: false,
    locale: 'zh-CN',
    messages: { 'zh-CN': zhCN, 'zh-TW': zhTW, 'en-US': enUS }
})
const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/farm', component: Farm }]
})
const app = renderer.createApp(Farm).use(i18n).use(router)
try {
    await router.push('/farm')
    app.mount(root)
    await settle()
    for (const cls of [
        'topbar',
        'toolbar',
        'sidebar',
        'companion',
        'decoration-card',
        'landscape-fill',
        'coin-plus'
    ])
        assert.equal(findClass(cls).length, 0)
    assert.equal(scene().props.state.view.farm.plots.length, 12)
    for (const [w, h] of [
        [800, 600],
        [1080, 720],
        [1800, 900]
    ]) {
        const layout = farmLayout(w, h)
        assert.ok(layout.x <= 0 && layout.y <= 0)
        assert.ok(layout.x + 1600 * layout.scale >= w && layout.y + 900 * layout.scale >= h)
        layout.plots.forEach((p, id) =>
            assert.deepEqual(hitFarm(layout, p.x, p.y), { kind: 'plot', id })
        )
        for (const [index, entry] of farmEntrances.entries()) {
            const { area } = entry
            assert.deepEqual(
                hitFarm(
                    layout,
                    layout.x + (area.x + area.width / 2) * layout.scale,
                    layout.y + (area.y + area.height / 4) * layout.scale
                ),
                { kind: 'entry', id: entry.id }
            )
            assert.equal(layout.entrances[index].x, layout.x + entry.sign.x * layout.scale)
            assert.equal(layout.entrances[index].y, layout.y + entry.sign.y * layout.scale)
        }
        assert.deepEqual(hitFarm(layout, 0, 0), { kind: 'blank' })
    }
    for (let id = 0; id < 12; id++)
        for (const slot of plantingSlots)
            assert.ok(
                insidePlot(
                    { x: plotPosition(id).x + slot.x, y: plotPosition(id).y + slot.y },
                    plotPosition(id)
                )
            )
    const entranceSave = structuredClone(persisted)
    const signs = () => findClass('entrance-sign')
    assert.equal(signs().length, 4)
    for (const [index, entry] of farmEntrances.entries()) {
        await click(signs()[index])
        assert.equal(findClass('entrance-feedback').length, 1)
        assert.equal(findClass('entrance-feedback')[0].props['data-entry-tip'], entry.id)
        assert.ok(textOf(findClass('entrance-feedback')[0]).includes('暂未开放'))
        await target({ kind: 'entry', id: entry.id })
        assert.equal(
            findClass('entrance-feedback').length,
            1,
            'sign and scene share one feedback card'
        )
    }
    assert.equal(commands.length, 0, 'placeholder entrances never send farm transactions')
    assert.deepEqual(persisted, entranceSave, 'placeholder entrances preserve the complete save')
    await new Promise((r) => setTimeout(r, 2100))
    await settle()
    assert.equal(findClass('entrance-tip').length, 0, 'entry feedback automatically disappears')
    scene().props.onHover({ kind: 'entry', id: 'pasture', x: 0, y: 0 })
    await settle()
    assert.equal(findClass('entrance-tip').length, 0, 'hover waits before showing a hint')
    await new Promise((r) => setTimeout(r, 280))
    await settle()
    assert.equal(findClass('entrance-tip')[0].props.role, 'tooltip')
    scene().props.onHover(null)
    await settle()
    assert.equal(findClass('entrance-tip').length, 0)
    await click(signs()[0])
    await target({ kind: 'blank' }, true)
    assert.equal(findClass('entrance-tip').length, 0, 'right click clears entrance feedback')
    await click(signs()[1])
    listeners.get('keydown')({ key: 'Escape' })
    await settle()
    assert.equal(findClass('entrance-tip').length, 0, 'Escape clears entrance feedback')
    await click(signs()[2])
    await click(findClass('orders-entry')[0])
    assert.equal(findClass('entrance-tip').length, 0)
    await target({ kind: 'entry', id: 'cabin' })
    assert.equal(findClass('entrance-tip').length, 0, 'modal blocks entry activation')
    await close()
    await plot(6)
    assert.equal(seeds().length, 0)
    assert.equal(commands.length, 0)
    await plot(2)
    assert.equal(seeds().length, 6)
    assert.equal(seeds()[1].props.disabled, true)
    assert.equal(scene().props.state.enabled, false, 'picker blocks underlying scene')
    await target({ kind: 'entry', id: 'fishing' })
    assert.equal(findClass('entrance-tip').length, 0, 'seed picker blocks entry activation')
    assert.equal(button(root, '全部浇水'), undefined)
    let release
    gate = new Promise((r) => {
        release = r
    })
    await click(seeds()[0])
    assert.deepEqual(commands[0].operation, { type: 'sow', cropId: 'wheat', plotIds: [2] })
    await plot(3)
    await click(seeds()[0])
    assert.equal(commands.length, 1)
    gate = null
    release()
    await settle()
    assert.equal(persisted.farm.seeds.wheat, 5)
    assert.equal(persisted.farm.tutorialRemaining, 5)
    assert.equal(seeds().length, 0)
    const beforeWater = structuredClone(persisted)
    diskFail = true
    await plot(2)
    assert.deepEqual(persisted, beforeWater, 'failed watering save leaves the crop unchanged')
    assert.equal(findClass('water-drop').length, 0, 'failed watering shows no success animation')
    diskFail = false
    await click(button(root, '重试'))
    gate = new Promise((r) => (release = r))
    await plot(2)
    assert.equal(findClass('water-drop').length, 0, 'water drops wait for the save acknowledgement')
    gate = null
    release()
    await settle()
    assert.equal(persisted.farm.plots[2].plant.watered, true)
    assert.equal(findClass('water-splash').length, 1)
    assert.equal(findClass('water-drop').length, 5)
    const splash = findClass('water-splash')[0]
    const waterRequests = commands.length
    await plot(2)
    assert.equal(commands.length, waterRequests, 'watered crop does not send another transaction')
    assert.equal(
        findClass('water-splash')[0],
        splash,
        'repeat clicking does not replay water drops'
    )
    now += 300000
    notify()
    await settle()
    await plot(2)
    assert.equal(persisted.farm.plots[2].plant, null)
    assert.equal(persisted.farm.produce.wheat, 3)
    await plot(2)
    assert.equal(seeds().length, 6)
    listeners.get('keydown')({ key: 'Escape' })
    await settle()
    assert.equal(seeds().length, 0)
    await click(findClass('orders-entry')[0])
    assert.equal(findClass('order-card').length, 3)
    assert.ok(findClass('order-need').length >= 3)
    await click(button(modal(), '交付'))
    assert.equal(persisted.farm.produce.wheat, 0)
    assert.equal(persisted.cash, 575)
    await close()
    assert.equal(textOf(findClass('store-entry')[0]).includes('575'), false)
    await click(findClass('store-entry')[0])
    assert.equal(textOf(findClass('store-balance')[0]).includes('575'), true)
    assert.equal(findClass('item-card').length, 6)
    await click(button(modal(), '◈ 20 · 购买'))
    assert.equal(textOf(findClass('store-balance')[0]).includes('575'), true)
    await click(button(modal(), '5'))
    await click(findClass('trade-confirm')[0])
    assert.equal(persisted.cash, 475)
    assert.equal(textOf(findClass('store-balance')[0]).includes('475'), true)
    assert.equal(persisted.farm.seeds.wheat, 10)
    assert.equal(findClass('item-card').length, 6)
    await close()
    const before = structuredClone(persisted)
    await plot(0)
    diskFail = true
    await click(seeds()[0])
    assert.deepEqual(persisted, before, 'disk failure cannot consume seed or tutorial allowance')
    assert.ok(findClass('save-error').length)
    assert.equal(scene().props.state.enabled, false)
    await target({ kind: 'entry', id: 'pasture' })
    assert.equal(findClass('entrance-tip').length, 0, 'save failure blocks entry activation')
    diskFail = false
    await click(button(root, '重试'))
    assert.equal(scene().props.state.view.saveError, null)
    await plot(0)
    await target({ kind: 'blank' }, true)
    assert.equal(seeds().length, 0)
    persisted.farm.produce.carrot = 4
    notify()
    await settle()
    await click(findClass('backpack-entry')[0])
    assert.equal(findClass('tabs')[0].children.filter((n) => n.type === 'button').length, 2)
    await click(button(modal(), '作物'))
    await click(button(findClass('item-card')[1], '出售'))
    const beforeWarning = commands.length
    await click(findClass('trade-confirm')[0])
    assert.equal(commands.length, beforeWarning)
    await click(findClass('trade-confirm')[0])
    assert.equal(persisted.farm.produce.carrot, 3)
    await close()
    for (const locale of ['zh-CN', 'zh-TW', 'en-US']) {
        i18n.global.locale.value = locale
        await settle()
        await click(signs()[0])
        assert.ok(
            textOf(findClass('entrance-feedback')[0]).includes(
                i18n.global.t('farm.entrancePreparing', {
                    name: i18n.global.t('farm.entrances.pasture')
                })
            )
        )
        assert.equal(textOf(root).includes('farm.entrances'), false)
        await click(findClass('codex-entry')[0])
        assert.equal(walk(modal()).filter((n) => n.props['data-item']).length, 30)
        assert.equal(textOf(root).includes('farm.'), false)
        await close()
        assert.equal(findClass('settings-button').length, 0)
        assert.equal(findClass('exit-button').length, 1)
        assert.equal(textOf(root).includes('farm.'), false)
    }
    i18n.global.locale.value = 'zh-CN'
    await settle()
    assert.equal(findClass('backup-summary').length, 0)
    assert.equal(textOf(root).includes('备份与恢复'), false)
    persisted.cash = 900
    notify()
    await settle()
    assert.equal(textOf(findClass('store-entry')[0]).includes('900'), false)
    await click(findClass('store-entry')[0])
    assert.equal(textOf(findClass('store-balance')[0]).includes('900'), true)
    await close()
    await new Promise((r) => setTimeout(r, 2100))
    await settle()
    assert.equal(findClass('notice').length, 0)
    assert.equal(findClass('plot-feedback').length, 0)
    assert.equal(findClass('water-drop').length, 0, 'water drops are removed automatically')
    app.unmount()
    await settle()
    assert.equal(listeners.size, 0)
    assert.ok(checkpointed && unsubscribed)
    console.log(
        'Actual Vue + farm service: direct planting/watering/harvest, duplicate blocking, failed-save rollback, real trade/orders, illustrated panels, locales, backup errors and cleanup: passed'
    )
} finally {
    app.unmount()
    globalThis.window = previousWindow
    globalThis.document = previousDocument
    globalThis.confirm = previousConfirm
    globalThis.ResizeObserver = previousObserver
}
