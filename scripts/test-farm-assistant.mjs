import assert from 'node:assert/strict'
import { build } from 'esbuild'
process.on('uncaughtException', error => { console.error(error.stack?.replace(/data:text\/javascript;base64,[A-Za-z0-9+/=]+/g, 'compiled-farm')); process.exitCode = 1 })
const bundled = await build({ stdin: { contents: `
export { FarmService } from './src/main/modules/farm/service';
export { FarmAssistant, planFarmAssistant } from './src/main/modules/farm/assistant';
export { FarmDialogue } from './src/renderer/utils/farmDialogue';
export { farmWindowSize, fixedFarmWindow, observeFarmWorkArea } from './src/main/modules/farm/window';
export { farmExperience } from './src/shared/farmExperience';
export { validateFarm } from './src/main/modules/farm/rules';
`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', write: false })
const { FarmService, FarmAssistant, planFarmAssistant, FarmDialogue, farmWindowSize, fixedFarmWindow, observeFarmWorkArea, farmExperience: cfg, validateFarm } = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'))
function fixture() {
    const f = { mono: 0, wall: 1800000000000, fail: false, available: true, frozen: false, owner: 'player', attempts: 0, persisted: { farm: null, cash: 500, revision: 0, receipts: [] }, events: [], sequence: 0 }
    const id = () => 'assistant-' + ++f.sequence
    const clock = { wall: () => f.wall, monotonic: () => f.mono }
    f.service = new FarmService({ read: () => structuredClone(f.persisted), commit: snapshot => { f.attempts++; if (f.fail) throw Error('disk failed'); f.persisted = structuredClone(snapshot) } }, clock, id, () => 0)
    f.service.getView()
    f.assistant = new FarmAssistant(f.service, clock, () => f.available, () => f.frozen, () => f.owner, (status, event) => { if (event) f.events.push({ status, event }) }, id, 0, () => true)
    f.advance = ms => { f.mono += ms; f.wall += ms }
    return f
}
{
    const f = fixture()
    f.advance(cfg.idleMs - 1); f.assistant.tick()
    assert.equal(f.persisted.receipts.length, 0)
    f.advance(1); f.assistant.tick()
    assert.equal(f.persisted.farm.plots[0].plant.cropId, 'wheat')
    assert.equal(f.persisted.farm.seeds.wheat, 5)
    assert.equal(f.persisted.farm.tutorialRemaining, 5)
    f.assistant.tick(); assert.equal(f.persisted.receipts.length, 1)
    f.advance(cfg.actionMs); f.assistant.tick()
    assert.equal(f.persisted.farm.plots[0].plant.watered, true)
    assert.equal(f.persisted.receipts.length, 2)
    f.advance(4 * 60_000); f.assistant.tick()
    assert.equal(f.persisted.farm.produce.wheat, 3)
    f.advance(cfg.actionMs); f.assistant.tick()
    assert.equal(f.persisted.farm.produce.wheat, 0)
    assert.ok(f.persisted.cash > 500)
    assert.ok('remainingMs' in f.persisted.farm.orders[0])
    f.advance(cfg.actionMs); f.assistant.tick()
    assert.equal(f.persisted.farm.plots[0].plant.cropId, 'carrot')
    f.advance(cfg.actionMs); f.assistant.tick()
    assert.equal(f.assistant.getStatus().state, 'resting')
    assert.equal(f.persisted.farm.assistant.successfulActions, 0)
    assert.equal(f.persisted.farm.assistant.restUntil, f.wall + cfg.restMs)
    const receipts = f.persisted.receipts.length
    f.advance(cfg.restMs - 1); f.assistant.tick()
    assert.equal(f.persisted.receipts.length, receipts)
    f.advance(1); f.assistant.tick()
    assert.notEqual(f.assistant.getStatus().state, 'resting')
    assert.ok(f.events.some(e => e.event.kind === 'started'))
    assert.ok(f.events.some(e => e.event.kind === 'harvested'))
    assert.ok(f.events.some(e => e.event.kind === 'delivered'))
    assert.ok(f.events.some(e => e.event.kind === 'resting'))
    const command = { requestId: f.persisted.receipts[0].requestId, expectedRevision: 0, operation: { type: 'sow', cropId: 'wheat', plotIds: [0] } }
    const before = structuredClone(f.persisted)
    f.service.execute(command)
    assert.deepEqual(f.persisted, before, 'replayed assistant request cannot debit or reward again')
}
{
    const f = fixture(); f.advance(cfg.idleMs)
    f.assistant.manualActivity(); f.assistant.tick()
    assert.equal(f.persisted.receipts.length, 0)
    f.advance(cfg.idleMs - 1); f.assistant.tick(); assert.equal(f.persisted.receipts.length, 0)
    f.advance(1); f.assistant.tick(); assert.equal(f.persisted.receipts.length, 1)
    f.available = false; f.advance(cfg.actionMs); f.assistant.tick()
    assert.equal(f.assistant.getStatus().state, 'paused'); assert.equal(f.persisted.receipts.length, 1)
    f.available = true; f.frozen = true; f.assistant.tick()
    assert.equal(f.persisted.receipts.length, 1)
    f.frozen = false; f.assistant.tick()
    assert.equal(f.persisted.receipts.length, 2)
    f.owner = 'other'; f.advance(cfg.actionMs); f.assistant.tick()
    assert.equal(f.assistant.getStatus().state, 'waitingPlayer')
    assert.equal(f.persisted.receipts.length, 2)
}
{
    const f = fixture(); f.advance(cfg.idleMs); f.assistant.tick()
    assert.equal(f.persisted.farm.assistant.successfulActions, 1)
    f.assistant.manualActivity()
    assert.equal(f.persisted.farm.assistant.successfulActions, 0, 'player takeover clears the assistant work streak')
    assert.equal(f.persisted.farm.assistant.restUntil, 0)
    assert.equal(f.persisted.farm.assistant.lastManualAt, f.wall)
}
{
    const f = fixture(); f.advance(cfg.idleMs); f.assistant.tick()
    const before = structuredClone(f.persisted)
    f.fail = true; f.advance(cfg.actionMs); f.assistant.tick()
    assert.equal(f.assistant.getStatus().state, 'saveError')
    assert.deepEqual(f.persisted, before, 'failed write leaves seeds, plots, rewards and helper count intact')
    const attempts = f.attempts
    f.advance(60000); f.assistant.tick()
    assert.equal(f.attempts, attempts, 'does not keep retrying failed writes')
    assert.equal(f.events.filter(e => e.event.kind === 'harvested').length, 0)
    f.fail = false; f.service.checkpoint(); f.assistant.tick()
    assert.equal(f.persisted.farm.plots[0].plant.watered, true)
}
{
    const f = fixture()
    f.persisted.farm.seeds = { wheat: 0, carrot: 0 }
    f.advance(cfg.idleMs); f.assistant.tick()
    assert.equal(f.assistant.getStatus().state, 'missingSeeds')
    assert.equal(f.persisted.cash, 500)
    f.advance(60000); f.assistant.tick()
    assert.equal(f.events.filter(e => e.event.kind === 'missingSeeds').length, 1)
    f.persisted.farm.seeds.carrot = 1
    f.advance(30000); f.assistant.tick()
    assert.equal(f.persisted.farm.plots[0].plant.cropId, 'carrot', 'tries another order with available seeds')
}
{
    const f = fixture()
    for (const plot of f.persisted.farm.plots.slice(0, 6))
        plot.plant = { cropId: 'wheat', elapsedMs: 0, durationMs: 1800000, plantedAt: f.wall, watered: true }
    f.advance(cfg.idleMs); f.assistant.tick()
    assert.equal(f.assistant.getStatus().state, 'waitingGrowth', 'full farm waits rather than claiming seeds are missing')
    assert.equal(f.persisted.receipts.length, 0)
}
{
    const f = fixture()
    f.persisted.farm.plots[0].plant = { cropId: 'wheat', elapsedMs: 0, durationMs: 1800000, plantedAt: f.wall, watered: true }
    let plan = planFarmAssistant(f.service.getView())
    assert.equal(plan.operation?.type, 'sow')
    assert.equal(plan.operation?.cropId, 'carrot', 'does not duplicate wheat already in the ground')
    f.persisted.farm.produce.carrot = 3
    plan = planFarmAssistant(f.service.getView())
    assert.equal(plan.operation.type, 'deliver', 'ready order has priority over growing crops')
    f.persisted.farm.plots[0].plant.cropId = 'carrot'
    f.persisted.farm.plots[0].plant.durationMs = 7200000
    f.persisted.farm.plots[0].plant.elapsedMs = 7200000
    f.persisted.farm.orders = [{ instanceId: 'only-wheat', templateId: 'wheat-small' }, { remainingMs: 1800000 }, { remainingMs: 1800000 }]
    plan = planFarmAssistant(f.service.getView())
    assert.equal(plan.operation.type, 'sow', 'unrelated mature plants are not harvested')
    assert.equal(plan.operation.plotIds[0], 1)
    f.persisted.farm.orders = [{ remainingMs: 1800000 }, { remainingMs: 1800000 }, { remainingMs: 1800000 }]
    assert.equal(planFarmAssistant(f.service.getView()).status, 'waitingOrders')
}
{
    const f = fixture(); f.advance(cfg.idleMs); f.assistant.tick()
    f.assistant.suspend(true); f.advance(12 * 3600000); f.assistant.tick()
    assert.equal(f.persisted.receipts.length, 1)
    f.assistant.suspend(false); f.advance(cfg.actionMs); f.assistant.tick()
    assert.equal(f.persisted.receipts.length, 2, 'resume performs one current action rather than offline replay')
    const restarted = new FarmAssistant(f.service, { wall: () => f.wall, monotonic: () => f.mono }, () => true, () => false, () => 'player', () => {}, () => 'new', f.mono)
    restarted.tick(); assert.equal(f.persisted.receipts.length, 2, 'restart waits a fresh 15 minutes')
    const previous = f.persisted.farm.orders[0]
    f.service.execute({ requestId: 'user-discard', expectedRevision: f.persisted.revision, operation: { type: 'discard', instanceId: previous.instanceId } })
    assert.notEqual(planFarmAssistant(f.service.getView()).orderId, previous.instanceId, 'stale order is replanned')
}
{
    const d = new FarmDialogue(() => true)
    d.offer({ id: 'start', kind: 'started', at: 0 })
    assert.equal(d.next(0, false), 'started')
    d.offer({ id: 'start', kind: 'started', at: 0 }); assert.equal(d.next(30000, false), undefined)
    d.offer({ id: 'a', kind: 'harvested', at: 31000 })
    d.offer({ id: 'b', kind: 'harvested', at: 32000 })
    d.offer({ id: 'done', kind: 'delivered', at: 33000 })
    assert.equal(d.next(33000, false), 'delivered')
    assert.equal(d.next(63000, false), undefined, 'no speech backlog')
    d.offer({ id: 'rest', kind: 'resting', at: 64000 })
    assert.equal(d.next(64000, true), undefined, 'hunger and sleep take priority')
    assert.equal(d.next(95000, false), undefined, 'suppressed speech is not replayed')
    d.offer({ id: 'old', kind: 'missingSeeds', at: 0 })
    assert.equal(d.next(96000, false), undefined, 'old events expire')
}
{
    const dialogue = new FarmDialogue()
    for (const kind of ['started', 'missingSeeds', 'harvested', 'resting', 'delivered']) {
        dialogue.offer({ id: kind, kind, at: 0 })
        assert.equal(dialogue.next(0, false), undefined, 'disabled dialogue ignores leftover IPC events: ' + kind)
    }
    let enabled = true
    const queued = new FarmDialogue(() => enabled)
    queued.offer({ id: 'queued', kind: 'started', at: 0 })
    enabled = false
    assert.equal(queued.next(0, false), undefined, 'disabling clears already queued speech')
    enabled = true
    assert.equal(queued.next(0, false), undefined, 're-enabling cannot replay discarded speech')
    queued.offer({ id: 'new', kind: 'harvested', at: 0 })
    assert.equal(queued.next(0, false), 'harvested', 'explicitly enabled dialogue still works')
}
assert.deepEqual(farmWindowSize({ width: 1920, height: 1080 }), { width: 1280, height: 720 })
assert.deepEqual(farmWindowSize({ width: 900, height: 600 }), { width: 900, height: 506 })
assert.deepEqual(fixedFarmWindow, { resizable: false, maximizable: false, fullscreenable: false })
{
    const windowEvents = {}, displayEvents = {}, bounds = { x: 12, y: 16, width: 1280, height: 720 }
    let adjustments = 0
    const fakeWindow = { isDestroyed: () => false, webContents: { getURL: () => 'file:///farm.html#/farm' }, getBounds: () => bounds,
        setMinimumSize: () => {}, setBounds: value => { Object.assign(bounds, value); adjustments++ }, on: (name, callback) => { windowEvents[name] = callback }, once: () => {} }
    const fakeDisplay = { getDisplayMatching: () => ({ workArea: { x: 0, y: 0, width: 900, height: 600 } }),
        on: (name, callback) => { displayEvents[name] = callback }, removeListener: () => {} }
    observeFarmWorkArea(fakeWindow, fakeDisplay)
    assert.equal(windowEvents.move, undefined, 'dragging must not resize the window')
    assert.equal(typeof windowEvents.moved, 'function')
    windowEvents.moved()
    assert.deepEqual(bounds, { x: 0, y: 16, width: 900, height: 506 })
    windowEvents.moved()
    assert.equal(adjustments, 1, 'post-drag correction must settle after one update')
}
const invalid = fixture().persisted.farm
invalid.assistant = { successfulActions: 6, restUntil: 0, lastManualAt: 0 }
assert.throws(() => validateFarm(invalid), /助手/)
console.log('Farm assistant: startup timer without a farm window, real transactions, order planning, user takeover, rest, activity/freeze, failures, resume, deduplication, dialogue and window sizing: passed')
