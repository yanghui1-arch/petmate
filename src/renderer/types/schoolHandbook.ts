import type {
  SchoolHandbookBatchProgress,
  SchoolHandbookClaimRewardResult,
  SchoolHandbookMilestoneProgress,
  SchoolHandbookProgress,
} from '@main/types/school-handbook'
import type { Response } from '../../types/response'

export type {
  SchoolHandbookBatchProgress,
  SchoolHandbookClaimRewardResult,
  SchoolHandbookMilestoneProgress,
  SchoolHandbookProgress,
}

export type SchoolHandbookApi = Pick<
  Window['api'],
  'getSchoolHandbookProgress' | 'claimSchoolHandbookReward'
>

export type SchoolHandbookProgressResponse = Response<SchoolHandbookProgress>
export type SchoolHandbookRewardResponse = Response<SchoolHandbookClaimRewardResult>
