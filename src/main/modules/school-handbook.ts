import Store from "electron-store"
import type { ActivityInfo } from "../types/activity"
import {
    SCHOOL_HANDBOOK_DESKMATE_TITLE_ID,
    SCHOOL_HANDBOOK_FULL_ATTENDANCE_TITLE_ID,
    SCHOOL_HANDBOOK_REQUIRED_TASKS,
    SCHOOL_HANDBOOK_TASK_IDS,
    SCHOOL_HANDBOOK_TITLE,
    SchoolHandbookClaimRewardResult,
    SchoolHandbookClaimedReward,
    SchoolHandbookDayProgress,
    SchoolHandbookDayStoreData,
    SchoolHandbookMilestoneProgress,
    SchoolHandbookProgress,
    SchoolHandbookReward,
    SchoolHandbookStoreData,
    SchoolHandbookStoreState,
    SchoolHandbookTaskCompletionResult,
    SchoolHandbookTaskDefinition,
    SchoolHandbookTaskId,
    SchoolHandbookTaskProgress
} from "../types/school-handbook"
import {
    SCHOOL_UNIFORM_SKIN_ID,
    playerResourceManager
} from "./player/resource"

const SCHOOL_HANDBOOK_STORE_NAME = "school-handbook-store"
const SCHOOL_HANDBOOK_SCHEMA_VERSION = 1
const TASK_SELECTION_VERSION = "school-handbook-task-selection-v1"

export const SCHOOL_HANDBOOK_TASK_DEFINITIONS: readonly SchoolHandbookTaskDefinition[] = [
    {
        id: "study",
        name: "完成一次学习活动",
        description: "和尤美一起认真学习一次。",
        targetCount: 1
    },
    {
        id: "breakfast",
        name: "给尤美吃早餐",
        description: "在早餐时段给尤美准备一份食物或饮料。",
        targetCount: 1
    },
    {
        id: "game",
        name: "玩一次游戏",
        description: "陪尤美玩一次掌机游戏。",
        targetCount: 1
    },
    {
        id: "commission",
        name: "完成多次委托",
        description: "完成 2 次委托，帮尤美攒下开学用品。",
        targetCount: 2
    },
    {
        id: "drawing",
        name: "完成一次绘画活动",
        description: "完成一次绘画学习活动。",
        targetCount: 1
    }
]

type SchoolHandbookMilestoneDefinition = {
    id: string;
    stampCount: number;
    reward: SchoolHandbookReward;
}

export const SCHOOL_HANDBOOK_MILESTONES: readonly SchoolHandbookMilestoneDefinition[] = [
    {
        id: "school-handbook-milestone-3",
        stampCount: 3,
        reward: {
            id: "school-handbook-supply-box",
            type: "supply-box",
            name: "开学补给箱",
            description: "一份装满新学期小惊喜的补给箱。"
        }
    },
    {
        id: "school-handbook-milestone-5",
        stampCount: 5,
        reward: {
            id: "school-handbook-limited-item",
            type: "limited-item",
            name: "开学限定物品",
            description: "开学手册限定纪念物，领取记录会永久保存在手册中。"
        }
    },
    {
        id: "school-handbook-milestone-7",
        stampCount: 7,
        reward: {
            id: SCHOOL_HANDBOOK_FULL_ATTENDANCE_TITLE_ID,
            type: "title",
            name: "九月全勤生",
            description: "每天都认真完成任务的全勤称谓。",
            resources: [{
                type: "title",
                id: SCHOOL_HANDBOOK_FULL_ATTENDANCE_TITLE_ID,
                name: "九月全勤生"
            }]
        }
    },
    {
        id: "school-handbook-milestone-10",
        stampCount: 10,
        reward: {
            id: "school-handbook-special-animation",
            type: "special-animation",
            name: "新学期特别表情",
            description: "一份记录在开学手册中的特别动画/表情奖励。"
        }
    },
    {
        id: "school-handbook-milestone-12",
        stampCount: 12,
        reward: {
            id: "school-handbook-youmei-desk-bundle",
            type: "resource-bundle",
            name: "学院制服套装与尤美的同桌",
            description: "解锁学院制服套装，并获得限定称谓“尤美的同桌”。",
            resources: [
                {
                    type: "skin",
                    id: SCHOOL_UNIFORM_SKIN_ID,
                    name: "学院制服套装"
                },
                {
                    type: "title",
                    id: SCHOOL_HANDBOOK_DESKMATE_TITLE_ID,
                    name: "尤美的同桌"
                }
            ]
        }
    }
]

