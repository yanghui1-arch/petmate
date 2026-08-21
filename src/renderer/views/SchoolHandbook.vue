<template>
  <main class="school-handbook-page">
    <header class="handbook-header">
      <n-button
        class="back-button"
        quaternary
        circle
        size="large"
        :aria-label="t('common.back')"
        @click="goBack"
      >
        <template #icon><span aria-hidden="true">←</span></template>
      </n-button>

      <div class="handbook-title-block">
        <div class="handbook-kicker">{{ t('schoolHandbook.kicker') }}</div>
        <h1>{{ t('schoolHandbook.title') }}</h1>
        <p>{{ t('schoolHandbook.subtitle') }}</p>
      </div>

      <div class="handbook-hero" aria-hidden="true">
        <img :src="handbookHero" alt="" />
      </div>
    </header>

    <section class="handbook-intro" :aria-label="t('schoolHandbook.rulesTitle')">
      <div class="intro-mark" aria-hidden="true">📘</div>
      <div>
        <h2>{{ t('schoolHandbook.rulesTitle') }}</h2>
        <p>{{ t('schoolHandbook.rules') }}</p>
      </div>
    </section>

    <section v-if="loading" class="handbook-state" aria-live="polite">
      <n-spin size="large" />
      <p>{{ t('schoolHandbook.loading') }}</p>
    </section>

    <section v-else-if="loadError" class="handbook-state handbook-state-error" aria-live="assertive">
      <div class="state-icon" aria-hidden="true">☁</div>
      <h2>{{ t('schoolHandbook.loadFailed') }}</h2>
      <p>{{ loadError }}</p>
      <n-button type="primary" @click="loadHandbook">
        {{ t('schoolHandbook.retry') }}
      </n-button>
    </section>

    <template v-else>
      <div v-if="actionError" class="action-error" role="alert">
        <span>{{ actionError }}</span>
        <n-button quaternary size="small" @click="actionError = ''">
          {{ t('common.close') }}
        </n-button>
      </div>
      <section class="handbook-progress-card" :aria-label="t('schoolHandbook.progressTitle')">
        <div class="progress-copy">
          <div class="section-eyebrow">{{ t('schoolHandbook.progressTitle') }}</div>
          <div class="progress-number">
            <strong>{{ stampedDays }}</strong>
            <span>/ {{ rewardMilestones[rewardMilestones.length - 1] }}</span>
          </div>
          <p>{{ t('schoolHandbook.progressDescription') }}</p>
        </div>
        <div class="progress-track-wrap">
          <n-progress
            type="line"
            :percentage="progressPercentage"
            :show-indicator="false"
            :height="12"
            color="#e28fac"
            rail-color="rgba(92, 53, 57, 0.16)"
          />
          <div class="progress-caption">
            <span>{{ t('schoolHandbook.stamped') }}</span>
            <span>{{ t('schoolHandbook.nextReward', { count: nextMilestone }) }}</span>
          </div>
        </div>
      </section>

      <section class="handbook-section">
        <div class="section-heading">
          <div>
            <div class="section-eyebrow">{{ t('schoolHandbook.calendarEyebrow') }}</div>
            <h2>{{ t('schoolHandbook.calendarTitle') }}</h2>
          </div>
          <div class="section-actions">
            <span class="section-note">{{ t('schoolHandbook.taskCount') }}</span>
            <n-button
              size="small"
              secondary
              :loading="loading"
              :disabled="loading || Boolean(busyAction)"
              @click="loadHandbook"
            >
              {{ t('schoolHandbook.refresh') }}
            </n-button>
          </div>
        </div>

        <div v-if="days.length === 0" class="empty-state">
          <div class="state-icon" aria-hidden="true">🗓️</div>
          <h3>{{ t('schoolHandbook.emptyTitle') }}</h3>
          <p>{{ t('schoolHandbook.emptyDescription') }}</p>
        </div>

        <div v-else class="day-grid">
          <article
            v-for="day in days"
            :key="day.date"
            class="day-card"
            :class="{
              'day-card-stamped': isDayStamped(day.progress),
              'day-card-current': day.isCurrent,
              'day-card-future': day.isFuture,
            }"
          >
            <div class="day-card-header">
              <div class="date-lockup">
                <span class="date-label">{{ formatDateLabel(day.date) }}</span>
              </div>
              <div
                class="stamp-status"
                :class="{ stamped: isDayStamped(day.progress) }"
                :aria-label="isDayStamped(day.progress) ? t('schoolHandbook.stamped') : t('schoolHandbook.notStamped')"
              >
                <span aria-hidden="true">{{ isDayStamped(day.progress) ? '✓' : '○' }}</span>
                {{ isDayStamped(day.progress) ? t('schoolHandbook.stamped') : t('schoolHandbook.notStamped') }}
              </div>
            </div>

            <div class="day-rule"></div>

            <div v-if="getTasks(day.progress).length > 0" class="task-list">
              <div v-for="(task, taskIndex) in getTasks(day.progress)" :key="task.id" class="task-row" :class="{ completed: isTaskCompleted(task) }">
                <div class="task-check" aria-hidden="true">{{ isTaskCompleted(task) ? '✓' : taskIndex + 1 }}</div>
                <div class="task-copy">
                  <div class="task-title">{{ taskTitle(task, taskIndex) }}</div>
                  <div v-if="task.description" class="task-description">{{ task.description }}</div>
                </div>
                <n-button
                  v-if="!isTaskCompleted(task)"
                  size="tiny"
                  tertiary
                  type="primary"
                  :loading="busyAction === taskActionKey(day, task)"
                  :disabled="Boolean(busyAction) || isDayStamped(day.progress) || !day.isCurrent"
                  :aria-label="t('schoolHandbook.completeTask', { task: taskTitle(task, taskIndex) })"
                  @click="completeTask(day, task)"
                >
                  {{ t('schoolHandbook.complete') }}
                </n-button>
                <span v-else class="task-done">{{ t('schoolHandbook.done') }}</span>
              </div>
            </div>

            <div v-else class="day-empty">{{ t('schoolHandbook.dayEmpty') }}</div>

            <div class="day-card-footer">
              <span>{{ t('schoolHandbook.taskProgress', { completed: completedTaskCount(day.progress), total: getTasks(day.progress).length || 3 }) }}</span>
              <span v-if="isDayStamped(day.progress)" class="stamp-mark" aria-hidden="true">✦</span>
              <span v-else-if="day.isCurrent" class="stamp-hint">{{ t('schoolHandbook.stampHint') }}</span>
              <span v-else class="stamp-hint">{{ day.isFuture ? t('schoolHandbook.futureDay') : t('schoolHandbook.historyDay') }}</span>
            </div>
          </article>
        </div>
      </section>

      <section class="handbook-section rewards-section">
        <div class="section-heading">
          <div>
            <div class="section-eyebrow">{{ t('schoolHandbook.rewardsEyebrow') }}</div>
            <h2>{{ t('schoolHandbook.rewardsTitle') }}</h2>
          </div>
          <span class="section-note">{{ t('schoolHandbook.rewardNote') }}</span>
        </div>

        <div class="reward-track">
          <div v-for="reward in rewards" :key="reward.id" class="reward-node" :class="rewardState(reward)">
            <div class="reward-dot" aria-hidden="true">{{ reward.claimed ? '✓' : reward.stampCount }}</div>
            <div class="reward-info">
              <strong>{{ t('schoolHandbook.stampMilestone', { count: reward.stampCount }) }}</strong>
              <span>{{ rewardDescription(reward) }}</span>
            </div>
            <n-button
              v-if="!reward.claimed"
              size="small"
              :type="reward.available ? 'primary' : 'default'"
              :disabled="!reward.available || Boolean(busyAction)"
              :loading="busyAction === rewardActionKey(reward)"
              @click="claimReward(reward)"
            >
              {{ reward.available ? t('schoolHandbook.claim') : t('schoolHandbook.locked') }}
            </n-button>
            <span v-else class="reward-claimed">{{ t('schoolHandbook.claimed') }}</span>
          </div>
        </div>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import handbookHero from '@/assets/image/special_activity/school-2026/youmei-school-handbook.png'
