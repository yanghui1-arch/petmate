<template>
  <main class="school-handbook-page">
    <div class="handbook-shell">
      <header class="handbook-header">
        <div class="handbook-title-block">
          <div class="handbook-title-line">
            <h1>{{ t('schoolHandbook.title') }}</h1>

            <n-popover trigger="hover" placement="bottom-start" :show-arrow="false" raw>
              <template #trigger>
                <button
                  class="rules-fab"
                  type="button"
                  :aria-label="t('schoolHandbook.rulesTitle')"
                >
                  ?
                </button>
              </template>
              <div class="rules-popover">
                <strong>{{ t('schoolHandbook.rulesTitle') }}</strong>
                <p>{{ t('schoolHandbook.rules') }}</p>
                <ul>
                  <li>{{ t('schoolHandbook.ruleRefreshDescription') }}</li>
                  <li>{{ t('schoolHandbook.ruleOfflineDescription') }}</li>
                  <li>{{ t('schoolHandbook.ruleStampDescription') }}</li>
                </ul>
              </div>
            </n-popover>
          </div>
        </div>
      </header>

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

      <section v-else class="handbook-content">
        <div v-if="actionError" class="action-error" role="alert">
          <span>{{ actionError }}</span>
          <n-button quaternary size="small" @click="actionError = ''">
            {{ t('common.close') }}
          </n-button>
        </div>

        <div class="handbook-game-tabs" role="tablist" :aria-label="t('schoolHandbook.title')">
          <button
            id="school-handbook-tasks-tab"
            class="game-tab"
            :class="{ active: activeTab === 'tasks' }"
            type="button"
            role="tab"
            :aria-selected="activeTab === 'tasks'"
            aria-controls="school-handbook-tasks-panel"
            @click="activeTab = 'tasks'"
          >
            <span class="game-tab-mark" aria-hidden="true"></span>
            <span class="game-tab-label">{{ t('schoolHandbook.batchTab') }}</span>
          </button>
          <button
            id="school-handbook-rewards-tab"
            class="game-tab"
            :class="{ active: activeTab === 'rewards' }"
            type="button"
            role="tab"
            :aria-selected="activeTab === 'rewards'"
            aria-controls="school-handbook-rewards-panel"
            @click="activeTab = 'rewards'"
          >
            <span class="game-tab-mark" aria-hidden="true"></span>
            <span class="game-tab-label">{{ t('schoolHandbook.rewardsTab') }}</span>
          </button>
        </div>

        <div class="handbook-tab-panels">
          <section
            v-if="activeTab === 'tasks'"
            id="school-handbook-tasks-panel"
            class="handbook-tab-panel"
            role="tabpanel"
            aria-labelledby="school-handbook-tasks-tab"
          >
            <section class="batch-panel">
              <div class="panel-heading">
                <div>
                  <h2>{{ isCoolingDown ? t('schoolHandbook.batchCompleteTitle') : t('schoolHandbook.batchTitle') }}</h2>
                  <p v-if="!isCoolingDown">{{ t('schoolHandbook.allTaskRequired') }}</p>
                  <p v-else>{{ t('schoolHandbook.batchCompleteDescription') }}</p>
                </div>
                <div class="batch-counter">
                  <strong>{{ completedTaskCount }}</strong>
                  <span>/ {{ requiredTaskCount }}</span>
                  <small>{{ t('schoolHandbook.tasksComplete') }}</small>
                </div>
              </div>

              <div v-if="isCoolingDown" class="cooldown-panel">
                <div class="cooldown-copy">
                  <span class="cooldown-label">{{ t('schoolHandbook.cooldownTitle') }}</span>
                  <strong>{{ formattedCooldown }}</strong>
                </div>
              </div>

              <div v-else class="task-grid">
                <article
                  v-for="(task, taskIndex) in currentTasks"
                  :key="task.id"
                  class="task-card"
                  :class="{ completed: task.completed }"
                >
                  <div class="task-card-topline">
                    <span class="task-number">{{ String(taskIndex + 1).padStart(2, '0') }}</span>
                    <span v-if="task.completed" class="task-complete-mark" :aria-label="t('schoolHandbook.done')">✓</span>
                  </div>
                  <h3>{{ task.name }}</h3>
                  <p>{{ task.description }}</p>
                  <div class="task-card-footer">
                    <div
                      class="task-progress"
                      :aria-label="`${task.completedCount}/${task.targetCount}`"
                    >
                      <div
                        class="task-progress-track"
                        role="progressbar"
                        :aria-valuenow="task.completedCount"
                        aria-valuemin="0"
                        :aria-valuemax="task.targetCount"
                      >
                        <span
                          class="task-progress-fill"
                          :style="{ width: `${taskProgressPercentage(task)}%` }"
                        ></span>
                      </div>
                      <span class="task-progress-count">{{ task.completedCount }}/{{ task.targetCount }}</span>
                    </div>
                    <span v-if="task.completed" class="task-done">{{ t('schoolHandbook.done') }}</span>
                  </div>
                </article>
              </div>

              <div class="batch-progress-footer">
                <div class="batch-progress-copy">
                  <span>{{ t('schoolHandbook.taskProgress', { completed: completedTaskCount, total: requiredTaskCount }) }}</span>
                  <span>{{ isCoolingDown ? t('schoolHandbook.stampHintComplete') : t('schoolHandbook.stampHintAll') }}</span>
                </div>
                <n-progress
                  type="line"
                  :percentage="batchProgressPercentage"
                  :show-indicator="false"
                  :height="8"
                  color="#e28fac"
                  rail-color="rgba(255, 255, 255, 0.12)"
                />
              </div>
            </section>
          </section>

          <section
            v-else
            id="school-handbook-rewards-panel"
            class="handbook-tab-panel"
            role="tabpanel"
            aria-labelledby="school-handbook-rewards-tab"
          >
            <section class="rewards-panel">
              <div class="reward-shop-header">
                <div class="reward-balance">
                  <div class="reward-balance-icon">
                    <img :src="handbookBadge" :alt="t('schoolHandbook.stampBalance')" />
                  </div>
                  <div class="reward-balance-copy">
                    <span>{{ t('schoolHandbook.stampBalance') }}</span>
                    <strong>{{ stampedCount }}</strong>
                  </div>
                </div>
              </div>

              <div class="reward-grid">
                <article
                  v-for="reward in rewards"
                  :key="reward.id"
                  class="reward-card"
                  :class="[rewardState(reward), { clickable: reward.available, busy: busyAction === rewardActionKey(reward) }]"
                  :aria-busy="busyAction === rewardActionKey(reward)"
                  :role="reward.available ? 'button' : undefined"
                  :tabindex="reward.available ? 0 : undefined"
                  @click="openRewardConfirm(reward)"
                  @keydown.enter.prevent="openRewardConfirm(reward)"
                  @keydown.space.prevent="openRewardConfirm(reward)"
                >
                  <div class="reward-card-visual">
                    <img
                      class="reward-image"
                      :src="rewardImageById(reward.reward.id)"
                      :alt="reward.reward.name"
                    />
                    <span class="reward-limit">
                      {{ reward.repeatable ? t('schoolHandbook.repeatable') : t('schoolHandbook.oneTimeOnly') }}
                    </span>
                  </div>
                  <strong class="reward-name">{{ reward.reward.name }}</strong>
                  <p class="reward-description">{{ reward.reward.description }}</p>
                  <div class="reward-card-meta">
                    <span
                      class="reward-cost"
                      :aria-label="t('schoolHandbook.stampMilestone', { count: reward.stampCount })"
                    >
                      <img :src="handbookBadge" alt="" aria-hidden="true" />
                      <span>× {{ reward.stampCount }}</span>
                    </span>
                  </div>
                </article>
              </div>
            </section>
          </section>
        </div>
      </section>
    </div>

    <Transition name="reward-confirm">
      <div
        v-if="rewardConfirm"
        class="reward-confirm-backdrop"
        role="dialog"
        aria-modal="true"
        @click.self="closeRewardConfirm"
      >
        <div class="reward-confirm-dialog">
          <div class="reward-confirm-heading">
            <div class="reward-confirm-art">
              <img
                :src="rewardImageById(rewardConfirm.reward.id)"
                :alt="rewardConfirm.reward.name"
              />
            </div>
            <div class="reward-confirm-copy">
              <span class="reward-confirm-kicker">{{ t('schoolHandbook.rewardConfirmTitle') }}</span>
              <h2>{{ rewardConfirm.reward.name }}</h2>
              <p>{{ rewardConfirm.reward.description }}</p>
            </div>
          </div>

          <div v-if="rewardConfirm.repeatable" class="reward-quantity-row">
            <span>{{ t('schoolHandbook.rewardQuantity') }}</span>
            <div class="reward-quantity-control">
              <button
                type="button"
                class="reward-quantity-step"
                :disabled="rewardQuantity <= 1 || Boolean(busyAction)"
                @click="adjustRewardQuantity(-1)"
              >
                −
              </button>
              <input
                v-model.number="rewardQuantity"
                class="reward-quantity-input"
                type="number"
                min="1"
                :max="rewardConfirmMaxQuantity"
                :disabled="Boolean(busyAction)"
                :aria-label="t('schoolHandbook.rewardQuantity')"
                @blur="normalizeRewardQuantity"
              />
              <button
                type="button"
                class="reward-quantity-step"
                :disabled="rewardQuantity >= rewardConfirmMaxQuantity || Boolean(busyAction)"
                @click="adjustRewardQuantity(1)"
              >
                +
              </button>
            </div>
            <small>{{ t('schoolHandbook.rewardQuantityLimit', { count: rewardConfirmMaxQuantity }) }}</small>
          </div>

          <div class="reward-confirm-cost">
            <img :src="handbookBadge" alt="" aria-hidden="true" />
            <span>{{ t('schoolHandbook.rewardTotalCost', { count: rewardConfirmTotalCost }) }}</span>
          </div>

          <div class="reward-confirm-actions">
            <button
              type="button"
              class="reward-confirm-button reward-confirm-button-secondary"
              :disabled="Boolean(busyAction)"
              @click="closeRewardConfirm"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              type="button"
              class="reward-confirm-button reward-confirm-button-primary"
              :class="{ 'is-loading': Boolean(busyAction) }"
              :disabled="Boolean(busyAction)"
              :aria-busy="Boolean(busyAction)"
              @click="confirmRewardClaim"
            >
              {{ t('common.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="reward-reveal">
      <div
        v-if="rewardReveal"
        class="reward-reveal-backdrop"
        role="dialog"
        aria-modal="true"
        @click.self="closeRewardReveal"
      >
        <div class="reward-reveal-dialog">
          <span class="reward-reveal-new">{{ t('schoolHandbook.rewardNew') }}</span>
          <div class="reward-reveal-spark reward-reveal-spark-left" aria-hidden="true">✦</div>
          <div class="reward-reveal-spark reward-reveal-spark-right" aria-hidden="true">✦</div>
          <div class="reward-reveal-kicker">{{ t('schoolHandbook.rewardEarnedKicker') }}</div>
          <h2>{{ t('schoolHandbook.rewardEarnedTitle') }}</h2>
          <div
            class="reward-reveal-art"
            :class="`reward-reveal-art-${rewardReveal.reward.type}`"
          >
            <img
              :src="rewardImageById(rewardReveal.reward.id)"
              :alt="rewardReveal.reward.name"
            />
          </div>
          <strong class="reward-reveal-name">{{ rewardRevealName }}</strong>
          <p>{{ rewardReveal.reward.description }}</p>
          <p
            v-if="rewardRevealIsInventoryItem"
            class="reward-reveal-inventory-hint"
          >
            {{ t('schoolHandbook.rewardSupplyBoxHint') }}
          </p>
          <span v-if="rewardRevealQuantity > 1" class="reward-reveal-quantity">
            {{ t('schoolHandbook.rewardBatchCount', { count: rewardRevealQuantity }) }}
          </span>
          <button type="button" class="reward-reveal-close" @click="closeRewardReveal">
            {{ t('schoolHandbook.rewardEarnedClose') }}
          </button>
        </div>
      </div>
    </Transition>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import handbookBadge from '@/assets/image/special_activity/school-2026/school-handbook-badge.png'
import rewardLimitedItem from '@/assets/image/special_activity/school-2026/school-handbook-reward-limited-item.png'
import rewardSupplyBundle from '@/assets/image/special_activity/school-2026/school-handbook-reward-supply-bundle.png'
import fullAttendanceTitleImage from '@/assets/image/special_activity/school-2026/titles/school-handbook-title-september-perfect-attendance.png'
import schoolUniformFashion from '@/assets/image/item/fashion/学院制服套装.png'
import { usePlayer } from '@/hooks/usePlayer'
import type {
  SchoolHandbookApi,
  SchoolHandbookMilestoneProgress,
  SchoolHandbookProgress,
  SchoolHandbookTaskProgress,
  SchoolHandbookClaimRewardResult,
} from '@/types/schoolHandbook'

const { t } = useI18n()
const { refreshPlayerData } = usePlayer()
const api = window.api as SchoolHandbookApi

const rewardImages: Record<string, string> = {
  'school-handbook-supply-box': rewardSupplyBundle,
  'school-handbook-limited-item': rewardLimitedItem,
  'school-handbook-september-full-attendance': fullAttendanceTitleImage,
  'school-handbook-youmei-desk-bundle': schoolUniformFashion,
}

const handbook = ref<SchoolHandbookProgress | null>(null)
const activeTab = ref('tasks')
const loading = ref(true)
const hasLoadedHandbook = ref(false)
const loadError = ref('')
const actionError = ref('')
const busyAction = ref('')
const rewardConfirm = ref<SchoolHandbookMilestoneProgress | null>(null)
const rewardQuantity = ref(1)
const rewardReveal = ref<SchoolHandbookClaimRewardResult | null>(null)
const rewardRevealQuantity = ref(1)
const clock = ref(Date.now())
let clockTimer: ReturnType<typeof setInterval> | undefined

const stampedCount = computed(() => handbook.value?.stampCount ?? 0)
const currentBatch = computed(() => handbook.value?.batch ?? null)
const currentTasks = computed(() => currentBatch.value?.tasks ?? [])
const completedTaskCount = computed(() => currentBatch.value?.completedTaskCount ?? 0)
const requiredTaskCount = computed(() => currentBatch.value?.requiredTaskCount ?? 3)
const batchProgressPercentage = computed(() => Math.min(100, (completedTaskCount.value / requiredTaskCount.value) * 100))
const rewards = computed(() => handbook.value?.milestones ?? [])
const rewardRevealName = computed(() => {
  if (rewardReveal.value?.reward.type === 'supply-box') {
    return t('schoolHandbook.rewardSupplyBoxReceived')
  }
  if (rewardReveal.value?.reward.type === 'limited-item') {
    return t('schoolHandbook.rewardLimitedItemReceived')
  }
  return rewardReveal.value?.reward.name ?? ''
})
const rewardRevealIsInventoryItem = computed(() => {
  const type = rewardReveal.value?.reward.type
  return type === 'supply-box' || type === 'limited-item'
})
const rewardConfirmMaxQuantity = computed(() => {
  const reward = rewardConfirm.value
  if (!reward || !reward.repeatable || reward.stampCount <= 0) return 1
  return Math.max(1, Math.floor(stampedCount.value / reward.stampCount))
})
const rewardConfirmTotalCost = computed(() => {
  const reward = rewardConfirm.value
  if (!reward) return 0
  const quantity = Number.isFinite(rewardQuantity.value) ? Math.max(1, Math.floor(rewardQuantity.value)) : 1
  return reward.stampCount * Math.min(quantity, rewardConfirmMaxQuantity.value)
})
const remainingMs = computed(() => {
  const nextRefreshAt = handbook.value?.nextRefreshAt
  if (!nextRefreshAt) return 0
  return Math.max(0, Date.parse(nextRefreshAt) - clock.value)
})
const isCoolingDown = computed(() => Boolean(handbook.value?.isCoolingDown && remainingMs.value >= 0))
const formattedCooldown = computed(() => formatDuration(remainingMs.value))

type ApiResponse<T> = { code?: number; message?: string; data?: T }

function unwrapResponse<T>(response: ApiResponse<T>): T {
  if (response.code !== undefined && response.code !== 200) {
    throw new Error(response.message || t('schoolHandbook.actionFailed'))
  }
  if (!response.data) throw new Error(t('schoolHandbook.invalidResponse'))
  return response.data
}

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(durationMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

function syncProgress(progress: SchoolHandbookProgress): void {
  handbook.value = progress
  clock.value = Date.now()
}

async function loadHandbook(): Promise<void> {
  const isRefresh = hasLoadedHandbook.value
  loading.value = true
  loadError.value = ''
  actionError.value = ''
  try {
    handbook.value = unwrapResponse<SchoolHandbookProgress>(await api.getSchoolHandbookProgress())
    clock.value = Date.now()
    hasLoadedHandbook.value = true
  } catch (error) {
    const message = error instanceof Error ? error.message : t('schoolHandbook.loadFailed')
    if (isRefresh) actionError.value = message
    else loadError.value = message
  } finally {
    loading.value = false
  }
}

function taskProgressPercentage(task: SchoolHandbookTaskProgress): number {
  if (task.targetCount <= 0) return 0
  return Math.min(100, Math.max(0, (task.completedCount / task.targetCount) * 100))
}

function rewardActionKey(reward: SchoolHandbookMilestoneProgress): string {
  return 'reward:' + reward.id
}

function rewardImageById(rewardId: string): string {
  return rewardImages[rewardId] ?? handbookBadge
}

function closeRewardReveal(): void {
  rewardReveal.value = null
  rewardRevealQuantity.value = 1
}

function openRewardConfirm(reward: SchoolHandbookMilestoneProgress): void {
  if (!reward.available || busyAction.value) return
  rewardConfirm.value = reward
  rewardQuantity.value = 1
}

function closeRewardConfirm(): void {
  if (busyAction.value) return
  rewardConfirm.value = null
  rewardQuantity.value = 1
}

function normalizeRewardQuantity(): void {
  const quantity = Number(rewardQuantity.value)
  rewardQuantity.value = Number.isFinite(quantity)
    ? Math.min(rewardConfirmMaxQuantity.value, Math.max(1, Math.floor(quantity)))
    : 1
}

function adjustRewardQuantity(delta: number): void {
  const quantity = Number(rewardQuantity.value)
  const current = Number.isFinite(quantity) ? Math.floor(quantity) : 1
  rewardQuantity.value = Math.min(
    rewardConfirmMaxQuantity.value,
    Math.max(1, current + delta)
  )
}

function rewardState(reward: SchoolHandbookMilestoneProgress): string {
  if (reward.claimed) return 'claimed'
  return reward.available ? 'available' : 'locked'
}

async function claimReward(reward: SchoolHandbookMilestoneProgress, quantity: number = 1): Promise<boolean> {
  if (!reward.available || busyAction.value) return false
  const claimQuantity = reward.repeatable
    ? Math.min(Math.max(1, Math.floor(quantity)), Math.max(1, Math.floor(stampedCount.value / reward.stampCount)))
    : 1
  busyAction.value = rewardActionKey(reward)
  actionError.value = ''
  try {
    const result = unwrapResponse<SchoolHandbookClaimRewardResult>(
      await api.claimSchoolHandbookReward(reward.id, claimQuantity)
    )
    syncProgress(result.progress)
    await refreshPlayerData()
    rewardRevealQuantity.value = result.quantity
    rewardReveal.value = result
    return true
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : t('schoolHandbook.actionFailed')
    return false
  } finally {
    busyAction.value = ''
  }
}

async function confirmRewardClaim(): Promise<void> {
  const reward = rewardConfirm.value
  if (!reward || busyAction.value) return
  normalizeRewardQuantity()
  const claimed = await claimReward(reward, rewardQuantity.value)
  if (claimed) {
    rewardConfirm.value = null
    rewardQuantity.value = 1
  }
}

onMounted(() => {
  void loadHandbook()
  clockTimer = setInterval(() => {
    clock.value = Date.now()
    if (handbook.value?.isCoolingDown && remainingMs.value <= 0 && !loading.value) {
      void loadHandbook()
    }
  }, 1000)
})

onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer)
})
</script>

<style scoped lang="scss">
.school-handbook-page {
  flex: 1;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  padding: 18px 5% 24px;
  color: $font-light;
  background: $system-bgc;
}

.handbook-shell {
  width: 100%;
  height: 100%;
  min-height: 0;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.handbook-header {
  position: relative;
  display: flex;
  min-height: 30px;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.handbook-title-block {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.handbook-title-line {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  max-width: 100%;

  h1 {
    margin: 0;
    color: $font-light;
    font-size: 18px;
    font-weight: 500;
    white-space: nowrap;
  }
}

.section-eyebrow {
  color: $color-pink-100;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.batch-panel,
.rewards-panel {
  border-radius: 8px;
  background: $content-bgc;
  box-shadow: 0 4px 24px 0 rgba(253, 203, 110, 0.14);
}

.handbook-content {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  flex-direction: column;
}

.handbook-game-tabs {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.game-tab {
  position: relative;
  display: flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 8px 14px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 9px;
  color: $font-muted-light;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.025));
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  transition: color 160ms ease, border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
}

.game-tab::after {
  position: absolute;
  top: 9px;
  right: 11px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: $color-pink-100;
  box-shadow: 0 0 8px $color-pink-100;
  content: '';
  opacity: 0;
  transform: scale(0.5);
  transition: opacity 160ms ease, transform 160ms ease;
}

.game-tab:hover,
.game-tab:focus-visible {
  color: $font-light;
  border-color: rgba(255, 255, 255, 0.28);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04));
  outline: none;
}

.game-tab.active {
  color: $font-light;
  border-color: rgba($color-pink-100, 0.72);
  background: linear-gradient(145deg, rgba($color-pink-100, 0.2), rgba($color-pink-100, 0.06));
  box-shadow: 0 0 16px rgba($color-pink-100, 0.16), inset 0 0 0 1px rgba($color-pink-100, 0.12);
}

.game-tab.active::after {
  opacity: 1;
  transform: scale(1);
}

.game-tab-mark {
  display: grid;
  width: 17px;
  height: 17px;
  flex: 0 0 auto;
  place-items: center;
  color: currentColor;
}

.game-tab-mark::before {
  width: 8px;
  height: 8px;
  border: 1px solid currentColor;
  content: '';
  transform: rotate(45deg);
  transition: background 160ms ease, box-shadow 160ms ease;
}

.game-tab.active .game-tab-mark::before {
  border-color: $color-pink-100;
  background: $color-pink-100;
  box-shadow: 0 0 8px rgba($color-pink-100, 0.75);
}

.game-tab-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}

.handbook-tab-panels {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  flex-direction: column;
}

.handbook-tab-panel {
  box-sizing: border-box;
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 0 2px 8px;
}

.action-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  padding: 7px 11px;
  border: 1px solid rgba(255, 118, 117, 0.42);
  border-radius: 6px;
  color: #ffb0b0;
  background: rgba(255, 118, 117, 0.12);
  font-size: 12px;
}

