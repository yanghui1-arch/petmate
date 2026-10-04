import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { build } from 'esbuild'

const bundle = await build({
    entryPoints: ['tools/farm-life-lab/session.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false
})
const { LabSession } = await import(
    'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')
)
function fixture() {
    let snapshot = { farm: null, cash: 10000, revision: 0, receipts: [] },
        session,
        open = false
    const speeches = [],
        host = {
            available: () => true,
            blocked: () => session.conditions.energy || session.conditions.sleep,
            farmOpen: () => open,
            skin: () => session.skin,
            publish: (_view, speech) => {
                if (speech) speeches.push(speech)
            },
            restore: () => {}
        }
    session = new LabSession(
        {
            read: () => structuredClone(snapshot),
            commit: (value) => (snapshot = structuredClone(value))
        },
        host,
        () => {},
        () => 1800000000000,
        () => 0
    )
    return {
        session,
        speeches,
        snapshot: () => snapshot,
        open: () => {
            open = true
            session.life.farmEntered()
        }
    }
}
let checks = 0
function check(name, run) {
    try {
        run()
        checks++
        console.log('PASS ' + name)
    } catch (error) {
        throw Error(name + ': ' + error.message)
    }
}
const kinds = [
    'water',
    'harvest',
    'order',
    'rest',
    'butterfly',
    'seedlings',
    'walk',
    'check',
    'flower',
    'tutorial'
]
check('all ten events select the real controller path and commit once', () => {
    for (const kind of kinds) {
        const f = fixture(),
            s = f.session
        s.prepare(
            kind === 'tutorial'
                ? 'water'
                : ['water', 'harvest', 'order', 'seedlings', 'flower'].includes(kind)
                  ? kind
                  : 'rest'
        )
        const before = s.snapshot()
        s.trigger(kind)
        assert.equal(s.life.getView().visit.kind, kind === 'tutorial' ? 'water' : kind)
        s.next()
        s.next()
        const visit = s.life.getView().visit,
            after = s.snapshot()
        assert.equal(visit.committed, true)
        assert.equal(after.farm.life.events.length, 1)
        assert.equal(after.farm.life.events[0].interrupted, false)
        assert.equal(after.farm.life.daily.trips, 1)
        assert.equal(after.cash, before.cash, 'helper does not deliver or buy')
        if (kind === 'water' || kind === 'tutorial')
            assert.ok(after.farm.plots.some((plot) => plot.plant?.wateredBy === 'helper'))
        if (kind === 'harvest' || kind === 'order') assert.ok(after.farm.produce.wheat > 0)
        if (kind === 'flower') assert.equal(after.farm.life.flower, true)
        s.tick()
        assert.equal(s.snapshot().farm.life.events.length, 1)
        s.next()
        s.next()
        s.next()
        assert.equal(s.life.getView().visit, null)
        assert.equal(f.speeches.filter((speech) => speech.stage === 'return').length, 1)
    }
})
check('boundary presets cannot be bypassed by controlled randomness', () => {
    for (const preset of ['first', '99', '499', '999', 'quota', 'energy', 'empty']) {
        const { session: s } = fixture()
        s.prepare(preset)
        const before = s.snapshot()
        assert.throws(() =>
            s.trigger(preset === 'quota' || preset === 'energy' ? 'water' : 'harvest')
        )
        assert.equal(s.life.getView().visit, null)
        assert.deepEqual(s.snapshot().farm.produce, before.farm.produce)
        assert.equal(s.snapshot().farm.life.events.length, 0)
    }
})
check('entry after departure preserves work; entry before departure cancels without work', () => {
    const f = fixture(),
        s = f.session
    s.prepare('water')
    s.trigger('water')
    s.next()
    s.next()
    f.open()
    s.next()
    assert.equal(s.snapshot().farm.life.events[0].interrupted, false)
    assert.equal(
        s.snapshot().farm.plots.some((plot) => plot.plant?.watered),
        true
    )
    const early = fixture()
    early.session.prepare('water')
    early.session.trigger('water')
    early.session.next()
    early.open()
    assert.equal(early.session.life.getView().visit, null)
    assert.equal(early.session.snapshot().farm.life.events.length, 0)
    assert.equal(early.session.snapshot().farm.life.daily.trips, 0)
})
check('eleventh personal water plus helper does not unlock personal field achievement', () => {
    const { session: s } = fixture()
    s.prepare('manualWater')
    s.trigger('water')
    s.next()
    s.next()
    s.next()
    const farm = s.snapshot().farm
    assert.equal(farm.plots[11].plant.wateredBy, 'helper')
    assert.equal(farm.achievements.unlocked.includes('ACH_FARM_WATERED_FIELD'), false)
})
check('save failure changes no inventory/event and recovery/restart do not replay rewards', () => {
    const { session: s } = fixture()
    s.prepare('harvest')
    s.trigger('harvest')
    s.next()
    const before = s.snapshot()
    s.conditions.saveFailure = true
    s.next()
    assert.equal(s.life.getView().visit, null)
    assert.deepEqual(s.snapshot().farm.produce, before.farm.produce)
    assert.equal(s.snapshot().farm.life.events.length, 0)
    s.conditions.saveFailure = false
    s.service.checkpoint()
    s.restart()
    assert.equal(s.snapshot().farm.life.active, null)
    // Recent-event variation remains active: the next help can be order preparation.
    s.trigger('order')
    s.next()
    s.next()
    s.next()
    const saved = s.snapshot().farm.produce
    s.restart()
    assert.deepEqual(s.snapshot().farm.produce, saved)
    assert.equal(s.snapshot().farm.life.events.length, 1)
})
const sources = await Promise.all(
    [
        'tools/farm-life-lab/main.ts',
        'tools/farm-life-lab/session.ts',
        'scripts/farm-life-lab.mjs'
    ].map((path) => readFile(path, 'utf8'))
)
const pkg = JSON.parse(await readFile('package.json', 'utf8'))
const graph = await build({
    entryPoints: ['tools/farm-life-lab/main.ts'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['electron'],
    write: false,
    metafile: true
})
check(
    'test entry has no production bootstrap/storage/Steam import or production packaging entry',
    () => {
        for (const source of sources)
            assert.equal(
                /from\s+['"][^'"]*(?:modules\/store|modules\/steam|main\/index)['"]/.test(source),
                false
            )
        assert.equal(
            Object.keys(graph.metafile.inputs).some((path) =>
                /modules\/(?:store|steam)|src\/main\/index|player\//.test(path)
            ),
            false
        )
        assert.equal(pkg.main, './out/main/index.js')
        assert.equal(
            pkg.build.files.some((path) => path.startsWith('tools/')),
            false
        )
    }
)
console.log(
    'Passed ' + checks + ' isolated lab groups; launching actual Electron controller smoke test.'
)
const child = spawn(process.execPath, ['scripts/farm-life-lab.mjs', '--smoke'], {
    stdio: 'inherit',
    env: process.env,
    windowsHide: true
})
const code = await new Promise((done, reject) => {
    child.once('error', reject)
    child.once('exit', done)
})
assert.equal(code, 0, 'Electron controller smoke test')
