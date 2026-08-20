import { i18n } from "../i18n";

const WISH_STATUS_MAP = {
    doing: "wish.statuses.doing",
    finished: "wish.statuses.finished",
    claimed: "wish.statuses.claimed",
    failed: "wish.statuses.failed",
    timeout: "wish.statuses.timeout",
} as const;

export const convertWishText = (status: string) => {
    const messageKey = WISH_STATUS_MAP[status as keyof typeof WISH_STATUS_MAP];
    return messageKey ? i18n.global.t(messageKey) : status;
}
