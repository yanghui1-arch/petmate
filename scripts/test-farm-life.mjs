import assert from 'node:assert/strict'
import { build } from 'esbuild'
const bundle = await build({
    stdin: {
        contents: `export { FarmLife } from './src/main/modules/farm/life'; export { FarmService } from './src/main/modules/farm/service'; export { safeHelp, lifeChoices } from './src/main/modules/farm/lifeRules'; export { farmCatalog } from './src/main/modules/farm/catalog'; export { farmAchievementEntries } from './src/shared/farmAchievements'; export { ensureFarmLife, farmLifeConfig, validateFarmLife, farmLifePose } from './src/shared/farmLife'; export { FarmDiaryPlayback } from './src/renderer/utils/farmDiary'; export { farmLifeLine } from './src/renderer/utils/farmLifeText'; export { farmLifeCN, farmLifeTW, farmLifeEN } from './src/renderer/i18n/farm-life';`,
        resolveDir: process.cwd()
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false
})
const {
    FarmLife,
    FarmService,
    safeHelp,
    lifeChoices,
    farmCatalog,
    farmAchievementEntries,
    ensureFarmLife,
    farmLifeConfig: config,
    validateFarmLife,
    farmLifePose,
    FarmDiaryPlayback,
    farmLifeLine,
    farmLifeCN,
    farmLifeTW,
    farmLifeEN
} = await import(
    'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')
)
let checks = 0
function check(name, action) {
    try {
        action()
        checks++
        console.log('PASS ' + name)
    } catch (error) {
        throw new Error(name + ': ' + error.message)
    }
}
function fixture(enabled = true, random = () => 0) {
    const f = {
        mono: 0,
        wall: new Date(2026, 9, 2, 12).getTime(),
        seq: 0,
        fail: false,
        failResult: false,
        open: false,
        blocked: false,
        visible: true,
        published: [],
        restores: 0,
        snapshot: { farm: null, cash: 100000, revision: 0, receipts: [] }
    }
    f.id = () => 'life-' + ++f.seq
    f.clock = { wall: () => f.wall, monotonic: () => f.mono }
    f.repo = {
        read: () => structuredClone(f.snapshot),
        commit: (value) => {
            if (f.fail || (f.failResult && value.farm?.life?.active?.committed)) throw Error('disk full')
            f.snapshot = structuredClone(value)
        }
    }
    f.service = new FarmService(f.repo, f.clock, f.id, () => 0)
    f.service.getView()
    f.host = {
        available: () => f.visible,
        blocked: () => f.blocked,
        farmOpen: () => f.open,
        skin: () => 'school-uniform',
        publish: (view, speech) => {
            f.published.push(structuredClone({ view, speech }))
        },
        restore: () => {
            f.restores++
        }
    }
    f.controller = new FarmLife(f.service, f.clock, f.host, f.id, random, enabled)
    f.advance = (ms) => {
        f.mono += ms
        f.wall += ms
        f.controller.tick()
    }
    f.run = (operation) =>
        f.service.execute({ requestId: f.id(), expectedRevision: f.snapshot.revision, operation })
    f.enter = () => {
        f.open = true
        f.controller.farmEntered()
    }
    f.leave = () => {
        f.open = false
        f.controller.farmLeft()
    }
    f.depart = () => {
        f.controller.speechFinished(f.controller.getView().visit.id)
        assert.equal(f.controller.getView().visit.phase, 'leaving')
        f.advance(config.walkMs - 1)
        assert.equal(f.controller.getView().visit.phase, 'leaving', 'departure must finish before the pet is hidden')
        f.advance(1)
        assert.equal(f.controller.getView().visit.phase, 'visiting')
    }
    f.finish = () => {
        f.advance(60_000)
        assert.equal(f.controller.getView().visit.phase, 'exiting')
        f.advance(config.exitMs)
        assert.equal(f.controller.getView().visit.phase, 'returning')
        f.advance(config.returnMs)
        assert.equal(f.controller.getView().visit, null)
    }
    f.plant = (id, cropId = 'wheat', ripe = true) => {
        const crop = farmCatalog.crops.find((c) => c.id === cropId)
        f.snapshot.farm.plots[id].plant = {
            cropId,
            plantedAt: f.wall,
            durationMs: crop.minutes * 60_000,
            elapsedMs: ripe ? crop.minutes * 60_000 : 0,
            watered: false
        }
    }
    f.ordinary = () => {
        f.enter()
        f.leave()
        f.service.lifeTransaction(f.snapshot.revision, (data) => {
            data.tutorialDone = true
        })
        f.advance(config.idleMaxMs)
    }
    return f
}
check('the result commits immediately on departure; opening the farm never cancels or repeats it', () => {
    const f = fixture()
    f.run({ type: 'sow', cropId: 'carrot', plotIds: [0, 1, 2, 3] })
    f.ordinary()
    f.depart()
    assert.equal(f.controller.getView().visit.committed, true)
    assert.equal(f.snapshot.farm.life.events.length, 1)
    assert.equal(f.snapshot.farm.life.daily.watered, 3)
    f.enter()
    assert.equal(f.controller.getView().visit.cancelled, false)
    f.controller.farmReady()
    f.advance(1)
    assert.equal(f.snapshot.farm.life.events.length, 1)
})
check('no farm entry, open window, blocked pet and disabled switch prevent departures', () => {
    const f = fixture()
    f.advance(config.idleMs * 5)
    assert.equal(f.controller.getView().visit, null)
    f.enter()
    f.advance(config.idleMs * 5)
    assert.equal(f.controller.getView().visit, null)
    f.leave()
    f.blocked = true
    f.advance(config.idleMs * 5)
    assert.equal(f.controller.getView().visit, null)
    f.blocked = false
    f.advance(1)
    assert.ok(f.controller.getView().visit)
    const off = fixture(false)
    off.ordinary()
    assert.equal(off.controller.getView().visit, null)
    assert.equal(off.published.length, 0)
})
check('tutorial waters a bounded subset, saves outcome/quota/diary together, returns once', () => {
    const f = fixture()
    f.run({ type: 'sow', cropId: 'carrot', plotIds: [0, 1, 2, 3, 4, 5] })
    f.enter()
    f.leave()
    f.advance(config.tutorialMs)
    assert.equal(f.controller.getView().visit.kind, 'water')
    assert.equal(f.controller.getView().visit.skin, 'school-uniform')
    assert.equal(f.snapshot.farm.life.daily.trips, 0)
    f.depart()
    assert.equal(f.snapshot.farm.life.daily.trips, 1)
    f.advance(1)
    const life = f.snapshot.farm.life
    assert.equal(life.daily.watered, 3)
    assert.equal(life.events.length, 1)
    assert.equal(life.events[0].plots, 3)
    assert.equal(f.snapshot.farm.plots.filter((p) => p.plant?.wateredBy === 'helper').length, 3)
    assert.equal(
        farmAchievementEntries(f.snapshot.farm, farmCatalog, 6).find((e) => e.metric === 'watered')
            .value,
        0
    )
    f.advance(500)
    assert.equal(f.snapshot.farm.life.events.length, 1)
    f.finish()
    assert.equal(f.snapshot.farm.life.tutorialDone, true)
    assert.equal(f.published.filter((e) => e.speech?.stage === 'return').length, 1)
    f.advance(config.tutorialMs)
    assert.equal(f.snapshot.farm.life.daily.trips, 1)
})
check('departure waits for its own finished dialogue; stale acknowledgements and timeouts cannot start it', () => {
    const f = fixture()
    f.ordinary()
    const visit = f.controller.getView().visit
    f.advance(8_000)
    assert.equal(f.controller.getView().visit.phase, 'preparing', 'eight seconds cannot interrupt unread speech')
    f.controller.speechFinished('older-visit')
    assert.equal(f.controller.getView().visit.phase, 'preparing')
    f.controller.speechFinished(visit.id)
    assert.equal(f.controller.getView().visit.phase, 'leaving', 'dialogue completion immediately starts costume scan')
    f.advance(500)
    f.controller.speechFinished(visit.id)
    f.advance(config.walkMs - 501)
    assert.equal(f.controller.getView().visit.phase, 'leaving', 'duplicate completion cannot restart the departure')
    f.advance(1)
    assert.equal(f.controller.getView().visit.phase, 'visiting')
    const timeout = fixture()
    timeout.ordinary()
    const expired = timeout.controller.getView().visit.id
    timeout.advance(config.speechTimeoutMs)
    assert.equal(timeout.controller.getView().visit, null)
    timeout.controller.speechFinished(expired)
    assert.equal(timeout.controller.getView().visit, null)
    assert.equal(timeout.snapshot.farm.life.daily.trips, 0)
    const blocked = fixture()
    blocked.ordinary()
    const id = blocked.controller.getView().visit.id
    blocked.blocked = true
    blocked.controller.speechFinished(id)
    assert.equal(blocked.controller.getView().visit, null)
})
check(
    'before departure cancellation consumes no quota; farm arrival preserves the committed visit',
    () => {
        const f = fixture()
        f.ordinary()
        f.controller.activity()
        assert.equal(f.controller.getView().visit, null)
        assert.equal(f.snapshot.farm.life.daily.trips, 0)
        f.advance(config.idleMs)
        f.depart()
        const trip = f.controller.getView().visit.id
        f.enter()
        assert.equal(f.controller.getView().visit.id, trip)
        assert.equal(f.controller.getView().visit.cancelled, false)
        f.advance(1)
        assert.equal(f.snapshot.farm.life.events[0].interrupted, false)
        f.leave()
        f.enter()
        assert.equal(f.snapshot.farm.life.daily.trips, 1)
        f.finish()
    }
)
check('opening after commit and re-entering never duplicates resources, trip or event', () => {
    const f = fixture()
    f.run({ type: 'sow', cropId: 'carrot', plotIds: [0, 1, 2, 3] })
    f.ordinary()
    f.depart()
    f.advance(1)
    const before = structuredClone(f.snapshot.farm.life.daily)
    f.enter()
    f.leave()
    f.enter()
    f.advance(300)
    assert.deepEqual(f.snapshot.farm.life.daily, before)
    assert.equal(f.snapshot.farm.life.events.length, 1)
    f.finish()
})
check('first harvest and 99/499/999 crossings are reserved for player', () => {
    for (const count of [0, 99, 499, 999]) {
        const f = fixture()
        for (let id = 0; id < 6; id++) f.plant(id)
        f.snapshot.farm.achievements.harvestedPlots.wheat = count
        if (count) f.snapshot.farm.achievements.manualHarvestedPlots = { wheat: 1 }
        f.service.checkpoint()
        assert.deepEqual(
            safeHelp(
                f.snapshot.farm,
                f.snapshot.cash,
                { type: 'harvest', plotIds: [0, 1] },
                f.wall
            ),
            []
        )
        f.run({ type: 'harvest', plotIds: [0] })
        assert.ok(f.snapshot.farm.achievements.unlocked.includes('ACH_FARM_HARVEST_' + (count + 1)))
    }
})
check('498 can become 499, never 500; unlocked milestones do not block later help', () => {
    const f = fixture()
    f.snapshot.farm.achievements.harvestedPlots.wheat = 498
    f.snapshot.farm.achievements.manualHarvestedPlots = { wheat: 1 }
    for (let id = 0; id < 6; id++) f.plant(id)
    f.service.checkpoint()
    assert.deepEqual(
        safeHelp(f.snapshot.farm, f.snapshot.cash, { type: 'harvest', plotIds: [0, 1] }, f.wall),
        [0]
    )
    assert.throws(
        () =>
            f.service.lifeTransaction(f.snapshot.revision, () => {}, {
                type: 'harvest',
                plotIds: [0, 1]
            }),
        /亲自/
    )
    f.service.lifeTransaction(f.snapshot.revision, () => {}, { type: 'harvest', plotIds: [0] })
    assert.equal(f.snapshot.farm.achievements.harvestedPlots.wheat, 499)
    f.run({ type: 'harvest', plotIds: [1] })
    assert.deepEqual(
        safeHelp(f.snapshot.farm, f.snapshot.cash, { type: 'harvest', plotIds: [2] }, f.wall),
        [2]
    )
})
check('helper experience cannot unlock the full field achievement', () => {
    const f = fixture()
    f.snapshot.farm.exp = farmCatalog.levels[4] - 1
    f.snapshot.farm.achievements.harvestedPlots.wheat = 5
    f.snapshot.farm.achievements.manualHarvestedPlots = { wheat: 1 }
    f.plant(0)
    f.plant(1)
    f.service.checkpoint()
    assert.deepEqual(
        safeHelp(f.snapshot.farm, f.snapshot.cash, { type: 'harvest', plotIds: [0] }, f.wall),
        []
    )
    f.run({ type: 'harvest', plotIds: [0] })
    assert.ok(f.snapshot.farm.achievements.unlocked.includes('ACH_FARM_FULL_FIELD'))
})
check(
    'six species helper harvests do not count; manual counts alone unlock collection and all-rounder',
    () => {
        const f = fixture()
        f.snapshot.farm.exp = 900
        f.snapshot.farm.achievements.harvestedPlots.wheat = 5
        f.snapshot.farm.achievements.manualHarvestedPlots = { wheat: 1 }
        for (const [id, crop] of farmCatalog.crops.entries()) {
            f.plant(id, crop.id)
            f.snapshot.farm.achievements.manualHarvestedPlots[crop.id] = 19
        }
        f.service.checkpoint()
        f.service.lifeTransaction(f.snapshot.revision, () => {}, {
            type: 'harvest',
            plotIds: [0, 1, 2, 3, 4, 5]
        })
        assert.equal(
            farmAchievementEntries(f.snapshot.farm, farmCatalog, 12).find(
                (e) => e.metric === 'minimum'
            ).value,
            19
        )
        for (const [id, crop] of farmCatalog.crops.entries()) f.plant(id, crop.id)
        f.run({ type: 'harvest', plotIds: [0, 1, 2, 3, 4, 5] })
        assert.ok(f.snapshot.farm.achievements.unlocked.includes('ACH_FARM_ALL_ROUNDER'))
        const unknown = fixture()
        unknown.snapshot.farm.achievements.manualHarvestedPlots = {}
        unknown.snapshot.farm.achievements.harvestedPlots = Object.fromEntries(
            farmCatalog.crops.map((c) => [c.id, 20])
        )
        unknown.service.checkpoint()
        assert.equal(
            farmAchievementEntries(unknown.snapshot.farm, farmCatalog, 6).find(
                (e) => e.metric === 'collection'
            ).value,
            0
        )
    }
)
check('11 manual waters + 1 helper stays 11; new crop cycle resets provenance', () => {
    const f = fixture()
    f.snapshot.farm.exp = 900
    f.snapshot.farm.seeds.carrot = 12
    f.service.checkpoint()
    f.run({ type: 'sow', cropId: 'carrot', plotIds: Array.from({ length: 12 }, (_, i) => i) })
    f.run({ type: 'water', plotIds: Array.from({ length: 11 }, (_, i) => i) })
    f.service.lifeTransaction(f.snapshot.revision, () => {}, { type: 'water', plotIds: [11] })
    assert.equal(
        farmAchievementEntries(f.snapshot.farm, farmCatalog, 12).find((e) => e.metric === 'watered')
            .value,
        11
    )
    assert.throws(() => f.run({ type: 'water', plotIds: [11] }), /没有符合/)
    f.advance(120 * 60_000)
    f.run({ type: 'harvest', plotIds: [11] })
    f.snapshot.farm.seeds.carrot = 1
    f.run({ type: 'sow', cropId: 'carrot', plotIds: [11] })
    assert.equal(f.snapshot.farm.plots[11].plant.wateredBy, undefined)
    f.run({ type: 'water', plotIds: [11] })
    assert.ok(f.snapshot.farm.achievements.unlocked.includes('ACH_FARM_WATERED_FIELD'))
})
check('failure and revision conflict keep resources, quotas, diary and achievements atomic', () => {
    const f = fixture()
    f.run({ type: 'sow', cropId: 'carrot', plotIds: [0, 1, 2, 3] })
    f.ordinary()
    f.controller.speechFinished(f.controller.getView().visit.id)
    const before = structuredClone(f.snapshot)
    f.fail = true
    f.advance(config.walkMs)
    assert.deepEqual(f.snapshot, before)
    assert.equal(f.controller.getView().visit, null)
    assert.equal(f.published.filter((p) => p.speech?.stage === 'return').length, 0)
    assert.ok(f.restores)
    f.fail = false
    assert.throws(
        () => f.service.lifeTransaction(before.revision - 1, (data) => (data.flower = true)),
        /资源已变化/
    )
})
check('revalidation discards watered targets', () => {
    const f = fixture()
    f.run({ type: 'sow', cropId: 'carrot', plotIds: [0, 1, 2, 3] })
    f.ordinary()
    f.run({ type: 'water', plotIds: [0, 1, 2] })
    f.depart()
    assert.equal(f.snapshot.farm.life.daily.watered, 0)
    assert.equal(f.snapshot.farm.life.events[0].interrupted, true)
})
check('recall and suspend after departure preserve the single already committed result', () => {
    for (const suspend of [false, true]) {
        const f = fixture()
        f.run({ type: 'sow', cropId: 'carrot', plotIds: [0, 1, 2, 3] })
        f.ordinary()
        f.depart()
        if (suspend) f.controller.suspend(true)
        else {
            f.controller.recall()
            f.advance(100)
        }
        assert.equal(f.snapshot.farm.life.events.length, 1)
        assert.equal(f.snapshot.farm.life.events[0].interrupted, false)
        assert.equal(f.snapshot.farm.life.daily.watered, 3)
        assert.equal(f.snapshot.farm.plots.filter((plot) => plot.plant?.watered).length, 3)
        if (suspend) {
            assert.equal(f.controller.getView().visit, null)
            f.advance(86_400_000)
            assert.equal(f.snapshot.farm.life.events.length, 1)
            f.controller.suspend(false)
            f.advance(100)
            assert.equal(f.controller.getView().visit, null)
        } else {
            f.advance(config.exitMs)
            f.advance(config.returnMs)
            assert.equal(f.controller.getView().visit, null)
        }
    }
})
check('one bounded schedule has no probability tail; touches only protect briefly, formal activity reschedules', () => {
    for (const value of [0, 0.5, 0.999]) {
        let calls = 0
        const f = fixture(true, () => { calls++; return value })
        f.enter()
        f.leave()
        f.service.lifeTransaction(f.snapshot.revision, data => { data.tutorialDone = true })
        const delay = config.idleMs + value * (config.idleMaxMs - config.idleMs)
        const before = calls
        f.advance(delay - 1)
        f.controller.tick()
        assert.equal(calls, before, 'waiting never rerolls the deadline')
        assert.equal(f.controller.getView().visit, null)
        f.controller.interaction()
        f.advance(1)
        assert.equal(f.controller.getView().visit, null)
        f.advance(config.interactionMs - 1)
        assert.ok(f.controller.getView().visit, 'touch does not start another twenty-minute wait')
        f.controller.activity()
        assert.equal(f.controller.getView().visit, null)
        f.advance(delay - 1)
        assert.equal(f.controller.getView().visit, null)
        f.advance(1)
        assert.ok(f.controller.getView().visit)
    }
})
check(
    'order help uses real missing ripe crops, normal inventory, and never delivers or sells',
    () => {
        const f = fixture(true, () => 0.2)
        f.snapshot.farm.achievements.harvestedPlots.wheat = 5
        f.snapshot.farm.achievements.manualHarvestedPlots = { wheat: 1 }
        const template = farmCatalog.orders.find(
            (order) => Object.keys(order.requirements).length === 1 && order.requirements.wheat
        )
        f.snapshot.farm.orders = [
            { instanceId: 'target-order', templateId: template.id },
            { remainingMs: 1800000 },
            { remainingMs: 1800000 }
        ]
        for (let id = 0; id < 6; id++) f.plant(id)
        f.snapshot.farm.produce.wheat = Math.max(0, template.requirements.wheat - 1)
        f.service.checkpoint()
        const choices = lifeChoices(f.service.getView(), f.wall, () => 0.2),
            order = choices.find((choice) => choice.kind === 'order')
        assert.ok(order)
        assert.equal(order.plotIds.length, 1)
        // Skip harvest in the recent memory so the weighted choice selects the order.
        const life = ensureFarmLife(f.snapshot.farm, f.wall)
        life.recent = ['harvest']
        f.ordinary()
        assert.equal(f.controller.getView().visit.kind, 'order')
        const before = f.snapshot.cash
        f.depart()
        f.advance(1)
        assert.equal(f.snapshot.cash, before)
        assert.equal(f.snapshot.farm.orders[0].instanceId, 'target-order')
        assert.equal(f.snapshot.farm.achievements.completedOrders, 0)
        const event = f.snapshot.farm.life.events[0]
        assert.equal(event.orderReady, true)
        assert.equal(event.items.wheat, farmCatalog.crops.find((c) => c.id === 'wheat').yield)
        assert.ok(f.snapshot.farm.produce.wheat >= template.requirements.wheat)
        assert.equal(f.snapshot.farm.plots.filter((plot) => plot.plant).length, 5)
        const stale = fixture(true, () => 0.2)
        stale.seq = 100
        stale.snapshot = structuredClone(f.snapshot)
        stale.snapshot.farm.life.active = null
        stale.snapshot.farm.life.recent = ['harvest']
        stale.snapshot.farm.life.daily = { trips: 0, work: 0, life: 0, watered: 0, harvested: 0 }
        stale.snapshot.farm.produce.wheat = 0
        stale.ordinary()
        assert.equal(stale.controller.getView().visit.kind, 'order')
        stale.snapshot.farm.orders = Array.from({ length: 3 }, () => ({ remainingMs: 1800000 }))
        stale.depart()
        assert.equal(stale.snapshot.farm.life.events.at(-1).interrupted, true)
        assert.equal(stale.snapshot.farm.produce.wheat, 0)
    }
)
check('harvest fractions preserve mature fields and daily remaining quota', () => {
    for (const count of [2, 3, 5, 6]) {
        const f = fixture()
        f.snapshot.farm.achievements.harvestedPlots.wheat = 5
        f.snapshot.farm.achievements.manualHarvestedPlots = { wheat: 1 }
        for (let id = 0; id < count; id++) f.plant(id)
        f.service.checkpoint()
        const choice = lifeChoices(f.service.getView(), f.wall, () => 0).find(
            (choice) => choice.kind === 'harvest'
        )
        assert.ok(choice.plotIds.length >= Math.ceil(count * 0.25))
        assert.ok(choice.plotIds.length <= Math.floor(count * 0.5))
        assert.ok(choice.plotIds.length < count)
        const data = ensureFarmLife(f.snapshot.farm, f.wall)
        data.daily.harvested = 2
        assert.equal(
            lifeChoices(f.service.getView(), f.wall, () => 0).find(
                (choice) => choice.kind === 'harvest'
            ).plotIds.length,
            1
        )
    }
})
check('day reset and clock rollback do not refund quotas; 7-day cleanup preserves flower', () => {
    const f = fixture(),
        data = ensureFarmLife(f.snapshot.farm, f.wall)
    data.daily.trips = 4
    data.flower = true
    const oldDay = data.day
    ensureFarmLife(f.snapshot.farm, f.wall - 86_400_000)
    assert.equal(data.day, oldDay)
    assert.equal(data.daily.trips, 4)
    data.events.push({
        id: 'old',
        at: f.wall,
        day: data.day,
        kind: 'flower',
        plots: 0,
        items: {},
        line: 0,
        shown: false,
        interrupted: false,
        orderReady: false
    })
    ensureFarmLife(f.snapshot.farm, f.wall + 7 * 86_400_000)
    assert.equal(data.daily.trips, 0)
    assert.equal(data.events.length, 0)
    assert.equal(data.flower, true)
    assert.throws(
        () => validateFarmLife({ ...data, daily: { ...data.daily, watered: -1 } }),
        /无效/
    )
})
check('quota ceilings, one ripe plot and manual-first requirement restrict choices', () => {
    const f = fixture()
    const data = ensureFarmLife(f.snapshot.farm, f.wall)
    f.plant(0)
    assert.equal(
        lifeChoices(f.service.getView(), f.wall, () => 0).some((c) => c.kind === 'harvest'),
        false
    )
    data.daily.trips = 4
    data.daily.work = 3
    data.daily.life = 1
    assert.deepEqual(
        lifeChoices(f.service.getView(), f.wall, () => 0),
        []
    )
})
check('permanent flower requires tutorial and 3 trips, uses a life trip with no resources', () => {
    const f = fixture()
    f.enter()
    f.leave()
    f.service.lifeTransaction(f.snapshot.revision, (data) => {
        data.tutorialDone = true
        data.trips = 3
    })
    f.advance(config.idleMs)
    assert.equal(f.controller.getView().visit.kind, 'flower')
    const before = f.snapshot.cash
    f.depart()
    f.advance(1)
    assert.equal(f.snapshot.farm.life.flower, true)
    assert.equal(f.snapshot.farm.life.daily.life, 1)
    assert.equal(f.snapshot.cash, before)
    f.finish()
})
check(
    'late farm entry and scene readiness give full playback, repeated readiness adds no work or delay',
    () => {
        const f = fixture()
        f.ordinary()
        f.depart()
        const events = f.snapshot.farm.life.events.length
        f.advance(config.minVisitMs - 1_000)
        f.enter()
        f.advance(500)
        f.controller.farmReady()
        const deadline = f.controller.getView().visit.returnAt
        f.advance(500)
        f.controller.farmReady()
        assert.equal(f.controller.getView().visit.returnAt, deadline)
        f.advance(config.watchGraceMs - 501)
        assert.equal(f.controller.getView().visit.phase, 'visiting')
        f.advance(1)
        assert.equal(f.controller.getView().visit.phase, 'exiting')
        assert.equal(f.snapshot.farm.life.events.length, events)
        f.advance(config.exitMs)
        f.advance(config.returnMs)
        const blocked = fixture()
        blocked.ordinary()
        blocked.depart()
        blocked.blocked = true
        blocked.advance(100)
        assert.equal(blocked.controller.getView().visit.phase, 'exiting')
    }
)
check('farm entry during the hidden exit second and re-entry both show the same visit, recall takes priority', () => {
    const f = fixture()
    f.run({ type: 'sow', cropId: 'carrot', plotIds: [0, 1, 2, 3] })
    f.ordinary()
    f.depart()
    f.advance(config.minVisitMs)
    assert.equal(f.controller.getView().visit.phase, 'exiting')
    f.advance(config.exitMs - 1)
    f.enter()
    f.controller.farmReady()
    assert.equal(f.controller.getView().visit.phase, 'visiting')
    const id = f.controller.getView().visit.id
    f.advance(config.watchGraceMs - 1)
    f.leave()
    f.enter()
    f.controller.farmReady()
    assert.equal(f.controller.getView().visit.id, id)
    f.advance(config.watchGraceMs - 1)
    assert.equal(f.controller.getView().visit.phase, 'visiting')
    assert.equal(f.snapshot.farm.life.events.length, 1)
    assert.equal(f.snapshot.farm.life.daily.trips, 1)
    f.controller.recall()
    f.advance(1)
    assert.equal(f.controller.getView().visit.phase, 'exiting')
    f.leave()
    f.enter()
    f.controller.farmReady()
    f.advance(config.exitMs)
    assert.equal(f.controller.getView().visit.phase, 'returning')
})
check('interrupted tutorials retry after return and only a saved valid outcome completes the lesson', () => {
    const f = fixture()
    f.run({ type: 'sow', cropId: 'carrot', plotIds: [0, 1, 2, 3] })
    f.enter()
    f.leave()
    f.advance(config.tutorialMs)
    f.controller.interaction()
    assert.equal(f.snapshot.farm.life.tutorialDone, false)
    assert.equal(f.snapshot.farm.life.tutorialPending, true)
    assert.equal(f.snapshot.farm.life.daily.trips, 0)
    f.advance(config.tutorialMs)
    assert.equal(f.controller.getView().visit.tutorial, true)
    // Change the latest targets without sending the normal cancellation IPC, to exercise commit revalidation.
    f.run({ type: 'water', plotIds: [0, 1, 2, 3] })
    f.depart()
    assert.equal(f.snapshot.farm.life.events[0].interrupted, true)
    assert.equal(f.snapshot.farm.life.daily.watered, 0)
    assert.equal(f.snapshot.farm.life.tutorialDone, false)
    f.finish()
    assert.equal(f.snapshot.farm.life.tutorialDone, false, 'returning is not tutorial completion')
    f.advance(config.tutorialMs - 1)
    assert.equal(f.controller.getView().visit, null)
    f.advance(1)
    assert.equal(f.controller.getView().visit.tutorial, true)
    assert.equal(isWork(f.controller.getView().visit.kind), false)
    f.depart()
    assert.equal(f.snapshot.farm.life.tutorialDone, true, 'a saved no-reward life visit is a valid tutorial')
    assert.equal(f.snapshot.farm.life.tutorialPending, false)
})
function isWork(kind) { return ['water', 'harvest', 'order'].includes(kind) }
check('a failed tutorial result save preserves pending status and retries after restart without partial rewards', () => {
    const f = fixture()
    f.run({ type: 'sow', cropId: 'carrot', plotIds: [0, 1, 2, 3] })
    f.enter()
    f.leave()
    f.advance(config.tutorialMs)
    f.controller.speechFinished(f.controller.getView().visit.id)
    f.failResult = true
    f.advance(config.walkMs)
    assert.equal(f.controller.getView().visit, null)
    assert.equal(f.snapshot.farm.life.tutorialDone, false)
    assert.equal(f.snapshot.farm.life.tutorialPending, true)
    assert.equal(f.snapshot.farm.life.daily.trips, 1, 'an actual departed work trip retains its reserved type')
    assert.equal(f.snapshot.farm.life.daily.work, 1)
    assert.equal(f.snapshot.farm.life.daily.life, 0)
    assert.equal(f.snapshot.farm.life.daily.watered, 0)
    assert.equal(f.snapshot.farm.life.events.length, 0)
    assert.ok(f.snapshot.farm.plots.every(plot => !plot.plant?.watered))
    f.failResult = false
    f.service.checkpoint()
    const recovered = new FarmLife(f.service, f.clock, f.host, f.id, () => 0)
    recovered.start()
    try {
        f.mono += config.tutorialMs
        f.wall += config.tutorialMs
        recovered.tick()
        assert.equal(recovered.getView().visit.tutorial, true)
        assert.equal(f.snapshot.farm.life.events.length, 0)
        recovered.speechFinished(recovered.getView().visit.id)
        f.mono += config.walkMs
        f.wall += config.walkMs
        recovered.tick()
        assert.equal(f.snapshot.farm.life.tutorialDone, true)
        assert.equal(f.snapshot.farm.life.events.length, 1)
        assert.equal(f.snapshot.farm.life.daily.watered, 3)
    } finally { recovered.stop() }
})
check('crashing before tutorial departure remains pending and costs no trip', () => {
    const f = fixture()
    f.enter()
    f.leave()
    f.advance(config.tutorialMs)
    f.controller.speechFinished(f.controller.getView().visit.id)
    const recovered = new FarmLife(f.service, f.clock, f.host, f.id, () => 0)
    recovered.start()
    try {
        assert.equal(f.snapshot.farm.life.active, null)
        assert.equal(f.snapshot.farm.life.tutorialDone, false)
        f.mono += config.tutorialMs
        f.wall += config.tutorialMs
        recovered.tick()
        assert.equal(recovered.getView().visit.tutorial, true)
        assert.equal(f.snapshot.farm.life.daily.trips, 0)
    } finally { recovered.stop() }
})
check('only real productive visits use sweat; life visits and interrupted work use existing rest poses', () => {
    for (const kind of ['water', 'harvest', 'order']) {
        assert.equal(farmLifePose(kind), 'sweat')
        assert.equal(farmLifePose(kind, true), 'door')
    }
    assert.equal(farmLifePose('rest'), 'door')
    assert.equal(farmLifePose('check'), 'door')
    for (const kind of ['seedlings', 'butterfly', 'walk', 'flower'])
        assert.equal(farmLifePose(kind), 'bridge')
})
check('restart clears pending identity without replaying work; budget remains consumed', () => {
    const f = fixture()
    f.ordinary()
    f.depart()
    const before = f.snapshot.farm.life.daily.trips
    const recovered = new FarmLife(f.service, f.clock, f.host, f.id, () => 0)
    recovered.start()
    recovered.stop()
    assert.equal(f.snapshot.farm.life.active, null)
    assert.equal(f.snapshot.farm.life.daily.trips, before)
    assert.equal(f.snapshot.farm.life.events.length, 1)
})
check('crash after tutorial commit cannot repeat the guaranteed lesson on restart', () => {
    const f = fixture()
    f.run({ type: 'sow', cropId: 'carrot', plotIds: [0, 1, 2, 3] })
    f.enter()
    f.leave()
    f.advance(config.tutorialMs)
    f.depart()
    f.advance(1)
    assert.equal(f.snapshot.farm.life.tutorialDone, true)
    assert.equal(f.snapshot.farm.life.tutorialPending, false)
    const recovered = new FarmLife(f.service, f.clock, f.host, f.id, () => 0)
    recovered.start()
    f.mono += config.tutorialMs
    f.wall += config.tutorialMs
    recovered.tick()
    assert.equal(recovered.getView().visit, null)
    assert.equal(f.snapshot.farm.life.events.length, 1)
    assert.equal(f.snapshot.farm.life.daily.trips, 1)
    recovered.stop()
})
check(
    'diary shows latest five in chronological order, visible 2.8s, pauses and retries acknowledgements',
    () => {
        const events = Array.from({ length: 8 }, (_, i) => ({ id: '' + i, shown: false }))
        const player = new FarmDiaryPlayback()
        player.update(events)
        assert.equal(player.current(events), '3')
        assert.equal(player.hidden('4', '3'), true)
        assert.deepEqual(player.step(events, new Set(['3']), 2_000, false), [])
        assert.deepEqual(player.step(events, new Set(['3']), 10_000, true), [])
        assert.deepEqual(player.step(events, new Set(['3']), 800, false), ['3'])
        assert.equal(player.current(events), '4')
        player.retry('3')
        assert.equal(player.current(events), '3')
        assert.equal(player.acknowledged.has('0'), false)
        const reentered = new FarmDiaryPlayback()
        events[3].shown = true
        reentered.update(events)
        assert.equal(reentered.current(events), '4')
    }
)
check(
    'every reviewed phrase remains reachable, with stable event wording in all three locales',
    () => {
        for (const messages of [farmLifeCN, farmLifeTW, farmLifeEN]) {
            const t = (key, values = {}) => {
                const text = key
                    .split('.')
                    .slice(1)
                    .reduce((value, part) => value[part], messages)
                assert.equal(typeof text, 'string', 'missing translation: ' + key)
                return text.replace(/\{count\}/g, String(values.count))
            }
            for (const stage of ['start', 'return', 'diary']) {
                for (const kind of Object.keys(farmLifeCN[stage])) {
                    assert.equal(messages[stage][kind].length, farmLifeCN[stage][kind].length)
                    const expected = new Set(
                        messages[stage][kind].map((line) => line.replace(/\{count\}/g, '3'))
                    )
                    const seen = new Set()
                    for (let index = 0; index < 200; index++) {
                        const event = {
                            id: 'phrase-' + index,
                            kind,
                            plots: 3,
                            line: stage === 'start' ? index % expected.size : 0
                        }
                        const line = farmLifeLine(event, stage, t)
                        assert.equal(
                            farmLifeLine(event, stage, t),
                            line,
                            'rerender must keep the same wording'
                        )
                        seen.add(line)
                    }
                    assert.deepEqual(
                        seen,
                        expected,
                        kind + '/' + stage + ': all variants must be selectable'
                    )
                }
            }
            const event = { id: 'ready-order', kind: 'order', plots: 2, line: 0, orderReady: true }
            assert.ok(farmLifeLine(event, 'return', t).endsWith(' ' + messages.ready))
            assert.equal(
                farmLifeLine({ ...event, interrupted: true }, 'diary', t),
                messages.interrupted
            )
        }
    }
)
console.log(`farm life: ${checks} isolated behavioral groups passed`)
