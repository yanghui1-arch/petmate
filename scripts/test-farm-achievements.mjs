import assert from 'node:assert/strict'
import { build } from 'esbuild'

const bundled = await build({
    stdin: {
        contents: `
export { FarmService } from './src/main/modules/farm/service';
export { FarmAssistant } from './src/main/modules/farm/assistant';
export { FarmAchievementSync } from './src/main/modules/farm/achievementSync';
export { farmCatalog } from './src/main/modules/farm/catalog';
export { validateFarm } from './src/main/modules/farm/rules';
export { farmAchievementEntries, farmAchievementDefinitions } from './src/shared/farmAchievements';
export { farmAssistantEnabled, farmExperience } from './src/shared/farmExperience';
`,
        resolveDir: process.cwd()
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false
})
const {
    FarmService,
    FarmAssistant,
    FarmAchievementSync,
    farmCatalog,
    validateFarm,
    farmAchievementEntries,
    farmAchievementDefinitions,
    farmAssistantEnabled,
    farmExperience
} = await import(
    'data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64')
)

function fixture() {
    const f = {
        mono: 0,
        wall: 1800000000000,
        fail: false,
        sequence: 0,
        writes: 0,
        saved: [],
        state: { farm: null, cash: 100000, revision: 0, receipts: [] }
    }
    f.clock = { wall: () => f.wall, monotonic: () => f.mono }
    f.id = () => 'achievement-' + ++f.sequence
    f.repository = {
        read: () => structuredClone(f.state),
        commit: (state) => {
            f.writes++
            if (f.fail) throw Error('disk unavailable')
            f.state = structuredClone(state)
        }
    }
    f.service = new FarmService(
        f.repository,
        f.clock,
        f.id,
        () => 0,
        (farm) => f.saved.push(structuredClone(farm))
    )
    f.service.getView()
    f.run = (operation) =>
        f.service.execute({ requestId: f.id(), expectedRevision: f.state.revision, operation })
    f.plant = (plot, cropId) => {
        const crop = farmCatalog.crops.find((c) => c.id === cropId)
        f.state.farm.plots[plot].plant = {
            cropId,
            plantedAt: f.wall,
            durationMs: crop.minutes * 60000,
            elapsedMs: crop.minutes * 60000,
            watered: false
        }
    }
    return f
}
assert.equal(farmAchievementDefinitions.length, 12)
assert.equal(farmAssistantEnabled, false)
{
    const f = fixture(),
        events = []
    const assistant = new FarmAssistant(
        f.service,
        f.clock,
        () => true,
        () => false,
        () => 'player',
        (...event) => events.push(event),
        f.id,
        0
    )
    const before = structuredClone(f.state),
        writes = f.writes
    assistant.start()
    f.mono += farmExperience.idleMs + 24 * 3600000
    f.wall += f.mono
    assistant.tick()
    assistant.manualActivity()
    assistant.suspend(true)
    assistant.suspend(false)
    assistant.tick()
    assistant.stop()
    assert.deepEqual(
        f.state,
        before,
        'disabled helper cannot mutate plots, seeds, orders or metadata'
    )
    assert.equal(f.writes, writes, 'disabled manual reporting does not write the save')
    assert.equal(events.length, 0, 'disabled helper publishes no work or speech events')
    assert.equal(assistant.getStatus().state, 'paused')
    f.run({ type: 'sow', cropId: 'wheat', plotIds: [0] })
    f.run({ type: 'water', plotIds: [0] })
    f.mono += 4 * 60000
    f.wall += 4 * 60000
    f.run({ type: 'harvest', plotIds: [0] })
    f.run({ type: 'deliver', instanceId: f.state.farm.orders[0].instanceId })
    assert.equal(
        f.state.farm.achievements.completedOrders,
        1,
        'manual production and delivery stay available'
    )
}
for (const target of [1, 100, 500, 1000]) {
    const f = fixture()
    f.state.farm.achievements.harvestedPlots.wheat = target - 1
    f.plant(0, 'wheat')
    f.plant(1, 'wheat')
    const command = {
        requestId: f.id(),
        expectedRevision: f.state.revision,
        operation: { type: 'harvest', plotIds: [0, 1] }
    }
    f.service.execute(command)
    assert.equal(f.state.farm.achievements.harvestedPlots.wheat, target + 1)
    assert.equal(
        f.state.farm.harvests.wheat,
        6,
        'two plots yield six items but count as two harvests'
    )
    assert.ok(f.state.farm.achievements.unlocked.includes('ACH_FARM_HARVEST_' + target))
    const before = structuredClone(f.state)
    f.service.execute(command)
    assert.deepEqual(f.state, before, 'replayed harvest is not counted again')
    assert.throws(() => f.service.execute({ ...command, requestId: f.id() }), /资源已变化/)
}
for (const target of [1, 10, 100]) {
    const f = fixture()
    f.state.farm.achievements.completedOrders = target - 1
    f.state.farm.produce.wheat = 3
    f.run({ type: 'deliver', instanceId: f.state.farm.orders[0].instanceId })
    assert.equal(f.state.farm.achievements.completedOrders, target)
    assert.ok(f.state.farm.achievements.unlocked.includes('ACH_FARM_ORDER_' + target))
    f.run({ type: 'discard', instanceId: f.state.farm.orders[1].instanceId })
    assert.equal(
        f.state.farm.achievements.completedOrders,
        target,
        'discard is not a delivered order'
    )
}
{
    const f = fixture()
    f.state.farm.exp = 900
    for (const [index, crop] of farmCatalog.crops.entries()) {
        f.state.farm.achievements.harvestedPlots[crop.id] = 19
        f.plant(index, crop.id)
    }
    f.service.checkpoint()
    assert.ok(f.state.farm.achievements.unlocked.includes('ACH_FARM_DIVERSITY'))
    assert.ok(f.state.farm.achievements.unlocked.includes('ACH_FARM_FULL_FIELD'))
    f.run({ type: 'harvest', plotIds: [0, 1, 2, 3, 4, 5] })
    assert.ok(f.state.farm.achievements.unlocked.includes('ACH_FARM_COLLECTION'))
    assert.ok(f.state.farm.achievements.unlocked.includes('ACH_FARM_ALL_ROUNDER'))
    assert.ok(
        f.state.farm.achievements.unlocked.includes('ACH_FARM_DIVERSITY'),
        'temporary planting condition remains unlocked after harvest'
    )
    f.state.farm.seeds.wheat = 12
    f.run({ type: 'sow', cropId: 'wheat', plotIds: Array.from({ length: 12 }, (_, i) => i) })
    f.run({ type: 'water', plotIds: Array.from({ length: 11 }, (_, i) => i) })
    assert.equal(f.state.farm.achievements.unlocked.includes('ACH_FARM_WATERED_FIELD'), false)
    f.run({ type: 'water', plotIds: [11] })
    assert.ok(f.state.farm.achievements.unlocked.includes('ACH_FARM_WATERED_FIELD'))
    f.mono += 1800000
    f.wall += 1800000
    f.run({ type: 'harvest', plotIds: [0] })
    assert.ok(f.state.farm.achievements.unlocked.includes('ACH_FARM_WATERED_FIELD'))
}
{
    const f = fixture()
    f.plant(0, 'wheat')
    const before = structuredClone(f.state),
        saved = f.saved.length
    f.fail = true
    assert.throws(() => f.run({ type: 'harvest', plotIds: [0] }), /disk unavailable/)
    assert.deepEqual(f.state, before)
    assert.equal(f.saved.length, saved, 'failed save never calls external achievement sync')
    f.fail = false
    f.run({ type: 'harvest', plotIds: [0] })
    assert.equal(f.state.farm.achievements.harvestedPlots.wheat, 1)
    const restored = new FarmService(f.repository, f.clock, f.id)
    assert.ok(restored.getView().farm.achievements.unlocked.includes('ACH_FARM_HARVEST_1'))
}
{
    const f = fixture()
    delete f.state.farm.achievements
    f.state.farm.harvests = { wheat: 300, potato: 80, strawberry: 100 }
    f.service.checkpoint()
    assert.deepEqual(f.state.farm.achievements.harvestedPlots, {
        wheat: 100,
        carrot: 0,
        potato: 20,
        tomato: 0,
        strawberry: 20,
        pumpkin: 0
    })
    assert.equal(
        f.state.farm.achievements.completedOrders,
        0,
        'missing order history is not fabricated'
    )
    assert.ok(f.state.farm.achievements.unlocked.includes('ACH_FARM_HARVEST_100'))
    f.state.farm.achievements.completedOrders = -1
    assert.throws(() => validateFarm(f.state.farm), /成就/)
}
{
    const f = fixture()
    f.service = new FarmService(
        f.repository,
        f.clock,
        f.id,
        () => 0,
        () => {
            throw Error('Steam unavailable')
        }
    )
    f.plant(0, 'wheat')
    f.run({ type: 'harvest', plotIds: [0] })
    assert.equal(
        f.state.farm.produce.wheat,
        3,
        'external failure cannot invalidate a saved harvest'
    )
}

