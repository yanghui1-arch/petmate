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
        contents: `export { default as Petmate } from './src/renderer/views/Petmate.vue'; export { farmLifeCN as lifeMessages } from './src/renderer/i18n/farm-life';`,
        resolveDir: process.cwd()
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    loader: { '.png': 'dataurl', '.webm': 'dataurl' },
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
                setAngry: noop, setEnergyLow: noop, setActivity: noop, sleepResponseTick: ref(0), speechAnchor: ref({x:150,y:10}), destroy: noop }; }`,
                    loader: 'js'
                }))
                builder.onLoad({ filter: /usePlayer\.ts$/ }, () => ({
                    contents: `export function usePlayer() { return {
            playerData: globalThis.petSpeechTestPlayer, initPlayerData: async () => {}, refreshPlayerData: async () => {},
            subscribeToPlayerDataSync: () => () => {} }; }`,
                    loader: 'js'
                }))
                builder.onLoad({ filter: /\.(png|webm)$/ }, args => ({
                    contents: `export default ${JSON.stringify('/test-assets/' + basename(args.path))}`,
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
const { Petmate, lifeMessages } = await import(
    'data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64')
)
const node = (type) => ({ type, props: {}, children: [], parent: null, text: '',
    ...(type === 'video' ? { readyState: 0, plays: 0, play() { this.plays++; return Promise.resolve() } } : {}) })
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
    timeouts = new Map(),
    animationFrames = new Map(),
    listeners = new Map()
let animationNow = 0, sequence = 0,
    subscriptions = 0,
    receiveFarmEvent, receiveLife, receiveLifeSpeech
let interactions = 0, currentSpeech = null
const heartbeats = []
const originals = {
    setInterval,
    clearInterval,
    setTimeout,
    clearTimeout,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
    performance: globalThis.performance,
    window: globalThis.window,
    document: globalThis.document
}
const originalDateNow = Date.now
let speechNow = originalDateNow()
Date.now = () => speechNow
const finishedSpeeches = []
globalThis.setInterval = (callback, delay) => {
    const id = ++sequence
    intervals.set(id, { callback, delay })
    return id
}
globalThis.clearInterval = (id) => intervals.delete(id)
globalThis.setTimeout = (callback, delay) => {
    const id = ++sequence
    timeouts.set(id, { callback, delay })
    return id
}
globalThis.clearTimeout = (id) => timeouts.delete(id)
globalThis.performance = { now: () => animationNow }
globalThis.requestAnimationFrame = callback => {
    const id = ++sequence
    animationFrames.set(id, callback)
    return id
}
globalThis.cancelAnimationFrame = id => animationFrames.delete(id)
const advanceFrame = async elapsed => {
    animationNow += elapsed
    const pending = [...animationFrames.values()]
    animationFrames.clear()
    for (const callback of pending) callback(animationNow)
    await settle()
}
globalThis.document = {
    hidden: false,
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name) => listeners.delete(name)
}
globalThis.window = {
    api: {
        updatePetSpeech: message => { currentSpeech = structuredClone(message) },
        getFarmLife: async () => ({ code: 200, data: { enabled: false, visit: null } }),
        onFarmLifeState: callback => { receiveLife = callback; return () => receiveLife = undefined },
        onFarmLifeSpeech: callback => { receiveLifeSpeech = callback; return () => receiveLifeSpeech = undefined },
        farmLifePetState: (ready, blocked) => heartbeats.push({ ready, blocked }),
        farmLifeInteraction: () => interactions++,
        finishFarmLifeSpeech: id => finishedSpeeches.push(id),
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
                        farmLife: lifeMessages,
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
            true,
            'shared speech visibility listener remains available with old assistant disabled'
        )
        receiveFarmEvent?.({ id: 'legacy-event', kind: 'started', at: Date.now() })
        for (const timer of intervals.values()) timer.callback()
        await settle()
        assert.equal(currentSpeech, null, 'legacy event cannot display a farm bubble')
        const event = {id:'new-life',at:Date.now(),day:'2026-10-03',kind:'water',plots:3,items:{},line:0,shown:false,interrupted:false,orderReady:false}
        receiveLifeSpeech({stage:'start',event}); await settle()
        assert.equal(currentSpeech, null, 'new switch off also suppresses speech')
        const visit = {id:event.id,skin:'school-uniform',phase:'preparing',since:Date.now(),kind:'water',plotIds:[0],line:0,returnAt:0,committed:false,cancelled:false,tutorial:false}
        receiveLife({enabled:true,visit,direction:'left'}); receiveLifeSpeech({stage:'start',event}); await settle()
        for(let tick=0;tick<90;tick++) { for(const timer of [...intervals.values()]) if(timer.delay===80)timer.callback() }
        await settle()
        assert.ok(!walk(root).some(n => String(n.props.class).includes('life-sprite')), 'legacy actions removed')
        assert.equal(walk(root).find(n => n.props.class === 'petmate-canvas-container').props.style.display, 'block', 'preparing keeps original model')
        assert.equal(currentSpeech?.key, 'life', 'new life speech goes to unified window')
        assert.ok(heartbeats.some(state => state.ready && !state.blocked), 'renderer reports live readiness')
        const finishedBefore = finishedSpeeches.length
        speechNow += 1499
        for (const timer of intervals.values()) if (timer.delay === 80) timer.callback()
        await settle()
        assert.equal(finishedSpeeches.length, finishedBefore, 'full text remains for 1.5 seconds before costume scan')
        assert.equal(currentSpeech?.key, 'life')
        speechNow += 1
        for (const timer of intervals.values()) if (timer.delay === 80) timer.callback()
        await settle()
        assert.deepEqual(finishedSpeeches.slice(finishedBefore), [visit.id], 'bubble ends and signals the matching departure together')
        assert.equal(currentSpeech, null)
        for (const timer of intervals.values()) if (timer.delay === 80) timer.callback()
        assert.equal(finishedSpeeches.length, finishedBefore + 1, 'dialogue completion is sent only once')
        receiveLife({enabled:true,visit:{...visit,phase:'leaving'}}); await settle()
        const video=walk(root).find(n=>n.type==='video')
        assert.ok(video && video.props.src.endsWith('.webm'),'departure uses approved transparent video')
        assert.ok(!('autoplay' in video.props) && !video.props.loop,'video waits for costume effect and plays once')
        video.props.onLoadeddata();await settle()
        assert.equal(walk(root).find(n => n.props.class === 'petmate-canvas-container').props.style.display, 'block', 'original costume starts fully visible')
        assert.ok(walk(root).some(n => n.props.class === 'costume-effect'),'warm costume effect mounts')
        assert.equal(video.plays,0,'walking does not start during costume effect')
        await advanceFrame(550)
        const originalModel=walk(root).find(n => n.props.class === 'petmate-canvas-container')
        assert.equal(originalModel.props.style.display,'block','lower original costume remains at halfway')
        assert.equal(originalModel.props.style.clipPath,'inset(150px 0 0)','clip upper half of original')
        assert.equal(walk(root).find(n=>n.props.class==='departure-frame').props.style.clipPath,'inset(0 calc(100% - 245px) 150px 0)','show complementary upper half of workwear; keep door hidden')
        assert.equal(video.plays,0,'workwear stays on first frame while beam scans')
        await advanceFrame(550)
        assert.equal(walk(root).find(n=>n.props.class==='petmate-canvas-container').props.style.display,'none','original disappears after feet are changed')
        assert.equal(walk(root).find(n=>n.props.class==='departure-frame').props.style.clipPath,'none','door and complete video appear after scan')
        assert.equal(video.plays,1,'start approved video once after costume effect')
        assert.ok(!walk(root).some(n => n.props.class === 'costume-effect'),'effect clears after 1100ms')
        receiveLife({enabled:true,visit:{...visit,phase:'visiting'}}); await settle()
        assert.ok(!walk(root).some(n=>n.type==='video'),'farm visit removes desktop video')
        assert.equal(walk(root).find(n => n.props.class === 'petmate-canvas-container').props.style.display, 'none')
        receiveLife({enabled:true,visit:{...visit,phase:'returning'}}); await settle()
        assert.equal(walk(root).find(n => n.props.class === 'petmate-canvas-container').props.style.display, 'block','return restores original costume')
        receiveLife({enabled:true,visit:{...visit,id:'cancel-costume',phase:'leaving'}});await settle()
        const cancelledVideo=walk(root).find(n=>n.type==='video')
        cancelledVideo.props.onLoadeddata();await settle()
        receiveLife({enabled:true,visit:null});await settle()
        await advanceFrame(1100)
        assert.equal(cancelledVideo.plays,0,'cancel during costume effect never starts a stale video')
        assert.equal(walk(root).find(n => n.props.class === 'petmate-canvas-container').props.style.display,'block','cancel restores original immediately')
        receiveLife({enabled:true,visit:{...visit,phase:'returning'}});await settle()
        walk(root).find(n => n.props.class === 'petmate-container').props.onPointerdownCapture()
        await settle(); assert.ok(interactions > 0); assert.equal(currentSpeech, null, 'player interaction clears speech and recalls')
        receiveLifeSpeech({stage:'start',event}); await settle()
        player.value.petmates[0].attrs.hungry = 20
        await settle()
        assert.equal(currentSpeech?.key, 'hungry', 'hunger bubbles remain available')
        assert.notEqual(currentSpeech?.key, 'life', 'hunger takes priority without queued life speech')
        receiveLife({enabled:true,visit:null}); await settle()
        assert.equal(walk(root).find(n => n.props.class === 'petmate-canvas-container').props.style.display, 'block')
        player.value.petmates[0].attrs.hungry = 100
        await settle()
        app.unmount()
        assert.equal(currentSpeech, null, 'unmount clears speech')
        assert.equal(listeners.has('visibilitychange'), false, 'unmount removes shared visibility listener')
        assert.equal(intervals.size, 0, 'unmount clears remaining pet timers')
        assert.equal(timeouts.size, 0, 'unmount clears costume and dialogue timers')
        assert.equal(animationFrames.size, 0, 'unmount cancels scan frames')
        assert.equal(receiveLife, undefined); assert.equal(receiveLifeSpeech, undefined)
        assert.deepEqual(heartbeats.at(-1), {ready:false,blocked:true})
    }
} finally {
    Date.now = originalDateNow
    Object.assign(globalThis, originals)
    delete globalThis.petSpeechTestPlayer
}
console.log(
    'Pet speech: old assistant remains disabled; new life switch, original costume, once-only departure video, single role, truthful bubbles, player recall, hunger priority, heartbeat and remount cleanup passed'
)