import type {
  SchoolHandbookApi,
  SchoolHandbookCalendarDay,
  SchoolHandbookClaimRewardResult,
  SchoolHandbookDayProgress,
  SchoolHandbookMilestoneProgress,
  SchoolHandbookProgress,
  SchoolHandbookTaskCompletionResult,
  SchoolHandbookTaskProgress,
} from '@/types/schoolHandbook'

const { t } = useI18n()
const router = useRouter()
const api = window.api as SchoolHandbookApi

const HANDBOOK_MONTH = 9
const rewardMilestones = [3, 5, 7, 10, 12] as const
const handbook = ref<SchoolHandbookProgress | null>(null)
const days = ref<SchoolHandbookCalendarDay[]>([])
const loading = ref(true)
const hasLoadedHandbook = ref(false)
const loadError = ref('')
const actionError = ref('')
const busyAction = ref('')

const stampedDays = computed(() => handbook.value?.stampCount ?? 0)
const progressPercentage = computed(() => Math.min(100, (stampedDays.value / 12) * 100))
const nextMilestone = computed(() => {
  const next = handbook.value?.milestones.find((milestone) => !milestone.claimed)
  return next?.stampCount ?? 12
})
const rewards = computed(() => handbook.value?.milestones ?? [])

type ApiResponse<T> = { code?: number; message?: string; data?: T }

