import Store from "electron-store"
import type { ActivityInfo } from "../types/activity"
import {
    SCHOOL_HANDBOOK_DESKMATE_TITLE_ID,
    SCHOOL_HANDBOOK_FULL_ATTENDANCE_TITLE_ID,
    SCHOOL_HANDBOOK_LIMITED_ITEM_ITEM_ID,
    SCHOOL_HANDBOOK_REFRESH_COOLDOWN_MS,
    SCHOOL_HANDBOOK_REQUIRED_TASKS,
    SCHOOL_HANDBOOK_TASKS_PER_BATCH,
    SCHOOL_HANDBOOK_TASK_IDS,
    SCHOOL_HANDBOOK_TITLE,
    SchoolHandbookBatchProgress,
    SchoolHandbookBatchStoreData,
    SchoolHandbookClaimRewardResult,
    SchoolHandbookClaimedReward,
    SchoolHandbookLegacyDayStoreData,
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
const SCHOOL_HANDBOOK_SCHEMA_VERSION = 2
const TASK_SELECTION_VERSION = "school-handbook-task-selection-v2"

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
    repeatable: boolean;
}

export const SCHOOL_HANDBOOK_MILESTONES: readonly SchoolHandbookMilestoneDefinition[] = [
    {
        id: "school-handbook-milestone-3",
        stampCount: 1,
        repeatable: true,
        reward: {
            id: "school-handbook-supply-box",
            type: "supply-box",
            name: "开学补给箱",
            description: "一份装满新学期物品的超大补给箱"
        }
    },
    {
        id: "school-handbook-milestone-5",
        stampCount: 1,
        repeatable: true,
        reward: {
            id: "school-handbook-limited-item",
            type: "limited-item",
            name: "开学限定物品",
            description: "开学手册限定奖励包，打开后可随机获得一件新学期委托道具"
        }
    },
    {
        id: "school-handbook-milestone-7",
        stampCount: 3,
        repeatable: false,
        reward: {
            id: SCHOOL_HANDBOOK_FULL_ATTENDANCE_TITLE_ID,
            type: "title",
            name: "九月全勤生",
            description: "解锁「九月全勤生」称谓",
            resources: [{
                type: "title",
                id: SCHOOL_HANDBOOK_FULL_ATTENDANCE_TITLE_ID,
                name: "九月全勤生"
            }]
        }
    },
    {
        id: "school-handbook-milestone-12",
        stampCount: 5,
        repeatable: false,
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

const createDefaultState = (now: Date = new Date()): SchoolHandbookStoreState => ({
    schemaVersion: SCHOOL_HANDBOOK_SCHEMA_VERSION,
    batchSequence: 1,
    stampCount: 0,
    currentBatch: createBatchStoreData(1, now),
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
        this.state = this.normalizeState(this.store.get("state"), new Date())
        this.saveState()
    }

    getProgress(at: Date | string = new Date()): SchoolHandbookProgress {
        this.ensureInit()
        const now = toDate(at)
        this.ensureReady(now)
        return this.buildProgress(now)
    }

    recordTaskCompletion(
        taskId: SchoolHandbookTaskId,
        count: number = 1,
        at: Date | string = new Date()
    ): SchoolHandbookTaskCompletionResult {
        this.ensureInit()
        assertTaskId(taskId)
        assertPositiveInteger(count, "任务完成次数")

        const now = toDate(at)
        this.ensureReady(now)
        const batch = this.state.currentBatch
        if (batch.completedAt) {
            throw new Error(formatCooldownMessage(batch.nextRefreshAt))
        }

        const task = batch.tasks.find(taskState => taskState.id === taskId)
        if (!task) {
            throw new Error("当前批次没有任务: " + taskId)
        }

        const taskDefinition = TASK_DEFINITION_MAP.get(taskId)!
        task.completedCount = Math.min(taskDefinition.targetCount, task.completedCount + count)
        const newlyStamped = isBatchComplete(batch)
        if (newlyStamped) {
            const completedAt = now.toISOString()
            batch.completedAt = completedAt
            batch.nextRefreshAt = new Date(
                now.getTime() + SCHOOL_HANDBOOK_REFRESH_COOLDOWN_MS
            ).toISOString()
            this.state.stampCount += 1
        }
        this.saveState()

        const progress = this.buildProgress(now)
        return {
            task: progress.batch.tasks.find(progressTask => progressTask.id === taskId)!,
            batch: progress.batch,
            newlyStamped,
            progress
        }
    }

    /**
     * 真实行为只在当前批次抽到对应任务时计入。
     * 批次完成后的冷却期间，行为不会提前消耗下一批任务。
     */
    recordTaskCompletionIfActive(
        taskId: SchoolHandbookTaskId,
        count: number = 1,
        at: Date | string = new Date()
    ): SchoolHandbookProgress {
        this.ensureInit()
        assertTaskId(taskId)
        assertPositiveInteger(count, "任务完成次数")

        const now = toDate(at)
        this.ensureReady(now)
        const batch = this.state.currentBatch
        if (batch.completedAt || !batch.tasks.some(taskState => taskState.id === taskId)) {
            return this.buildProgress(now)
        }

        return this.recordTaskCompletion(taskId, count, now).progress
    }

    recordActivityCompletion(
        activity: Pick<ActivityInfo, "type" | "url">,
        at: Date | string = new Date()
    ): SchoolHandbookProgress {
        const taskIds: SchoolHandbookTaskId[] = []
        if (activity.type === "study") {
            taskIds.push("study")
            if (activity.url.includes("draw")) taskIds.push("drawing")
        }
        if (activity.type === "entertainment" && activity.url.includes("game")) {
            taskIds.push("game")
        }

        const now = toDate(at)
        let progress = this.getProgress(now)
        for (const taskId of taskIds) {
            if (progress.isCoolingDown) break
            progress = this.recordTaskCompletionIfActive(taskId, 1, now)
        }
        return progress
    }

    recordBreakfastCompletion(at: Date | string = new Date()): SchoolHandbookProgress {
        return this.recordTaskCompletionIfActive("breakfast", 1, at)
    }

    recordCommissionCompletion(
        count: number = 1,
        at: Date | string = new Date()
    ): SchoolHandbookProgress {
        return this.recordTaskCompletionIfActive("commission", count, at)
    }

    claimMilestoneReward(
        milestoneIdOrStampCount: string | number,
        at: Date | string = new Date(),
        quantity: number = 1
    ): SchoolHandbookClaimRewardResult {
        this.ensureInit()
        const milestone = resolveMilestone(milestoneIdOrStampCount)
        if (!Number.isInteger(quantity) || quantity <= 0) {
            throw new Error("兑换数量必须是正整数")
        }
        const now = toDate(at)
        const progress = this.getProgress(now)
        const existing = this.state.claimedRewards.find(
            claimedReward => claimedReward.milestoneId === milestone.id
        )

        if (!milestone.repeatable && quantity > 1) {
            throw new Error("这个奖励不能批量兑换")
        }

        if (existing && !milestone.repeatable) {
            throw new Error("这个奖励只能兑换一次")
        }

        const totalStampCost = milestone.stampCount * quantity
        if (progress.stampCount < totalStampCost) {
            throw new Error("印章数量不足，需要 " + totalStampCost + " 枚印章")
        }

        let playerResources
        if (milestone.reward.type === "supply-box") {
            playerResourceManager.grantSchoolHandbookSupplyBoxes(quantity)
        }
        if (milestone.reward.type === "limited-item") {
            playerResourceManager.grantSchoolHandbookLimitedItems(quantity)
        }
        for (let index = 0; index < quantity; index += 1) {
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
        }

        this.state.stampCount -= totalStampCost

        const claimedReward: SchoolHandbookClaimedReward = {
            milestoneId: milestone.id,
            stampCount: milestone.stampCount,
            reward: cloneReward(milestone.reward),
            claimedAt: now.toISOString()
        }
        if (!milestone.repeatable) {
            this.state.claimedRewards.push(claimedReward)
        }
        this.saveState()

        return {
            reward: cloneReward(milestone.reward),
            claimedReward: cloneClaimedReward(claimedReward),
            quantity,
            newlyClaimed: true,
            progress: this.buildProgress(now),
            playerResources
        }
    }

    private ensureReady(now: Date): void {
        const batch = this.state.currentBatch
        if (!batch) {
            const sequence = Math.max(1, this.state.batchSequence || 1)
            this.state.batchSequence = sequence
            this.state.currentBatch = createBatchStoreData(sequence, now)
            this.saveState()
            return
        }

        const nextRefreshAt = batch.nextRefreshAt ? Date.parse(batch.nextRefreshAt) : NaN
        if (batch.completedAt && Number.isFinite(nextRefreshAt) && now.getTime() >= nextRefreshAt) {
            const sequence = Math.max(this.state.batchSequence, batch.sequence) + 1
            this.state.batchSequence = sequence
            this.state.currentBatch = createBatchStoreData(sequence, now)
            this.saveState()
        }
    }

    private buildProgress(now: Date): SchoolHandbookProgress {
        const batch = toBatchProgress(this.state.currentBatch, now)
        const claimedRewards = new Map(
            this.state.claimedRewards.map(claimedReward => [claimedReward.milestoneId, claimedReward])
        )
        const milestones: SchoolHandbookMilestoneProgress[] = SCHOOL_HANDBOOK_MILESTONES.map(milestone => {
            const claimedReward = claimedRewards.get(milestone.id)
            const claimed = !milestone.repeatable && claimedReward !== undefined
            return {
                id: milestone.id,
                stampCount: milestone.stampCount,
                reward: cloneReward(milestone.reward),
                repeatable: milestone.repeatable,
                claimed,
                claimedAt: claimedReward?.claimedAt ?? null,
                available: this.state.stampCount >= milestone.stampCount && !claimed
            }
        })

        return {
            title: SCHOOL_HANDBOOK_TITLE,
            batch,
            stampCount: this.state.stampCount,
            milestones,
            nextRefreshAt: batch.nextRefreshAt,
            cooldownRemainingMs: batch.cooldownRemainingMs,
            isCoolingDown: batch.isCoolingDown
        }
    }

    private normalizeState(
        stored: SchoolHandbookStoreData["state"] | undefined,
        now: Date
    ): SchoolHandbookStoreState {
        const state = createDefaultState(now)
        if (!stored || typeof stored !== "object") return state

        state.claimedRewards = normalizeClaimedRewards(stored.claimedRewards)
        if (stored.currentBatch && typeof stored.currentBatch === "object") {
            const sequence = normalizeSequence(stored.currentBatch.sequence, stored.batchSequence)
            state.batchSequence = sequence
            state.stampCount = normalizeStampCount(stored.stampCount)
            state.currentBatch = normalizeBatch(stored.currentBatch, sequence, now)
            return state
        }

        const legacyDays = stored.days
        if (legacyDays && typeof legacyDays === "object") {
            state.stampCount = Object.values(legacyDays)
                .filter(isLegacyStamped)
                .length
            state.batchSequence = Math.max(1, state.stampCount + 1)
            state.currentBatch = createBatchStoreData(state.batchSequence, now)
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

function createBatchStoreData(sequence: number, now: Date): SchoolHandbookBatchStoreData {
    return {
        id: "school-handbook-batch-" + sequence,
        sequence,
        tasks: selectTaskIds(sequence).map(taskId => ({
            id: taskId,
            completedCount: 0
        })),
        createdAt: now.toISOString()
    }
}

function normalizeBatch(
    stored: Partial<SchoolHandbookBatchStoreData>,
    fallbackSequence: number,
    now: Date
): SchoolHandbookBatchStoreData {
    const sequence = normalizeSequence(stored.sequence, fallbackSequence)
    const expectedTaskIds = selectTaskIds(sequence)
    const previousCounts = new Map(
        (Array.isArray(stored.tasks) ? stored.tasks : [])
            .filter(task => task && typeof task === "object" && isTaskId(task.id))
            .map(task => [task.id, normalizeTaskCount(task.id, task.completedCount)])
    )
    const tasks = expectedTaskIds.map(taskId => ({
        id: taskId,
        completedCount: previousCounts.get(taskId) ?? 0
    }))
    const createdAt = isValidTimestamp(stored.createdAt)
        ? stored.createdAt!
        : now.toISOString()
    let completedAt = isValidTimestamp(stored.completedAt) ? stored.completedAt : undefined
    let nextRefreshAt = isValidTimestamp(stored.nextRefreshAt) ? stored.nextRefreshAt : undefined
    if (isBatchComplete({ tasks } as SchoolHandbookBatchStoreData) && !completedAt) {
        completedAt = now.toISOString()
    }
    if (completedAt && !nextRefreshAt) {
        nextRefreshAt = new Date(
            Date.parse(completedAt) + SCHOOL_HANDBOOK_REFRESH_COOLDOWN_MS
        ).toISOString()
    }

    return {
        id: typeof stored.id === "string" && stored.id
            ? stored.id
            : "school-handbook-batch-" + sequence,
        sequence,
        tasks,
        createdAt,
        completedAt,
        nextRefreshAt
    }
}

function selectTaskIds(sequence: number): SchoolHandbookTaskId[] {
    const taskIds = [...SCHOOL_HANDBOOK_TASK_IDS]
    let seed = hashString(TASK_SELECTION_VERSION + ":" + sequence)
    for (let index = taskIds.length - 1; index > 0; index--) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
        const swapIndex = seed % (index + 1)
        const current = taskIds[index]
        taskIds[index] = taskIds[swapIndex]
        taskIds[swapIndex] = current
    }
    return taskIds.slice(0, SCHOOL_HANDBOOK_TASKS_PER_BATCH)
}

function hashString(value: string): number {
    let hash = 2166136261
    for (let index = 0; index < value.length; index++) {
        hash ^= value.charCodeAt(index)
        hash = Math.imul(hash, 16777619)
    }
    return hash >>> 0
}

function toDate(value: Date | string): Date {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return new Date(value.getTime())
    }
    if (typeof value === "string") {
        const parsed = new Date(value)
        if (!Number.isNaN(parsed.getTime())) return parsed
    }
    throw new Error("日期不合法")
}

function isValidTimestamp(value: unknown): value is string {
    return typeof value === "string" && Number.isFinite(Date.parse(value))
}

function isTaskId(value: unknown): value is SchoolHandbookTaskId {
    return typeof value === "string" && SCHOOL_HANDBOOK_TASK_IDS.includes(value as SchoolHandbookTaskId)
}

function assertTaskId(taskId: unknown): asserts taskId is SchoolHandbookTaskId {
    if (!isTaskId(taskId)) throw new Error("未知开学手册任务: " + String(taskId))
}

function assertPositiveInteger(value: number, label: string): void {
    if (!Number.isInteger(value) || value <= 0) throw new Error(label + "不合法: " + value)
}

function normalizeSequence(...values: unknown[]): number {
    const value = values.find(candidate => typeof candidate === "number" && Number.isInteger(candidate) && candidate > 0)
    return typeof value === "number" ? value : 1
}

function normalizeStampCount(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) && value >= 0
        ? Math.floor(value)
        : 0
}

function normalizeTaskCount(taskId: SchoolHandbookTaskId, count: unknown): number {
    const targetCount = TASK_DEFINITION_MAP.get(taskId)!.targetCount
    if (typeof count !== "number" || !Number.isFinite(count) || count <= 0) return 0
    return Math.min(targetCount, Math.floor(count))
}

function isBatchComplete(batch: SchoolHandbookBatchStoreData): boolean {
    return batch.tasks.length === SCHOOL_HANDBOOK_TASKS_PER_BATCH &&
        batch.tasks.every(task => {
            const definition = TASK_DEFINITION_MAP.get(task.id)
            return definition !== undefined && task.completedCount >= definition.targetCount
        })
}

function isLegacyStamped(day: SchoolHandbookLegacyDayStoreData): boolean {
    return typeof day?.stampedAt === "string" && isValidTimestamp(day.stampedAt)
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

function toBatchProgress(batch: SchoolHandbookBatchStoreData, now: Date): SchoolHandbookBatchProgress {
    const tasks = batch.tasks.map(toTaskProgress)
    const nextRefreshAt = batch.nextRefreshAt ?? null
    const remaining = nextRefreshAt
        ? Math.max(0, Date.parse(nextRefreshAt) - now.getTime())
        : 0
    const completed = Boolean(batch.completedAt) || isBatchComplete(batch)
    return {
        id: batch.id,
        sequence: batch.sequence,
        tasks,
        completedTaskCount: tasks.filter(task => task.completed).length,
        requiredTaskCount: SCHOOL_HANDBOOK_REQUIRED_TASKS,
        completed,
        createdAt: batch.createdAt,
        completedAt: batch.completedAt ?? null,
        nextRefreshAt,
        cooldownRemainingMs: remaining,
        isCoolingDown: completed && remaining > 0
    }
}

function formatCooldownMessage(nextRefreshAt?: string): string {
    if (!nextRefreshAt) return "当前批次已经完成"
    return "当前批次已经完成，下一批任务将在 " + new Date(nextRefreshAt).toLocaleString() + " 刷新"
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
    throw new Error("未知开学手册里程碑: " + String(milestoneIdOrStampCount))
}

function normalizeClaimedRewards(
    storedRewards: SchoolHandbookStoreState["claimedRewards"] | undefined
): SchoolHandbookClaimedReward[] {
    const claimedRewardIds = new Set<string>()
    const claimedRewards: SchoolHandbookClaimedReward[] = []
    if (!Array.isArray(storedRewards)) return claimedRewards

    storedRewards.forEach(storedReward => {
        const milestone = typeof storedReward?.milestoneId === "string"
            ? MILESTONE_DEFINITION_MAP.get(storedReward.milestoneId)
            : undefined
        if (!milestone || claimedRewardIds.has(milestone.id)) return
        claimedRewardIds.add(milestone.id)
        claimedRewards.push({
            milestoneId: milestone.id,
            stampCount: milestone.stampCount,
            reward: cloneReward(milestone.reward),
            claimedAt: isValidTimestamp(storedReward.claimedAt)
                ? storedReward.claimedAt
                : new Date(0).toISOString()
        })
    })
    return claimedRewards
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
