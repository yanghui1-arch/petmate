// Standalone prototype verification. Uses the project's installed Electron;
// never boots Petmate, its preload, IPC, or real save directory.
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const assert = require('node:assert/strict')

if (!process.versions.electron) {
    const { spawnSync } = require('node:child_process')
    const temporaryProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'petmate-farm-prototype-'))
    const env = { ...process.env, FARM_PROTOTYPE_PROFILE: temporaryProfile }
    delete env.ELECTRON_RUN_AS_NODE
    const result = spawnSync(require('electron'), [__filename], { env, stdio: 'inherit' })
    const resolved = path.resolve(temporaryProfile)
    if (
        path.dirname(resolved) === path.resolve(os.tmpdir()) &&
        path.basename(resolved).startsWith('petmate-farm-prototype-')
    ) {
        fs.rmSync(resolved, { recursive: true, force: true })
    }
    process.exit(result.status ?? 1)
}

const { app, BrowserWindow } = require('electron')
app.setPath('userData', process.env.FARM_PROTOTYPE_PROFILE)
app.disableHardwareAcceleration()
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
const results = []
let window
const evaluate = (fn, ...args) =>
    window.webContents.executeJavaScript(`(${fn.toString()})(...${JSON.stringify(args)})`, true)
const visible = (selector) =>
    evaluate((s) => !!document.querySelector(s) && !document.querySelector(s).hidden, selector)
const textContent = (selector) => evaluate((s) => document.querySelector(s)?.textContent, selector)
async function pointer(selector, button) {
    const point = await evaluate((s) => {
        const r = document.querySelector(s).getBoundingClientRect()
        return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
    }, selector)
    window.webContents.sendInputEvent({ type: 'mouseMove', ...point })
    if (button) {
        window.webContents.sendInputEvent({ type: 'mouseDown', ...point, button, clickCount: 1 })
        window.webContents.sendInputEvent({ type: 'mouseUp', ...point, button, clickCount: 1 })
    }
    await pause(button ? 230 : 320)
    return point
}
const click = (selector) => pointer(selector, 'left')
async function escape() {
    window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' })
    window.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' })
    await pause(80)
}
async function screenshot(name) {
    await pause(150)
    fs.writeFileSync(path.join(__dirname, name), (await window.webContents.capturePage()).toPNG())
}
function passed(name) {
    results.push(name)
    console.log('PASS:', name)
}
async function actionCursor(selector, index) {
    const point = await pointer(selector)
    const result = await evaluate((selector) => {
        const r = document.querySelector('#cursor').getBoundingClientRect()
        return { x: r.x, y: r.y, width: r.width, height: r.height,
            native: getComputedStyle(document.querySelector(selector)).cursor,
            visible: !document.querySelector('#cursor').hidden }
    }, selector)
    const hotspots = { 7: [40 / 313, 276 / 295], 8: [295 / 310, 250 / 267], 9: [23 / 323, 154 / 280] }
    assert.equal(result.visible, true)
    assert.equal(result.native, 'none')
    assert(Math.abs(result.x + result.width * hotspots[index][0] - point.x) < 0.05)
    assert(Math.abs(result.y + result.height * hotspots[index][1] - point.y) < 0.05)
}

