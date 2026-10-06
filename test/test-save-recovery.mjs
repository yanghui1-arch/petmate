import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { build } from 'esbuild'

const bundled = await build({ entryPoints: ['src/main/modules/save/backup.ts'], bundle: true, platform: 'node', format: 'esm', write: false })
const { makeBackup, validateBackup, captureGameSaves, restoreGameBackup, recoverInterruptedRestore } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`)
const directory = mkdtempSync(join(tmpdir(), 'petmate-farm-save-test-'))
const files = ['player-store', 'player-resource-store', 'school-handbook-store']
const petNumbers = ['level', 'exp', 'nextExp', 'gameLevel', 'gameExp', 'gameNextExp', 'singLevel', 'singExp', 'singNextExp', 'drawLevel', 'drawExp', 'drawNextExp', 'affectionLevel', 'affectionExp', 'affectionNextExp', 'hungry', 'emotion', 'energy', 'health', 'maxHungry', 'maxEmotion', 'maxEnergy', 'maxHealth', 'maxBuffs']
const attrs = { ...Object.fromEntries(petNumbers.map(key => [key, 1])), buffs: [] }
const original = {
  'player-store': { playerInfo: { name:'Tester',steamId:'test-owner',cash:500,items:[],petmates:[{id:0,name:'尤美',attrs,status:{status:'idle'},wishes:[],completedWishesNum:0}] }, revision: 1 },
  'player-resource-store': { resources: { skins:[{id:'classic',name:'经典',acquiredAt:'system'}],equippedSkinId:'classic',titles:[],equippedTitleId:null,animationResources:[],completedCommissionIds:[],commissionCompletionCounts:{},schoolHandbookLimitedItemMissCount:0 } },
  'school-handbook-store': { state: { schemaVersion:2,batchSequence:1,stampCount:0,currentBatch:{id:'batch-1',sequence:1,tasks:[],createdAt:new Date(0).toISOString()},claimedRewards:[] } }
}
function writeSaves(saves) { for (const name of files) writeFileSync(join(directory, `${name}.json`), JSON.stringify(saves[name])) }
writeSaves(original)
const before = captureGameSaves(directory)
const backup = makeBackup(before, '0.6.4')
validateBackup(backup, 'test-owner')
assert.throws(() => validateBackup({ ...backup, checksum:'bad' }), /校验失败/)
assert.throws(() => validateBackup(backup, 'someone-else'), /不属于/)
const incomplete = structuredClone(before)
delete incomplete['player-resource-store'].resources.equippedSkinId
assert.throws(() => makeBackup(incomplete, '0.6.4'), /玩家资源/)
const malformed = structuredClone(before)
malformed['school-handbook-store'].state.currentBatch.tasks = [{ id: 'study', completedCount: -1 }]
assert.throws(() => makeBackup(malformed, '0.6.4'), /活动任务/)
const changed = structuredClone(before)
changed['player-store'].playerInfo.cash = 88
changed['player-resource-store'].resources.schoolHandbookLimitedItemMissCount = 3
changed['school-handbook-store'].state.stampCount = 5
const target = makeBackup(changed, '0.6.4')
let writes = 0
assert.throws(() => restoreGameBackup(directory, target, '0.6.4', name => { if (name === 'player-resource-store') throw new Error('injected replacement failure'); writes++ }), /injected/)
assert.ok(writes >= 2)
assert.deepEqual(captureGameSaves(directory), before)
for (const failurePoint of ['journal', 'player-store', 'school-handbook-store']) {
  assert.throws(() => restoreGameBackup(directory, target, '0.6.4', name => { if (name === failurePoint) throw new Error(`injected ${name}`) }), /injected/)
  assert.deepEqual(captureGameSaves(directory), before)
}
assert.ok(readFileSync(join(directory, 'backups', 'last-before-restore.json'), 'utf8'))
restoreGameBackup(directory, target, '0.6.4')
assert.deepEqual(captureGameSaves(directory), changed)
writeSaves(before)
assert.throws(() => restoreGameBackup(directory, target, '0.6.4', name => { if (name === 'commit') throw new Error('simulated crash after commit') }), /simulated crash/)
recoverInterruptedRestore(directory)
assert.deepEqual(captureGameSaves(directory), changed)
restoreGameBackup(directory, backup, '0.6.4')
assert.deepEqual(captureGameSaves(directory), before)
// Startup sees an interrupted prepared restore and finishes rolling every related file back.
writeFileSync(join(directory, 'restore-journal.json'), JSON.stringify({ phase:'prepared',before:backup,target }))
writeFileSync(join(directory, 'player-store.json'), JSON.stringify(changed['player-store']))
recoverInterruptedRestore(directory)
assert.deepEqual(captureGameSaves(directory), before)
// A committed journal is completed towards the target on startup.
writeFileSync(join(directory, 'restore-journal.json'), JSON.stringify({ phase:'committed',before:backup,target }))
recoverInterruptedRestore(directory)
assert.deepEqual(captureGameSaves(directory), changed)
console.log('complete backup, integrity, rollback and interrupted restore: passed')
