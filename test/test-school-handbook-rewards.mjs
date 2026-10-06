import { strict as assert } from 'node:assert'
import { build } from 'esbuild'

const uniformMilestoneId = 'school-handbook-milestone-school-uniform'
const uniformId = 'youmei-school-uniform-2026'
const skins = new Set()
const grants = []
globalThis.__petmateHandbookRewardTest = {
  hasSkin: id => skins.has(id),
  grantSkin(id) {
    skins.add(id)
    grants.push(id)
  },
  getResources: () => ({ skins: [...skins].map(id => ({ id })) })
}

try {
  const bundled = await build({
    entryPoints: ['src/main/modules/school-handbook.ts'],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    plugins: [{
      name: 'mock-handbook-services',
      setup(build) {
        build.onResolve({ filter: /^(electron-store|\.\/player\/resource)$/ }, args => ({
          path: args.path,
          namespace: 'mock-handbook-services'
        }))
        build.onLoad({ filter: /.*/, namespace: 'mock-handbook-services' }, args => ({
          contents: args.path === 'electron-store'
            ? 'export default class Store {}'
            : `export const playerResourceManager = globalThis.__petmateHandbookRewardTest;
               export const SCHOOL_UNIFORM_SKIN_ID = '${uniformId}';
               export const SCHOOL_DANCE_ANIMATION_ID = 'youmei-school-dance-2026';`
        }))
      }
    }]
  })
  const { SchoolHandbookManager } = await import(
    `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
  )

  function createManager(saved) {
    const store = {
      saved,
      get() { return structuredClone(this.saved) },
      set(key, value) { this.saved = structuredClone(value) }
    }
    const manager = new SchoolHandbookManager(store)
    manager.initSchoolHandbook()
    return { manager, store }
  }

  const fresh = createManager()
  assert.deepEqual(grants, [])
  assert.equal(fresh.manager.getProgress().milestones.find(reward => reward.id === uniformMilestoneId).available, false)
  assert.throws(() => fresh.manager.claimMilestoneReward(uniformMilestoneId), /不足/)
  fresh.manager.addStamps(30)
  const purchased = fresh.manager.claimMilestoneReward(uniformMilestoneId)
  assert.equal(purchased.progress.stampCount, 0)
  assert.equal(skins.has(uniformId), true)
  assert.deepEqual(grants, [uniformId])
  assert.throws(() => fresh.manager.claimMilestoneReward(uniformMilestoneId), /只能兑换一次/)

  const receipt = fresh.store.saved.claimedRewards[0]
  // Reproduce a valid exchange receipt with missing wardrobe data and no remaining stamps.
  skins.clear()
  grants.length = 0
  const repaired = createManager(fresh.store.saved)
  assert.equal(skins.has(uniformId), true)
  assert.deepEqual(grants, [uniformId])
  assert.equal(repaired.manager.getProgress().stampCount, 0)
  assert.deepEqual(repaired.store.saved.claimedRewards[0], receipt)
  repaired.manager.initSchoolHandbook()
  createManager(repaired.store.saved)
  assert.deepEqual(grants, [uniformId])
  assert.throws(() => repaired.manager.claimMilestoneReward(uniformMilestoneId), /只能兑换一次/)

  skins.clear()
  grants.length = 0
  const fundedSave = structuredClone(fresh.store.saved)
  fundedSave.stampCount = 243
  assert.equal(createManager(fundedSave).manager.getProgress().stampCount, 243)
  assert.deepEqual(grants, [uniformId])

  skins.clear()
  grants.length = 0
  const unclaimedSave = structuredClone(fundedSave)
  unclaimedSave.claimedRewards = []
  const unclaimed = createManager(unclaimedSave)
  assert.deepEqual(grants, [])
  assert.equal(unclaimed.manager.getProgress().milestones.find(reward => reward.id === uniformMilestoneId).available, true)
  assert.equal(unclaimed.manager.claimMilestoneReward(uniformMilestoneId).progress.stampCount, 213)
  assert.deepEqual(grants, [uniformId])

  skins.clear()
  grants.length = 0
  const danceOnlySave = structuredClone(fundedSave)
  danceOnlySave.claimedRewards = [{
    ...receipt,
    milestoneId: 'school-handbook-milestone-school-dance'
  }]
  createManager(danceOnlySave)
  assert.deepEqual(grants, [])
  console.log('School uniform exchanges passed: missing wardrobe recovery, unchanged stamps and receipts, idempotency, normal exchange costs, and dance-only receipts.')
} finally {
  delete globalThis.__petmateHandbookRewardTest
}
