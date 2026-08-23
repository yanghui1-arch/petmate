import type {
  SchoolHandbookBatchProgress,
  SchoolHandbookClaimRewardResult,
  SchoolHandbookMilestoneProgress,
  SchoolHandbookProgress,
  SchoolHandbookTaskCompletionResult,
  SchoolHandbookTaskId,
  SchoolHandbookTaskProgress,
} from '@main/types/school-handbook'
import type { Response } from '../../types/response'

export type {
  SchoolHandbookBatchProgress,
  SchoolHandbookClaimRewardResult,
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
