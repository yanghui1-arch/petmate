import type { PlayerInfo } from '../types/player'
import {
    REMINDER_VERSION,
    NATIONAL_DAY_START,
    NATIONAL_DAY_END,
    NATIONAL_DAY_LOGIN_CASH,
    type VersionReminderState
} from '../types/version-reminder'

export function isNationalDayActive(now: number = Date.now()): boolean {
    return now >= Date.parse(NATIONAL_DAY_START) && now < Date.parse(NATIONAL_DAY_END)
}

export function getVersionReminderState(
    player: PlayerInfo,
    now: number = Date.now()
): VersionReminderState {
    const saved = player.versionReminder
    return {
        version: REMINDER_VERSION,
        announcementPending: saved?.acknowledgedVersion !== REMINDER_VERSION,
        rewardPending: !!saved?.nationalDayRewardGrantedAt && !saved.nationalDayRewardSeenAt,
        eventActive: isNationalDayActive(now),
        cash: NATIONAL_DAY_LOGIN_CASH,
        buffEndsAt: NATIONAL_DAY_END
    }
}

export function acknowledgeVersionReminder(
    player: PlayerInfo,
    now: number = Date.now()
): PlayerInfo {
    const saved = { ...player.versionReminder, acknowledgedVersion: REMINDER_VERSION }
    const shouldGrant = isNationalDayActive(now) && !saved.nationalDayRewardGrantedAt
    if (shouldGrant) saved.nationalDayRewardGrantedAt = new Date(now).toISOString()
    // Save the cash and receipt together so retries and multiple windows cannot grant twice.
    return {
        ...player,
        cash: player.cash + (shouldGrant ? NATIONAL_DAY_LOGIN_CASH : 0),
        versionReminder: saved
    }
}

export function dismissVersionReward(player: PlayerInfo, now: number = Date.now()): PlayerInfo {
    if (!player.versionReminder?.nationalDayRewardGrantedAt) return player
    return {
        ...player,
        versionReminder: {
            ...player.versionReminder,
            nationalDayRewardSeenAt: new Date(now).toISOString()
        }
    }
}
