import { strict as assert } from 'node:assert'
import { build } from 'esbuild'

const uniformAchievement = 'ACH_SCOOL_CLOTH_26'
const nationalAchievement = 'ACH_COLLECT_ALL_NATIONAL_CW'
const uniformId = 'youmei-school-uniform-2026'
const titleIds = [
  'national-day-mountain-witness',
  'national-day-fellow-traveler',
  'national-day-grand-celebration'
]

const bundled = await build({
  entryPoints: ['src/main/modules/player/resource.ts'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  plugins: [{
    name: 'mock-resource-services',
    setup(build) {
      build.onResolve({ filter: /^(electron-store|\.\.\/store|\.\.\/\.\.\/(greenworks|log))$/ }, args => ({
        path: args.path,
        namespace: 'mock-resource-services'
      }))
      build.onLoad({ filter: /.*/, namespace: 'mock-resource-services' }, args => {
        const fixture = 'const fixture = globalThis.__petmateAchievementTest;'
        if (args.path === 'electron-store') {
          return { contents: `${fixture}
            export default class Store {
              get() { return structuredClone(fixture.saved) }
              set(key, value) { fixture.saved = structuredClone(value) }
            }` }
        }
        if (args.path === '../store') {
          return { contents: 'export const itemManager = {}; export const playerManager = {};' }
        }
        if (args.path.endsWith('/log')) {
          return { contents: `${fixture}
            export default {
              warn(message) { fixture.logs.push(message) },
              error(message) { fixture.logs.push(message) }
            };` }
        }
        return { contents: `${fixture} export const greenworksManager = fixture.steam;` }
      })
    }
  }]
})

let caseId = 0
async function createManager(saved, options = {}) {
  const calls = []
  const logs = []
  const achieved = new Set(options.achieved ?? [])
  const fixture = {
    saved,
    logs,
    steam: {
      isReady: () => options.ready !== false,
      getAchievementNames: () => options.names ?? [
        uniformAchievement, nationalAchievement, 'ACH_51_LABOR'
      ],
      getAchievement(name, success, failure) {
        if (options.statusError) return failure('status error')
        success(achieved.has(name))
      },
      activateAchievement(name, success, failure) {
        if (options.activationError) return failure('activation error')
        if (name === uniformAchievement) {
          assert.equal(fixture.saved.equippedSkinId, uniformId)
          assert.ok(fixture.saved.skins.some(skin => skin.id === uniformId))
        }
        if (name === nationalAchievement) {
          assert.ok(titleIds.every(id => fixture.saved.titles.some(title => title.id === id)))
        }
        calls.push(name)
        achieved.add(name)
        success()
      }
    }
  }
  globalThis.__petmateAchievementTest = fixture
  const module = await import(
    `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}#${caseId++}`
  )
  module.playerResourceManager.initPlayerResource()
  return { manager: module.playerResourceManager, calls, logs, fixture, options }
}

try {
  const fresh = await createManager()
  assert.throws(() => fresh.manager.equipSkin(uniformId))
  assert.deepEqual(fresh.calls, [])
  fresh.manager.unlockSkin(uniformId)
  fresh.manager.equipSkin('youmei-classic-dress')
  assert.deepEqual(fresh.calls, [])
  fresh.manager.equipSkin(uniformId)
  fresh.manager.equipSkin(uniformId)
  assert.deepEqual(fresh.calls, [uniformAchievement])

  const reward = await createManager()
  reward.manager.grantSkin(uniformId)
  const ownedUniformSave = reward.manager.getResources()
  assert.deepEqual(reward.calls, [])
  reward.manager.equipSkin(uniformId)
  assert.deepEqual(reward.calls, [uniformAchievement])
  const equippedUniformSave = reward.manager.getResources()
  assert.deepEqual((await createManager(ownedUniformSave)).calls, [])
  assert.deepEqual((await createManager(equippedUniformSave)).calls, [uniformAchievement])
  assert.deepEqual((await createManager({ equippedSkinId: uniformId })).calls, [])

  // Every title can be the last one collected; missing or duplicated titles cannot unlock it.
  for (const order of [
    [0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]
  ]) {
    const collection = await createManager()
    collection.manager.grantTitle(titleIds[order[0]])
    collection.manager.grantTitle(titleIds[order[0]])
    collection.manager.grantTitle(titleIds[order[1]])
    assert.deepEqual(collection.calls, [])
    assert.deepEqual((await createManager(collection.manager.getResources())).calls, [])
    collection.manager.grantTitle(titleIds[order[2]])
    collection.manager.grantTitle(titleIds[order[2]])
    assert.deepEqual(collection.calls, [nationalAchievement])
    const restored = await createManager(collection.manager.getResources())
    assert.deepEqual(restored.calls, [nationalAchievement])
    restored.manager.equipTitle(titleIds[order[0]])
    assert.deepEqual(restored.calls, [nationalAchievement])
  }

  const collection = await createManager(equippedUniformSave)
  titleIds.forEach(id => collection.manager.grantTitle(id))
  const completedSave = collection.manager.getResources()
  assert.deepEqual((await createManager(completedSave, {
    achieved: [uniformAchievement, nationalAchievement]
  })).calls, [])
  assert.deepEqual((await createManager(completedSave, { ready: false })).calls, [])
  const unconfigured = await createManager(completedSave, { names: [] })
  assert.deepEqual(unconfigured.calls, [])
  assert.equal(unconfigured.logs.length, 2)
  const statusFailure = await createManager(completedSave, { statusError: true })
  assert.deepEqual(statusFailure.calls, [])
  assert.equal(statusFailure.logs.length, 2)

  const retry = await createManager(completedSave, { activationError: true })
  assert.deepEqual(retry.calls, [])
  assert.equal(retry.logs.length, 2)
  retry.options.activationError = false
  retry.manager.equipSkin(uniformId)
  retry.manager.grantTitle(titleIds[0])
  assert.deepEqual(retry.calls, [uniformAchievement, nationalAchievement])

  const legacyTitle = await createManager()
  legacyTitle.manager.grantTitle('labor-2026-holiday-craftsperson')
  assert.deepEqual(legacyTitle.calls, ['ACH_51_LABOR'])
  assert.deepEqual((await createManager(legacyTitle.manager.getResources())).calls, ['ACH_51_LABOR'])
  console.log('Resource achievements passed: ownership, equip validation, title collection orders, save recovery, duplicate activation, Steam failures, and legacy titles.')
} finally {
  delete globalThis.__petmateAchievementTest
}