.batch-panel,
.rewards-panel {
  padding: 18px;
}

.rules-fab {
  display: grid;
  width: 23px;
  height: 23px;
  place-items: center;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  color: $font-muted-light;
  background: rgba(255, 255, 255, 0.06);
  cursor: help;
  font-size: 15px;
  font-weight: 700;
  line-height: 1;
  transition: color 160ms ease, border-color 160ms ease, background 160ms ease;

  &:hover,
  &:focus-visible {
    border-color: $color-pink-100;
    color: $color-pink-100;
    background: rgba(226, 143, 172, 0.12);
    outline: none;
  }
}

.rules-popover {
  max-width: 260px;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  color: $font-muted-light;
  background: $content-bgc;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
  font-size: 12px;
  line-height: 1.55;

  strong {
    display: block;
    margin-bottom: 6px;
    color: $font-light;
    font-size: 13px;
  }

  p {
    margin: 0;
  }

  ul {
    margin: 7px 0 0;
    padding-left: 17px;
  }

  li + li {
    margin-top: 3px;
  }
}

.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 16px;

  &.compact {
    margin-bottom: 14px;
  }

  h2 {
    margin: 3px 0 3px;
    color: $font-light;
    font-size: 18px;
    font-weight: 500;
  }

  p {
    max-width: 620px;
    margin: 0;
    color: $font-muted-light;
    font-size: 12px;
    line-height: 1.55;
  }
}

