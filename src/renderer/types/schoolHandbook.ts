import type {
  SchoolHandbookClaimRewardResult,
  SchoolHandbookDayProgress,
  SchoolHandbookMilestoneProgress,
  SchoolHandbookProgress,
  SchoolHandbookTaskCompletionResult,
  SchoolHandbookTaskId,
  SchoolHandbookTaskProgress,
} from '@main/types/school-handbook'
import type { Response } from '../../types/response'

export type {
  SchoolHandbookClaimRewardResult,
  SchoolHandbookDayProgress,
  SchoolHandbookMilestoneProgress,
  SchoolHandbookProgress,
  SchoolHandbookTaskCompletionResult,
  SchoolHandbookTaskId,
  SchoolHandbookTaskProgress,
}

export type SchoolHandbookApi = Pick<
  Window['api'],
  'getSchoolHandbookProgress' | 'recordSchoolHandbookTask' | 'claimSchoolHandbookReward'
>

export type SchoolHandbookProgressResponse = Response<SchoolHandbookProgress>
export type SchoolHandbookTaskResponse = Response<SchoolHandbookTaskCompletionResult>
export type SchoolHandbookRewardResponse = Response<SchoolHandbookClaimRewardResult>

export type SchoolHandbookCalendarDay = {
  date: string
  progress: SchoolHandbookDayProgress
  isCurrent: boolean
  isFuture: boolean
}

export type SchoolHandbookViewModel = {
  progress: SchoolHandbookProgress
  days: SchoolHandbookCalendarDay[]
}
