import { plantStage } from '../../main/modules/farm/rules'
import type { FarmView } from '../../main/types/farm'
export type FarmPoint = { x: number; y: number }
export type FarmTarget = { kind: 'plot'; id: number } | { kind: 'blank' }
export type FarmHover = { id: number; x: number; y: number } | null
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
    return id < 0 ? { kind: 'blank' } : { kind: 'plot', id }
}
export function plotMode(view: FarmView, id: number) {
    if (id >= view.unlockedPlots) return 'locked'
    const plant = view.farm?.plots[id]?.plant
    if (!plant) return 'sow'
    if (plantStage(plant) === 3) return 'harvest'
    return plant.watered ? 'inspect' : 'water'
}
