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
      export { assertPlacement } from './src/main/modules/farm/rules.ts';
      export { farmLayout, cellRect, hitFarm, placementAllowed } from './src/renderer/game/farmSceneModel.ts';
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
                            contents: `import { h } from 'vue'; export default { props: ['state'], emits: ['target'],
            setup(props, { emit }) { return () => h('farm-scene', { state: props.state,
              onTarget: (target, right) => emit('target', target, right) }) } };`,
                            loader: 'js'
                        }
                    const source = await readFile(args.path, 'utf8')
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
                builder.onLoad({ filter: /\.png$/ }, (args) => ({
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
    assertPlacement,
    farmLayout,
    cellRect,
    hitFarm,
    placementAllowed
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
    removeEventListener() {}
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
const seeds = () => findClass('seed-option')
const scene = () => walk(root).find((target) => target.type === 'farm-scene')
const tool = () => scene().props.state.tool
const settle = async () => {
    for (let index = 0; index < 4; index++) {
        await new Promise((resolve) => setImmediate(resolve))
        await nextTick()
    }
}
const click = async (target) => {
    assert.ok(target?.props.onClick, 'expected clickable element')
    if (target.props.disabled) return
    target.props.onClick({ stopPropagation() {}, preventDefault() {}, target })
    await settle()
}
const target = async (value, right = false) => {
    scene().props.onTarget(value, right)
    await settle()
}
const plot = (id) => target({ kind: 'plot', id })
const buttons = (within) => walk(within).filter((item) => item.type === 'button')
const button = (within, label) => buttons(within).find((item) => textOf(item).trim() === label)
const toolbar = (label) => button(findClass('toolbar')[0], label)
const modal = () => findClass('modal')[0]
const close = async () => click(button(modal(), '×'))
const top = (label) => buttons(findClass('topbar')[0]).find((item) => textOf(item).trim() === label)
const art = (within) => walk(within).filter((item) => item.props['data-item'])

let now = 1_800_000_000_000
let sequence = 0
let persisted = { farm: null, cash: 500, revision: 0, receipts: [] }
let diskFail = false
const service = new FarmService(
    {
        read: () => structuredClone(persisted),
        commit: (snapshot) => {
            if (diskFail) throw new Error('模拟磁盘保存失败')
            persisted = structuredClone(snapshot)
        }
    },
    { wall: () => now, monotonic: () => now },
    () => `ui-${++sequence}`,
    () => 0
)
service.getView()
persisted.farm.seeds.carrot = 0
persisted.farm.decorations.barrel = 2
const fixture = service.getView()
fixture.level = 4
fixture.farm.exp = 420
fixture.farm.decorations = { barrel: 5, bench: 5 }
fixture.farm.placed = [
    { instanceId: 'fixture-barrel', decorationId: 'barrel', region: 'bottom', x: 2, y: 0 },
    { instanceId: 'fixture-bench', decorationId: 'bench', region: 'right', x: 0, y: 1 }
]
for (const [width, height] of [
    [760, 549],
    [560, 419],
    [1280, 720]
]) {
    const layout = farmLayout(width, height)
    for (const [id, rect] of layout.plots.entries()) {
        assert.deepEqual(
            hitFarm(layout, fixture, rect.x + rect.width / 2, rect.y + rect.height / 2),
            { kind: 'plot', id }
        )
    }
    for (const region of ['left', 'right', 'bottom']) {
        for (let y = 0; y < (region === 'bottom' ? 1 : 4); y++) {
            for (let x = 0; x < (region === 'bottom' ? 8 : 2); x++) {
                const cell = { region, x, y }
                const rect = cellRect(layout, cell)
                assert.deepEqual(
                    hitFarm(
                        layout,
                        fixture,
                        rect.x + rect.width / 2,
                        rect.y + rect.height / 2,
                        true
                    ),
                    { kind: 'cell', cell }
                )
                for (const decorationId of ['barrel', 'bench']) {
                    const instanceId = decorationId === 'bench' ? 'fixture-bench' : 'new-instance'
                    let allowed = true
                    try {
                        assertPlacement(fixture.farm, { instanceId, decorationId, ...cell })
                    } catch {
                        allowed = false
                    }
                    const current =
                        decorationId === 'bench'
                            ? { kind: 'move', decorationId, instanceId }
                            : { kind: 'place', decorationId }
                    assert.equal(
                        placementAllowed(fixture, current, cell),
                        allowed,
                        'visual occupancy must agree with authoritative rules'
                    )
                }
            }
        }
    }
    assert.deepEqual(hitFarm(layout, fixture, width, height), { kind: 'blank' })
}
const commands = []
const previews = []
let notify
let gate = null
let fail = false
let unsubscribed = false
let checkpointed = false
const listeners = new Map()
const previousWindow = globalThis.window
const previousDocument = globalThis.document
const previousConfirm = globalThis.confirm
globalThis.confirm = () => true
globalThis.document = { hidden: true }
globalThis.window = {
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name, fn) => {
        if (listeners.get(name) === fn) listeners.delete(name)
    },
    api: {
        getFarm: async () => ({ code: 200, data: service.getView() }),
        previewFarm: async (operation) => {
            previews.push(structuredClone(operation))
            return { code: 200, data: service.preview(operation) }
        },
        executeFarm: async (command) => {
            commands.push(structuredClone(command))
            if (gate) await gate
            if (fail) return { code: 500, message: '模拟提交失败' }
            return { code: 200, data: service.execute(command) }
        },
        onGameSaveChanged: (callback) => {
            notify = callback
            return () => {
                unsubscribed = true
            }
        },
        checkpointFarm: async () => {
            checkpointed = true
        }
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
    assert.equal(scene().props.state.view.farm.plots.length, 12)
    assert.equal(buttons(findClass('toolbar')[0]).length, 6)
    assert.equal(toolbar('种子'), undefined)
    assert.equal(toolbar('商店'), undefined)
    assert.equal(findClass('sidebar').length, 0, 'the drawer starts closed')
    await click(toolbar('农场订单'))
    assert.equal(findClass('order-card').length, 3)
    await click(findClass('drawer-close')[0])
    assert.equal(findClass('sidebar').length, 0)
    await plot(0)
    assert.equal(seeds().length, 6, 'viewing an empty plot opens the seed drawer')
    await target({ kind: 'blank' })
    assert.equal(findClass('sidebar').length, 0, 'clicking the scene outside the drawer closes it')
    await plot(0)
    listeners.get('keydown')({ key: 'Escape' })
    await settle()
    assert.equal(findClass('sidebar').length, 0)
    await click(toolbar('浇水'))
    assert.equal(tool().kind, 'water', 'water can be equipped even when every plot is empty')
    assert.equal(commands.length, 0)
    assert.equal(findClass('notice').length, 0)
    assert.equal(findClass('tool-status').length, 0, 'watering has no operation instruction bar')
    assert.equal(button(root, '全部浇水'), undefined)
    await click(toolbar('浇水'))
    await click(top('仓库'))
    assert.equal(art(modal()).length, 6, 'all six seed cards have real art')
    assert.equal(button(modal(), '批量种'), undefined)
    assert.match(textOf(modal()), /5 分钟/)
    assert.match(textOf(modal()), /教学剩余 6 次/)
    const initial = structuredClone(persisted)
    await click(button(modal(), '播种'))
    assert.equal(tool().kind, 'sow')
    assert.equal(findClass('tool-status').length, 0, 'sowing has no operation instruction bar')
    assert.equal(findClass('sidebar').length, 0)
    assert.equal(findClass('overlay').length, 0)
    assert.equal(commands.length, 0, 'equipping a seed without selected land sends no IPC')
    assert.deepEqual(persisted, initial)
    await plot(6)
    assert.equal(commands.length, 0, 'locked target is never replaced with the first empty plot')

    let release
    gate = new Promise((resolve) => {
        release = resolve
    })
    await plot(2)
    assert.deepEqual(commands[0].operation, { type: 'sow', cropId: 'wheat', plotIds: [2] })
    assert.equal(scene().props.state.enabled, false)
    await plot(3)
    assert.equal(commands.length, 1, 'repeated clicks during commit cannot submit twice')
    gate = null
    release()
    await settle()
    assert.equal(persisted.farm.seeds.wheat, 5)
    assert.equal(persisted.farm.tutorialRemaining, 5)
    assert.equal(tool().kind, 'sow', 'sowing stays equipped for consecutive clicks')
    assert.equal(findClass('sidebar').length, 0, 'sowing never opens the drawer')
    await plot(2)
    assert.equal(commands.length, 1, 'occupied plot remains unchanged')
    await plot(3)
    assert.equal(persisted.farm.seeds.wheat, 4)
    assert.deepEqual(commands.at(-1).operation.plotIds, [3])
    await target({ kind: 'blank' }, true)
    assert.equal(tool().kind, 'inspect')

    await click(toolbar('浇水'))
    const waterStart = commands.length
    assert.equal(tool().kind, 'water')
    assert.equal(commands.length, waterStart, 'equipping water never runs a batch')
    await plot(0)
    await plot(6)
    assert.equal(commands.length, waterStart)
    await plot(2)
    assert.deepEqual(commands.at(-1).operation, { type: 'water', plotIds: [2] })
    assert.equal(persisted.farm.plots[2].plant.watered, true)
    await plot(2)
    assert.equal(commands.length, waterStart + 1)
    await plot(3)
    assert.equal(persisted.farm.plots[3].plant.watered, true)
    assert.equal(tool().kind, 'water')
    assert.equal(findClass('sidebar').length, 0, 'consecutive watering never opens the drawer')
    await click(toolbar('浇水'))
    assert.equal(tool().kind, 'inspect')
    await plot(2)
    assert.equal(findClass('sidebar').length, 1, 'viewing a planted crop opens the detail drawer')
    assert.ok(button(findClass('plot-detail')[0], '已浇水').props.disabled)
    await click(findClass('drawer-close')[0])

    now += 300000
    notify()
    await settle()
    await click(toolbar('浇水'))
    const matureWater = commands.length
    await plot(2)
    assert.equal(commands.length, matureWater)
    await click(toolbar('一键收获2'))
    assert.equal(persisted.farm.produce.wheat, 6)
    assert.equal(persisted.farm.plots[2].plant, null)
    assert.equal(tool().kind, 'inspect')
    await plot(2)
    assert.equal(seeds().length, 6)
    assert.match(textOf(seeds()[0]), /5 分钟/)
    assert.match(textOf(seeds()[0]), /教学剩余 4 次/)
    const sidebarStart = commands.length
    await click(seeds()[0])
    assert.equal(
        commands.length,
        sidebarStart,
        'sidebar selection equips instead of sowing the old selection'
    )
    assert.equal(tool().kind, 'sow')
    assert.equal(findClass('sidebar').length, 0, 'equipping the selected seed closes the drawer')
    await plot(1)
    assert.deepEqual(commands.at(-1).operation.plotIds, [1])

    await plot(0)
    const beforeFail = structuredClone(persisted)
    fail = true
    await plot(4)
    assert.deepEqual(persisted, beforeFail)
    assert.equal(tool().kind, 'sow', 'temporary failure leaves an eligible tool for retry')
    fail = false
    diskFail = true
    await plot(4)
    assert.deepEqual(persisted, beforeFail)
    assert.equal(tool().kind, 'inspect', 'save failure clears executable tools')
    await plot(5)
    assert.equal(seeds().length, 6)
    assert.ok(seeds().every((item) => item.props.disabled))
    diskFail = false
    notify()
    await settle()
    assert.equal(seeds()[0].props.disabled, false)
    persisted.farm.seeds.wheat = 1
    notify()
    await settle()
    await click(seeds()[0])
    await plot(4)
    assert.equal(persisted.farm.seeds.wheat, 0)
    assert.equal(tool().kind, 'inspect', 'last seed consumption exits tool')
    persisted.farm.seeds.wheat = 2
    notify()
    await settle()
    await click(top('仓库'))
    assert.equal(button(modal(), '批量种'), undefined)
    await click(button(modal(), '播种'))
    await plot(2)
    await plot(3)
    assert.deepEqual(commands.at(-1).operation, { type: 'sow', cropId: 'wheat', plotIds: [3] })
    assert.equal(persisted.farm.seeds.wheat, 0)
    assert.ok(previews.some((operation) => operation.type === 'harvest'))
    assert.ok(
        previews.every((operation) => operation.type !== 'sow'),
        'the UI has no batch sow preview'
    )
    await click(toolbar('浇水'))
    listeners.get('keydown')({ key: 'Escape' })
    await settle()
    assert.equal(tool().kind, 'inspect')

    await click(toolbar('布置'))
    assert.equal(findClass('decoration-card').length, 10)
    assert.equal(art(modal()).length, 10)
    await click(findClass('decoration-card')[0])
    assert.equal(tool().kind, 'place')
    assert.equal(findClass('overlay').length, 0)
    const decorStart = commands.length
    await target({ kind: 'plot', id: 0 })
    assert.equal(tool().kind, 'inspect')
    assert.equal(commands.length, decorStart, 'non-cell click cancels placement without a command')
    await click(toolbar('布置'))
    await click(findClass('decoration-card')[0])
    await target({ kind: 'cell', cell: { region: 'bottom', x: 0, y: 0 } })
    assert.equal(persisted.farm.placed.length, 1)
    assert.equal(tool().kind, 'inspect')
    assert.equal(persisted.farm.decorations.barrel, 2)
    const instanceId = persisted.farm.placed[0].instanceId
    await target({ kind: 'decoration', instanceId })
    assert.equal(tool().kind, 'move')
    await target({ kind: 'blank' })
    assert.equal(tool().kind, 'inspect')
    assert.equal(persisted.farm.placed[0].x, 0)
    await target({ kind: 'decoration', instanceId })
    fail = true
    await target({ kind: 'cell', cell: { region: 'bottom', x: 2, y: 0 } })
    assert.equal(persisted.farm.placed[0].x, 0)
    assert.equal(tool().kind, 'move')
    fail = false
    await target({ kind: 'cell', cell: { region: 'bottom', x: 2, y: 0 } })
    assert.equal(persisted.farm.placed[0].x, 2)
    await click(toolbar('布置'))
    await click(findClass('decoration-card')[0])
    const occupiedStart = commands.length
    await target({ kind: 'cell', cell: { region: 'bottom', x: 2, y: 0 } })
    assert.equal(commands.length, occupiedStart)
    assert.equal(tool().kind, 'inspect')
    fail = true
    await target({ kind: 'decoration', instanceId }, true)
    assert.equal(persisted.farm.placed.length, 1)
    fail = false
    gate = new Promise((resolve) => {
        release = resolve
    })
    await target({ kind: 'decoration', instanceId }, true)
    const reclaimStart = commands.length
    await target({ kind: 'decoration', instanceId }, true)
    assert.equal(commands.length, reclaimStart)
    gate = null
    release()
    await settle()
    assert.equal(persisted.farm.placed.length, 0)
    assert.equal(
        persisted.farm.decorations.barrel,
        2,
        'reclaim retains ownership, never creates another item'
    )

    // Two-cell boundary, move and occupancy behaviour through the real service.
    persisted.farm.exp = 420
    persisted.farm.decorations.bench = 1
    notify()
    await settle()
    await click(toolbar('布置'))
    await click(findClass('decoration-card')[3])
    const edgeStart = commands.length
    await target({ kind: 'cell', cell: { region: 'left', x: 1, y: 0 } })
    assert.equal(commands.length, edgeStart)
    assert.equal(tool().kind, 'inspect')
    await click(toolbar('布置'))
    await click(findClass('decoration-card')[3])
    await target({ kind: 'cell', cell: { region: 'left', x: 0, y: 0 } })
    assert.equal(persisted.farm.placed[0].decorationId, 'bench')

    await click(top('仓库'))
    await click(button(modal(), '作物'))
    assert.equal(art(modal()).length, 6)
    await click(button(modal(), '出售'))
    assert.equal(art(modal())[0].props['data-item'], 'wheat')
    await close()
    await click(top('仓库'))
    await click(button(modal(), '装饰'))
    assert.equal(art(modal()).length, 10)
    await close()
    await click(findClass('cash')[0])
    assert.equal(art(modal()).length, 6)
    await click(button(modal(), '购买'))
    assert.equal(art(modal())[0].props['data-item'], 'wheat')
    await close()
    await click(findClass('cash')[0])
    await click(button(modal(), '装饰'))
    assert.equal(art(modal()).length, 10)
    await click(button(modal(), '购买'))
    assert.equal(art(modal())[0].props['data-item'], 'barrel')
    await close()
    await click(toolbar('图鉴'))
    assert.equal(art(modal()).length, 30, 'six mature images plus all 24 growth frames')
    for (const locale of ['en-US', 'zh-TW', 'zh-CN']) {
        i18n.global.locale.value = locale
        await settle()
        assert.doesNotMatch(textOf(root), /farm\./)
        assert.equal(scene().props.state.labels.stages.length, 4)
    }
    await close()
    await click(toolbar('浇水'))
    await click(toolbar('农场订单'))
    assert.equal(findClass('sidebar').length, 1)
    await click(top('仓库'))
    assert.equal(findClass('sidebar').length, 0, 'other panels close the drawer')
    assert.equal(tool().kind, 'inspect', 'opening a panel clears the tool')
    await close()
    console.log(
        'farm UI: on-demand drawers, no sow/water bars or batch buttons, single targets, harvest all, cancellation, busy/failure/depletion, direct decor/move/right reclaim, all panel art and three locales: passed'
    )
} finally {
    app.unmount()
    globalThis.window = previousWindow
    globalThis.document = previousDocument
    globalThis.confirm = previousConfirm
}
assert.ok(
    unsubscribed && checkpointed && !listeners.size,
    'unmount removes subscription and key listener and checkpoints'
)
