import { farmAchievementEntries } from '../../../shared/farmAchievements'
import {
    ensureFarmLife,
    farmLifeConfig,
    type FarmLifeKind,
    type FarmLifeVisit,
    isFarmLifeWork
} from '../../../shared/farmLife'
import type { FarmOperation, FarmState, FarmView } from '../../types/farm'
import { farmCatalog, getOrder, unlockedPlots } from './catalog'
import { applyOperation, clone, eligiblePlots } from './rules'

export function safeHelp(
    farm: FarmState,
    cash: number,
    operation: FarmOperation,
    at: number
): number[] {
    if (operation.type !== 'water' && operation.type !== 'harvest') return []
    const manual = farm.achievements?.manualHarvestedPlots ?? {}
    if (operation.type === 'harvest' && !Object.values(manual).some((count) => count > 0)) return []
    const unlocked = new Set(farm.achievements?.unlocked ?? [])
    const safe: number[] = []
    for (const id of eligiblePlots(farm, operation)) {
        const candidate = clone(farm)
        applyOperation(candidate, cash, { ...operation, plotIds: [...safe, id] }, at, 'helper')
        if (
            !farmAchievementEntries(candidate, farmCatalog, unlockedPlots(candidate.exp)).some(
                (entry) => !unlocked.has(entry.id) && entry.value >= entry.target
            )
        )
            safe.push(id)
    }
    return safe
}
export type LifeChoice = { kind: FarmLifeKind; plotIds: number[]; orderId?: string; weight: number }
export function lifeChoices(view: FarmView, at: number, random: () => number): LifeChoice[] {
    const farm = view.farm!,
        data = ensureFarmLife(farm, at),
        budget = data.daily,
        choices: LifeChoice[] = []
    const ids = farm.plots.slice(0, view.unlockedPlots).map((plot) => plot.id)
    if (budget.trips >= farmLifeConfig.maxTrips) return choices
    if (budget.work < farmLifeConfig.maxWorkTrips) {
        const water = eligiblePlots(farm, { type: 'water', plotIds: ids })
        const count = Math.min(
            farmLifeConfig.maxWaterPlots,
            Math.max(1, water.length - 1)
        )
        const waterIds = safeHelp(
            farm,
            view.cash,
            { type: 'water', plotIds: water.slice(0, Math.max(0, count)) },
            at
        )
        if (waterIds.length)
            choices.push({ kind: 'water', plotIds: waterIds, weight: farmLifeConfig.weights.water })
        const ripe = eligiblePlots(farm, { type: 'harvest', plotIds: ids })
        if (ripe.length >= 2) {
            const max = Math.min(
                farmLifeConfig.maxHarvestPlots,
                Math.max(
                    Math.ceil(ripe.length * farmLifeConfig.harvestMinRatio),
                    Math.floor(
                        ripe.length *
                            (farmLifeConfig.harvestMinRatio +
                                random() *
                                    (farmLifeConfig.harvestMaxRatio -
                                        farmLifeConfig.harvestMinRatio))
                    )
                ),
                ripe.length - 1
            )
            const ripeIds = safeHelp(farm, view.cash, { type: 'harvest', plotIds: ripe }, at)
            if (ripeIds.length)
                choices.push({
                    kind: 'harvest',
                    plotIds: ripeIds.slice(0, max),
                    weight: farmLifeConfig.weights.harvest
                })
            const orders = farm.orders
                .flatMap((slot) => {
                    if (!('templateId' in slot)) return []
                    const requirements = getOrder(slot.templateId).requirements
                    const missing = Object.fromEntries(
                        Object.entries(requirements).map(([crop, qty]) => [
                            crop,
                            Math.max(0, qty - (farm.produce[crop] ?? 0))
                        ])
                    )
                    const selected: number[] = []
                    for (const id of ripeIds) {
                        const crop = farmCatalog.crops.find(
                            (crop) => crop.id === farm.plots[id].plant!.cropId
                        )!
                        if ((missing[crop.id] ?? 0) <= 0 || selected.length >= max) continue
                        selected.push(id)
                        missing[crop.id] -= crop.yield
                    }
                    return selected.length
                        ? [
                              {
                                  slot,
                                  selected,
                                  ready: Object.values(missing).every((qty) => qty <= 0)
                              }
                          ]
                        : []
                })
                .sort((a, b) => Number(b.ready) - Number(a.ready))
            if (orders[0])
                choices.push({
                    kind: 'order',
                    plotIds: orders[0].selected,
                    orderId: orders[0].slot.instanceId,
                    weight: farmLifeConfig.weights.order
                })
        }
    }
    if (budget.life < farmLifeConfig.maxLifeTrips) {
        const kinds: FarmLifeKind[] =
            data.tutorialDone && data.trips >= 3 && !data.flower
                ? ['flower']
                : ['rest', 'butterfly', 'walk']
        if (kinds[0] !== 'flower') {
            if (
                farm.plots.some(
                    (plot) =>
                        plot.plant &&
                        plot.plant.elapsedMs <
                            plot.plant.durationMs * (plot.plant.watered ? 0.8 : 1)
                )
            )
                kinds.push('seedlings')
            if (!choices.length) kinds.push('check')
        }
        const recent = data.recent.at(-1),
            pool = kinds.filter((kind) => kind !== recent)
        const eligible = pool.length ? pool : kinds
        choices.push({
            kind: eligible[Math.min(eligible.length - 1, Math.floor(random() * eligible.length))],
            plotIds: [],
            weight: farmLifeConfig.weights.life
        })
    }
    return choices
}
export function revalidateVisit(
    view: FarmView,
    visit: FarmLifeVisit,
    at: number
): FarmOperation | null {
    if (!isFarmLifeWork(visit.kind)) return null
    const choices = lifeChoices(view, at, () => 0.999)
    // The already departed visit has consumed its trip slot; callers temporarily refund it when checking work.
    const choice = choices.find(
        (choice) =>
            choice.kind === visit.kind &&
            (visit.kind !== 'order' || choice.orderId === visit.orderId)
    )
    if (!choice) return null
    const ids = visit.plotIds.filter((id) => choice.plotIds.includes(id))
    return ids.length ? { type: visit.kind === 'water' ? 'water' : 'harvest', plotIds: ids } : null
}