function unwrapResponse<T>(response: ApiResponse<T>): T {
  if (response.code !== undefined && response.code !== 200) {
    throw new Error(response.message || t('schoolHandbook.actionFailed'))
  }
  if (!response.data) throw new Error(t('schoolHandbook.invalidResponse'))
  return response.data
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}

function createSeptemberDates(): string[] {
  const year = new Date().getFullYear()
  const dayCount = new Date(year, HANDBOOK_MONTH, 0).getDate()
  return Array.from({ length: dayCount }, (_, index) => formatDateKey(year, HANDBOOK_MONTH, index + 1))
}

function todayDateKey(): string {
  const today = new Date()
  return formatDateKey(today.getFullYear(), today.getMonth() + 1, today.getDate())
}

function syncCurrentProgress(progress: SchoolHandbookProgress): void {
  handbook.value = progress
  const currentIndex = days.value.findIndex((entry) => entry.date === progress.currentDate)
  if (currentIndex !== -1) {
    days.value[currentIndex] = {
      ...days.value[currentIndex],
      progress: progress.day,
      isCurrent: true,
    }
  }
}

async function loadHandbook(): Promise<void> {
  const isRefresh = hasLoadedHandbook.value
  loading.value = true
  loadError.value = ''
  actionError.value = ''
  try {
    const currentProgress = unwrapResponse<SchoolHandbookProgress>(await api.getSchoolHandbookProgress())
    const calendarProgress = await Promise.all(
      createSeptemberDates().map(async (date) => unwrapResponse<SchoolHandbookProgress>(await api.getSchoolHandbookProgress(date)))
    )
    handbook.value = currentProgress
    const today = todayDateKey()
    days.value = calendarProgress.map((progress) => ({
      date: progress.day.date,
      progress: progress.day,
      isCurrent: progress.currentDate === currentProgress.currentDate,
      isFuture: progress.day.date > today,
    }))
    hasLoadedHandbook.value = true
  } catch (error) {
    const message = error instanceof Error ? error.message : t('schoolHandbook.loadFailed')
    if (isRefresh) actionError.value = message
    else loadError.value = message
  } finally {
    loading.value = false
  }
}