.batch-counter {
  display: grid;
  min-width: 68px;
  place-items: center;
  padding: 8px 10px;
  border-radius: 8px;
  color: $color-pink-100;
  background: rgba(255, 255, 255, 0.08);

  strong {
    font-size: 22px;
    line-height: 1;
  }

  span {
    margin-top: -2px;
    color: $font-muted-light;
    font-size: 12px;
  }

  small {
    margin-top: 3px;
    color: $font-muted-light;
    font-size: 10px;
    white-space: nowrap;
  }
}

.task-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.task-card {
  display: flex;
  min-height: 136px;
  flex-direction: column;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  transition: background 160ms ease, border-color 160ms ease;

  &:hover {
    border-color: rgba(226, 143, 172, 0.54);
    background: rgba(255, 255, 255, 0.1);
  }

  &.completed {
    border-color: rgba($color-pink-100, 0.46);
    background: linear-gradient(135deg, rgba($color-pink-100, 0.1), rgba(255, 255, 255, 0.045));
    box-shadow: inset 0 0 0 1px rgba($color-pink-100, 0.06), 0 0 16px rgba($color-pink-100, 0.06);
  }

  h3 {
    margin: 7px 0 3px;
    color: $font-light;
    font-size: 14px;
    line-height: 1.35;
  }

  p {
    flex: 1;
    margin: 0;
    color: $font-muted-light;
    font-size: 11px;
    line-height: 1.4;
  }
}

