export type Wish = {
    id: string,
    name: string,
    requirements: WishRequirement[],
    affectionExp: number,
    reward?: WishReward,
    status: "doing" | "finished" | "failed",
    duration: number
}

export type WishRequirement = {
    type: "item",
    id: number,
    count: number,
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