function getTasks(day: SchoolHandbookDayProgress): SchoolHandbookTaskProgress[] {
  return day.tasks
}

function isTaskCompleted(task: SchoolHandbookTaskProgress): boolean {
  return task.completed
}

function completedTaskCount(day: SchoolHandbookDayProgress): number {
  return day.completedTaskCount
}

function isDayStamped(day: SchoolHandbookDayProgress): boolean {
  return day.stamped
}

function formatDateParts(date: string): { month: string; day: string } {
  const [year, month, day] = date.split('-').map(Number)
  if (year && month && day) return { month: String(month), day: String(day) }
  return { month: '?', day: '?' }
}

function formatDateLabel(date: string): string {
  const parts = formatDateParts(date)
  return t('schoolHandbook.dateLabel', { month: parts.month, day: parts.day })
}

function taskTitle(task: SchoolHandbookTaskProgress, index: number): string {
  return task.name || t('schoolHandbook.taskFallback', { count: index + 1 })
}

function taskActionKey(day: SchoolHandbookCalendarDay, task: SchoolHandbookTaskProgress): string {
  return `task:${day.date}:${task.id}`
}

function rewardActionKey(reward: SchoolHandbookMilestoneProgress): string {
  return `reward:${reward.id}`
}

function rewardState(reward: SchoolHandbookMilestoneProgress): string {
  if (reward.claimed) return 'claimed'
  return reward.available ? 'available' : 'locked'
}

function rewardDescription(reward: SchoolHandbookMilestoneProgress): string {
  return `${reward.reward.name} · ${reward.reward.description}`
}

async function completeTask(day: SchoolHandbookCalendarDay, task: SchoolHandbookTaskProgress): Promise<void> {
  busyAction.value = taskActionKey(day, task)
  actionError.value = ''
  try {
    const result = unwrapResponse<SchoolHandbookTaskCompletionResult>(await api.recordSchoolHandbookTask(task.id))
    syncCurrentProgress(result.progress)
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : t('schoolHandbook.actionFailed')
  } finally {
    busyAction.value = ''
  }
}

async function claimReward(reward: SchoolHandbookMilestoneProgress): Promise<void> {
  if (!reward.available) return
  busyAction.value = rewardActionKey(reward)
  actionError.value = ''
  try {
    const result = unwrapResponse<SchoolHandbookClaimRewardResult>(await api.claimSchoolHandbookReward(reward.id))
    syncCurrentProgress(result.progress)
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : t('schoolHandbook.actionFailed')
  } finally {
    busyAction.value = ''
  }
}

function goBack(): void {
  if (window.history.length > 1) router.back()
  else router.push('/home')
}

onMounted(loadHandbook)
</script>