.task-card-topline,
.task-card-footer,
.batch-progress-copy,
.reward-card-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.task-number {
  color: $font-muted-light;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.task-complete-mark {
  display: inline-flex;
  min-width: 25px;
  height: 21px;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  border: 1px solid rgba($color-pink-100, 0.58);
  border-radius: 999px;
  color: $color-pink-100;
  background: rgba($color-pink-100, 0.12);
  box-shadow: 0 0 10px rgba($color-pink-100, 0.1);
  font-size: 11px;
  font-weight: 700;
}

.task-card-footer {
  margin-top: 8px;
  gap: 10px;
  color: $font-muted-light;
  font-size: 11px;
}

.task-progress {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 7px;
}

.task-progress-track {
  flex: 1;
  min-width: 56px;
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
}

.task-progress-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: $color-pink-100;
  transition: width 180ms ease, background 180ms ease;
}

.task-card.completed .task-progress-fill {
  background: linear-gradient(90deg, rgba($color-pink-100, 0.62), $color-pink-100);
}

.task-progress-count {
  flex: 0 0 auto;
  color: $font-muted-light;
  font-size: 10px;
  white-space: nowrap;
}

.task-done,
.reward-claimed {
  color: rgba($color-pink-100, 0.92);
  font-size: 11px;
  font-weight: 700;
}

