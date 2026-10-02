import { plantStage } from '../../main/modules/farm/rules'
import type { FarmView } from '../../main/types/farm'
export type FarmPoint = { x: number; y: number }
export const farmEntrances = [
    { id: 'pasture', sign: { x: 405, y: 325 }, area: { x: 330, y: 285, width: 125, height: 85 } },
    { id: 'explore', sign: { x: 860, y: 282 }, area: { x: 895, y: 295, width: 100, height: 55 } },
    { id: 'cabin', sign: { x: 1368, y: 321 }, area: { x: 1325, y: 268, width: 85, height: 140 } },
    // The fishing anchor is the post's foot, placed at the user's marked bank location.
    { id: 'fishing', sign: { x: 399, y: 676 }, area: { x: 320, y: 650, width: 180, height: 140 } }
] as const
export type FarmEntranceId = (typeof farmEntrances)[number]['id']
export type FarmTarget =
    | { kind: 'plot'; id: number }
    | { kind: 'entry'; id: FarmEntranceId }
    | { kind: 'blank' }
export type FarmHover = (Exclude<FarmTarget, { kind: 'blank' }> & FarmPoint) | null
export const worldSize = { width: 1600, height: 900 }
export const fieldFrame = { scale: 0.9, x: 130, y: 37.5 }
export const footprint: FarmPoint[] = [
    { x: 14, y: -52 },
    { x: 151, y: 0 },
    { x: 14, y: 52 },
    { x: -145, y: 0 }
]
export const plantingSlots: FarmPoint[] = []
for (const u of [0.22, 0.5, 0.78])
    for (const v of [0.22, 0.5, 0.78]) {
        const weights = [(1 - u) * (1 - v), u * (1 - v), u * v, (1 - u) * v]
        plantingSlots.push({
            x: footprint.reduce((n, p, i) => n + p.x * weights[i], 0),
            y: footprint.reduce((n, p, i) => n + p.y * weights[i], 0)
        })
    }
export function plotPosition(id: number): FarmPoint {
    return {
        x: 665 + (id % 4) * 168 - Math.floor(id / 4) * 168,
        y: 425 + (id % 4) * 60 + Math.floor(id / 4) * 60
    }
}
export function farmLayout(width: number, height: number) {
    const scale = Math.max(width / worldSize.width, height / worldSize.height)
    const x = (width - worldSize.width * scale) / 2,
        y = (height - worldSize.height * scale) / 2
    return {
        width,
        height,
        scale,
        x,
        y,
        entrances: farmEntrances.map((entry) => ({
            id: entry.id,
            x: x + entry.sign.x * scale,
            y: y + entry.sign.y * scale
        })),
        plots: Array.from({ length: 12 }, (_, id) => {
            const p = plotPosition(id)
            return {
                x: x + (fieldFrame.x + p.x * fieldFrame.scale) * scale,
                y: y + (fieldFrame.y + p.y * fieldFrame.scale) * scale
            }
        })
    }
}
export type FarmLayout = ReturnType<typeof farmLayout>
export function insidePlot(point: FarmPoint, origin: FarmPoint): boolean {
    return footprint.every((a, i) => {
        const b = footprint[(i + 1) % footprint.length]
        return (
            (b.x - a.x) * (point.y - origin.y - a.y) - (b.y - a.y) * (point.x - origin.x - a.x) >= 0
        )
    })
}
export function hitFarm(layout: FarmLayout, x: number, y: number): FarmTarget {
    const point = {
        x: ((x - layout.x) / layout.scale - fieldFrame.x) / fieldFrame.scale,
        y: ((y - layout.y) / layout.scale - fieldFrame.y) / fieldFrame.scale
    }
    const id = layout.plots.findIndex((_, index) => insidePlot(point, plotPosition(index)))
    if (id >= 0) return { kind: 'plot', id }
    const world = { x: (x - layout.x) / layout.scale, y: (y - layout.y) / layout.scale }
    const entry = farmEntrances.find(
        ({ area }) =>
            world.x >= area.x &&
            world.x <= area.x + area.width &&
            world.y >= area.y &&
            world.y <= area.y + area.height
    )
    return entry ? { kind: 'entry', id: entry.id } : { kind: 'blank' }
}
export function plotMode(view: FarmView, id: number) {
    if (id >= view.unlockedPlots) return 'locked'
    const plant = view.farm?.plots[id]?.plant
    if (!plant) return 'sow'
    if (plantStage(plant) === 3) return 'harvest'
    return plant.watered ? 'inspect' : 'water'
}
