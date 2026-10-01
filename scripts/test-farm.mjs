import assert from 'node:assert/strict'
import { build } from 'esbuild'

const bundled = await build({ entryPoints: ['src/main/modules/farm/service.ts'], bundle: true, platform: 'node', format: 'esm', write: false })
const { FarmService } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`)
const bundledRules = await build({ entryPoints: ['src/main/modules/farm/rules.ts'], bundle: true, platform: 'node', format: 'esm', write: false })
const { plantStage } = await import(`data:text/javascript;base64,${Buffer.from(bundledRules.outputFiles[0].text).toString('base64')}`)
const bundledCatalog = await build({ entryPoints: ['src/main/modules/farm/catalog.ts'], bundle: true, platform: 'node', format: 'esm', write: false })
const { orderCash } = await import(`data:text/javascript;base64,${Buffer.from(bundledCatalog.outputFiles[0].text).toString('base64')}`)

let wall = 1_800_000_000_000
let mono = 1000
let persisted = { farm: null, cash: 500, revision: 0, receipts: [] }
let fail = false
let serial = 0
const repo = {
  read: () => structuredClone(persisted),
  commit(snapshot) { if (fail) throw new Error('disk unavailable'); persisted = structuredClone(snapshot) }
}
const service = new FarmService(repo, { wall: () => wall, monotonic: () => mono }, () => `test-${++serial}`, () => 0)
const advance = ms => { wall += ms; mono += ms }
const command = (operation, requestId = `req-${++serial}`) => service.execute({ requestId, expectedRevision: persisted.revision, operation })

const unavailable = new FarmService(
  { read: () => ({ farm: null, cash: 500, revision: 0, receipts: [] }), commit: () => { throw new Error('disk unavailable') } },
  { wall: () => wall, monotonic: () => mono }, () => 'unavailable'
)
assert.throws(() => unavailable.getView(), /disk unavailable/)

const first = service.getView()
assert.equal(first.level, 1)
assert.equal(first.unlockedPlots, 6)
assert.deepEqual(first.farm.seeds, { wheat: 6, carrot: 6 })
assert.equal(first.catalog.orders.length, 12)
const largeOrder = first.catalog.orders.find(order => order.id === 'tomato-strawberry-large')
assert.deepEqual(largeOrder.requirements, { tomato: 8, strawberry: 10 })
assert.equal(largeOrder.exp, 50)
assert.equal(orderCash(largeOrder.id), 328)
const yields = Object.fromEntries(first.catalog.crops.map(crop => [crop.id, crop.yield]))
for (const order of first.catalog.orders) {
  assert.equal(Object.entries(order.requirements).reduce((n, [crop, count]) => n + count / yields[crop], 0), order.size)
  assert.equal(order.exp, order.size === 1 ? 15 : order.size === 2 ? 30 : 50)
}
const stagePlant = { cropId:'wheat',plantedAt:0,durationMs:300000,elapsedMs:0,watered:false }
assert.equal(plantStage(stagePlant), 0)
stagePlant.elapsedMs = 30000; assert.equal(plantStage(stagePlant), 1)
stagePlant.elapsedMs = 150000; assert.equal(plantStage(stagePlant), 2)
stagePlant.elapsedMs = 300000; assert.equal(plantStage(stagePlant), 3)
assert.equal(service.getView().farm.tutorialRemaining, 6)
assert.equal(persisted.revision, 1)

let result = command({ type: 'sow', cropId: 'wheat', plotIds: [0, 1, 2, 3, 4, 5] })
assert.equal(result.view.farm.tutorialRemaining, 0)
assert.equal(result.view.farm.plots[0].plant.durationMs, 300000)
assert.equal(result.view.farm.seeds.wheat, 0)
const occupied = structuredClone(persisted)
assert.throws(() => command({ type: 'sow', cropId: 'wheat', plotIds: [0] }), /没有符合条件/)
assert.deepEqual(persisted, occupied)
const repeated = service.execute({ requestId: persisted.receipts.at(-1).requestId, expectedRevision: 1, operation: { type: 'sow', cropId: 'wheat', plotIds: [0, 1, 2, 3, 4, 5] } })
assert.equal(repeated.view.revision, result.view.revision)
assert.equal(repeated.view.farm.seeds.wheat, 0)
command({ type: 'water', plotIds: [0] })
assert.throws(() => command({ type: 'water', plotIds: [0] }), /没有符合条件/)
advance(240000)
assert.equal(service.getView().farm.plots[0].plant.watered, true)
assert.equal(service.getView().farm.plots[0].plant.elapsedMs, 240000)
command({ type: 'harvest', plotIds: [0] })
assert.equal(persisted.farm.produce.wheat, 3)
assert.equal(persisted.farm.exp, 2)
assert.throws(() => command({ type: 'harvest', plotIds: [0] }), /没有符合条件/)
advance(60000)
command({ type: 'harvest', plotIds: [1, 2, 3, 4, 5] })
assert.equal(persisted.farm.produce.wheat, 18)

const cashBefore = persisted.cash
command({ type: 'buySeed', cropId: 'wheat', count: 2 })
assert.equal(persisted.cash, cashBefore - 8)
command({ type: 'sow', cropId: 'wheat', plotIds: [0] })
assert.equal(persisted.farm.plots[0].plant.durationMs, 1800000)
assert.throws(() => command({ type: 'buySeed', cropId: 'wheat', count: 0 }), /正整数/)
assert.throws(() => command({ type: 'sell', cropId: 'wheat', count: 999 }), /库存不足/)

const beforeFailure = structuredClone(persisted)
fail = true
assert.throws(() => command({ type: 'sell', cropId: 'wheat', count: 1 }), /disk unavailable/)
assert.deepEqual(persisted, beforeFailure)
const readOnly = service.getView()
assert.match(readOnly.saveError, /存档暂不可用/)
assert.equal(readOnly.farm.produce.wheat, beforeFailure.farm.produce.wheat)
assert.throws(() => command({ type: 'sell', cropId: 'wheat', count: 1 }), /disk unavailable/)
assert.deepEqual(persisted, beforeFailure)
fail = false
service.getView()
const order = persisted.farm.orders[0]
command({ type: 'deliver', instanceId: order.instanceId })
assert.equal(persisted.farm.orders[0].remainingMs, 1800000)
assert.throws(() => command({ type: 'deliver', instanceId: order.instanceId }), /不存在/)
advance(1800000)
service.getView()
assert.ok('templateId' in persisted.farm.orders[0])
assert.equal(new Set(persisted.farm.orders.filter(o => 'templateId' in o).map(o => o.templateId)).size, 3)

let carrotSave = { farm: null, cash: 500, revision: 0, receipts: [] }
let carrotWall = 1_800_100_000_000
let carrotMono = 0
let carrotSerial = 0
const carrotRepo = { read: () => structuredClone(carrotSave), commit: snapshot => { carrotSave = structuredClone(snapshot) } }
const carrotService = new FarmService(carrotRepo, { wall: () => carrotWall, monotonic: () => carrotMono }, () => `carrot-${++carrotSerial}`)
carrotService.getView()
const carrotCommand = operation => carrotService.execute({ requestId:`carrot-req-${++carrotSerial}`,expectedRevision:carrotSave.revision,operation })
carrotCommand({ type:'sow',cropId:'carrot',plotIds:[0] })
carrotWall += 96 * 60000; carrotMono += 96 * 60000
carrotCommand({ type:'water',plotIds:[0] })
assert.equal(carrotService.getView().farm.plots[0].plant.watered, true)
assert.equal(plantStage(carrotService.getView().farm.plots[0].plant), 3)
const carrotRestart = new FarmService(carrotRepo, { wall: () => carrotWall, monotonic: () => 0 }, () => 'carrot-restart')
assert.throws(() => carrotRestart.execute({requestId:'carrot-retry',expectedRevision:carrotSave.revision,operation:{type:'water',plotIds:[0]}}), /没有符合条件/)
carrotCommand({ type:'harvest',plotIds:[0] })
carrotCommand({ type:'deliver',instanceId:carrotSave.farm.orders[1].instanceId })
assert.equal(carrotSave.cash, 523)

wall -= 3600000
const elapsedBefore = persisted.farm.plots[0].plant.elapsedMs
service.getView()
assert.ok(persisted.farm.plots[0].plant.elapsedMs >= elapsedBefore)
assert.throws(() => command({ type: 'place', decorationId: 'barrel', region: 'left', x: 0, y: 0 }), /没有可摆放/)
command({ type: 'buyDecoration', decorationId: 'barrel', count: 1 })
command({ type: 'place', decorationId: 'barrel', region: 'left', x: 0, y: 0 })
assert.equal(persisted.farm.placed.length, 1)
const decorationId = persisted.farm.placed[0].instanceId
command({ type: 'move', instanceId: decorationId, region: 'right', x: 1, y: 3 })
assert.equal(persisted.farm.placed[0].x, 1)
command({ type: 'reclaim', instanceId: decorationId })
assert.equal(persisted.farm.placed.length, 0)
console.log('farm rules, transactions, idempotency, timing, orders and decoration: passed')

let mixed = { farm: null, cash: 1000, revision: 0, receipts: [] }
let mixedWall = 1_900_000_000_000
let mixedMono = 100
let mixedSerial = 0
const mixedRepository = { read: () => structuredClone(mixed), commit: snapshot => { mixed = structuredClone(snapshot) } }
const mixedService = new FarmService(mixedRepository, { wall: () => mixedWall, monotonic: () => mixedMono }, () => `mixed-${++mixedSerial}`)
mixedService.getView()
const mixedCommand = operation => mixedService.execute({ requestId: `mixed-req-${++mixedSerial}`, expectedRevision: mixed.revision, operation })
mixedCommand({ type: 'sow', cropId: 'wheat', plotIds: [0, 1, 2, 3] })
mixedWall += 300000; mixedMono += 300000
mixedCommand({ type: 'harvest', plotIds: [0, 1, 2, 3] })
const limitedPreview = mixedService.preview({ type:'sow',cropId:'wheat',plotIds:[0,1,2,3] })
assert.equal(limitedPreview.eligible, 2)
assert.equal(limitedPreview.seedCost, 2)
mixedCommand({ type: 'buySeed', cropId: 'wheat', count: 2 })
const preview = mixedService.preview({ type: 'sow', cropId: 'wheat', plotIds: [0, 1, 2, 3] })
assert.equal(preview.eligible, 4)
assert.equal(preview.tutorial, 2)
assert.equal(preview.normal, 2)
mixedCommand(preview.operation)
assert.deepEqual(mixed.farm.plots.slice(0, 4).map(plot => plot.plant.durationMs), [300000, 300000, 1800000, 1800000])
assert.equal(mixed.farm.tutorialRemaining, 0)
const stale = { requestId:'stale', expectedRevision:preview.revision, operation:{ type:'sell',cropId:'wheat',count:1 } }
assert.throws(() => mixedService.execute(stale), /刷新/)
const restart = new FarmService(mixedRepository, { wall: () => mixedWall + 1800000, monotonic: () => 0 }, () => `restart-${++mixedSerial}`)
assert.equal(restart.getView().farm.plots[2].plant.elapsedMs, 1800000)
assert.equal(restart.getView().farm.plots[2].plant.watered, false)
assert.equal(restart.getView().level, 1)
assert.equal(restart.getView().catalog.orders.length, 12)

mixed.farm.exp = 9300
mixed.revision++
const maxService = new FarmService(mixedRepository, { wall: () => mixedWall + 1800000, monotonic: () => 50 }, () => `max-${++mixedSerial}`)
assert.equal(maxService.getView().level, 10)
assert.equal(maxService.getView().unlockedPlots, 12)
let maxSerial = 0
const maxCommand = operation => maxService.execute({ requestId:`max-${++maxSerial}`,expectedRevision:mixed.revision,operation })
maxCommand({ type:'buyDecoration',decorationId:'bench',count:2 })
assert.throws(() => maxCommand({ type:'place',decorationId:'bench',region:'bottom',x:7,y:0 }), /不能摆放/)
maxCommand({ type:'place',decorationId:'bench',region:'bottom',x:0,y:0 })
assert.throws(() => maxCommand({ type:'place',decorationId:'bench',region:'bottom',x:1,y:0 }), /占用/)
maxCommand({ type:'buyDecoration',decorationId:'barrel',count:12 })
for (let i = 0; i < 11; i++) maxCommand({ type:'place',decorationId:'barrel',region:i < 8 ? 'left' : 'right',x:i % 2,y:Math.floor((i % 8) / 2) })
assert.equal(mixed.farm.placed.length, 12)
assert.throws(() => maxCommand({ type:'place',decorationId:'barrel',region:'right',x:1,y:3 }), /最多同时摆放 12 件/)
mixed.farm.version = 99
assert.throws(() => maxService.getView(), /存档格式无效/)
console.log('tutorial crossover, preview revision, offline restart, level cap and malformed save: passed')
