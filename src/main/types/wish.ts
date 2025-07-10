export type Wish = {
    id: string,
    name: string,
    requirements: WishRequirement[],
    affectionExp: number,
    reward?: WishReward,
    startTime: Date,
    duration: number,
    endTime: Date,
    status: "doing" | "finished" | "failed"
}

export type WishRequirement = {
    type: "item",
    id: number,
    count: number,
    userCount: number,
    status: "doing" | "finished"
} | {
    type: "act",
    id: number,
    status: "doing" | "finished"
}

export type WishReward = {
    type: "item",
    id: number,
    count: number,
} | {
    type: "buff",
    id: number
}