.batch-progress-footer {
  margin-top: 15px;
  padding-top: 12px;
  border-top: 1px dashed rgba(255, 255, 255, 0.14);
}

.batch-progress-copy {
  margin-bottom: 7px;
  color: $font-muted-light;
  font-size: 11px;

  span:last-child {
    color: $font-muted-light;
  }
}

.cooldown-panel {
  display: flex;
  align-items: center;
  min-height: 120px;
  padding: 18px 20px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
}

.cooldown-copy {
  flex: 1;

  .cooldown-label {
    display: block;
    color: $font-muted-light;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
  }

  strong {
    display: block;
    margin: 3px 0;
    color: $color-pink-100;
    font-size: clamp(26px, 4vw, 36px);
    letter-spacing: 0.08em;
  }

}

.reward-shop-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  margin-bottom: 7px;
}

.reward-balance {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
}

.reward-balance-icon {
  display: grid;
  width: 46px;
  height: 46px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid rgba($color-pink-100, 0.46);
  border-radius: 12px;
  background: rgba($color-pink-100, 0.1);
  box-shadow: 0 0 16px rgba($color-pink-100, 0.12);

  img {
    width: 38px;
    height: 38px;
    object-fit: contain;
  }
}

.reward-balance-copy {
  display: grid;
  gap: 1px;

  span {
    color: $font-muted-light;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  strong {
    color: $color-pink-100;
    font-size: 26px;
    line-height: 1;
  }
}

.reward-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.reward-card {
  display: flex;
  min-height: 236px;
  flex-direction: column;
  padding: 9px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.06);
  transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;

  &:hover {
    border-color: rgba($color-pink-100, 0.54);
    background: rgba(255, 255, 255, 0.09);
    transform: translateY(-2px);
  }

  &.available {
    border-color: rgba($color-pink-100, 0.68);
    box-shadow: 0 0 18px rgba($color-pink-100, 0.09);
  }

  &.claimed {
    border-color: rgba($color-pink-100, 0.3);
    background: rgba($color-pink-100, 0.06);
  }

  &.clickable {
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid $color-pink-100;
      outline-offset: 2px;
    }
  }

  &.busy {
    cursor: wait;
    opacity: 0.72;
  }
}

