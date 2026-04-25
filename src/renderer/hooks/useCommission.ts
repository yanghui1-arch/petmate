import { ref, computed } from 'vue'
import type { Commission } from '../types/commission'
import toolGiftImage from '../assets/image/special_activity/labor-2026/工具寻礼贴图.png'
import parasolImage from '../assets/image/special_activity/labor-2026/洋伞赠礼贴图.png'
import gamingImage from '../assets/image/special_activity/labor-2026/电竞赠礼.png'

const STORAGE_KEY = 'petmate_commission_status'

const LABOR_DAY_DEADLINE = new Date('2026-05-05T23:59:59+08:00')
const now = ref(new Date())
let clockStarted = false

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
    },
]

const loadStatus = (): Record<string, 'completed'> => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : {}
    } catch {
        return {}
    }
}

const saveStatus = (status: Record<string, 'completed'>) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(status))
}

const commissionStatus = ref<Record<string, 'completed'>>(loadStatus())

const startCommissionClock = () => {
    if (clockStarted) return
    clockStarted = true
    window.setInterval(() => {
        now.value = new Date()
    }, 60 * 1000)
}

export function useCommission() {
    startCommissionClock()

    const holidayCommissions = computed<Commission[]>(() => {
        return HOLIDAY_COMMISSION_DEFS.map(c => ({
            ...c,
            status: commissionStatus.value[c.id]
                ? 'completed'
                : now.value > c.deadline
                    ? 'expired'
                    : 'active',
        }))
    })

    const markCompleted = (commissionId: string) => {
        commissionStatus.value = { ...commissionStatus.value, [commissionId]: 'completed' }
        saveStatus(commissionStatus.value)
    }

    const submitCommission = async (commission: Commission): Promise<{ success: boolean, message: string }> => {
        if (commission.status === 'completed') {
            return { success: false, message: '这个委托已经完成啦' }
        }
        if (commission.status === 'expired') {
            return { success: false, message: '这个委托已经截止啦' }
        }

        const requirements = commission.requirements.map(requirement => ({
            itemId: requirement.itemId,
            count: requirement.count,
        }))
        const response = await window.api.submitCommissionRequirements(requirements)
        if (response.code === 200) {
            markCompleted(commission.id)
            return { success: true, message: '委托完成' }
        }

        return {
            success: false,
            message: response.message || '委托提交失败',
        }
    }

    return { holidayCommissions, markCompleted, submitCommission }
}
