import type { farmAchievementDefinitions } from '../../../shared/farmAchievements'
import allRounderLocked from './ACH_FARM_ALL_ROUNDER_locked.png'
import allRounderUnlocked from './ACH_FARM_ALL_ROUNDER_unlocked.png'
import collectionLocked from './ACH_FARM_COLLECTION_locked.png'
import collectionUnlocked from './ACH_FARM_COLLECTION_unlocked.png'
import diversityLocked from './ACH_FARM_DIVERSITY_locked.png'
import diversityUnlocked from './ACH_FARM_DIVERSITY_unlocked.png'
import fullFieldLocked from './ACH_FARM_FULL_FIELD_locked.png'
import fullFieldUnlocked from './ACH_FARM_FULL_FIELD_unlocked.png'
import harvest1Locked from './ACH_FARM_HARVEST_1_locked.png'
import harvest1Unlocked from './ACH_FARM_HARVEST_1_unlocked.png'
import harvest100Locked from './ACH_FARM_HARVEST_100_locked.png'
import harvest100Unlocked from './ACH_FARM_HARVEST_100_unlocked.png'
import harvest500Locked from './ACH_FARM_HARVEST_500_locked.png'
import harvest500Unlocked from './ACH_FARM_HARVEST_500_unlocked.png'
import harvest1000Locked from './ACH_FARM_HARVEST_1000_locked.png'
import harvest1000Unlocked from './ACH_FARM_HARVEST_1000_unlocked.png'
import order1Locked from './ACH_FARM_ORDER_1_locked.png'
import order1Unlocked from './ACH_FARM_ORDER_1_unlocked.png'
import order10Locked from './ACH_FARM_ORDER_10_locked.png'
import order10Unlocked from './ACH_FARM_ORDER_10_unlocked.png'
import order100Locked from './ACH_FARM_ORDER_100_locked.png'
import order100Unlocked from './ACH_FARM_ORDER_100_unlocked.png'
import wateredFieldLocked from './ACH_FARM_WATERED_FIELD_locked.png'
import wateredFieldUnlocked from './ACH_FARM_WATERED_FIELD_unlocked.png'

export const farmAchievementArt = {
    ACH_FARM_HARVEST_1: { locked: harvest1Locked, unlocked: harvest1Unlocked },
    ACH_FARM_HARVEST_100: { locked: harvest100Locked, unlocked: harvest100Unlocked },
    ACH_FARM_HARVEST_500: { locked: harvest500Locked, unlocked: harvest500Unlocked },
    ACH_FARM_HARVEST_1000: { locked: harvest1000Locked, unlocked: harvest1000Unlocked },
    ACH_FARM_ORDER_1: { locked: order1Locked, unlocked: order1Unlocked },
    ACH_FARM_ORDER_10: { locked: order10Locked, unlocked: order10Unlocked },
    ACH_FARM_ORDER_100: { locked: order100Locked, unlocked: order100Unlocked },
    ACH_FARM_COLLECTION: { locked: collectionLocked, unlocked: collectionUnlocked },
    ACH_FARM_ALL_ROUNDER: { locked: allRounderLocked, unlocked: allRounderUnlocked },
    ACH_FARM_FULL_FIELD: { locked: fullFieldLocked, unlocked: fullFieldUnlocked },
    ACH_FARM_DIVERSITY: { locked: diversityLocked, unlocked: diversityUnlocked },
    ACH_FARM_WATERED_FIELD: { locked: wateredFieldLocked, unlocked: wateredFieldUnlocked }
} satisfies Record<
    (typeof farmAchievementDefinitions)[number]['id'],
    { locked: string; unlocked: string }
>