const TASK_DEFINITION_MAP = new Map(
    SCHOOL_HANDBOOK_TASK_DEFINITIONS.map(task => [task.id, task])
)

const MILESTONE_DEFINITION_MAP = new Map(
    SCHOOL_HANDBOOK_MILESTONES.map(milestone => [milestone.id, milestone])
)

const createDefaultState = (): SchoolHandbookStoreState => ({
    schemaVersion: SCHOOL_HANDBOOK_SCHEMA_VERSION,
    days: {},
    claimedRewards: []
})

export class SchoolHandbookManager {
    private readonly store: Store<SchoolHandbookStoreData>
    private state: SchoolHandbookStoreState = createDefaultState()
    private isInit = false

    constructor(store?: Store<SchoolHandbookStoreData>) {
        this.store = store ?? new Store<SchoolHandbookStoreData>({
            name: SCHOOL_HANDBOOK_STORE_NAME
        })
    }

    initSchoolHandbook(): void {
        if (this.isInit) return
        this.isInit = true
        this.state = this.normalizeState(this.store.get("state"))
        this.saveState()
    }

    getProgress(date: Date | string = new Date()): SchoolHandbookProgress {
        this.ensureInit()
        const dateKey = toDateKey(date)
        const day = this.ensureDay(dateKey)
        return this.buildProgress(dateKey, day)
    }

    recordTaskCompletion(
        taskId: SchoolHandbookTaskId,
        count: number = 1,
        date: Date | string = new Date()
    ): SchoolHandbookTaskCompletionResult {
        this.ensureInit()
        assertTaskId(taskId)
        assertPositiveInteger(count, "任务完成次数")

        const dateKey = toDateKey(date)
        const day = this.ensureDay(dateKey)
        const task = day.tasks.find(taskState => taskState.id === taskId)
        if (!task) {
            throw new Error(`今日没有任务: ${taskId}`)
        }

        const taskDefinition = TASK_DEFINITION_MAP.get(taskId)!
        const wasStamped = isDayStamped(day)
        task.completedCount = Math.min(taskDefinition.targetCount, task.completedCount + count)
        const newlyStamped = !wasStamped && isDayStamped(day)
        if (newlyStamped) {
            day.stampedAt = new Date().toISOString()
        }
        this.saveState()

        const progress = this.buildProgress(dateKey, day)
        return {
            task: progress.day.tasks.find(progressTask => progressTask.id === taskId)!,
            day: progress.day,
            newlyStamped,
            progress
        }
    }

    /**
     * 真实行为只在当天抽到对应任务时计入；未抽到的任务不会报错。
     * 这个入口供活动、委托和早餐行为调用。
     */
    recordTaskCompletionIfActive(
        taskId: SchoolHandbookTaskId,
        count: number = 1,
        date: Date | string = new Date()
    ): SchoolHandbookProgress {
        this.ensureInit()
        assertTaskId(taskId)
        assertPositiveInteger(count, "任务完成次数")

        const dateKey = toDateKey(date)
        const day = this.ensureDay(dateKey)
        if (!day.tasks.some(taskState => taskState.id === taskId)) {
            return this.buildProgress(dateKey, day)
        }

        return this.recordTaskCompletion(taskId, count, date).progress
    }

