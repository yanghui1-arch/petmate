import { PlayerResourceState } from "./player-resource"

export const SCHOOL_HANDBOOK_TITLE = "尤美的新学期手册"
export const SCHOOL_HANDBOOK_REQUIRED_TASKS = 2
export const SCHOOL_HANDBOOK_BREAKFAST_START_HOUR = 5
export const SCHOOL_HANDBOOK_BREAKFAST_END_HOUR = 11
export const SCHOOL_HANDBOOK_FULL_ATTENDANCE_TITLE_ID = "school-handbook-september-full-attendance"
export const SCHOOL_HANDBOOK_DESKMATE_TITLE_ID = "school-handbook-youmei-deskmate"

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

export type SchoolHandbookDayProgress = {
    date: string;
    tasks: SchoolHandbookTaskProgress[];
    completedTaskCount: number;
    requiredTaskCount: number;
    stamped: boolean;
    stampedAt: string | null;
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
    | "special-animation"
    | "resource-bundle"

export type SchoolHandbookReward = {
    id: string;
    type: SchoolHandbookRewardType;
    name: string;
    description: string;
    resources?: SchoolHandbookPlayerResourceReward[];
}

export type SchoolHandbookMilestoneProgress = {
    id: string;
    stampCount: number;
    reward: SchoolHandbookReward;
    claimed: boolean;
    claimedAt: string | null;
    available: boolean;
}

export type SchoolHandbookProgress = {
    title: typeof SCHOOL_HANDBOOK_TITLE;
    currentDate: string;
    day: SchoolHandbookDayProgress;
    stampCount: number;
    stampedDates: string[];
    milestones: SchoolHandbookMilestoneProgress[];
}

export type SchoolHandbookTaskCompletionResult = {
    task: SchoolHandbookTaskProgress;
    day: SchoolHandbookDayProgress;
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
    newlyClaimed: boolean;
    progress: SchoolHandbookProgress;
    playerResources?: PlayerResourceState;
}

export type SchoolHandbookDayStoreData = {
    tasks: Array<{
        id: SchoolHandbookTaskId;
        completedCount: number;
    }>;
    stampedAt?: string;
}

export type SchoolHandbookStoreState = {
    schemaVersion: 1;
    days: Record<string, SchoolHandbookDayStoreData>;
    claimedRewards: SchoolHandbookClaimedReward[];
}

export type SchoolHandbookStoreData = {
    state?: Partial<SchoolHandbookStoreState>;
}
