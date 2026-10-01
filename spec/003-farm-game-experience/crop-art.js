// Single-plant art: source-pixel pivots measured independently of transparent padding.
// Generated PNGs stay untouched. Both field plants and inventory icons use these regions.
;(() => {
    'use strict'
    const sprites = {
        wheat: {
            file: 'crop-wheat-single.png',
            sheet: [2172, 724],
            stages: [
                {
                    rect: [120, 382, 241, 271],
                    pivot: [249, 646],
                    height: 24
                },
                {
                    rect: [569, 153, 414, 500],
                    pivot: [779, 646],
                    height: 46
                },
                {
                    rect: [1085, 21, 501, 633],
                    pivot: [1333, 648],
                    height: 78
                },
                {
                    rect: [1661, 13, 483, 641],
                    pivot: [1907, 647],
                    height: 106
                }
            ]
        },
        carrot: {
            file: 'crop-carrot-single.png',
            sheet: [2172, 724],
            stages: [
                {
                    rect: [158, 490, 225, 180],
                    pivot: [272, 664],
                    height: 20
                },
                {
                    rect: [618, 265, 345, 402],
                    pivot: [813, 660],
                    height: 40
                },
                {
                    rect: [1070, 124, 497, 549],
                    pivot: [1321, 666],
                    height: 62
                },
                {
                    rect: [1607, 20, 537, 655],
                    pivot: [1869, 669],
                    height: 86
                }
            ]
        },
        potato: {
            file: 'crop-potato-single.png',
            sheet: [2172, 724],
            stages: [
                {
                    rect: [140, 450, 281, 172],
                    pivot: [287, 615],
                    height: 20
                },
                {
                    rect: [588, 204, 447, 419],
                    pivot: [810, 616],
                    height: 40
                },
                {
                    rect: [1115, 106, 460, 517],
                    pivot: [1348, 616],
                    height: 62
                },
                {
                    rect: [1638, 42, 471, 593],
                    pivot: [1888, 620],
                    height: 86
                }
            ]
        },
        tomato: {
            file: 'crop-tomato-single.png',
            sheet: [2172, 724],
            stages: [
                {
                    rect: [130, 480, 293, 177],
                    pivot: [268, 653],
                    height: 20
                },
                {
                    rect: [621, 209, 376, 449],
                    pivot: [814, 654],
                    height: 40
                },
                {
                    rect: [1095, 51, 451, 614],
                    pivot: [1317, 661],
                    height: 68
                },
                {
                    rect: [1625, 22, 514, 645],
                    pivot: [1873, 663],
                    height: 90
                }
            ]
        },
        strawberry: {
            file: 'crop-strawberry-single.png',
            sheet: [2172, 724],
            stages: [
                {
                    rect: [85, 378, 307, 193],
                    pivot: [242, 565],
                    height: 18
                },
                {
                    rect: [521, 211, 487, 374],
                    pivot: [755, 578],
                    height: 32
                },
                {
                    rect: [1042, 147, 527, 451],
                    pivot: [1303, 591],
                    height: 44
                },
                {
                    rect: [1586, 82, 530, 532],
                    pivot: [1865, 588],
                    height: 58
                }
            ]
        },
        pumpkin: {
            file: 'crop-pumpkin-single.png',
            sheet: [2172, 724],
            stages: [
                {
                    rect: [57, 426, 365, 178],
                    pivot: [243, 597],
                    height: 18
                },
                {
                    rect: [519, 256, 447, 352],
                    pivot: [749, 601],
                    height: 30
                },
                {
                    rect: [1025, 190, 543, 416],
                    pivot: [1315, 599],
                    height: 46
                },
                {
                    rect: [1605, 82, 557, 557],
                    pivot: [1885, 611],
                    height: 65
                }
            ]
        }
    }
    // The four measured soil corners, clockwise from its rear corner.
    const footprint = [
        { x: 14, y: -52 },
        { x: 151, y: 0 },
        { x: 14, y: 52 },
        { x: -145, y: 0 }
    ]
    const slots = []
    for (const u of [0.22, 0.5, 0.78])
        for (const v of [0.22, 0.5, 0.78]) {
            const weights = [(1 - u) * (1 - v), u * (1 - v), u * v, (1 - u) * v]
            slots.push({
                x: footprint.reduce((sum, p, i) => sum + p.x * weights[i], 0),
                y: footprint.reduce((sum, p, i) => sum + p.y * weights[i], 0)
            })
        }
    const style = (id, phase) => {
        const { file, sheet, stages } = sprites[id]
        const { rect, pivot, height } = stages[phase]
        const [x, y, w, h] = rect,
            width = (height * w) / h
        const anchorX = ((pivot[0] - x) * height) / h,
            anchorY = ((pivot[1] - y) * height) / h
        return `width:${width}px;height:${height}px;left:${-anchorX}px;top:${-anchorY}px;transform-origin:${anchorX}px ${anchorY}px;background-image:url('assets/${file}');background-size:${(sheet[0] / w) * 100}% ${(sheet[1] / h) * 100}%;background-position:${(x / (sheet[0] - w)) * 100}% ${(y / (sheet[1] - h)) * 100}%`
    }
    const icon = (id, phase = 3, extra = '') => {
        const { file, sheet, stages } = sprites[id]
        const [x, y, width, height] = stages[phase].rect
        return `<svg class="crop-icon ${extra}" data-crop="${id}" data-phase="${phase}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><svg width="${width}" height="${height}" overflow="hidden"><image href="assets/${file}" x="${-x}" y="${-y}" width="${sheet[0]}" height="${sheet[1]}" /></svg></svg>`
    }
    const plant = (id, phase, x, y, plot, slot) =>
        `<span class="crop-root" data-plot="${plot}" data-slot="${slot}" data-crop="${id}" data-phase="${phase}" style="left:${x}px;top:${y}px;z-index:${Math.round(y * 100) + slot}"><span class="root-shadow"></span><span class="atlas-art crop-art" style="${style(id, phase)}"></span></span>`
    window.FarmCropArt = Object.freeze({ sprites, footprint, slots, style, icon, plant })
})()
