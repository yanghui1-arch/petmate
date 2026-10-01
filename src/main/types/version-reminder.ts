export const REMINDER_VERSION = '0.6.5'
export const NATIONAL_DAY_START = '2026-10-01T00:00:00+08:00'
export const NATIONAL_DAY_END = '2026-10-08T00:00:00+08:00'
export const NATIONAL_DAY_LOGIN_CASH = 3000

export type VersionReminderSave = {
    acknowledgedVersion?: string
    nationalDayRewardGrantedAt?: string
    nationalDayRewardSeenAt?: string
}

export type VersionReminderState = {
    version: string
    announcementPending: boolean
    rewardPending: boolean
    eventActive: boolean
    cash: number
    buffEndsAt: string
}
