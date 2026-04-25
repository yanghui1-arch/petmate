<template>
  <n-modal v-model:show="isVisible" :mask-closable="phase === 'opened'">
    <div class="reward-reveal-wrapper" :class="`phase-${phase}`">
      <div class="gift-stage">
        <div class="burst-ring"></div>
        <span
          v-for="particle in particles"
          :key="particle.id"
          class="burst-particle"
          :style="particle.style"
        ></span>
        <div class="gift-box">
          <div class="gift-lid">
            <span class="gift-bow-left"></span>
            <span class="gift-bow-right"></span>
          </div>
          <div class="gift-body">
            <span class="gift-ribbon"></span>
          </div>
        </div>
      </div>

      <div class="reward-content">
        <div class="reward-kicker">委托完成</div>
        <div class="reward-title">{{ commissionName }}</div>
        <div class="reward-list">
          <div
            v-for="reward in rewardPreviews"
            :key="reward.id"
            class="reward-item"
            :class="`reward-item-${reward.type}`"
          >
            <div class="reward-image" v-if="reward.imageUrl">
              <img :src="reward.imageUrl" :alt="reward.name" />
            </div>
            <div class="reward-badge" v-else>{{ getRewardBadge(reward.type) }}</div>
            <div class="reward-info">
              <span class="reward-name">{{ reward.name }}</span>
              <span class="reward-description">{{ reward.description }}</span>
            </div>
          </div>
        </div>
        <button type="button" class="reward-accept-btn" @click="closeReveal">
          收下奖励
        </button>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import type { CommissionRewardPreview } from "@/types/commission";

const props = defineProps<{
  show: boolean;
  commissionName: string;
  rewardPreviews: CommissionRewardPreview[];
}>();

const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
}>();

type RevealPhase = "idle" | "shaking" | "bursting" | "opened";

const phase = ref<RevealPhase>("idle");
const timers: number[] = [];

const particles = Array.from({ length: 24 }, (_, index) => {
  const angle = (Math.PI * 2 * index) / 24;
  const distance = index % 2 === 0 ? 112 : 86;
  return {
    id: index,
    style: {
      "--burst-x": `${Math.cos(angle) * distance}px`,
      "--burst-y": `${Math.sin(angle) * distance}px`,
      "--burst-delay": `${index * 18}ms`,
    },
  };
});

const isVisible = computed({
  get: () => props.show,
  set: (val) => emit("update:show", val),
});

watch(
  () => props.show,
  (show) => {
    clearTimers();
    if (!show) {
      phase.value = "idle";
      return;
    }

    phase.value = "shaking";
    timers.push(window.setTimeout(() => (phase.value = "bursting"), 1250));
    timers.push(window.setTimeout(() => (phase.value = "opened"), 1780));
  }
);

onBeforeUnmount(clearTimers);

function closeReveal() {
  isVisible.value = false;
}

function getRewardBadge(type: CommissionRewardPreview["type"]) {
  if (type === "cash") return "金";
  if (type === "item") return "物";
  if (type === "animation") return "动";
  return "称";
}

function clearTimers() {
  while (timers.length) {
    const timer = timers.pop();
    if (timer) window.clearTimeout(timer);
  }
}
</script>

