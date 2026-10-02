import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { basename, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { compileScript, parse } from 'vue/compiler-sfc'

const require = createRequire(import.meta.url)
const { createRenderer, nextTick, ref } = require('vue')
const { createI18n } = require('vue-i18n')
const player = ref({
    petmates: [
        {
            status: { status: 'idle' },
            attrs: {
                hungry: 100,
                maxHungry: 100,
                emotion: 100,
                maxEmotion: 100,
                energy: 100,
                maxEnergy: 100
            }
        }
    ]
})
globalThis.petSpeechTestPlayer = player
const bundled = await build({
    stdin: {
        contents: `export { default as Petmate } from './src/renderer/views/Petmate.vue';`,
        resolveDir: process.cwd()
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    plugins: [
        {
            name: 'pet-speech-test',
            setup(builder) {
                builder.onResolve({ filter: /^(vue|vue-i18n)$/ }, (args) => ({
                    path: pathToFileURL(require.resolve(args.path)).href,
                    external: true
                }))
                builder.onLoad({ filter: /usePetmateModel\.ts$/ }, () => ({
                    contents: `import { ref } from 'vue';
            export const isShowContextMenu = ref(false);
            export function usePetmateModel() { const noop = () => {}; return { init2D: async () => {}, playIdle: noop,
                setAngry: noop, setEnergyLow: noop, setActivity: noop, sleepResponseTick: ref(0), destroy: noop }; }`,
                    loader: 'js'
                }))
                builder.onLoad({ filter: /usePlayer\.ts$/ }, () => ({
                    contents: `export function usePlayer() { return {
            playerData: globalThis.petSpeechTestPlayer, initPlayerData: async () => {}, refreshPlayerData: async () => {},
            subscribeToPlayerDataSync: () => () => {} }; }`,
                    loader: 'js'
                }))
                builder.onLoad({ filter: /\.vue$/ }, async (args) => {
                    if (basename(args.path) === 'WheelMenu.vue')
                        return {
                            contents: 'export default { render() { return null } }',
                            loader: 'js'
                        }
                    const { descriptor, errors } = parse(await readFile(args.path, 'utf8'), {
                        filename: args.path
                    })
                    assert.deepEqual(errors, [])
                    return {
                        contents: compileScript(descriptor, {
                            id: 'pet-speech-test',
                            inlineTemplate: true
                        }).content,
                        loader: 'ts',
                        resolveDir: dirname(args.path)
                    }
                })
            }
        }
    ]
})
const { Petmate } = await import(
    'data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64')
)
const node = (type) => ({ type, props: {}, children: [], parent: null, text: '' })
const detach = (child) => {
    if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1)
    child.parent = null
}
const renderer = createRenderer({
    createElement: node,
    createText: (text) => ({ ...node('#text'), text }),
    createComment: (text) => ({ ...node('#comment'), text }),
    setText: (target, text) => {
        target.text = text
    },
    setElementText: (target, text) => {
        target.text = text
    },
    patchProp: (target, key, _old, value) => {
        target.props[key] = value
    },
    insert: (child, parent, anchor) => {
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
const intervals = new Map(),
    listeners = new Map()
let sequence = 0,
    subscriptions = 0,
    receiveFarmEvent
const originals = {
    setInterval,
    clearInterval,
    window: globalThis.window,
    document: globalThis.document
}
globalThis.setInterval = (callback, delay) => {
    const id = ++sequence
    intervals.set(id, { callback, delay })
    return id
}
globalThis.clearInterval = (id) => intervals.delete(id)
globalThis.document = {
    hidden: false,
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name) => listeners.delete(name)
}
globalThis.window = {
    api: {
        onFarmAssistantEvent(callback) {
            subscriptions++
            receiveFarmEvent = callback
            return () => {
                receiveFarmEvent = undefined
            }
        },
        onActivityFinished() {}
    }
}
const walk = (target) => [target, ...target.children.flatMap(walk)]
const settle = async () => {
    for (let i = 0; i < 3; i++) {
        await Promise.resolve()
        await nextTick()
    }
}
try {
    for (let mount = 0; mount < 2; mount++) {
        const root = node('root'),
            app = renderer.createApp(Petmate)
        app.use(
            createI18n({
                legacy: false,
                locale: 'test',
                messages: {
                    test: {
                        petmate: {
                            hungryDialog: '饿啦',
                            sleepDialog: '困啦',
                            farmSpeech: { started: '我去照顾一下农田啦！' }
                        }
                    }
                }
            })
        )
        app.mount(root)
        await settle()
        assert.equal(subscriptions, 0, 'disabled pet does not subscribe to farm IPC')
        assert.ok(
            [...intervals.values()].every((timer) => timer.delay !== 120),
            'disabled pet creates no farm speech timer'
        )
        assert.equal(
            listeners.has('visibilitychange'),
            false,
            'disabled pet creates no farm speech listener'
        )
        receiveFarmEvent?.({ id: 'legacy-event', kind: 'started', at: Date.now() })
        for (const timer of intervals.values()) timer.callback()
        await settle()
        assert.ok(
            !walk(root).some((n) => String(n.props.class).includes('farm-dialog')),
            'legacy event cannot display a farm bubble'
        )
        player.value.petmates[0].attrs.hungry = 20
        await settle()
        assert.ok(
            walk(root).some((n) => String(n.props.class).includes('hunger-dialog')),
            'hunger bubbles remain available'
        )
        player.value.petmates[0].attrs.hungry = 100
        await settle()
        app.unmount()
        assert.equal(intervals.size, 0, 'unmount clears remaining pet timers')
    }
} finally {
    Object.assign(globalThis, originals)
    delete globalThis.petSpeechTestPlayer
}
console.log(
    'Pet farm speech: disabled IPC subscription, timer, legacy events, hunger bubbles and repeated mounts passed'
)