    recordActivityCompletion(
        activity: Pick<ActivityInfo, "type" | "url">,
        date: Date | string = new Date()
    ): SchoolHandbookProgress {
        const taskIds: SchoolHandbookTaskId[] = []
        if (activity.type === "study") {
            taskIds.push("study")
            if (activity.url.includes("draw")) taskIds.push("drawing")
        }
        if (activity.type === "entertainment" && activity.url.includes("game")) {
            taskIds.push("game")
        }

        let progress = this.getProgress(date)
        for (const taskId of taskIds) {
            progress = this.recordTaskCompletionIfActive(taskId, 1, date)
        }
        return progress
    }

    recordBreakfastCompletion(date: Date | string = new Date()): SchoolHandbookProgress {
        return this.recordTaskCompletionIfActive("breakfast", 1, date)
    }

    recordCommissionCompletion(
        count: number = 1,
        date: Date | string = new Date()
    ): SchoolHandbookProgress {
        return this.recordTaskCompletionIfActive("commission", count, date)
    }

    claimMilestoneReward(
        milestoneIdOrStampCount: string | number,
        date: Date | string = new Date()
    ): SchoolHandbookClaimRewardResult {
        this.ensureInit()
        const milestone = resolveMilestone(milestoneIdOrStampCount)
        const dateKey = toDateKey(date)
        const day = this.ensureDay(dateKey)
        const progress = this.buildProgress(dateKey, day)
        const existing = this.state.claimedRewards.find(
            claimedReward => claimedReward.milestoneId === milestone.id
        )

        if (existing) {
            return {
                reward: cloneReward(existing.reward),
                claimedReward: cloneClaimedReward(existing),
                newlyClaimed: false,
                progress,
                playerResources: milestone.reward.resources?.length
                    ? playerResourceManager.getResources()
                    : undefined
            }
        }

        if (progress.stampCount < milestone.stampCount) {
            throw new Error(`印章数量不足，需要 ${milestone.stampCount} 枚印章`)
        }

        let playerResources
        if (milestone.reward.resources?.length) {
            for (const resource of milestone.reward.resources) {
                if (resource.type === "skin") {
                    playerResourceManager.grantSkin(resource.id)
                } else {
                    playerResourceManager.grantTitle(resource.id)
                }
            }
            playerResources = playerResourceManager.getResources()
        }

        const claimedReward: SchoolHandbookClaimedReward = {
            milestoneId: milestone.id,
            stampCount: milestone.stampCount,
            reward: cloneReward(milestone.reward),
            claimedAt: new Date().toISOString()
        }
        this.state.claimedRewards.push(claimedReward)
        this.saveState()

        return {
            reward: cloneReward(milestone.reward),
            claimedReward: cloneClaimedReward(claimedReward),
            newlyClaimed: true,
            progress: this.buildProgress(dateKey, day),
            playerResources
        }
    }

    private ensureDay(dateKey: string): SchoolHandbookDayStoreData {
        const existing = this.state.days[dateKey]
        const expectedTaskIds = selectTaskIds(dateKey)
        if (existing && sameTaskSelection(existing.tasks, expectedTaskIds)) {
            return existing
        }

        const previousCounts = new Map(
            (existing?.tasks ?? []).map(task => [task.id, normalizeTaskCount(task.id, task.completedCount)])
        )
        const day: SchoolHandbookDayStoreData = {
            tasks: expectedTaskIds.map(taskId => ({
                id: taskId,
                completedCount: previousCounts.get(taskId) ?? 0
            }))
        }
        if (existing?.stampedAt && isDayStamped(day)) {
            day.stampedAt = existing.stampedAt
        }
        this.state.days[dateKey] = day
        this.saveState()
        return day
    }