<style scoped lang="scss">
.reward-reveal-wrapper {
  width: 380px;
  min-height: 420px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 18px;
  background:
    radial-gradient(circle at 50% 28%, rgba(255, 248, 225, 0.22), transparent 42%),
    linear-gradient(145deg, #5b4b50, #2f282a);
  border: 1px solid rgba(253, 203, 110, 0.35);
  box-shadow: 0 18px 46px rgba(0, 0, 0, 0.4);
}

.gift-stage {
  position: relative;
  width: 100%;
  height: 210px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gift-box {
  position: relative;
  width: 108px;
  height: 96px;
  transform-origin: 50% 80%;
  z-index: 2;
}

.phase-shaking .gift-box {
  animation: giftShake 0.24s ease-in-out infinite;
}

.phase-bursting .gift-box {
  animation: giftPop 0.55s ease forwards;
}

.gift-lid {
  position: absolute;
  top: 0;
  left: -7px;
  width: 122px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, #ff7d92, #ffb86b);
  border: 2px solid rgba(255, 255, 255, 0.48);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.22);
}

.phase-bursting .gift-lid,
.phase-opened .gift-lid {
  animation: lidFly 0.62s ease forwards;
}

.gift-body {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 108px;
  height: 74px;
  border-radius: 8px 8px 12px 12px;
  background: linear-gradient(135deg, #ff89a6, #6bc8d9);
  border: 2px solid rgba(255, 255, 255, 0.45);
  box-shadow: 0 12px 22px rgba(0, 0, 0, 0.26);
}

.gift-ribbon {
  position: absolute;
  left: 43px;
  top: 0;
  width: 22px;
  height: 100%;
  background: linear-gradient(180deg, #fff8e1, #ffd36e);
  box-shadow: 0 0 12px rgba(255, 248, 225, 0.36);
}

.gift-bow-left,
.gift-bow-right {
  position: absolute;
  top: -24px;
  width: 42px;
  height: 28px;
  border-radius: 50% 50% 40% 50%;
  background: linear-gradient(135deg, #fff8e1, #ffd36e);
  border: 2px solid rgba(255, 255, 255, 0.58);
}

.gift-bow-left {
  left: 19px;
  transform: rotate(-28deg);
}

.gift-bow-right {
  right: 19px;
  transform: rotate(28deg) scaleX(-1);
}

.burst-ring {
  position: absolute;
  width: 132px;
  height: 132px;
  border-radius: 50%;
  border: 2px solid rgba(255, 248, 225, 0);
}

.phase-bursting .burst-ring,
.phase-opened .burst-ring {
  animation: burstRing 0.62s ease-out forwards;
}

.burst-particle {
  position: absolute;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #fff8e1;
  opacity: 0;
  z-index: 1;

  &:nth-child(3n) {
    background: #ff89a6;
  }

  &:nth-child(4n) {
    width: 7px;
    height: 18px;
    border-radius: 3px;
    background: #6bc8d9;
  }
}

.phase-bursting .burst-particle,
.phase-opened .burst-particle {
  animation: particleBurst 0.78s ease-out var(--burst-delay) forwards;
}

.reward-content {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 20px 20px;
  opacity: 0;
  transform: translateY(18px);
  pointer-events: none;
}

.phase-opened .reward-content {
  animation: rewardRise 0.36s ease forwards;
  pointer-events: all;
}

.reward-kicker {
  padding: 3px 10px;
  border-radius: 999px;
  color: #8b4513;
  font-size: 11px;
  font-weight: 800;
  background: linear-gradient(135deg, #fff8e1, #ffd6e7);
}

.reward-title {
  margin-top: 8px;
  color: #ffffff;
  font-size: 22px;
  font-weight: 800;
}

.reward-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  row-gap: 10px;
  margin-top: 14px;
}

.reward-item {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-height: 70px;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(253, 203, 110, 0.22);
}

.reward-image,
.reward-badge {
  width: 58px;
  height: 58px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(135deg, #fff8e1, #ffecb3);
}

.reward-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.reward-badge {
  color: #8b4513;
  font-size: 22px;
  font-weight: 900;
}

.reward-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  row-gap: 4px;
}

.reward-name {
  color: #ffffff;
  font-size: 14px;
  font-weight: 800;
}

.reward-description {
  color: rgba(255, 255, 255, 0.68);
  font-size: 12px;
  line-height: 1.45;
}

.reward-accept-btn {
  width: 128px;
  height: 34px;
  margin-top: 16px;
  border: 1px solid rgba(253, 203, 110, 0.35);
  border-radius: 10px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 800;
  background: linear-gradient(135deg, #ff7675, #6bc8d9);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 18px rgba(255, 118, 117, 0.28);
  }
}

@keyframes giftShake {
  0%,
  100% {
    transform: translateX(0) rotate(0deg);
  }
  25% {
    transform: translateX(-6px) rotate(-5deg);
  }
  75% {
    transform: translateX(6px) rotate(5deg);
  }
}

@keyframes giftPop {
  0% {
    transform: scale(1);
  }
  55% {
    transform: scale(1.16);
  }
  100% {
    transform: scale(0.92);
  }
}

@keyframes lidFly {
  100% {
    transform: translate(-28px, -82px) rotate(-28deg);
    opacity: 0;
  }
}

@keyframes burstRing {
  0% {
    transform: scale(0.3);
    border-color: rgba(255, 248, 225, 0.8);
    opacity: 1;
  }
  100% {
    transform: scale(1.9);
    border-color: rgba(255, 248, 225, 0);
    opacity: 0;
  }
}

@keyframes particleBurst {
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(0.4) rotate(0deg);
  }
  20% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(var(--burst-x), var(--burst-y)) scale(1) rotate(220deg);
  }
}

@keyframes rewardRise {
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