function steamFixture() {
    const f = {
        ready: true,
        names: farmAchievementDefinitions.map((d) => d.id),
        stats: new Map(farmAchievementDefinitions.map((d) => [d.stat, 0])),
        unlocked: new Set(),
        calls: [],
        failStore: false,
        rejectStat: false,
        failUnlock: false,
        errors: []
    }
    f.steam = {
        ready: () => f.ready,
        names: () => f.names,
        getStat: (name) => f.stats.get(name),
        setStat: (name, value) => {
            f.calls.push(['stat', name, value])
            if (f.rejectStat) return false
            f.stats.set(name, value)
            return true
        },
        achieved: async (id) => f.unlocked.has(id),
        unlock: async (id) => {
            if (f.failUnlock) throw Error('unlock unavailable')
            f.calls.push(['unlock', id])
            f.unlocked.add(id)
        },
        store: async () => {
            f.calls.push(['store'])
            if (f.failStore) throw Error('store unavailable')
        }
    }
    f.sync = new FarmAchievementSync(f.steam, (error) => f.errors.push(error))
    return f
}
function entriesAt(count) {
    const f = fixture()
    f.state.farm.achievements.harvestedPlots.wheat = count
    f.service.checkpoint()
    return farmAchievementEntries(f.state.farm, farmCatalog, 6)
}
{
    const f = steamFixture(),
        entries = entriesAt(101)
    f.ready = false
    await f.sync.sync('player', entries)
    assert.equal(f.calls.length, 0)
    f.ready = true
    f.names = []
    await f.sync.sync('player', entries)
    assert.equal(f.calls.length, 0)
    f.names = farmAchievementDefinitions.map((d) => d.id)
    f.failStore = true
    await f.sync.sync('player', entries)
    assert.equal(f.errors.length, 1)
    assert.equal(f.stats.get('FarmHarvestCount'), 101)
    f.failStore = false
    await f.sync.sync('player', entries)
    assert.equal(
        f.calls.filter((c) => c[0] === 'store').length,
        2,
        'failed StoreStats retries even after in-memory stats changed'
    )
    assert.equal(
        f.calls.filter((c) => c[0] === 'unlock').length,
        2,
        'only the 1 and 100 milestones unlock, no duplicate unlocks'
    )
    const calls = f.calls.length
    await f.sync.sync('player', entries)
    assert.equal(f.calls.length, calls, 'unchanged successful checkpoints do not repeatedly upload')
    f.stats.set('FarmHarvestCount', 2000)
    await f.sync.sync('player', entriesAt(110))
    assert.equal(f.stats.get('FarmHarvestCount'), 2000, 'Steam progress must never decrease')
}
{
    const f = steamFixture()
    f.stats.delete('FarmHarvestCount')
    await f.sync.sync('player', entriesAt(1))
    assert.equal(f.errors.length, 1)
    assert.equal(f.calls.length, 0)
    f.stats.set('FarmHarvestCount', 0)
    f.rejectStat = true
    await f.sync.sync('player', entriesAt(1))
    assert.equal(f.errors.length, 2)
    f.rejectStat = false
    f.failUnlock = true
    await f.sync.sync('player', entriesAt(1))
    assert.equal(f.errors.length, 3)
    f.failUnlock = false
    await f.sync.sync('player', entriesAt(1))
    assert.ok(f.unlocked.has('ACH_FARM_HARVEST_1'))
}
{
    const f = steamFixture()
    let release, entered
    const waiting = new Promise((resolve) => {
        entered = resolve
    })
    const blocker = new Promise((resolve) => {
        release = resolve
    })
    let first = true
    f.steam.store = async () => {
        f.calls.push(['store'])
        if (first) {
            first = false
            entered()
            await blocker
        }
    }
    const running = f.sync.sync('player', entriesAt(1))
    await waiting
    await f.sync.sync('player', entriesAt(100))
    await f.sync.sync('player', entriesAt(500))
    release()
    await running
    assert.equal(
        f.stats.get('FarmHarvestCount'),
        500,
        'in-flight checkpoints coalesce to the newest saved total'
    )
    assert.equal(f.calls.filter((c) => c[0] === 'store').length, 2)
}
console.log(
    'Farm achievements: 12 conditions, plot counts, orders, permanent unlocks, replay/save failure, disabled assistant, Steam retry/monotonic/coalescing: passed'
)