.reward-card-visual {
  position: relative;
  display: grid;
  min-height: 94px;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
}

.reward-image {
  width: 100%;
  height: 90px;
  object-fit: contain;
  filter: drop-shadow(0 7px 8px rgba(0, 0, 0, 0.22));
}

.reward-limit {
  position: absolute;
  top: 7px;
  right: 7px;
  padding: 3px 5px;
  border: 1px solid rgba($color-pink-100, 0.34);
  border-radius: 4px;
  color: $font-muted-light;
  background: rgba($content-bgc, 0.8);
  font-size: 9px;
  line-height: 1;
  white-space: nowrap;
}

.reward-name {
  margin: 7px 0 3px;
  color: $font-light;
  font-size: 13px;
  line-height: 1.35;
}

.reward-description {
  flex: 1;
  min-height: 24px;
  margin: 0 0 5px;
  color: $font-muted-light;
  font-size: 10px;
  line-height: 1.5;
}

.reward-card-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding-top: 5px;
  border-top: 1px dashed rgba(255, 255, 255, 0.14);
}

.reward-cost {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: $color-pink-100;
  font-size: 13px;
  font-weight: 700;

  img {
    width: 23px;
    height: 23px;
    object-fit: contain;
  }
}

.reward-confirm-backdrop {
  position: fixed;
  z-index: 90;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(19, 16, 20, 0.72);
  backdrop-filter: blur(4px);
}

.reward-confirm-dialog {
  width: min(420px, calc(100vw - 40px));
  padding: 18px;
  border: 1px solid rgba($color-pink-100, 0.5);
  border-radius: 14px;
  color: $font-light;
  background: linear-gradient(160deg, rgba($content-bgc, 0.99), rgba($system-bgc, 0.99));
  box-shadow: 0 16px 45px rgba(0, 0, 0, 0.4), 0 0 26px rgba($color-pink-100, 0.14);
}

