import type { FarmCatalog, FarmState } from '../main/types/farm'

export const farmAchievementDefinitions = [
    {
        id: 'ACH_FARM_HARVEST_1',
        key: 'harvest1',
        target: 1,
        stat: 'FarmHarvestCount',
        metric: 'harvest',
        icon: 7
    },
    {
        id: 'ACH_FARM_HARVEST_100',
        key: 'harvest100',
        target: 100,
        stat: 'FarmHarvestCount',
        metric: 'harvest',
        icon: 7
    },
    {
        id: 'ACH_FARM_HARVEST_500',
        key: 'harvest500',
        target: 500,
        stat: 'FarmHarvestCount',
        metric: 'harvest',
        icon: 7
    },
    {
        id: 'ACH_FARM_HARVEST_1000',
        key: 'harvest1000',
        target: 1000,
        stat: 'FarmHarvestCount',
        metric: 'harvest',
        icon: 7
    },
    {
        id: 'ACH_FARM_ORDER_1',
        key: 'order1',
        target: 1,
        stat: 'FarmOrderCount',
        metric: 'orders',
        icon: 1
    },
    {
        id: 'ACH_FARM_ORDER_10',
        key: 'order10',
        target: 10,
        stat: 'FarmOrderCount',
        metric: 'orders',
        icon: 1
    },
    {
        id: 'ACH_FARM_ORDER_100',
        key: 'order100',
        target: 100,
        stat: 'FarmOrderCount',
        metric: 'orders',
        icon: 1
    },
    {
        id: 'ACH_FARM_COLLECTION',
        key: 'collection',
        target: 6,
        stat: 'FarmCropTypesHarvested',
        metric: 'collection',
        icon: 3
    },
    {
        id: 'ACH_FARM_ALL_ROUNDER',
        key: 'allRounder',
        target: 20,
        stat: 'FarmLeastHarvestedCropCount',
        metric: 'minimum',
        icon: 3
    },
    {
        id: 'ACH_FARM_FULL_FIELD',
        key: 'fullField',
        target: 12,
        stat: 'FarmUnlockedPlots',
        metric: 'plots',
        icon: 8
    },
    {
        id: 'ACH_FARM_DIVERSITY',
        key: 'diversity',
        target: 6,
        stat: 'FarmCropDiversity',
        metric: 'diversity',
        icon: 8
    },
    {
        id: 'ACH_FARM_WATERED_FIELD',
        key: 'wateredField',
        target: 12,
        stat: 'FarmWateredPlots',
        metric: 'watered',
        icon: 9
    }
] as const

export function ensureFarmAchievements(farm: FarmState, catalog: FarmCatalog) {
    return (farm.achievements ??= {
        // Existing harvest records are item counts; each crop has a fixed yield.
        harvestedPlots: Object.fromEntries(
            catalog.crops.map((crop) => [
                crop.id,
                Math.floor((farm.harvests[crop.id] ?? 0) / crop.yield)
            ])
        ),
        completedOrders: 0,
        unlocked: []
    })
}

export function farmAchievementEntries(
    farm: FarmState,
    catalog: FarmCatalog,
    unlockedPlots: number
) {
    const state = farm.achievements
    const counts = catalog.crops.map(
        (crop) =>
            state?.harvestedPlots[crop.id] ?? Math.floor((farm.harvests[crop.id] ?? 0) / crop.yield)
    )
    const metrics = {
        harvest: counts.reduce((sum, count) => sum + count, 0),
        orders: state?.completedOrders ?? 0,
        collection: counts.filter((count) => count > 0).length,
        minimum: Math.min(...counts),
        plots: unlockedPlots,
        diversity: new Set(farm.plots.flatMap((plot) => (plot.plant ? [plot.plant.cropId] : [])))
            .size,
        watered: farm.plots.filter((plot) => plot.plant?.watered).length
    }
    return farmAchievementDefinitions.map((definition) => ({
        ...definition,
        value: Math.max(
            metrics[definition.metric],
            state?.unlocked.includes(definition.id) ? definition.target : 0
        ),
        unlocked: state?.unlocked.includes(definition.id) ?? false
    }))
}

export function updateFarmAchievements(
    farm: FarmState,
    catalog: FarmCatalog,
    unlockedPlots: number
) {
    const state = ensureFarmAchievements(farm, catalog)
    for (const entry of farmAchievementEntries(farm, catalog, unlockedPlots)) {
        if (entry.value >= entry.target && !state.unlocked.includes(entry.id))
            state.unlocked.push(entry.id)
    }
}
