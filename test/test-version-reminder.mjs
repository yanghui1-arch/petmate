import { strict as assert } from 'node:assert'
import { build } from 'esbuild'
import { readFileSync } from 'node:fs'

const bundled = await build({
    entryPoints: ['src/main/modules/version-reminder.ts'],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm'
})
const {
    getVersionReminderState: state,
    acknowledgeVersionReminder: acknowledge,
    dismissVersionReward: dismiss,
    isNationalDayActive
} = await import(
    `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
)

const start = Date.parse('2026-10-01T00:00:00+08:00')
const end = Date.parse('2026-10-08T00:00:00+08:00')
const legacySave = { name: 'Player', cash: 500, petmates: [], items: [] }
assert.equal(isNationalDayActive(start - 1), false)
assert.equal(isNationalDayActive(start), true)
assert.equal(isNationalDayActive(end - 1), true)
assert.equal(isNationalDayActive(end), false)
assert.equal(state(legacySave, start).announcementPending, true)
assert.equal(state(legacySave, start).rewardPending, false)

const granted = acknowledge(legacySave, start)
assert.equal(granted.cash, 3500)
assert.equal(legacySave.cash, 500)
assert.equal(state(granted, start).announcementPending, false)
assert.equal(state(granted, start).rewardPending, true)
assert.equal(acknowledge(granted, start + 100).cash, 3500)

// A saved receipt survives window closure and an application restart without paying twice.
const restored = JSON.parse(JSON.stringify(granted))
assert.equal(state(restored, start + 1000).rewardPending, true)
assert.equal(acknowledge(restored, start + 1000).cash, 3500)
const seen = dismiss(restored, start + 1000)
assert.equal(state(seen, start + 1000).rewardPending, false)
assert.equal(acknowledge(seen, start + 2000).cash, 3500)
assert.equal(state(acknowledge(seen, start + 2000), start).rewardPending, false)

assert.equal(acknowledge(legacySave, end).cash, 500)
assert.equal(state(acknowledge(legacySave, end), end).rewardPending, false)
assert.equal(state(restored, end).rewardPending, true)
assert.equal(state(restored, end).eventActive, false)
assert.equal(dismiss(legacySave, start), legacySave)

// Reading the update before the holiday does not consume the later login reward.
const previewed = acknowledge(legacySave, start - 1)
assert.equal(previewed.cash, 500)
assert.equal(acknowledge(previewed, start).cash, 3500)

const petmateBundle = await build({
    entryPoints: ['src/main/modules/petmate/petmate.ts'],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm'
})
const { PetMate } = await import(
    `data:text/javascript;base64,${Buffer.from(petmateBundle.outputFiles[0].text).toString('base64')}`
)
const loginBuff = JSON.parse(readFileSync('resources/data/buff.json', 'utf8')).find(
    (buff) => buff.id === 4
)
const originalTimeout = globalThis.setTimeout
let expireBuff
globalThis.setTimeout = (callback) => {
    expireBuff = callback
    return 0
}
try {
    const ordinaryBuff = { id: 'ordinary', buff: { id: 0 }, endTime: new Date(Date.now() + 60000) }
    const pet = new PetMate(
        0,
        'Youmei',
        {
            buffs: [ordinaryBuff],
            maxBuffs: 1,
            level: 1,
            exp: 0,
            nextExp: 100
        },
        { status: 'idle' },
        [],
        0
    )
    const expiresAt = new Date(Date.now() + 30000)
    assert.equal(pet.addBuffUntil(loginBuff, expiresAt), undefined)
    const giftBuff = pet.addBuffUntil(loginBuff, expiresAt, true)
    assert.equal(giftBuff.buff.effect.expGainRate, 1.5)
    assert.equal(giftBuff.endTime.getTime(), expiresAt.getTime())
    assert.equal(pet.attrs.buffs.length, 2)
    expireBuff()
    assert.deepEqual(
        pet.attrs.buffs.map((buff) => buff.id),
        ['ordinary']
    )
    assert.equal(pet.addBuffUntil(loginBuff, new Date(Date.now() - 1), true), undefined)
} finally {
    globalThis.setTimeout = originalTimeout
}
console.log(
    'Version reminder: legacy saves, event boundaries, one-time grants, restart receipts, dismissal, full buff slots, and buff expiration passed.'
)
