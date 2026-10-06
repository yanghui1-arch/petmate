import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { build } from 'esbuild'

// Isolated native-window adapter: no real player window, disk, or Steam access.
let area = { x: -1920, y: -80, width: 1920, height: 1040 },
    now = 0,
    sequence = 0
const timers = new Map()
const originals = { performance: globalThis.performance, setInterval, clearInterval }
globalThis.farmLifeWindowScreen = { getDisplayMatching: () => ({ workArea: area }) }
globalThis.performance = { now: () => now }
globalThis.setInterval = (action) => {
    const id = ++sequence
    timers.set(id, action)
    return id
}
globalThis.clearInterval = (id) => timers.delete(id)
try {
    const result = await build({
        stdin: {
            contents:
                "export { FarmLifeDesktop, clampPetPosition } from './src/main/modules/farm/lifeDesktop'",
            resolveDir: process.cwd()
        },
        bundle: true,
        platform: 'node',
        format: 'esm',
        write: false,
        plugins: [
            {
                name: 'isolated-electron',
                setup(builder) {
                    builder.onResolve({ filter: /^electron$/ }, () => ({
                        path: 'electron',
                        namespace: 'fake'
                    }))
                    builder.onLoad({ filter: /.*/, namespace: 'fake' }, () => ({
                        contents:
                            'export const screen = globalThis.farmLifeWindowScreen; export class BrowserWindow {}',
                        loader: 'js'
                    }))
                }
            }
        ]
    })
    const { FarmLifeDesktop, clampPetPosition } = await import(
        'data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64')
    )
    class Window extends EventEmitter {
        bounds = { x: -1550, y: 400, width: 300, height: 300 }
        visible = true
        ignored = false
        destroyed = false
        focused = 0
        sent = []
        moves = []
        webContents = { send: (channel, payload) => this.sent.push([channel, payload]) }
        isDestroyed() {
            return this.destroyed
        }
        getBounds() {
            return { ...this.bounds }
        }
        setPosition(x, y) {
            assert.ok(Number.isInteger(x) && Number.isInteger(y))
            this.moves.push([x, y])
            this.bounds.x = x
            this.bounds.y = y
        }
        setMinimumSize(width,height) { this.min=[width,height] }
        setMaximumSize(width,height) { this.max=[width,height] }
        setBounds(bounds) { this.bounds={...bounds} }
        setIgnoreMouseEvents(value) {
            this.ignored = value
        }
        hide() {
            this.visible = false
            this.emit('hide')
        }
        showInactive() {
            this.visible = true
            this.emit('show')
        }
    }
    const window = new Window()
    let interactions = 0
    const desktop = new FarmLifeDesktop(window, () => interactions++)
    const phase = (phase) => desktop.update({ enabled: true, visit: { phase } })
    const advance = (ms) => {
        now += ms
        for (const timer of [...timers.values()]) timer()
    }
    phase('preparing')
    assert.equal(desktop.prepareRelocation('enough-room'), false, 'enough space skips the flash')
    assert.equal(window.sent.length, 0)
    phase('leaving')
    assert.equal(desktop.direction,'right')
    assert.equal(window.bounds.width,470)
    const departureBounds={...window.bounds}
    advance(6584)
    assert.deepEqual(window.bounds,departureBounds,'video owns walk; native window must remain stationary')
    assert.equal(timers.size,0)
    phase('visiting')
    assert.equal(window.visible, true)
    assert.equal(window.ignored, false, 'away card must receive button clicks')
    assert.deepEqual(window.bounds, { x: -1544, y: 568, width: 288, height: 132 })
    assert.equal(desktop.hiddenByPlayer, false)
    assert.equal(interactions, 0)
    phase('exiting')
    assert.equal(window.visible, true)
    // Monitor removal while away: clamp return to the surviving display.
    area = { x: 0, y: 0, width: 1280, height: 720 }
    phase('returning')
    assert.equal(window.visible, true)
    assert.equal(window.ignored, false)
    advance(3000)
    desktop.restore()
    assert.deepEqual(window.bounds, { x: 0, y: 400, width: 300, height: 300 })
    assert.equal(window.focused, 0)
    assert.equal(timers.size, 0)
    phase('preparing')
    phase('leaving')
    advance(1000)
    window.hide()
    assert.equal(desktop.hiddenByPlayer, true)
    assert.equal(interactions, 1)
    desktop.restore()
    assert.equal(window.visible, false, 'user hide must be preserved')
    assert.equal(window.ignored, false)
    window.showInactive()
    assert.equal(desktop.hiddenByPlayer, false)
    assert.equal(interactions, 2)
    assert.deepEqual(
        clampPetPosition(
            { x: 9000, y: -9000 },
            { x: 0, y: 0, width: 1280, height: 720 },
            { width: 300, height: 300 }
        ),
        { x: 980, y: 0 }
    )
    window.bounds.x=960
    phase('preparing')
    advance(350)
    assert.equal(window.bounds.x,960,'preparing dialogue must not slide the native window')
    const moveCount = window.moves.length
    assert.equal(desktop.prepareRelocation('edge'),true)
    assert.deepEqual(window.sent.at(-1),['farm-life-departure-shift',{id:'edge'}])
    const sentCount = window.sent.length
    assert.equal(desktop.prepareRelocation('edge'),true)
    assert.equal(window.sent.length,sentCount,'duplicate speech acknowledgement cannot restart flash')
    assert.equal(window.bounds.x,960,'requesting flash must not move the character')
    assert.equal(desktop.moveCovered('stale'),false)
    assert.equal(window.bounds.x,960)
    assert.equal(desktop.moveCovered('edge'),true)
    assert.deepEqual(window.bounds,{x:810,y:400,width:300,height:300},'covered move is immediate and preserves vertical position')
    assert.equal(desktop.moveCovered('edge'),true)
    assert.equal(window.moves.length,moveCount+1,'native relocation happens once')
    assert.equal(desktop.prepareRelocation('edge'),false,'finished flash releases normal outfit and video')
    phase('leaving')
    assert.equal(desktop.moveCovered('edge'),false,'late relocation cannot move a playing video')
    assert.equal(window.bounds.x+window.bounds.width,1280,'door cannot be clipped off screen')
    desktop.restore()
    assert.equal(window.bounds.x,960)
    assert.equal(window.bounds.width,300)
    phase('preparing')
    assert.equal(desktop.prepareRelocation('cancelled'),true)
    desktop.restore()
    assert.equal(desktop.moveCovered('cancelled'),false,'cancelled trip cannot teleport later')
    assert.equal(window.bounds.x,960)
    area={x:-1920,y:-80,width:1920,height:1040}
    window.bounds={x:-310,y:800,width:300,height:300}
    phase('preparing')
    assert.equal(desktop.prepareRelocation('negative-display'),true)
    assert.equal(desktop.moveCovered('negative-display'),true)
    assert.deepEqual(window.bounds,{x:-470,y:660,width:300,height:300},'nearest safe point respects negative display origin and bottom edge')
    desktop.restore()
    area={x:0,y:0,width:1280,height:720}
    window.bounds = { x: 100, y: 200, width: 300, height: 300 }
    phase('preparing')
    phase('leaving')
    phase('visiting')
    const cardStart = { ...window.bounds }
    const beforeDragInteractions = interactions
    window.setPosition(cardStart.x + 260, cardStart.y - 80)
    const movedCard = { ...window.bounds }
    phase('visiting')
    phase('exiting')
    assert.deepEqual(window.bounds, movedCard, 'phase changes must not snap a dragged card back')
    assert.equal(interactions, beforeDragInteractions, 'native card movement cannot recall the pet')
    phase('returning')
    assert.deepEqual(window.bounds, { x: 360, y: 120, width: 300, height: 300 }, 'pet follows the card displacement')
    desktop.restore()
    assert.deepEqual(window.bounds, { x: 360, y: 120, width: 300, height: 300 }, 'return displacement applies once')
    phase('preparing')
    phase('leaving')
    phase('visiting')
    window.setPosition(9000, -9000)
    phase('returning')
    assert.deepEqual(window.bounds, { x: 980, y: 0, width: 300, height: 300 }, 'dragged return remains inside work area')
    phase('preparing')
    phase('leaving')
    phase('visiting')
    window.hide()
    phase('exiting')
    assert.equal(window.visible, false, 'away card must respect manual hide')
    phase('returning')
    assert.equal(window.visible, false, 'return must respect manual hide')
    window.showInactive()
    phase('preparing')
    phase('leaving')
    window.destroyed = true
    window.emit('closed')
    assert.equal(timers.size, 0)
    console.log(
        'Farm life desktop: cover-before-teleport, move once, stale/cancel guards, two work areas, stationary video, draggable away card, return, explicit hide and cleanup: passed'
    )
} finally {
    Object.assign(globalThis, originals)
    delete globalThis.farmLifeWindowScreen
}
