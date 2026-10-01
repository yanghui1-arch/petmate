// Read original generated PNGs without changing their pixels.
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')
if (!process.versions.electron) {
    const { spawnSync } = require('node:child_process')
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'petmate-farm-assets-'))
    const env = { ...process.env, FARM_ASSET_PROFILE: profile }
    delete env.ELECTRON_RUN_AS_NODE
    const result = spawnSync(require('electron'), [__filename], { env, stdio: 'inherit' })
    const resolved = path.resolve(profile)
    if (
        path.dirname(resolved) === path.resolve(os.tmpdir()) &&
        path.basename(resolved).startsWith('petmate-farm-assets-')
    )
        fs.rmSync(resolved, { recursive: true, force: true })
    process.exit(result.status ?? 1)
}
const { app, nativeImage } = require('electron')
app.setPath('userData', process.env.FARM_ASSET_PROFILE)
const context = { window: {} }
require('node:vm').runInNewContext(
    fs.readFileSync(path.join(__dirname, 'crop-art.js'), 'utf8'),
    context
)
const sprites = context.window.FarmCropArt.sprites
for (const id of ['wheat', 'carrot', 'potato', 'tomato', 'strawberry', 'pumpkin']) {
    const image = nativeImage.createFromPath(
        path.join(__dirname, 'assets', `crop-${id}-single.png`)
    )
    const { width, height } = image.getSize(),
        pixels = image.getBitmap()
    const visited = new Uint8Array(width * height)
    const queue = new Int32Array(width * height)
    const components = []
    let transparent = 0
    for (let i = 0; i < width * height; i++) {
        if (pixels[i * 4 + 3] === 0) transparent++
        if (visited[i] || pixels[i * 4 + 3] < 128) continue
        let head = 0,
            tail = 1,
            x0 = width,
            y0 = height,
            x1 = 0,
            y1 = 0
        queue[0] = i
        visited[i] = 1
        while (head < tail) {
            const pixel = queue[head++],
                x = pixel % width,
                y = Math.floor(pixel / width)
            x0 = Math.min(x0, x)
            x1 = Math.max(x1, x)
            y0 = Math.min(y0, y)
            y1 = Math.max(y1, y)
            const neighbors = []
            if (x > 0) neighbors.push(pixel - 1)
            if (x < width - 1) neighbors.push(pixel + 1)
            if (y > 0) neighbors.push(pixel - width)
            if (y < height - 1) neighbors.push(pixel + width)
            for (const n of neighbors)
                if (!visited[n] && pixels[n * 4 + 3] >= 128) {
                    visited[n] = 1
                    queue[tail++] = n
                }
        }
        if (tail > 500) components.push({ x0, y0, x1, y1, count: tail })
    }
    const stages = components
        .sort((a, b) => a.x0 - b.x0)
        .map(({ x0, y0, x1, y1, count }, phase) => {
            const bottom = []
            for (let y = y1 - 12; y <= y1; y++) {
                let first = x1,
                    last = x0
                for (let x = x0; x <= x1; x++)
                    if (pixels[(y * width + x) * 4 + 3] >= 128) {
                        first = Math.min(first, x)
                        last = Math.max(last, x)
                    }
                if (first <= last) bottom.push([y, first, last])
            }
            return { phase, rect: [x0, y0, x1 - x0 + 1, y1 - y0 + 1], opaquePixels: count, bottom }
        })
    const anchors = sprites[id].stages.map(({ rect, pivot }, phase) => {
        const [x, y, w, h] = rect,
            [px, py] = pivot
        const alpha = pixels[(py * width + px) * 4 + 3]
        if (alpha < 32) throw new Error(`${id}:${phase} pivot does not touch the plant artwork`)
        if (
            x < 0 ||
            y < 0 ||
            x + w > width ||
            y + h > height ||
            px < x ||
            px >= x + w ||
            py < y ||
            py >= y + h
        )
            throw new Error(`${id}:${phase} invalid sprite region or pivot`)
        return { phase, pivot, alpha }
    })
    if (stages.length !== 4 || transparent / (width * height) < 0.5)
        throw new Error(`${id}: expected four transparent single-plant stages`)
    console.log(
        JSON.stringify({
            id,
            width,
            height,
            transparentFraction: transparent / (width * height),
            stages,
            anchors
        })
    )
}
app.exit(0)
