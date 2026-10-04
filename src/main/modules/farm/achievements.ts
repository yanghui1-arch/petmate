import { farmAchievementEntries } from '../../../shared/farmAchievements'
import { greenworksManager } from '../../greenworks'
import logger from '../../log'
import type { FarmState } from '../../types/farm'
import { FarmAchievementSync } from './achievementSync'
import { farmCatalog, unlockedPlots } from './catalog'

const sync = new FarmAchievementSync(
    {
        ready: () => greenworksManager.isReady(),
        names: () => greenworksManager.getAchievementNames(),
        getStat: (name) => greenworksManager.getStatInt(name),
        setStat: (name, value) => greenworksManager.setStat(name, value),
        achieved: (id) =>
            new Promise((resolve, reject) => greenworksManager.getAchievement(id, resolve, reject)),
        unlock: (id) =>
            new Promise((resolve, reject) =>
                greenworksManager.activateAchievement(id, resolve, reject)
            ),
        store: () => new Promise((resolve, reject) => greenworksManager.storeStats(resolve, reject))
    },
    (error) =>
        logger.warn('Farm achievement synchronization will retry at the next checkpoint', error)
)

export function syncFarmAchievements(owner: string, farm: FarmState): void {
    void sync.sync(owner, farmAchievementEntries(farm, farmCatalog, unlockedPlots(farm.exp)))
}
