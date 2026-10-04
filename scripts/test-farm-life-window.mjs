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
        isDestroyed() {
            return this.destroyed
        }
        getBounds() {
            return { ...this.bounds }
        }
        setPosition(x, y) {
            assert.ok(Number.isInteger(x) && Number.isInteger(y))
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
    phase('leaving')
    assert.equal(desktop.direction,'right')
    assert.equal(window.bounds.width,470)
    const departureBounds={...window.bounds}
    advance(6584)
    assert.deepEqual(window.bounds,departureBounds,'video owns walk; native window must remain stationary')
    assert.equal(timers.size,0)
    phase('visiting')
    assert.equal(window.visible, false)
    assert.equal(window.ignored, true)
    assert.equal(desktop.hiddenByPlayer, false)
    assert.equal(interactions, 0)
    phase('exiting')
    assert.equal(window.visible, false)
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
    advance(175)
    assert.ok(window.bounds.x<960&&window.bounds.x>810,'room for door is prepared smoothly')
    advance(175)
    assert.equal(window.bounds.x,810)
    phase('leaving')
    assert.equal(window.bounds.x+window.bounds.width,1280,'door cannot be clipped off screen')
    desktop.restore()
    assert.equal(window.bounds.x,960)
    assert.equal(window.bounds.width,300)
    phase('preparing')
    phase('leaving')
    window.destroyed = true
    window.emit('closed')
    assert.equal(timers.size, 0)
    console.log(
        'Farm life desktop: two work areas, stationary full video, expanded animation bounds, hide without interception, return clamp, explicit user hide, no focus and cleanup: passed'
    )
} finally {
    Object.assign(globalThis, originals)
    delete globalThis.farmLifeWindowScreen
}