.reward-confirm-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}

.reward-confirm-art {
  display: grid;
  width: 82px;
  height: 82px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);

  img {
    width: 72px;
    height: 72px;
    object-fit: contain;
  }
}

.reward-confirm-copy {
  min-width: 0;
  flex: 1;

  h2 {
    margin: 3px 0 4px;
    color: $font-light;
    font-size: 17px;
  }

  p {
    margin: 0;
    color: $font-muted-light;
    font-size: 11px;
    line-height: 1.5;
  }
}

.reward-confirm-kicker {
  color: $color-pink-100;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.reward-quantity-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding-top: 13px;
  border-top: 1px dashed rgba(255, 255, 255, 0.14);
  color: $font-muted-light;
  font-size: 11px;

  > span {
    flex: 1;
  }

  small {
    color: $font-muted-light;
    font-size: 10px;
    white-space: nowrap;
  }
}

.reward-quantity-control {
  display: inline-flex;
  align-items: center;
  overflow: hidden;
  border: 1px solid rgba($color-pink-100, 0.36);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
}

.reward-quantity-step {
  width: 28px;
  height: 28px;
  border: 0;
  color: $font-light;
  background: transparent;
  cursor: pointer;
  font-size: 17px;

  &:hover:not(:disabled) {
    background: rgba($color-pink-100, 0.16);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.35;
  }
}

.reward-quantity-input {
  width: 38px;
  height: 28px;
  padding: 0;
  border: 0;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  outline: 0;
  color: $font-light;
  background: transparent;
  font-size: 13px;
  text-align: center;

  &:disabled {
    opacity: 0.5;
  }

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    margin: 0;
    appearance: none;
  }
}

.reward-confirm-cost {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin-top: 15px;
  color: $color-pink-100;
  font-size: 13px;
  font-weight: 700;

  img {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }
}

.reward-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  margin-top: 17px;
}

.reward-confirm-button {
  position: relative;
  min-width: 84px;
  height: 36px;
  padding: 0 18px;
  overflow: hidden;
  border-radius: 8px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  transition: background 160ms ease, border-color 160ms ease, box-shadow 160ms ease, color 160ms ease, transform 160ms ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid rgba($color-pink-100, 0.9);
    outline-offset: 3px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.48;
  }
}

.reward-confirm-button-secondary {
  border: 1px solid rgba($font-muted-light, 0.38);
  color: $font-muted-light;
  background: rgba(255, 255, 255, 0.045);

  &:hover:not(:disabled) {
    border-color: rgba($color-pink-100, 0.48);
    color: $font-light;
    background: rgba($color-pink-100, 0.1);
    box-shadow: 0 6px 16px rgba($color-pink-100, 0.08);
  }
}

.reward-confirm-button-primary {
  border: 1px solid rgba($color-pink-100, 0.82);
  color: $font-light;
  background: linear-gradient(135deg, rgba($color-pink-100, 0.94), rgba($color-pink-100, 0.58));
  box-shadow: 0 7px 18px rgba($color-pink-100, 0.18);

  &:hover:not(:disabled) {
    border-color: rgba($color-pink-100, 1);
    background: linear-gradient(135deg, rgba($color-pink-100, 1), rgba($color-pink-100, 0.7));
    box-shadow: 0 9px 22px rgba($color-pink-100, 0.26);
  }

  &.is-loading {
    padding-left: 32px;

    &::before {
      position: absolute;
      top: 50%;
      left: 14px;
      width: 11px;
      height: 11px;
      border: 2px solid rgba($font-light, 0.42);
      border-top-color: $font-light;
      border-radius: 50%;
      content: '';
      animation: reward-confirm-spin 700ms linear infinite;
      transform: translateY(-50%);
    }
  }
}

.reward-confirm-enter-active,
.reward-confirm-leave-active {
  transition: opacity 160ms ease;
}

.reward-confirm-enter-active .reward-confirm-dialog,
.reward-confirm-leave-active .reward-confirm-dialog {
  transition: transform 180ms ease, opacity 160ms ease;
}

.reward-confirm-enter-from,
.reward-confirm-leave-to {
  opacity: 0;
}