    private buildProgress(dateKey: string, day: SchoolHandbookDayStoreData): SchoolHandbookProgress {
        const stampCount = Object.values(this.state.days).filter(isDayStamped).length
        const claimedRewards = new Map(
            this.state.claimedRewards.map(claimedReward => [claimedReward.milestoneId, claimedReward])
        )
        const milestones: SchoolHandbookMilestoneProgress[] = SCHOOL_HANDBOOK_MILESTONES.map(milestone => {
            const claimedReward = claimedRewards.get(milestone.id)
            return {
                id: milestone.id,
                stampCount: milestone.stampCount,
                reward: cloneReward(milestone.reward),
                claimed: claimedReward !== undefined,
                claimedAt: claimedReward?.claimedAt ?? null,
                available: stampCount >= milestone.stampCount && claimedReward === undefined
            }
        })

        return {
            title: SCHOOL_HANDBOOK_TITLE,
            currentDate: dateKey,
            day: toDayProgress(dateKey, day),
            stampCount,
            stampedDates: Object.entries(this.state.days)
                .filter(([, dayState]) => isDayStamped(dayState))
                .map(([storedDate]) => storedDate)
                .sort(),
            milestones
        }
    }

    private normalizeState(stored?: Partial<SchoolHandbookStoreState>): SchoolHandbookStoreState {
        const state = createDefaultState()
        if (!stored || typeof stored !== "object") return state

        if (stored.days && typeof stored.days === "object") {
            Object.entries(stored.days).forEach(([dateKey, storedDay]) => {
                if (!isValidDateKey(dateKey) || !storedDay || typeof storedDay !== "object") return
                const tasks = Array.isArray(storedDay.tasks)
                    ? storedDay.tasks
                        .filter(task => task && typeof task === "object" && isTaskId(task.id))
                        .map(task => ({
                            id: task.id,
                            completedCount: normalizeTaskCount(task.id, task.completedCount)
                        }))
                    : []
                const day: SchoolHandbookDayStoreData = { tasks }
                if (typeof storedDay.stampedAt === "string") day.stampedAt = storedDay.stampedAt
                state.days[dateKey] = day
            })
        }

        const claimedRewardIds = new Set<string>()
        if (Array.isArray(stored.claimedRewards)) {
            stored.claimedRewards.forEach(claimedReward => {
                if (!claimedReward || typeof claimedReward !== "object") return
                const milestoneId = claimedReward.milestoneId
                const milestone = typeof milestoneId === "string"
                    ? MILESTONE_DEFINITION_MAP.get(milestoneId)
                    : undefined
                if (!milestone || claimedRewardIds.has(milestone.id)) return
                claimedRewardIds.add(milestone.id)
                state.claimedRewards.push({
                    milestoneId: milestone.id,
                    stampCount: milestone.stampCount,
                    reward: cloneReward(milestone.reward),
                    claimedAt: typeof claimedReward.claimedAt === "string"
                        ? claimedReward.claimedAt
                        : new Date(0).toISOString()
                })
            })
        }

        return state
    }

    private saveState(): void {
        this.store.set("state", this.state)
    }

    private ensureInit(): void {
        if (!this.isInit) this.initSchoolHandbook()
    }
}

function selectTaskIds(dateKey: string): SchoolHandbookTaskId[] {
    const taskIds = [...SCHOOL_HANDBOOK_TASK_IDS]
    let seed = hashString(`${TASK_SELECTION_VERSION}:${dateKey}`)
    for (let index = taskIds.length - 1; index > 0; index--) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
        const swapIndex = seed % (index + 1)
        const current = taskIds[index]
        taskIds[index] = taskIds[swapIndex]
        taskIds[swapIndex] = current
    }
    return taskIds.slice(0, 3)
}

function hashString(value: string): number {
    let hash = 2166136261
    for (let index = 0; index < value.length; index++) {
        hash ^= value.charCodeAt(index)
        hash = Math.imul(hash, 16777619)
    }
    return hash >>> 0
}

function toDateKey(date: Date | string): string {
    if (typeof date === "string") {
        if (!isValidDateKey(date)) throw new Error(`日期格式不合法: ${date}`)
        return date
    }
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        throw new Error("日期不合法")
    }
    const year = date.getFullYear().toString().padStart(4, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const day = date.getDate().toString().padStart(2, "0")
    return `${year}-${month}-${day}`
}

