import { ref, computed } from 'vue'
import type { Commission } from '../types/commission'
import type { CommissionCompletionResult, PlayerResourceState } from '@main/types/player-resource'
import toolGiftImage from '../assets/image/special_activity/labor-2026/工具寻礼贴图.png'
import parasolImage from '../assets/image/special_activity/labor-2026/洋伞赠礼贴图.png'
import gamingImage from '../assets/image/special_activity/labor-2026/电竞赠礼.png'
import laborKickPreviewImage from '../assets/models/youmei/animations/angry_kick/labor-skin/10.png'

const LABOR_DAY_DEADLINE = new Date('2026-05-05T23:59:59+08:00')
const LABOR_KICK_REWARD = {
    id: 'youmei-angry-kick-labor-2026',
    type: 'animation' as const,
    name: '劳动节踢人动画',
    description: '尤美换上劳动节造型，使出元气满满的一脚。',
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
    commissionCompletionCounts: {},
    completedCommissionIds: [],
}
const playerResources = ref<PlayerResourceState>(defaultPlayerResources)
const isPlayerResourcesLoaded = ref(false)

const HOLIDAY_COMMISSION_DEFS: Omit<Commission, 'status'>[] = [
    {
        id: 'labor-2026-tool',
        name: '工具寻礼',
        description: '劳动节到啦！把这份精心准备的豪华工具箱交给尤美，她会非常开心的~',
        imageUrl: toolGiftImage,
        deadline: LABOR_DAY_DEADLINE,
        category: 'holiday',
        requirements: [
            { itemId: 24, itemName: '豪华工具箱', itemUrl: 'limit/mayday-luxury-toolbox', count: 1 },
        ],
        rewards: [
            {
                id: 'labor-2026-random-supplies',
                type: 'item',
                name: '随机补给',
                description: '可能开出食物、饮料、礼物或限时补给。',
            },
            {
                id: 'labor-2026-random-cash',
                type: 'cash',
                name: '随机金币',
                description: '礼盒里会附带一笔随机金币。',
            },
            LABOR_KICK_REWARD,
            {
                id: 'labor-2026-holiday-craftsperson',
                type: 'title',
                name: '假日小工匠',
                description: '把劳动节的心意认真送到的人。',
            },
        ],
    },
    {
        id: 'labor-2026-parasol',
        name: '洋伞赠礼',
        description: '五一阳光正好，送上这把蕾丝遮阳伞，让尤美在节日里也能优雅出行！',
        imageUrl: parasolImage,
        deadline: LABOR_DAY_DEADLINE,
        category: 'holiday',
        requirements: [
            { itemId: 23, itemName: '蕾丝遮阳伞', itemUrl: 'limit/mayday-lace-parasol', count: 1 },
        ],
        rewards: [
            {
                id: 'labor-2026-random-supplies',
                type: 'item',
                name: '随机补给',
                description: '可能开出食物、饮料、礼物或限时补给。',
            },
            {
                id: 'labor-2026-random-cash',
                type: 'cash',
                name: '随机金币',
                description: '礼盒里会附带一笔随机金币。',
            },
            LABOR_KICK_REWARD,
            {
                id: 'labor-2026-sunny-guardian',
                type: 'title',
                name: '晴光守护者',
                description: '替尤美撑起晴天小伞的人。',
            },
        ],
    },
    {
        id: 'labor-2026-gaming',
        name: '电竞赠礼',
        description: '假期电竞时刻！带上兔尾耳机，和尤美一起度过快乐的劳动节假期~',
        imageUrl: gamingImage,
        deadline: LABOR_DAY_DEADLINE,
        category: 'holiday',
        requirements: [
            { itemId: 22, itemName: '兔尾耳机', itemUrl: 'limit/mayday-bunny-headphones', count: 1 },
        ],
        rewards: [
            {
                id: 'labor-2026-random-supplies',
                type: 'item',
                name: '随机补给',
                description: '可能开出食物、饮料、礼物或限时补给。',
            },
            {
                id: 'labor-2026-random-cash',
                type: 'cash',
                name: '随机金币',
                description: '礼盒里会附带一笔随机金币。',
            },
            LABOR_KICK_REWARD,
            {
                id: 'labor-2026-winning-duo',
                type: 'title',
                name: '假期连胜搭子',
                description: '和尤美一起打满假期快乐的人。',
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
    startCommissionClock()
    startPlayerResourceListener()

    const holidayCommissions = computed<Commission[]>(() => {
        return HOLIDAY_COMMISSION_DEFS.map(c => ({
            ...c,
            status: now.value > c.deadline ? 'expired' : 'active',
        }))
    })

    const submitCommission = async (commission: Commission): Promise<{ success: boolean, message: string, result?: CommissionCompletionResult }> => {
        if (commission.status === 'expired') {
            return { success: false, message: '这个委托已经截止啦' }
        }

        const requirements = commission.requirements.map(requirement => ({
            itemId: requirement.itemId,
            count: requirement.count,
        }))
        const response = await window.api.completeCommission(commission.id, requirements)
        if (response.code === 200 && response.data) {
            playerResources.value = response.data.resources
            isPlayerResourcesLoaded.value = true
            return { success: true, message: '委托完成', result: response.data }
        }

        return {
            success: false,
            message: response.message || '委托提交失败',
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