<style scoped lang="scss">
.school-handbook-page {
  min-height: 100%;
  padding: 24px clamp(16px, 4vw, 54px) 48px;
  overflow-y: auto;
  color: #5c3539;
  background:
    radial-gradient(circle at 12% 0%, rgba(255, 246, 216, 0.95), transparent 34%),
    linear-gradient(145deg, #f8e4d4 0%, #f5d8ce 48%, #ecd0d1 100%);
}

.handbook-header,
.handbook-intro,
.handbook-progress-card,
.handbook-section {
  width: min(1100px, 100%);
  margin: 0 auto;
}

.handbook-header {
  display: grid;
  grid-template-columns: 44px 1fr 54px;
  align-items: center;
  gap: 16px;
  padding: 8px 0 24px;
}

.back-button {
  color: #7f4b55;
}

.handbook-title-block {
  text-align: center;

  h1 {
    margin: 3px 0 4px;
    color: #713d48;
    font-family: Petmate, sans-serif;
    font-size: clamp(28px, 5vw, 45px);
    letter-spacing: 0.08em;
    text-shadow: 0 2px 0 rgba(255, 255, 255, 0.5);
  }

  p {
    margin: 0;
    color: #9b6870;
    font-size: 13px;
  }
}

.handbook-kicker,
.section-eyebrow {
  color: #b57775;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.handbook-hero {
  display: grid;
  width: 50px;
  height: 50px;
  place-items: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.handbook-intro,
.handbook-progress-card {
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid rgba(181, 119, 117, 0.26);
  border-radius: 16px;
  background: rgba(255, 248, 237, 0.66);
  box-shadow: 0 12px 35px rgba(139, 79, 78, 0.1);
}

.handbook-intro {
  padding: 17px 20px;

  h2,
  p {
    margin: 0;
  }

  h2 {
    color: #77434a;
    font-size: 15px;
  }

  p {
    margin-top: 3px;
    color: #9b6870;
    font-size: 13px;
  }
}

.intro-mark {
  display: grid;
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 12px;
  background: #f3c6bd;
  font-size: 21px;
}

.handbook-progress-card {
  justify-content: space-between;
  margin-top: 16px;
  padding: 18px 22px;
}

.action-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: min(1100px, 100%);
  margin: 14px auto -14px;
  padding: 9px 12px 9px 15px;
  border: 1px solid rgba(184, 92, 83, 0.36);
  border-radius: 10px;
  background: rgba(255, 235, 225, 0.7);
  color: #a0524d;
  font-size: 12px;
}

.progress-number {
  margin-top: 2px;
  color: #77434a;

  strong {
    font-size: 34px;
    line-height: 1;
  }

  span {
    color: #b57775;
    font-size: 15px;
  }
}

.progress-copy p {
  margin: 3px 0 0;
  color: #9b6870;
  font-size: 12px;
}

.progress-track-wrap {
  width: min(440px, 45%);
}

.progress-caption {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  color: #a06c72;
  font-size: 11px;
}

.handbook-section {
  margin-top: 30px;
}

.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 13px;

  h2 {
    margin: 3px 0 0;
    color: #713d48;
    font-size: 22px;
    letter-spacing: 0.05em;
  }
}

.section-note {
  color: #b57775;
  font-size: 12px;
}

.section-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.day-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.day-card {
  min-height: 240px;
  padding: 16px;
  border: 1px solid rgba(181, 119, 117, 0.28);
  border-radius: 14px;
  background: rgba(255, 250, 243, 0.75);
  box-shadow: 0 8px 20px rgba(139, 79, 78, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 25px rgba(139, 79, 78, 0.14);
  }

  &.day-card-stamped {
    border-color: rgba(213, 144, 110, 0.65);
    background: linear-gradient(145deg, rgba(255, 249, 230, 0.9), rgba(255, 239, 216, 0.76));
  }

  &.day-card-current {
    box-shadow: 0 0 0 2px rgba(226, 143, 172, 0.28), 0 12px 25px rgba(139, 79, 78, 0.14);
  }

  &.day-card-future {
    opacity: 0.72;
  }
}

.day-card-header,
.day-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.date-lockup {
  display: flex;
  align-items: baseline;
  gap: 5px;
}

.date-label {
  color: #713d48;
  font-size: 31px;
  font-weight: 800;
  line-height: 1;
}

.stamp-status {
  color: #b0aaa0;
  font-size: 11px;

  span {
    display: inline-grid;
    width: 18px;
    height: 18px;
    margin-right: 3px;
    place-items: center;
    border: 1px dashed currentColor;
    border-radius: 50%;
  }

  &.stamped {
    color: #d08b63;

    span {
      border-style: solid;
      background: rgba(208, 139, 99, 0.12);
    }
  }
}

.day-rule {
  height: 1px;
  margin: 13px 0 10px;
  background: repeating-linear-gradient(90deg, rgba(181, 119, 117, 0.3) 0 4px, transparent 4px 8px);
}

.task-list {
  display: grid;
  gap: 9px;
}

