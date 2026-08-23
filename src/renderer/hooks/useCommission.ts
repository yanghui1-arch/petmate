import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Commission } from '../types/commission'
import type { CommissionCompletionResult, PlayerResourceState } from '@main/types/player-resource'
import toolGiftImage from '../assets/image/special_activity/labor-2026/工具寻礼贴图.png'
import parasolImage from '../assets/image/special_activity/labor-2026/洋伞赠礼贴图.png'
import gamingImage from '../assets/image/special_activity/labor-2026/电竞赠礼.png'
import laborKickPreviewImage from '../assets/models/youmei/animations/angry_kick/labor-skin/10.png'

const LABOR_DAY_DEADLINE = new Date('2026-05-15T23:59:59+08:00')
const LABOR_KICK_REWARD = {
    id: 'youmei-angry-kick-labor-2026',
    type: 'animation' as const,
    name: 'commission.rewards.laborKick.name',
    description: 'commission.rewards.laborKick.description',
    imageUrl: laborKickPreviewImage,
}

const now = ref(new Date())
let clockStarted = false
let resourceListenerStarted = false

const defaultPlayerResources: PlayerResourceState = {
    animationResources: [],
    skins: [],
    equippedSkinId: '',
    titles: [],
    equippedTitleId: null,
    commissionCompletionCounts: {},
    schoolHandbookLimitedItemMissCount: 0,
    completedCommissionIds: [],
}
const playerResources = ref<PlayerResourceState>(defaultPlayerResources)
const isPlayerResourcesLoaded = ref(false)

const HOLIDAY_COMMISSION_DEFS: Omit<Commission, 'status'>[] = [
    {
        id: 'labor-2026-tool',
        name: 'commission.definitions.tool.name',
        description: 'commission.definitions.tool.description',
        imageUrl: toolGiftImage,
        deadline: LABOR_DAY_DEADLINE,
        category: 'holiday',
        requirements: [
            { itemId: 24, itemName: 'commission.items.toolbox', itemUrl: 'limit/mayday-luxury-toolbox', count: 1 },
        ],
        rewards: [
            {
                id: 'labor-2026-random-supplies',
                type: 'item',
                name: 'commission.rewards.randomSupplies.name',
                description: 'commission.rewards.randomSupplies.description',
            },
            {
                id: 'labor-2026-random-cash',
                type: 'cash',
                name: 'commission.rewards.randomCash.name',
                description: 'commission.rewards.randomCash.description',
            },
            LABOR_KICK_REWARD,
            {
                id: 'labor-2026-holiday-craftsperson',
                type: 'title',
                name: 'commission.rewards.craftsperson.name',
                description: 'commission.rewards.craftsperson.description',
            },
        ],
    },
    {
        id: 'labor-2026-parasol',
        name: 'commission.definitions.parasol.name',
        description: 'commission.definitions.parasol.description',
        imageUrl: parasolImage,
        deadline: LABOR_DAY_DEADLINE,
        category: 'holiday',
        requirements: [
            { itemId: 23, itemName: 'commission.items.parasol', itemUrl: 'limit/mayday-lace-parasol', count: 1 },
        ],
        rewards: [
            {
                id: 'labor-2026-random-supplies',
                type: 'item',
                name: 'commission.rewards.randomSupplies.name',
                description: 'commission.rewards.randomSupplies.description',
            },
            {
                id: 'labor-2026-random-cash',
                type: 'cash',
                name: 'commission.rewards.randomCash.name',
                description: 'commission.rewards.randomCash.description',
            },
            LABOR_KICK_REWARD,
            {
                id: 'labor-2026-sunny-guardian',
                type: 'title',
                name: 'commission.rewards.guardian.name',
                description: 'commission.rewards.guardian.description',
            },
        ],
    },
    {
        id: 'labor-2026-gaming',
        name: 'commission.definitions.gaming.name',
        description: 'commission.definitions.gaming.description',
        imageUrl: gamingImage,
        deadline: LABOR_DAY_DEADLINE,
        category: 'holiday',
        requirements: [
            { itemId: 22, itemName: 'commission.items.headphones', itemUrl: 'limit/mayday-bunny-headphones', count: 1 },
        ],
        rewards: [
            {
                id: 'labor-2026-random-supplies',
                type: 'item',
                name: 'commission.rewards.randomSupplies.name',
                description: 'commission.rewards.randomSupplies.description',
            },
            {
                id: 'labor-2026-random-cash',
                type: 'cash',
                name: 'commission.rewards.randomCash.name',
                description: 'commission.rewards.randomCash.description',
            },
            LABOR_KICK_REWARD,
            {
                id: 'labor-2026-winning-duo',
                type: 'title',
                name: 'commission.rewards.winningDuo.name',
                description: 'commission.rewards.winningDuo.description',
            },
        ],
    },
]

const startCommissionClock = () => {
    if (clockStarted) return
    clockStarted = true
    window.setInterval(() => {
        now.value = new Date()
    }, 60 * 1000)
}

const startPlayerResourceListener = () => {
    if (resourceListenerStarted) return
    resourceListenerStarted = true
    window.api.onPlayerResourcesUpdated((_, resources) => {
        playerResources.value = resources
        isPlayerResourcesLoaded.value = true
    })
}

const refreshPlayerResources = async () => {
    const response = await window.api.getPlayerResources()
    if (response.code === 200 && response.data) {
        playerResources.value = response.data
        isPlayerResourcesLoaded.value = true
    }
}

export function useCommission() {
    const { t } = useI18n()
    startCommissionClock()
    startPlayerResourceListener()

    const holidayCommissions = computed<Commission[]>(() => {
        return HOLIDAY_COMMISSION_DEFS.map(c => ({
            ...c,
            name: t(c.name),
            description: t(c.description),
            requirements: c.requirements.map(requirement => ({
                ...requirement,
                itemName: t(requirement.itemName),
            })),
            rewards: c.rewards.map(reward => ({
                ...reward,
                name: t(reward.name),
                description: t(reward.description),
            })),
            status: now.value > c.deadline ? 'expired' : 'active',
        }))
    })

    const submitCommission = async (commission: Commission, completionCount: number = 1): Promise<{ success: boolean, message: string, result?: CommissionCompletionResult }> => {
        if (commission.status === 'expired') {
            return { success: false, message: t('commission.errors.expired') }
        }

        if (!Number.isInteger(completionCount) || completionCount <= 0) {
            return { success: false, message: t('commission.errors.invalidCount') }
        }

        const requirements = commission.requirements.map(requirement => ({
            itemId: requirement.itemId,
            count: requirement.count,
        }))
        const response = await window.api.completeCommission(commission.id, requirements, completionCount)
        if (response.code === 200 && response.data) {
            playerResources.value = response.data.resources
            isPlayerResourcesLoaded.value = true
            return { success: true, message: t('commission.completed'), result: response.data }
        }

        return {
            success: false,
            message: t('commission.submitFailed'),
        }
    }

    return {
        holidayCommissions,
        playerResources,
        isPlayerResourcesLoaded,
        refreshPlayerResources,
        submitCommission,
    }
}
