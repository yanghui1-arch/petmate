import type { CommissionGrantedReward, PlayerResourceState } from "./player-resource"

export const SCHOOL_HANDBOOK_TITLE = "尤美的新学期手册"
export const SCHOOL_HANDBOOK_REQUIRED_TASKS = 3
export const SCHOOL_HANDBOOK_TASKS_PER_BATCH = 3
export const SCHOOL_HANDBOOK_REFRESH_COOLDOWN_MS = 2 * 60 * 60 * 1000
export const SCHOOL_HANDBOOK_BREAKFAST_START_HOUR = 5
export const SCHOOL_HANDBOOK_BREAKFAST_END_HOUR = 11
export const SCHOOL_HANDBOOK_FULL_ATTENDANCE_TITLE_ID = "school-handbook-september-full-attendance"
export const SCHOOL_HANDBOOK_DESKMATE_TITLE_ID = "school-handbook-youmei-deskmate"
export const SCHOOL_HANDBOOK_SUPPLY_BOX_ITEM_ID = 27
export const SCHOOL_HANDBOOK_LIMITED_ITEM_ITEM_ID = 28
export const SCHOOL_HANDBOOK_LIMITED_REWARD_ITEM_IDS = [29, 30, 31, 32, 33, 34, 35, 36] as const
export const SCHOOL_HANDBOOK_CRUMPLED_HOMEWORK_ITEM_ID = 36

export const SCHOOL_HANDBOOK_TASK_IDS = [
    "study",
    "breakfast",
    "game",
    "commission",
    "drawing"
] as const

export type SchoolHandbookTaskId = typeof SCHOOL_HANDBOOK_TASK_IDS[number]

export type SchoolHandbookTaskDefinition = {
    id: SchoolHandbookTaskId;
    name: string;
    description: string;
    targetCount: number;
}

export type SchoolHandbookTaskProgress = SchoolHandbookTaskDefinition & {
    completedCount: number;
    completed: boolean;
}

export type SchoolHandbookBatchProgress = {
    id: string;
    sequence: number;
    tasks: SchoolHandbookTaskProgress[];
    completedTaskCount: number;
    requiredTaskCount: number;
    completed: boolean;
    createdAt: string;
    completedAt: string | null;
    nextRefreshAt: string | null;
    cooldownRemainingMs: number;
    isCoolingDown: boolean;
}

export type SchoolHandbookPlayerResourceReward = {
    type: "skin" | "title";
    id: string;
    name: string;
}

export type SchoolHandbookRewardType =
    | "supply-box"
    | "limited-item"
    | "title"
    | "resource-bundle"

export type SchoolHandbookReward = {
    id: string;
    type: SchoolHandbookRewardType;
    name: string;
    description: string;
    resources?: SchoolHandbookPlayerResourceReward[];
}

export type SchoolHandbookRewardGrant = Extract<CommissionGrantedReward, {
    type: "cash" | "item";
}>

export type SchoolHandbookMilestoneProgress = {
    id: string;
    stampCount: number;
    reward: SchoolHandbookReward;
    repeatable: boolean;
    claimed: boolean;
    claimedAt: string | null;
    available: boolean;
}

export type SchoolHandbookProgress = {
    title: typeof SCHOOL_HANDBOOK_TITLE;
    batch: SchoolHandbookBatchProgress;
    stampCount: number;
    milestones: SchoolHandbookMilestoneProgress[];
    nextRefreshAt: string | null;
    cooldownRemainingMs: number;
    isCoolingDown: boolean;
}

export type SchoolHandbookTaskCompletionResult = {
    task: SchoolHandbookTaskProgress;
    batch: SchoolHandbookBatchProgress;
    newlyStamped: boolean;
    progress: SchoolHandbookProgress;
}

export type SchoolHandbookClaimedReward = {
    milestoneId: string;
    stampCount: number;
    reward: SchoolHandbookReward;
    claimedAt: string;
}

export type SchoolHandbookClaimRewardResult = {
    reward: SchoolHandbookReward;
    claimedReward: SchoolHandbookClaimedReward;
    quantity: number;
    newlyClaimed: boolean;
    progress: SchoolHandbookProgress;
    playerResources?: PlayerResourceState;
}

export type SchoolHandbookBatchStoreData = {
    id: string;
    sequence: number;
    tasks: Array<{
        id: SchoolHandbookTaskId;
        completedCount: number;
    }>;
    createdAt: string;
    completedAt?: string;
    nextRefreshAt?: string;
}

export type SchoolHandbookLegacyDayStoreData = {
    tasks: Array<{
        id: SchoolHandbookTaskId;
        completedCount: number;
    }>;
    stampedAt?: string;
}

export type SchoolHandbookStoreState = {
    schemaVersion: 2;
    batchSequence: number;
    stampCount: number;
    currentBatch: SchoolHandbookBatchStoreData;
    claimedRewards: SchoolHandbookClaimedReward[];
}

export type SchoolHandbookStoreData = {
    state?: Partial<SchoolHandbookStoreState> & {
        days?: Record<string, SchoolHandbookLegacyDayStoreData>;
    };
}