.reward-confirm-enter-from .reward-confirm-dialog,
.reward-confirm-leave-to .reward-confirm-dialog {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

.reward-reveal-backdrop {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(19, 16, 20, 0.78);
  backdrop-filter: blur(5px);
}

.reward-reveal-dialog {
  position: relative;
  display: flex;
  width: min(360px, calc(100vw - 40px));
  max-height: calc(100vh - 40px);
  flex-direction: column;
  align-items: center;
  overflow-y: auto;
  padding: 24px 22px 22px;
  border: 1px solid rgba($color-pink-100, 0.68);
  border-radius: 16px;
  color: $font-light;
  background: linear-gradient(160deg, rgba($content-bgc, 0.99), rgba($system-bgc, 0.99));
  box-shadow: 0 18px 55px rgba(0, 0, 0, 0.44), 0 0 34px rgba($color-pink-100, 0.22);
  text-align: center;

  &::before {
    position: absolute;
    top: -90px;
    width: 250px;
    height: 180px;
    border-radius: 50%;
    background: rgba($color-pink-100, 0.16);
    content: '';
    filter: blur(18px);
  }

  h2 {
    z-index: 1;
    margin: 3px 0 0;
    color: $color-pink-100;
    font-size: 27px;
    font-weight: 700;
    letter-spacing: 0.08em;
  }

  p {
    z-index: 1;
    max-width: 270px;
    margin: 7px 0 16px;
    color: $font-muted-light;
    font-size: 11px;
    line-height: 1.55;
  }

}

.reward-reveal-new {
  position: absolute;
  z-index: 2;
  top: 14px;
  left: 16px;
  display: grid;
  width: 34px;
  height: 22px;
  place-items: center;
  border: 1px solid rgba($color-pink-100, 0.8);
  border-radius: 6px 6px 6px 2px;
  color: $font-light;
  background: rgba($color-pink-100, 0.78);
  box-shadow: 0 5px 14px rgba($color-pink-100, 0.2);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.reward-reveal-kicker {
  z-index: 1;
  color: $font-muted-light;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
}

.reward-reveal-art {
  z-index: 1;
  display: grid;
  width: 220px;
  height: 190px;
  margin: 8px 0 4px;
  place-items: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 12px 13px rgba(0, 0, 0, 0.3));
    animation: reward-art-float 2200ms ease-in-out infinite;
    will-change: transform;
  }
}

.reward-reveal-art-title {
  width: min(300px, calc(100vw - 80px));
  height: 110px;
  margin-top: 10px;
}

.reward-reveal-art-resource-bundle {
  height: 190px;
}

.reward-reveal-name {
  z-index: 1;
  color: $font-light;
  font-size: 17px;
}

.reward-reveal-close {
  z-index: 1;
  min-width: 130px;
  height: 40px;
  padding: 0 22px;
  border: 1px solid rgba($color-pink-100, 0.74);
  border-radius: 8px;
  color: $font-light;
  background: linear-gradient(135deg, rgba($color-pink-100, 0.9), rgba($color-pink-100, 0.58));
  box-shadow: 0 7px 18px rgba($color-pink-100, 0.18);
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  transition: background 160ms ease, box-shadow 160ms ease, transform 160ms ease;

  &:hover {
    background: linear-gradient(135deg, rgba($color-pink-100, 1), rgba($color-pink-100, 0.7));
    box-shadow: 0 9px 22px rgba($color-pink-100, 0.26);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid $color-pink-100;
    outline-offset: 3px;
  }
}

.reward-reveal-quantity {
  z-index: 1;
  display: block;
  margin: -8px 0 15px;
  color: $color-pink-100;
  font-size: 12px;
  font-weight: 700;
}

.reward-reveal-inventory-hint {
  z-index: 1;
  width: min(280px, 100%);
  margin: -3px 0 15px;
  padding: 8px 12px;
  border: 1px solid rgba($color-pink-100, 0.24);
  border-radius: 10px;
  background: rgba($color-pink-100, 0.08);
  text-align: center;
  color: $font-light;
  font-size: 11px;
  line-height: 1.5;
}

.reward-reveal-spark {
  position: absolute;
  z-index: 1;
  color: $color-pink-100;
  font-size: 22px;
  text-shadow: 0 0 12px rgba($color-pink-100, 0.9);
}

.reward-reveal-spark-left {
  top: 74px;
  left: 32px;
}

.reward-reveal-spark-right {
  top: 128px;
  right: 29px;
  font-size: 15px;
}

.reward-reveal-enter-active,
.reward-reveal-leave-active {
  transition: opacity 180ms ease;
}

.reward-reveal-enter-active .reward-reveal-dialog,
.reward-reveal-leave-active .reward-reveal-dialog {
  transition: transform 220ms ease, opacity 180ms ease;
}

.reward-reveal-enter-from,
.reward-reveal-leave-to {
  opacity: 0;
}

.reward-reveal-enter-from .reward-reveal-dialog,
.reward-reveal-leave-to .reward-reveal-dialog {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}

@keyframes reward-art-float {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-8px);
  }
}

@keyframes reward-confirm-spin {
  to {
    transform: translateY(-50%) rotate(360deg);
  }
}

.handbook-state {
  display: grid;
  flex: 1;
  place-items: center;
  align-content: center;
  gap: 10px;
  color: $font-muted-light;
  font-size: 13px;

  p {
    margin: 0;
  }
}

.handbook-state-error {
  .state-icon {
    font-size: 34px;
  }

  h2,
  p {
    margin: 0;
  }
}

@media (max-width: 760px) {
  .school-handbook-page {
    overflow-y: auto;
  }

  .handbook-shell {
    height: auto;
    min-height: 100%;
  }

  .task-grid {
    grid-template-columns: 1fr;
  }

  .cooldown-panel {
    align-items: flex-start;
    flex-wrap: wrap;
  }
}

@media (max-width: 420px) {
  .batch-panel,
  .rewards-panel {
    padding: 13px;
  }

  .reward-grid {
    gap: 8px;
  }

  .reward-card {
    min-height: 218px;
    padding: 8px;
  }

  .reward-card-visual {
    min-height: 82px;
  }

  .reward-image {
    height: 80px;
  }

  .reward-shop-title h2 {
    font-size: 16px;
  }
}
</style>
