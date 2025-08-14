const WISH_STATUS_MAP = {
    doing: "进行中",
    finished: "领取奖励",
    claimed: "已领取",
    failed: "已失败",
    timeout: "已过期",
}

export const convertWishText = (status: string) => {
    return WISH_STATUS_MAP[status as keyof typeof WISH_STATUS_MAP]
}