app.whenReady().then(async () => {
    const errors = []
    window = new BrowserWindow({
        width: 1600,
        height: 900,
        useContentSize: true,
        show: false,
        webPreferences: {
            offscreen: true,
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        }
    })
    window.webContents.on('console-message', (event) => {
        if (event.level === 'error') errors.push(event.message)
    })
    window.webContents.on('preload-error', (_event, _preloadPath, error) =>
        errors.push(error.message)
    )
    try {
        await window.loadFile(path.join(__dirname, 'prototype.html'))
        await pause(500)
        const assets = await evaluate(async () => {
            return Promise.all(
                [
                    'farm-world-lane.png',
                    'farm-icons.png',
                    'farm-atlas.png',
                    ...Object.values(window.FarmCropArt.sprites).map((sprite) => sprite.file)
                ].map(
                    (file) =>
                        new Promise((resolve) => {
                            const img = new Image()
                            img.onload = () =>
                                resolve({
                                    file,
                                    width: img.naturalWidth,
                                    height: img.naturalHeight
                                })
                            img.onerror = () => resolve({ file, width: 0 })
                            img.src = `assets/${file}`
                        })
                )
            )
        })
        assert(
            assets.every((asset) => asset.width > 0),
            `Missing art: ${JSON.stringify(assets)}`
        )
        assert.equal(await evaluate(() => document.querySelectorAll('.plot-hit').length), 12)
        assert.equal(await evaluate(() => document.querySelectorAll('.youmei').length), 0)
        assert.equal(await visible('#overlay'), false)
        await screenshot('prototype-preview.png')
        passed('All generated art loads; 12 fields; no scene character; no initial sidebar')

        await actionCursor('#hit-3', 8)
        assert.equal(await visible('#tooltip'), true)
        assert.equal(await visible('#cursor'), true)
        assert((await textContent('#tooltip')).includes('空闲'))
        assert.equal(
            await evaluate(() => getComputedStyle(document.querySelector('#hit-3')).stroke),
            'rgba(0, 0, 0, 0)'
        )
        await screenshot('prototype-hover.png')
        await click('#hit-3')
        assert.equal(await visible('#seed-picker'), true)
        assert.equal(await evaluate(() => document.querySelectorAll('.seed-card').length), 6)
        await screenshot('prototype-seed-picker.png')
        await escape()
        assert.equal(await visible('#seed-picker'), false)
        passed('Empty field hover and local seed selection; Esc cancels without planting')

        await click('#hit-3')
        await click('[data-seed="wheat"]')
        assert.equal(await visible('#seed-picker'), false)
        assert(
            (
                await evaluate(() => document.querySelector('#hit-3').getAttribute('aria-label'))
            ).includes('小麦')
        )
        await click('#backpack')
        assert((await textContent('#panel .item-card:first-child')).includes('×11'))
        assert((await textContent('#panel .item-card:first-child')).includes('教学剩余 2 次'))
        await escape()
        passed('One seed-card click plants target field and consumes one seed/teaching slot')

        await actionCursor('.crop-root[data-plot="2"][data-slot="4"] .crop-art', 9)
        assert.equal(await visible('#cursor'), true)
        await click('.crop-root[data-plot="2"][data-slot="4"] .crop-art')
        assert(
            (
                await evaluate(() => document.querySelector('#hit-2').getAttribute('aria-label'))
            ).includes('已浇水')
        )
        assert.equal(await visible('#overlay'), false)
        await pause(1500)
        assert.equal(
            await evaluate(() => document.querySelectorAll('.local-gain,.water-drop').length),
            0
        )
        await pointer('.crop-root[data-plot="4"][data-slot="4"] .crop-art')
        assert.equal(await visible('#cursor'), false)
        assert.equal(
            await evaluate(() => getComputedStyle(document.querySelector('#hit-4')).cursor),
            'default'
        )
        passed(
            'Direct watering; local feedback clears automatically; watered field keeps regular cursor'
        )

        await actionCursor('.crop-root[data-plot="0"][data-slot="4"] .crop-art', 7)
        assert.equal(await visible('#cursor'), true)
        assert((await textContent('#tooltip')).includes('可收获'))
        // Duplicate clicks during the pending animation must not reward twice.
        await evaluate(() => {
            document
                .querySelector('#hit-0')
                .dispatchEvent(new MouseEvent('click', { bubbles: true }))
            document
                .querySelector('#hit-0')
                .dispatchEvent(new MouseEvent('click', { bubbles: true }))
        })
        await pause(250)
        assert(
            (
                await evaluate(() => document.querySelector('#hit-0').getAttribute('aria-label'))
            ).includes('空地')
        )
        await click('#backpack')
        await click('[data-tab="produce"]')
        assert((await textContent('#panel .item-card:first-child')).includes('×4'))
        await escape()
        await click('.crop-root[data-plot="1"][data-slot="4"] .crop-art')
        assert.equal(await textContent('#cash'), '702')
        assert.equal(await visible('#order-badge'), true)
        await click('#orders')
        await click('[data-deliver="1"]')
        assert.equal(await textContent('#cash'), '732')
        assert.equal(
            await evaluate(() => document.querySelectorAll('[data-deliver="1"]').length),
            0
        )
        await screenshot('prototype-orders.png')
        await escape()
        await pause(2200)
        assert.equal(await visible('#toast'), false)
        passed(
            'Mature crop single-click harvest; duplicate request blocked; order reward once; toast expires'
        )

        await click('#coins')
        await click('[data-buy="wheat"]')
        await click('[data-step="1"]')
        await click('#trade-confirm')
        assert.equal(await textContent('#cash'), '724')
        await escape()
        await click('#backpack')
        assert((await textContent('#panel .item-card:first-child')).includes('×13'))
        await escape()
        await click('#codex')
        assert.equal(
            await evaluate(() => document.querySelectorAll('#panel .crop-icon').length),
            30
        )
        await screenshot('prototype-codex.png')
        await escape()
        passed(
            'Shop quantity/cost and inventory stay consistent; codex includes six crops and 24 growth-stage pictures'
        )

        assert.equal(await evaluate(() => document.querySelector('#decorate') === null), true)
        assert.equal(
            await evaluate(() => document.querySelectorAll('.side-actions .round-button').length),
            0
        )
        passed('Decoration removed and operating entries have no circular backing')

        await click('#settings')
        await click('#reset-demo')
        assert.equal(await textContent('#cash'), '702')
        await evaluate(() => {
            document
                .querySelector('#hit-0')
                .dispatchEvent(new MouseEvent('click', { bubbles: true }))
            document.querySelector('#settings').click()
            document.querySelector('#reset-demo').click()
        })
        await pause(250)
        assert(
            (
                await evaluate(() => document.querySelector('#hit-0').getAttribute('aria-label'))
            ).includes('可收获')
        )
        passed('Reset restores demonstration state and cancels pending old actions')

        const groundPositions = () =>
            evaluate(() =>
                [...document.querySelectorAll('#crop-layer .crop-root')]
                    .map((node) => {
                        const point = node.getBoundingClientRect()
                        return {
                            key: `${node.dataset.plot}:${node.dataset.slot}`,
                            x: point.x,
                            y: point.y
                        }
                    })
                    .sort((a, b) => a.key.localeCompare(b.key))
            )
        const beforeMaturing = await groundPositions()
        await click('#settings')
        await click('#mature-demo')
        assert.deepEqual(await groundPositions(), beforeMaturing)
        assert(
            await evaluate(() =>
                [...document.querySelectorAll('#crop-layer .crop-root')].every(
                    (node) => node.dataset.phase === '3'
                )
            )
        )
        await screenshot('prototype-mature.png')
        await click('#settings')
        await click('#reset-demo')
        passed('Stage changes preserve all 63 live root positions; mature farm captured')

        window.setContentSize(800, 600)
        await pause(350)
        const bounds = await evaluate(() =>
            [...document.querySelectorAll('.plot-hit')].map((node) => {
                const r = node.getBoundingClientRect()
                return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }
            })
        )
        assert(bounds.every((r) => r.x >= 0 && r.y >= 0 && r.right <= 800 && r.bottom <= 600))
        const sceneBounds = await evaluate(() => {
            const background = document.querySelector('#world .landscape').getBoundingClientRect()
            const fields = document.querySelector('#world').getBoundingClientRect()
            return ['x', 'y', 'width', 'height'].every(
                (key) => Math.abs(background[key] - fields[key]) < 1
            )
        })
        assert(sceneBounds, 'Background and field coordinates diverge at 800×600')
        await screenshot('prototype-800x600.png')
        await click('#hit-3')
        const popup = await evaluate(() => {
            const r = document.querySelector('#seed-picker').getBoundingClientRect()
            return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }
        })
        assert(popup.x >= 0 && popup.y >= 0 && popup.right <= 800 && popup.bottom <= 600)
        await escape()
        passed('800×600 keeps all 12 field hit areas and seed popover within viewport')
        window.setContentSize(1800, 900)
        await pause(300)
        await screenshot('prototype-wide.png')
        window.setContentSize(1600, 900)
        await pause(300)
        await click('#codex')
        // Render all 24 states using the exact fixed slots and sprite pivots used by the farm.
        await evaluate(() => {
            const cards = [...document.querySelectorAll('#panel .item-card')]
            const ids = ['wheat', 'carrot', 'potato', 'tomato', 'strawberry', 'pumpkin']
            const stageNames = ['新播种', '幼苗', '生长中', '成熟']
            const board = document.createElement('section')
            board.id = 'alignment-proof'
            board.style.cssText =
                'position:absolute;inset:0;z-index:110;background:#e2e8d3;padding:16px;color:#5c674b'
            board.innerHTML =
                '<h2 style="margin:0;height:46px;font-size:22px">固定种植点检查 · 六种作物 × 四个生长阶段</h2><div class="proof-grid" style="display:grid;grid-template-columns:repeat(6,1fr);grid-template-rows:repeat(4,1fr);gap:10px;height:calc(100% - 46px)"></div>'
            for (let phase = 0; phase < 4; phase++) {
                cards.forEach((card, index) => {
                    const cell = document.createElement('div')
                    cell.style.cssText =
                        'position:relative;overflow:hidden;background:#f2f4e7;border-radius:12px'
                    const label = document.createElement('strong')
                    label.textContent = `${card.querySelector('h3').textContent} · ${stageNames[phase]}`
                    label.style.cssText =
                        'position:absolute;left:12px;top:12px;font-size:14px;z-index:1'
                    const field = document.createElement('div')
                    field.className = 'alignment-field'
                    field.style.cssText =
                        'position:absolute;width:310px;height:220px;left:50%;top:73%;transform:translate(-50%,-70%) scale(.72)'
                    const soil = document.querySelector('.plot-bed').cloneNode(true)
                    field.append(soil)
                    window.FarmCropArt.slots.forEach((slot, n) =>
                        field.insertAdjacentHTML(
                            'beforeend',
                            window.FarmCropArt.plant(
                                ids[index],
                                phase,
                                155 + slot.x,
                                154 + slot.y,
                                index,
                                n
                            )
                        )
                    )
                    field
                        .querySelectorAll('.crop-art')
                        .forEach((art) => (art.style.animation = 'none'))
                    const guides = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
                    guides.setAttribute('viewBox', '0 0 310 220')
                    guides.setAttribute('class', 'alignment-guides')
                    guides.style.cssText =
                        'display:none;position:absolute;inset:0;width:310px;height:220px;z-index:1000000;pointer-events:none'
                    guides.innerHTML = `<polygon points="${window.FarmCropArt.footprint.map((p) => `${155 + p.x},${154 + p.y}`).join(' ')}" fill="none" stroke="#367a9b" stroke-width="1.5"/>${window.FarmCropArt.slots.map((p) => `<path d="M ${151 + p.x} ${154 + p.y} h 8 M ${155 + p.x} ${150 + p.y} v 8" stroke="#ffda66" stroke-width="2"/><circle cx="${155 + p.x}" cy="${154 + p.y}" r="1.7" fill="#bc4c35"/>`).join('')}`
                    field.append(guides)
                    cell.append(label, field)
                    board.querySelector('.proof-grid').append(cell)
                })
            }
            document.body.append(board)
        })
        const calibration = await evaluate(() => {
            let maxError = 0,
                checked = 0
            for (const root of document.querySelectorAll('#alignment-proof .crop-root')) {
                const art = root.querySelector('.crop-art')
                const meta =
                    window.FarmCropArt.sprites[root.dataset.crop].stages[Number(root.dataset.phase)]
                const bounds = art.getBoundingClientRect(),
                    ground = root.getBoundingClientRect()
                const actualX =
                    bounds.x + ((meta.pivot[0] - meta.rect[0]) / meta.rect[2]) * bounds.width
                const actualY =
                    bounds.y + ((meta.pivot[1] - meta.rect[1]) / meta.rect[3]) * bounds.height
                const slot = window.FarmCropArt.slots[Number(root.dataset.slot)]
                const field = root.closest('.alignment-field').getBoundingClientRect()
                const expectedX = field.x + ((155 + slot.x) * field.width) / 310
                const expectedY = field.y + ((154 + slot.y) * field.height) / 220
                maxError = Math.max(
                    maxError,
                    Math.hypot(actualX - expectedX, actualY - expectedY) / 0.72,
                    Math.hypot(actualX - ground.x, actualY - ground.y) / 0.72
                )
                checked++
            }
            return { checked, maxScenePixelError: maxError }
        })
        assert.equal(calibration.checked, 216)
        assert(calibration.maxScenePixelError <= 2, JSON.stringify(calibration))
        await screenshot('prototype-alignment.png')
        await evaluate(() =>
            document
                .querySelectorAll('.alignment-guides')
                .forEach((node) => (node.style.display = 'block'))
        )
        await screenshot('prototype-root-guides.png')
        passed(
            `All 24 stages × 9 fixed roots: maximum alignment error ${calibration.maxScenePixelError.toFixed(3)} scene pixels; normal and guide proofs saved`
        )
        assert.equal(errors.length, 0, errors.join('\n'))
        passed('No renderer errors')
        fs.writeFileSync(
            path.join(__dirname, 'verification.json'),
            JSON.stringify(
                { verifiedAt: new Date().toISOString(), assets, checks: results },
                null,
                2
            ) + '\n'
        )
        app.exit(0)
    } catch (error) {
        console.error(error.stack)
        await screenshot('prototype-verification-failure.png')
        app.exit(1)
    }
})
