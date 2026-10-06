import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { build } from 'esbuild'

const handlers = new Map(),
    events = new Map()
let nextId = 0
let area = { x: 0, y: 0, width: 1920, height: 1080 }
class Window extends EventEmitter {
    constructor(options = {}) {
        super()
        this.id = ++nextId
        this.options = options
        this.bounds = {
            x: options.x ?? 600,
            y: options.y ?? 400,
            width: options.width ?? 300,
            height: options.height ?? 300
        }
        this.visible = options.show ?? true
        this.top = options.alwaysOnTop ?? true
        this.webContents = Object.assign(new EventEmitter(), {
            id: this.id * 10,
            sent: [],
            send(channel, state) {
                this.sent.push([channel, structuredClone(state)])
            }
        })
    }
    isDestroyed() {
        return !!this.destroyed
    }
    isVisible() {
        return this.visible
    }
    isMinimized() {
        return !!this.minimized
    }
    isAlwaysOnTop() {
        return this.top
    }
    setAlwaysOnTop(top) {
        this.top = top
    }
    setIgnoreMouseEvents(value) {
        this.ignored = value
    }
    getBounds() {
        return { ...this.bounds }
    }
    getContentBounds() {
        return { ...this.bounds }
    }
    setContentBounds(value) {
        this.setBounds(value)
    }
    setBounds(value) {
        this.boundsWrites = (this.boundsWrites ?? 0) + 1
        this.bounds = { ...value }
        this.emit('move')
        this.emit('resize')
    }
    showInactive() {
        this.visible = true
        this.emit('show')
    }
    hide() {
        this.visible = false
        this.emit('hide')
    }
    destroy() {
        this.destroyed = true
        this.emit('closed')
    }
}
const screen = Object.assign(new EventEmitter(), { getDisplayMatching: () => ({ workArea: area }) })
globalThis.petSpeechTest = {
    BrowserWindow: Window,
    screen,
    ipcMain: {
        on: (key, callback) => events.set(key, callback),
        handle: (key, callback) => handlers.set(key, callback)
    }
}
try {
    const bundle = await build({
        stdin: {
            contents: `export {PetSpeechWindow, registerPetSpeechIpc} from './src/main/pet-speech-window';
            export {isHelperWindow} from './src/main/helperWindows';
            export {positionPetSpeech,selectPetSpeech} from './src/shared/petSpeech';`,
            resolveDir: process.cwd()
        },
        bundle: true,
        platform: 'node',
        format: 'esm',
        write: false,
        plugins: [
            {
                name: 'isolated-speech',
                setup(builder) {
                    builder.onResolve({ filter: /^electron$/ }, () => ({
                        path: 'electron',
                        namespace: 'mock'
                    }))
                    builder.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({
                        contents:
                            'export const {BrowserWindow,screen,ipcMain}=globalThis.petSpeechTest',
                        loader: 'js'
                    }))
                }
            }
        ]
    })
    const {
        PetSpeechWindow,
        registerPetSpeechIpc,
        isHelperWindow,
        positionPetSpeech,
        selectPetSpeech
    } = await import(
        'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')
    )
    const owner = new Window()
    const initial = owner.getBounds()
    const speech = new PetSpeechWindow(owner, '/preload', async () => {})
    const bubble = speech.window
    registerPetSpeechIpc(() => speech)
    assert.equal(isHelperWindow(bubble.id), true)
    assert.equal(bubble.options.focusable, false)
    assert.equal(bubble.ignored, true)
    assert.equal(bubble.isVisible(), false)
    const message = {
        id: 'first',
        key: 'life',
        text: '好像看到蝴蝶了，我去看看。',
        visibleText: '好',
        anchor: { x: 150, y: 10 }
    }
    events.get('pet-speech-update')({ sender: { id: -1 } }, message)
    assert.equal(speech.getState().message, null, 'only pet renderer can publish speech')
    events.get('pet-speech-update')({ sender: owner.webContents }, message)
    assert.equal(bubble.isVisible(), false, 'wait for full-text measurement before showing')
    events.get('pet-speech-measured')({ sender: owner.webContents }, 'first', 80)
    assert.equal(bubble.isVisible(), false, 'only bubble renderer can report size')
    events.get('pet-speech-measured')({ sender: bubble.webContents }, 'stale', 80)
    assert.equal(bubble.isVisible(), false, 'stale measurements cannot show a new message')
    events.get('pet-speech-measured')({ sender: bubble.webContents }, 'first', 80)
    assert.equal(bubble.isVisible(), true)
    const fixed = bubble.getBounds()
    assert.equal(fixed.width, 260)
    assert.ok(
        fixed.y + fixed.height < initial.y + 10,
        'bubble clears head instead of overlapping it'
    )
    assert.deepEqual(owner.getBounds(), initial, 'bubble never repositions or shrinks the pet')
    for (const visibleText of ['好像看到', '好像看到蝴蝶了，我去看看。']) {
        speech.update({ ...message, visibleText, anchor: { x: 140, y: 13 } })
        assert.deepEqual(
            bubble.getBounds(),
            fixed,
            'typing and breathing cannot change message bounds'
        )
    }
    owner.setBounds({ ...initial, x: initial.x + 50, y: initial.y + 40 })
    assert.deepEqual(
        bubble.getBounds(),
        { ...fixed, x: fixed.x + 50, y: fixed.y + 40 },
        'native dragging keeps the same head offset'
    )
    owner.hide()
    assert.equal(bubble.isVisible(), false)
    owner.showInactive()
    assert.equal(bubble.isVisible(), true)
    owner.minimized = true
    owner.emit('minimize')
    assert.equal(bubble.isVisible(), false)
    owner.minimized = false
    owner.emit('restore')
    assert.equal(bubble.isVisible(), true)
    owner.setBounds({ ...initial, width: 470 })
    assert.equal(bubble.isVisible(), false, 'departure window cannot retain stale speech')
    owner.setBounds({ ...initial, width: 288, height: 132 })
    assert.equal(bubble.isVisible(), false, 'away card cannot retain speech')
    owner.setBounds(initial)
    owner.emit('always-on-top-changed', {}, false)
    assert.equal(bubble.isAlwaysOnTop(), false)
    speech.update({ ...message, id: 'next', text: '我回来了。', visibleText: '' })
    assert.equal(bubble.isVisible(), false)
    speech.measured('first', 80)
    assert.equal(bubble.isVisible(), false)
    speech.measured('next', 64)
    assert.equal(bubble.getBounds().height, 64)
    assert.equal(bubble.isVisible(), true)
    owner.getContentBounds = () => ({ ...owner.getBounds(), width: 298, height: 298 })
    owner.emit('resize')
    assert.equal(bubble.isVisible(), true, 'DPI frame difference cannot hide a normal pet bubble')
    owner.getContentBounds = () => ({ ...owner.getBounds(), width: 305, height: 305 })
    owner.emit('resize')
    assert.equal(
        bubble.isVisible(),
        true,
        'native DPI size rounding remains inside the normal pet range'
    )
    owner.getContentBounds = () => owner.getBounds()
    owner.emit('resize')
    const exactContent = bubble.getContentBounds.bind(bubble)
    bubble.getContentBounds = () => {
        const bounds = exactContent()
        return { ...bounds, width: bounds.width + 1 }
    }
    const beforeRoundingUpdates = bubble.boundsWrites
    speech.update({ ...message, id: 'next', text: '我回来了。', visibleText: '我' })
    assert.equal(
        bubble.boundsWrites,
        beforeRoundingUpdates,
        'one DIP native rounding does not cause repeated bounds writes'
    )
    bubble.getContentBounds = exactContent
    speech.update({ ...message, id: 'bad', anchor: { x: NaN, y: Infinity } })
    assert.equal(speech.getState().message.id, 'next', 'invalid positions are rejected')
    assert.equal(handlers.get('pet-speech-get')({ sender: owner.webContents }).code, 400)
    assert.equal(handlers.get('pet-speech-get')({ sender: bubble.webContents }).code, 200)
    speech.update(null)
    assert.equal(bubble.isVisible(), false)
    speech.measured('next', 64)
    assert.equal(bubble.isVisible(), false, 'late measurement after clear cannot resurrect speech')
    const overlap = (a, b) =>
        a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
    for (const display of [area, { x: -1920, y: -100, width: 1920, height: 1040 }]) {
        for (const point of [
            { x: display.x, y: display.y },
            { x: display.x + display.width - 300, y: display.y },
            { x: display.x + 400, y: display.y + 400 }
        ]) {
            const pet = { ...point, width: 300, height: 300 }
            const placement = positionPetSpeech(pet, { x: 150, y: 10 }, display, 100)
            assert.ok(
                !overlap(placement.bounds, pet),
                'edge fallback stays outside the pet rectangle'
            )
            assert.ok(placement.bounds.x >= display.x && placement.bounds.y >= display.y)
            assert.ok(
                placement.bounds.x + 260 <= display.x + display.width &&
                    placement.bounds.y + 100 <= display.y + display.height
            )
        }
    }
    const line = (key) => ({ key, text: key, visibleText: key })
    assert.equal(selectPetSpeech([line('sleep'), line('hungry'), line('farm')]).key, 'sleep')
    assert.equal(selectPetSpeech([null, line('hungry'), line('farm')]).key, 'hungry')
    assert.equal(selectPetSpeech([null, null, line('farm')]).key, 'farm')
    assert.equal(selectPetSpeech([null, null]), null)
    area = { x: -1920, y: -100, width: 1920, height: 1040 }
    speech.update(message)
    speech.measured('first', 80)
    screen.emit('display-removed')
    assert.ok(bubble.getBounds().x + 260 <= 0, 'display changes re-clamp the helper window')
    owner.destroy()
    assert.equal(bubble.isDestroyed(), true)
    assert.equal(isHelperWindow(bubble.id), false)
    assert.equal(screen.listenerCount('display-removed'), 0)
    assert.equal(owner.listenerCount('move'), 0)
    console.log(
        'Pet speech: full-text size, stable head anchor, typing, dragging, screen edges, negative display, priority, visibility, sender/stale guards, helper lifecycle: passed'
    )
} finally {
    delete globalThis.petSpeechTest
}