function isValidDateKey(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const [year, month, day] = value.split("-").map(Number)
    const date = new Date(year, month - 1, day)
    return date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
}

function isTaskId(value: unknown): value is SchoolHandbookTaskId {
    return typeof value === "string" && SCHOOL_HANDBOOK_TASK_IDS.includes(value as SchoolHandbookTaskId)
}

function assertTaskId(taskId: unknown): asserts taskId is SchoolHandbookTaskId {
    if (!isTaskId(taskId)) throw new Error(`未知开学手册任务: ${String(taskId)}`)
}

function assertPositiveInteger(value: number, label: string): void {
    if (!Number.isInteger(value) || value <= 0) throw new Error(`${label}不合法: ${value}`)
}

function normalizeTaskCount(taskId: SchoolHandbookTaskId, count: unknown): number {
    const targetCount = TASK_DEFINITION_MAP.get(taskId)!.targetCount
    if (typeof count !== "number" || !Number.isFinite(count) || count <= 0) return 0
    return Math.min(targetCount, Math.floor(count))
}

function sameTaskSelection(
    tasks: Array<{ id: SchoolHandbookTaskId; completedCount: number }>,
    expectedTaskIds: SchoolHandbookTaskId[]
): boolean {
    const actualTaskIds = tasks.map(task => task.id).sort()
    return actualTaskIds.length === expectedTaskIds.length &&
        actualTaskIds.every((taskId, index) => taskId === [...expectedTaskIds].sort()[index])
}

function isDayStamped(day: SchoolHandbookDayStoreData): boolean {
    return day.tasks.filter(task => {
        const definition = TASK_DEFINITION_MAP.get(task.id)
        return definition !== undefined && task.completedCount >= definition.targetCount
    }).length >= SCHOOL_HANDBOOK_REQUIRED_TASKS
}

function toTaskProgress(task: { id: SchoolHandbookTaskId; completedCount: number }): SchoolHandbookTaskProgress {
    const definition = TASK_DEFINITION_MAP.get(task.id)!
    const completedCount = Math.min(definition.targetCount, Math.max(0, task.completedCount))
    return {
        ...definition,
        completedCount,
        completed: completedCount >= definition.targetCount
    }
}

function toDayProgress(dateKey: string, day: SchoolHandbookDayStoreData): SchoolHandbookDayProgress {
    const tasks = day.tasks.map(toTaskProgress)
    return {
        date: dateKey,
        tasks,
        completedTaskCount: tasks.filter(task => task.completed).length,
        requiredTaskCount: SCHOOL_HANDBOOK_REQUIRED_TASKS,
        stamped: isDayStamped(day),
        stampedAt: day.stampedAt ?? null
    }
}

function resolveMilestone(milestoneIdOrStampCount: string | number): SchoolHandbookMilestoneDefinition {
    if (typeof milestoneIdOrStampCount === "number") {
        const milestone = SCHOOL_HANDBOOK_MILESTONES.find(
            candidate => candidate.stampCount === milestoneIdOrStampCount
        )
        if (milestone) return milestone
    }
    if (typeof milestoneIdOrStampCount === "string") {
        const milestone = MILESTONE_DEFINITION_MAP.get(milestoneIdOrStampCount)
        if (milestone) return milestone
    }
    throw new Error(`未知开学手册里程碑: ${String(milestoneIdOrStampCount)}`)
}

function cloneReward(reward: SchoolHandbookReward): SchoolHandbookReward {
    return {
        ...reward,
        resources: reward.resources?.map(resource => ({ ...resource }))
    }
}

function cloneClaimedReward(reward: SchoolHandbookClaimedReward): SchoolHandbookClaimedReward {
    return {
        ...reward,
        reward: cloneReward(reward.reward)
    }
}

export const schoolHandbookManager = new SchoolHandbookManager()
