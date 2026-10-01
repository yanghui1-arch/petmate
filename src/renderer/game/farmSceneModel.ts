import { plantStage } from '../../main/modules/farm/rules'
import type { FarmView, PlacedDecoration } from '../../main/types/farm'

export type FarmTool =
    | { kind: 'inspect' }
    | { kind: 'sow'; cropId: string }
    | { kind: 'water' }
    | { kind: 'place'; decorationId: string }
    | { kind: 'move'; decorationId: string; instanceId: string }
export type FarmCell = { region: PlacedDecoration['region']; x: number; y: number }
export type FarmTarget =
    | { kind: 'plot'; id: number }
    | { kind: 'decoration'; instanceId: string }
    | { kind: 'cell'; cell: FarmCell }
    | { kind: 'blank' }
export type FarmRect = { x: number; y: number; width: number; height: number }

export function farmLayout(width: number, height: number) {
    const compact = width < 760
    const plotsWidth = width * (compact ? 0.62 : 0.6)
    const plotsHeight = Math.min(plotsWidth / 1.65, height * 0.54)
    return {
        width,
        height,
        plots: Array.from({ length: 12 }, (_, id) => ({
            x: width * (compact ? 0.25 : 0.24) + (id % 4) * ((plotsWidth - 12) / 4 + 4),
            y: height * 0.29 + Math.floor(id / 4) * ((plotsHeight - 8) / 3 + 4),
            width: (plotsWidth - 12) / 4,
            height: (plotsHeight - 8) / 3
        })),
        regions: {
            left: { x: width * 0.03, y: height * 0.46, width: width * 0.17, height: height * 0.22 },
            right: { x: width * 0.88, y: height * 0.44, width: width * 0.1, height: height * 0.37 },
            bottom: { x: width * 0.16, y: height * 0.86, width: width * 0.72, height: height * 0.1 }
        }
    }
}
export type FarmLayout = ReturnType<typeof farmLayout>
export function cellRect(layout: FarmLayout, cell: FarmCell, span = 1): FarmRect {
    const area = layout.regions[cell.region]
    const width = area.width / (cell.region === 'bottom' ? 8 : 2)
    const height = area.height / (cell.region === 'bottom' ? 1 : 4)
    return { x: area.x + cell.x * width, y: area.y + cell.y * height, width: width * span, height }
}
export function decorationWidth(view: FarmView, id: string) {
    return view.catalog.decorations.find((item) => item.id === id)?.width ?? 1
}
export function contains(rect: FarmRect, x: number, y: number) {
    return x >= rect.x && y >= rect.y && x < rect.x + rect.width && y < rect.y + rect.height
}
export function hitFarm(
    layout: FarmLayout,
    view: FarmView,
    x: number,
    y: number,
    arranging = false
): FarmTarget {
    if (!view.farm || x < 0 || y < 0 || x >= layout.width || y >= layout.height)
        return { kind: 'blank' }
    // While arranging, a cell remains targetable even under the instance being moved.
    if (!arranging) {
        for (const item of [...view.farm.placed].reverse()) {
            if (contains(cellRect(layout, item, decorationWidth(view, item.decorationId)), x, y)) {
                return { kind: 'decoration', instanceId: item.instanceId }
            }
        }
    }
    const plot = layout.plots.findIndex((rect) => contains(rect, x, y))
    if (plot >= 0) return { kind: 'plot', id: plot }
    for (const region of ['left', 'right', 'bottom'] as const) {
        const area = layout.regions[region]
        if (!contains(area, x, y)) continue
        return {
            kind: 'cell',
            cell: {
                region,
                x: Math.floor(((x - area.x) / area.width) * (region === 'bottom' ? 8 : 2)),
                y: Math.floor(((y - area.y) / area.height) * (region === 'bottom' ? 1 : 4))
            }
        }
    }
    return { kind: 'blank' }
}
export function placementAllowed(view: FarmView, tool: FarmTool, cell: FarmCell): boolean {
    if (!view.farm || view.saveError || (tool.kind !== 'place' && tool.kind !== 'move'))
        return false
    const definition = view.catalog.decorations.find((item) => item.id === tool.decorationId)
    if (
        !definition ||
        cell.x < 0 ||
        cell.y < 0 ||
        !Number.isInteger(cell.x) ||
        !Number.isInteger(cell.y) ||
        cell.x + definition.width > (cell.region === 'bottom' ? 8 : 2) ||
        cell.y >= (cell.region === 'bottom' ? 1 : 4)
    )
        return false
    if (
        tool.kind === 'place' &&
        (definition.level > view.level ||
            view.farm.placed.length >= 12 ||
            (view.farm.decorations[tool.decorationId] ?? 0) <=
                view.farm.placed.filter((item) => item.decorationId === tool.decorationId).length)
    )
        return false
    if (
        tool.kind === 'move' &&
        !view.farm.placed.some((item) => item.instanceId === tool.instanceId)
    )
        return false
    return !view.farm.placed.some(
        (item) =>
            item.region === cell.region &&
            item.y === cell.y &&
            !(tool.kind === 'move' && tool.instanceId === item.instanceId) &&
            item.x < cell.x + definition.width &&
            cell.x < item.x + decorationWidth(view, item.decorationId)
    )
}
export function plotIssue(view: FarmView, tool: FarmTool, id: number): string | null {
    if (!view.farm || !view.farm.plots[id] || id >= view.unlockedPlots) return 'locked'
    if (view.saveError) return 'saveBlocked'
    const plant = view.farm.plots[id].plant
    if (tool.kind === 'sow') {
        if (plant) return 'occupiedPlot'
        if (!(view.farm.seeds[tool.cropId] > 0)) return 'noSeeds'
        if (
            (view.catalog.crops.find((crop) => crop.id === tool.cropId)?.level ?? Infinity) >
            view.level
        )
            return 'locked'
    } else if (tool.kind === 'water') {
        if (!plant) return 'emptyWater'
        if (plantStage(plant) === 3) return 'matureWater'
        if (plant.watered) return 'watered'
    }
    return null
}