.task-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  color: #71454a;

  &.completed {
    color: #aa9d95;

    .task-title {
      text-decoration: line-through;
    }
  }
}

.task-check {
  display: grid;
  flex: 0 0 22px;
  width: 22px;
  height: 22px;
  place-items: center;
  border: 1px solid #d8a499;
  border-radius: 50%;
  color: #bf796f;
  font-size: 11px;
  font-weight: 700;
}

.completed .task-check {
  border-color: #d08b63;
  background: #f3c9a8;
  color: #fff8e8;
}

.task-copy {
  flex: 1;
  min-width: 0;
}

.task-title {
  overflow: hidden;
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-description {
  overflow: hidden;
  color: #ad8885;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-done,
.reward-claimed {
  color: #c28770;
  font-size: 11px;
  white-space: nowrap;
}

.day-empty,
.empty-state,
.handbook-state {
  color: #a27475;
  text-align: center;
}

.day-empty {
  padding: 30px 0;
  font-size: 12px;
}

.day-card-footer {
  margin-top: 14px;
  color: #ae8784;
  font-size: 10px;
}

.stamp-mark {
  color: #d08b63;
  font-size: 17px;
}

.stamp-hint {
  color: #b4a19c;
}

.reward-track {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 9px;
}

.reward-node {
  position: relative;
  min-height: 145px;
  padding: 13px 11px;
  border: 1px solid rgba(181, 119, 117, 0.25);
  border-radius: 13px;
  background: rgba(255, 250, 243, 0.65);

  &.available {
    border-color: rgba(208, 139, 99, 0.7);
    background: rgba(255, 239, 216, 0.82);
  }

  &.claimed {
    border-color: rgba(208, 139, 99, 0.45);
    background: rgba(243, 201, 168, 0.45);
  }
}

.reward-dot {
  display: grid;
  width: 32px;
  height: 32px;
  margin-bottom: 9px;
  place-items: center;
  border: 1px solid #d8a499;
  border-radius: 50%;
  color: #b57775;
  font-size: 12px;
  font-weight: 700;
}

.available .reward-dot,
.claimed .reward-dot {
  border-color: #d08b63;
  background: #f3c9a8;
  color: #fff8e8;
}

.reward-info {
  display: flex;
  min-height: 48px;
  flex-direction: column;
  gap: 3px;

  strong {
    color: #78474c;
    font-size: 12px;
  }

  span {
    color: #ae8582;
    font-size: 10px;
    line-height: 1.35;
  }
}

.reward-node .n-button {
  width: 100%;
  margin-top: 11px;
}

.empty-state,
.handbook-state {
  padding: 48px 20px;
  border: 1px dashed rgba(181, 119, 117, 0.4);
  border-radius: 14px;
  background: rgba(255, 250, 243, 0.42);

  h2,
  h3,
  p {
    margin: 5px 0 0;
  }

  h2,
  h3 {
    color: #78474c;
    font-size: 16px;
  }

  p {
    color: #ae8582;
    font-size: 12px;
  }
}

.handbook-state {
  margin: 30px auto 0;
  width: min(1100px, 100%);
}

.state-icon {
  font-size: 30px;
}

.handbook-state-error .n-button {
  margin-top: 16px;
}

@media (max-width: 820px) {
  .day-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .reward-track {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .school-handbook-page {
    padding: 14px 12px 32px;
  }

  .handbook-header {
    grid-template-columns: 36px 1fr 42px;
    gap: 7px;
  }

  .handbook-hero {
    width: 38px;
    height: 38px;
  }

  .handbook-intro,
  .handbook-progress-card {
    align-items: flex-start;
    flex-direction: column;
    padding: 15px;
  }

  .progress-track-wrap {
    width: 100%;
  }

  .day-grid,
  .reward-track {
    grid-template-columns: 1fr;
  }

  .reward-node {
    min-height: auto;
  }
}
</style>
