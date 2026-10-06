import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { spawn } from 'node:child_process'
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
      export { default as Petmate } from './src/renderer/views/Petmate.vue';
      export { default as FarmLifeController } from './src/renderer/views/FarmLifeController.vue';
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
                    if (basename(args.path) === 'WheelMenu.vue')
                        return { contents: 'export default { render: () => null }', loader: 'js' }
                    if (basename(args.path) === 'FarmDeparture.vue')
                        return {
                            contents: `import { h } from 'vue'; export default { emits:['switched'],
                                setup(_, {emit}) { return ()=>h('farm-departure-test',{onSwitched:()=>emit('switched')}) } };`,
                            loader: 'js'
                        }
                    if (basename(args.path) === 'FarmDepartureShift.vue')
                        return {
                            contents: `import { h } from 'vue'; export default { props:['id'], emits:['opacity','covered','done'],
                                setup(props, {emit}) { return ()=>h('farm-shift-test',{id:props.id,
                                    onOpacity:value=>emit('opacity',value),onCovered:()=>emit('covered'),onDone:ok=>emit('done',ok)}) } };`,
                            loader: 'js'
                        }
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
                builder.onLoad({ filter: /usePetmateModel\.ts$/ }, () => ({
                    contents: `import { ref } from 'vue';
                    export const isShowContextMenu=ref(false);
                    export const usePetmateModel=()=>({
                        init2D:async()=>{}, playIdle(){}, setAngry(){}, setEnergyLow(){},
                        setActivity(){}, sleepResponseTick:globalThis.petUiSleep??ref(0), speechAnchor:ref({x:150,y:10}), destroy(){}
                    });`,
                    loader: 'js'
                }))
                builder.onLoad({ filter: /usePlayer\.ts$/ }, () => ({
                    contents: `import { ref } from 'vue';
                    export const usePlayer=()=>({
                        playerData:globalThis.petUiPlayer??ref(null),initPlayerData:async()=>{},refreshPlayerData:async()=>{},
                        subscribeToPlayerDataSync:()=>()=>{}
                    });`,
                    loader: 'js'
                }))
            }
        }
    ]
})
const {
    Farm,
    Petmate,
    FarmLifeController,
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
    style: { display: '' },
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
globalThis.document = { hidden: true, activeElement: null, addEventListener() {}, removeEventListener() {} }
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
    assert.equal(findClass('assistant-status').length, 0, 'order panel hides all assistant status')
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
    const beforeSale = commands.length
    const beforeSaleCash = persisted.cash
    assert.ok(
        persisted.farm.orders.some(
            (order) =>
                'templateId' in order &&
                service
                    .getView()
                    .catalog.orders.find((definition) => definition.id === order.templateId)
                    .requirements.carrot
        ),
        'selling crop is needed by a current order'
    )
    assert.equal(textOf(modal()).includes('当前订单需要'), false)
    await click(findClass('trade-confirm')[0])
    assert.equal(commands.length, beforeSale + 1, 'one confirmation submits sale for an order crop')
    assert.deepEqual(commands.at(-1).operation, { type: 'sell', cropId: 'carrot', count: 1 })
    assert.equal(persisted.farm.produce.carrot, 3)
    assert.equal(
        persisted.cash,
        beforeSaleCash + service.getView().catalog.crops.find((crop) => crop.id === 'carrot').sell
    )
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
        await click(findClass('achievements-tab')[0])
        assert.equal(walk(modal()).filter(n => n.props['data-achievement']).length, 12)
        assert.equal(findClass('achievement-art').length, 12, 'each achievement has its Steam artwork')
        for (const card of walk(modal()).filter(n => n.props['data-achievement'])) {
            const image = walk(card).find(n => n.type === 'img')
            const state = String(card.props.class).split(' ').includes('unlocked') ? 'unlocked' : 'locked'
            assert.equal(image.props.src, '/farm-assets/' + card.props['data-achievement'] + '_' + state + '.png')
        }
        assert.ok(textOf(modal()).includes(i18n.global.t('farm.achievementNames.harvest1')))
        if (locale === 'en-US') assert.ok(textOf(modal()).includes('First Basket'))
        assert.equal(walk(modal()).filter(n => n.props.role === 'progressbar').length, 12)
        assert.equal(textOf(modal()).includes('放心交给我'), false, 'collaboration achievements are excluded')
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
    let receiveLife, receiveShift, receiveSpeech, interactions = 0, releasePage
    const finishedSpeech = []
    const speechUpdates = []
    globalThis.petUiSleep = require('vue').ref(0)
    globalThis.petUiPlayer = require('vue').ref(null)
    document.hidden = false
    const routes = []
    const away = { enabled: true, visit: { id: 'away-card-test', phase: 'visiting' } }
    Object.assign(window.api, {
        updatePetSpeech: message => speechUpdates.push(structuredClone(message)),
        onFarmLifeState: callback => { receiveLife = callback; return () => {} },
        onFarmLifeSpeech: callback => { receiveSpeech = callback; return () => {} },
        onFarmDepartureShift: callback => { receiveShift = callback; return () => {} },
        finishFarmLifeSpeech: id => finishedSpeech.push(id),
        getFarmLife: async () => ({ code: 200, data: away }),
        onActivityFinished() {},
        farmLifeInteraction: () => interactions++,
        openNewWindow: async route => {
            routes.push(route)
            if (route === '/farm') await new Promise(resolve => { releasePage = resolve })
            return { code: 200 }
        }
    })
    const petApp = renderer.createApp(Petmate).use(i18n)
    const paintCases = []
    try {
        petApp.mount(root)
        await settle()
        assert.equal(findClass('away-card').length, 1)
        const modelLayer = findClass('petmate-canvas-container')[0]
        const visibleCanvas = node('canvas')
        visibleCanvas.style.visibility = 'visible'
        visibleCanvas.parent = modelLayer
        modelLayer.children.push(visibleCanvas)
        assert.equal(modelLayer.props.style.display, 'none', 'the entire model layer must be removed from painting, even with visible descendants')
        paintCases.push({ phase: 'visiting', style: { ...modelLayer.props.style }, visible: false })
        assert.equal(buttons(findClass('away-card')[0]).length, 2)
        assert.equal(walk(findClass('away-card')[0]).filter(n => n.type === 'p').length, 0)
        const pointer = { stopPropagation() {}, preventDefault() {} }
        findClass('petmate-container')[0].props.onPointerdownCapture(pointer)
        findClass('away-card-host')[0].props.onPointerdown(pointer)
        await click(findClass('away-card-farm')[0])
        assert.equal(findClass('away-card-home')[0].props.disabled, true)
        await click(findClass('away-card-home')[0])
        assert.deepEqual(routes, ['/farm'], 'pending opening prevents duplicate page requests')
        releasePage()
        await settle()
        await click(findClass('away-card-home')[0])
        assert.deepEqual(routes, ['/farm', '/home'])
        assert.equal(interactions, 0, 'card pointer capture and both buttons must not recall Youmei')
        receiveLife({ ...away, visit: { ...away.visit, phase: 'exiting' } })
        await settle()
        assert.equal(findClass('away-card').length, 1, 'entry stays during farm exit')
        visibleCanvas.style.visibility = 'visible' // The real renderScene does this every frame.
        assert.equal(modelLayer.props.style.display, 'none', 'exit cannot expose an explicitly visible child canvas')
        paintCases.push({ phase: 'exiting', style: { ...modelLayer.props.style }, visible: false })
        for (const locale of ['zh-CN', 'zh-TW', 'en-US']) {
            i18n.global.locale.value = locale
            await settle()
            assert.equal(textOf(root).includes('farmLife.'), false)
            assert.equal(textOf(root).includes('wheel.'), false)
        }
        receiveLife({ ...away, visit: { ...away.visit, phase: 'returning' } })
        await settle()
        assert.equal(findClass('away-card').length, 0, 'return removes entry')
        assert.equal(findClass('petmate-canvas-container')[0], modelLayer, 'keep the initialized model mounted throughout the trip')
        assert.equal(modelLayer.props.style.display, 'block', 'return restores the model layer')
        paintCases.push({ phase: 'returning', style: { ...modelLayer.props.style }, visible: true })
        receiveLife({ enabled: true, visit: null })
        await settle()
        assert.equal(modelLayer.props.style.display, 'block', 'idle keeps the model visible')
        receiveLife({ ...away, visit: { ...away.visit, phase: 'preparing' } })
        await settle()
        assert.equal(modelLayer.props.style.display, 'block', 'departure dialogue shows the original model')
        receiveShift({id:'stale'})
        await settle()
        assert.equal(walk(root).filter(n=>n.type==='farm-shift-test').length,0,'ignore stale relocation request')
        receiveShift({id:away.visit.id})
        await settle()
        let shift = walk(root).find(n=>n.type==='farm-shift-test')
        assert.ok(shift)
        shift.props.onOpacity(.5)
        await settle()
        assert.equal(modelLayer.props.style.opacity,.5,'fade affects the whole current model')
        assert.equal(modelLayer.props.style.display,'block','model stays mounted and visible during fade')
        shift.props.onOpacity(0)
        shift.props.onCovered()
        await settle()
        assert.equal(modelLayer.props.style.display,'none','completed fade removes the entire original model before native relocation')
        paintCases.push({phase:'teleport-covered',style:{...modelLayer.props.style},visible:false})
        assert.equal(finishedSpeech.length,0,'costume and video must wait for fade and relocation')
        shift.props.onDone(true)
        await settle()
        assert.deepEqual(finishedSpeech,[away.visit.id])
        assert.equal(walk(root).filter(n=>n.type==='farm-shift-test').length,0)
        assert.equal(modelLayer.props.style.display,'none','new position must never show the previous outfit')
        receiveLife({ ...away, visit: { ...away.visit, phase: 'leaving' } })
        await settle()
        assert.equal(modelLayer.props.style.display,'none','scan at relocated position only reveals workwear')
        paintCases.push({phase:'relocated-scan',style:{...modelLayer.props.style},visible:false})
        receiveLife({ ...away, visit: { ...away.visit, phase: 'returning' } })
        await settle()
        assert.equal(modelLayer.props.style.display,'block')
        assert.equal(modelLayer.props.style.opacity,1,'return restores full opacity')
        receiveLife({ ...away, visit: { ...away.visit, phase: 'preparing' } })
        await settle()
        receiveShift({id:away.visit.id})
        await settle()
        shift=walk(root).find(n=>n.type==='farm-shift-test')
        shift.props.onCovered()
        await settle()
        receiveLife({enabled:true,visit:null})
        await settle()
        shift.props.onDone(true)
        assert.equal(modelLayer.props.style.display,'block','cancelling a covered trip restores model immediately')
        assert.equal(modelLayer.props.style.opacity,1,'cancel restores full opacity')
        assert.deepEqual(finishedSpeech,[away.visit.id],'cancelled fade cannot start a late departure')
        receiveLife({ ...away, visit: { ...away.visit, phase: 'leaving' } })
        await settle()
        assert.equal(modelLayer.props.style.display, 'block', 'scan still shows the clipped original costume before switching')
        paintCases.push({ phase: 'leaving-scan', style: { ...modelLayer.props.style }, visible: true })
        walk(root).find(n => n.type === 'farm-departure-test').props.onSwitched()
        await settle()
        assert.equal(modelLayer.props.style.display, 'none', 'completed outfit change hides the original model behind the departure video')
        paintCases.push({ phase: 'leaving-switched', style: { ...modelLayer.props.style }, visible: false })
        receiveLife({ enabled: true, visit: null })
        await settle()
        findClass('petmate-container')[0].props.onPointerdownCapture(pointer)
        assert.equal(interactions, 1, 'normal pet interactions still work after return')
        receiveLife({ ...away, visit: { ...away.visit, phase: 'preparing' } })
        receiveSpeech({ stage: 'start', event: { id: away.visit.id, kind: 'water', line: 0, plots: 1 } })
        await settle()
        const initialSpeech = speechUpdates.at(-1)
        assert.equal(initialSpeech.key, 'life')
        assert.equal(initialSpeech.text, i18n.global.t('farmLife.start.water.0', { count: 1 }))
        // settle() may span a typing tick on a busy machine; validate the prefix
        // without assuming that no real interval has elapsed.
        assert.ok(initialSpeech.text.startsWith(initialSpeech.visibleText))
        assert.deepEqual(initialSpeech.anchor, { x: 150, y: 10 })
        await new Promise(done => setTimeout(done, 200))
        await settle()
        assert.equal(speechUpdates.at(-1).id, initialSpeech.id, 'typing keeps the message identity and full-text reserve')
        assert.ok(speechUpdates.at(-1).visibleText.length > 0)
        assert.equal(findClass('pet-dialog').length, 0, 'all speech renders outside the model window')
        receiveLife({ ...away, visit: { ...away.visit, phase: 'leaving' } })
        await settle()
        assert.equal(speechUpdates.at(-1), null, 'outfit scan clears the independent speech window')
        receiveLife({ enabled: true, visit: null })
        globalThis.petUiPlayer.value = { petmates: [{ attrs: { hungry: 0, maxHungry: 100, emotion: 100, maxEmotion: 100, energy: 100, maxEnergy: 100 }, status: { status: 'idle' } }] }
        await settle()
        assert.equal(speechUpdates.at(-1).key, 'hungry', 'hunger uses the same speech window')
        receiveSpeech({ stage: 'return', event: { id: 'blocked-return', kind: 'water', line: 0, plots: 1 } })
        await settle()
        assert.equal(speechUpdates.at(-1).key, 'hungry', 'hunger prevents farm speech from replacing it')
        globalThis.petUiSleep.value++
        await new Promise(done => setTimeout(done, 150))
        await settle()
        assert.equal(speechUpdates.at(-1).key, 'sleep', 'sleep has priority through the same rendering path')
        console.log('Actual desktop Vue: away entry, farm/home routes, duplicate prevention, no recall, exit/return and three locales: passed')
        console.log('Actual desktop speech: complete text, stable typing identity, farm/hunger/sleep priority, no inline bubble, clearing on departure and unmount: passed')
    } finally {
        petApp.unmount()
        assert.equal(speechUpdates.at(-1), null, 'unmount clears the auxiliary window')
        delete globalThis.petUiSleep
        delete globalThis.petUiPlayer
        document.hidden = true
    }
    if (process.argv.includes('--paint')) {
        // Feed the actual Vue style bindings above into Chromium. Reproduce the
        // model hook's explicitly visible child canvas and test rendered pixels.
        const prefix = join(tmpdir(), 'petmate-model-visibility-')
        const directory = await mkdtemp(prefix)
        try {
            const source = await readFile('src/renderer/views/Petmate.vue', 'utf8')
            const css = parse(source).descriptor.styles.map(style => style.content).join('\n')
            const main = join(directory, 'main.cjs')
            await writeFile(main, `
                const assert=require('node:assert/strict');
                const {app,BrowserWindow}=require('electron');
                app.whenReady().then(async()=>{
                    const win=new BrowserWindow({width:288,height:132,useContentSize:true,show:false,
                        frame:false,transparent:true,webPreferences:{offscreen:true}});
                    try {
                        await win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(
                            '<html><head><style>html,body{margin:0;background:transparent}'+${JSON.stringify(css)}+
                            '</style></head><body><div class="petmate-canvas-container"><canvas width="300" height="300" style="visibility:visible;position:absolute;inset:0"></canvas></div></body></html>'
                        ));
                        for(const test of ${JSON.stringify(paintCases)}) {
                            const visible=await win.webContents.executeJavaScript('('+((test)=>{
                                const layer=document.querySelector('.petmate-canvas-container');
                                Object.assign(layer.style,test.style);
                                const canvas=layer.querySelector('canvas');
                                canvas.style.visibility='visible';
                                const ctx=canvas.getContext('2d');ctx.fillStyle='#ff0080';ctx.fillRect(0,0,300,300);
                                return canvas.checkVisibility({checkVisibilityCSS:true});
                            }).toString()+')('+JSON.stringify(test)+')');
                            assert.equal(visible,test.visible,test.phase+': child visibility must obey the model layer');
                            await new Promise(done=>setTimeout(done,100));
                            const bitmap=(await win.webContents.capturePage()).toBitmap();
                            assert.ok(bitmap.length>0);
                            assert.equal(bitmap[bitmap.length-1],test.visible?255:0,test.phase+': actual bottom pixel alpha');
                        }
                        console.log('Electron paint: explicitly visible child canvas stays transparent while away and renders on return/scan: passed');
                    } finally {win.destroy()}
                    app.exit(0);
                }).catch(error=>{console.error(error);app.exit(1)});
            `)
            const env = { ...process.env }
            delete env.ELECTRON_RUN_AS_NODE
            const child = spawn(require('electron'), [main], { env, stdio: 'inherit', windowsHide: true })
            const code = await new Promise((done, reject) => { child.once('exit', done); child.once('error', reject) })
            assert.equal(code, 0, 'Electron model visibility regression')
        } finally {
            if (!resolve(directory).startsWith(resolve(prefix))) throw Error('Unexpected test directory')
            await rm(directory, { recursive: true, force: true })
        }
    }
    const live = { life: { enabled: true, visit: null }, reason: '', choices: [{ kind: 'water', plotIds: [0, 1] }], daily: { trips: 0, work: 0, life: 0, watered: 0, harvested: 0 }, resources: { cash: 50, planted: 2 }, setupReason: '' }
    const devCommands = []
    const priorRoutes = routes.length
    Object.assign(window.api, {
        getFarmLifeDevelopment: async () => ({ code: 200, data: structuredClone(live) }),
        commandFarmLifeDevelopment: async (action, kind) => {
            devCommands.push([action, kind])
            if (action === 'addCoins') live.resources.cash += 1000
            else if (action === 'clearCrops') live.resources.planted = 0
            if (action === 'resetQuota') live.daily = { trips: 0, work: 0, life: 0, watered: 0, harvested: 0 }
            if (['addCoins', 'clearCrops', 'matureCrops', 'resetQuota'].includes(action))
                return { code: 200, data: structuredClone(live) }
            live.life.visit = { id: 'live-test', kind: 'water', phase: 'preparing', committed: false }
            live.setupReason = '尤美正在出行'
            live.choices = []
            live.reason = '已有出行'
            return { code: 200, data: structuredClone(live) }
        }
    })
    const liveApp = renderer.createApp(FarmLifeController)
    try {
        liveApp.mount(root)
        await settle()
        const water = walk(root).find(n => n.props['data-life-event'] === 'water')
        const harvest = walk(root).find(n => n.props['data-life-event'] === 'harvest')
        assert.equal(water.props.disabled, false)
        assert.equal(harvest.props.disabled, true)
        for (const action of ['addCoins', 'matureCrops', 'clearCrops', 'resetQuota']) {
            const target = walk(root).find(n => n.props['data-farm-action'] === action)
            assert.equal(target.props.disabled, false)
            await click(target)
            assert.deepEqual(devCommands.at(-1), [action, undefined])
        }
        assert.ok(textOf(root).includes('金币 1050'))
        assert.ok(textOf(root).includes('已种植 0 块'))
        devCommands.length = 0
        await click(water)
        assert.deepEqual(devCommands, [['trigger', 'water']], 'actual controller button calls the live IPC')
        assert.equal(routes.length, priorRoutes, 'controller cannot automatically open the farm')
        assert.ok(textOf(root).includes('出发气泡'))
        assert.ok(textOf(root).includes('尚未提交工作'))
        for (const action of ['matureCrops', 'clearCrops', 'resetQuota'])
            assert.equal(walk(root).find(n => n.props['data-farm-action'] === action).props.disabled, true)
        assert.equal(walk(root).find(n => n.props['data-farm-action'] === 'addCoins').props.disabled, false)
        await click(button(root, '召回尤美'))
        assert.deepEqual(devCommands.at(-1), ['recall', undefined])
        console.log('Actual live controller Vue: real command dispatch, qualification display, phase and recall, no automatic farm opening: passed')
    } finally { liveApp.unmount() }
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
