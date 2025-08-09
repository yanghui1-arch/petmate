<template>
  <div class="activity-container">
    <!-- 活动相关的等级 -->
    <div class="activity-grade-layout">
      <div class="activity-grade-wrapper">
        <div class="activity-grade-item">
          <n-image
            src="../assets/image/activity/grade-icon.png"
            width="25"
            height="25"
            preview-disabled
          />
          <span class="activity-grade-label">唱歌</span>
          <span class="activity-grade-value"
            >LV.{{ petmateAttribute?.singLevel ?? 0 }}</span
          >
          <AttributeBar
            :value="petmateAttribute?.singExp ?? 0"
            :max="petmateAttribute?.singNextExp ?? 0"
            width="200px"
            color="#FF7EB6"
          />
        </div>
        <div class="activity-grade-item">
          <n-image
            src="../assets/image/activity/grade-icon.png"
            width="25"
            height="25"
            preview-disabled
          />
          <span class="activity-grade-label">绘画</span>
          <span class="activity-grade-value"
            >LV.{{ petmateAttribute?.drawLevel ?? 0 }}</span
          >
          <AttributeBar
            :value="petmateAttribute?.drawExp ?? 0"
            :max="petmateAttribute?.drawNextExp ?? 0"
            width="200px"
            color="#7EBAFF"
          />
        </div>
        <div class="activity-grade-item">
          <n-image
            src="../assets/image/activity/grade-icon.png"
            width="25"
            height="25"
            preview-disabled
          />
          <span class="activity-grade-label">游戏</span>
          <span class="activity-grade-value"
            >LV.{{ petmateAttribute?.gameLevel ?? 0 }}</span
          >
          <AttributeBar
            :value="petmateAttribute?.gameExp ?? 0"
            :max="petmateAttribute?.gameNextExp ?? 0"
            width="200px"
            color="#7EFF9E"
          />
        </div>
      </div>
    </div>
    <div class="activity-layout">
      <!-- 活动状态 -->
      <div class="active-activity-wrapper">
        <!-- 活动进行中，活动可领取 -->
        <div
          class="active-activity"
          v-if="petmateStatus?.activity && petmateStatus?.status !== 'idle'"
        >
          <div
            class="active-activity-countdown"
            v-if="petmateStatus?.status !== 'finished'"
          >
            <n-image
              src="../assets/image/activity/switch.png"
              width="25"
              height="25"
              preview-disabled
              object-fit="contain"
              @click="cancelActivity"
            />
            <!-- 倒计时显示，只做UI展示，由主进程定时器结束发送通知再刷新玩家数据 -->
            <n-countdown :duration="countDownSeconds" :active="true" />
          </div>
          <div class="btn-activity-reward" v-else>
            <n-button type="primary" @click="handleClaimReward"
              >领取奖励</n-button
            >
          </div>
          <div class="active-activity-info">
            <div
              class="active-activity-title"
              v-if="petmateStatus?.status !== 'finished'"
            >
              <span
                >{{ currentActivePetmate?.name }}正在{{
                  petmateStatus?.activity?.name
                }}</span
              >
            </div>
            <div class="active-activity-title" v-else>
              <span
                >{{ currentActivePetmate?.name }}已完成{{
                  petmateStatus?.activity?.name
                }}</span
              >
            </div>
            <div class="active-activity-info-reward">
              <span
                v-for="(value, key) in petmateStatus?.activity?.reward"
                :key="key"
                >{{ convertActivityText(String(key)) }} + {{ value }}</span
              >
            </div>
          </div>
        </div>
        <!-- 无活动状态 -->
        <div class="active-activity-none" v-else>
          {{ currentActivePetmate?.name }}当前未进行任何活动
        </div>
      </div>
      <div class="activity-wrapper">
        <!-- 四个活动版块-->
        <n-grid x-gap="12" y-gap="10" :cols="2" v-show="!showActivity">
          <n-gi
            v-for="activitySection in activitySectionList"
            :key="activitySection.id"
            @click="selectActivitySection(activitySection)"
          >
            <div
              class="activity-section-wrapper"
              ref="activityItemRefs"
              @animationend="activityAnimationEnd"
              :class="[`activity-theme-${activitySection.type}`]"
            >
              <div class="activity-section-content">
                <div class="activity-section-header">
                  <span class="activity-section-title">{{
                    activitySection.name
                  }}</span>
                  <div
                    class="activity-section-icon"
                    :class="activitySection.type"
                  ></div>
                </div>
                <div class="activity-section-description">
                  {{ activitySection.description }}
                </div>
                <div class="activity-section-footer">
                  <span class="activity-section-type">{{
                    activitySection.type
                  }}</span>
                  <div class="activity-section-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>
          </n-gi>
        </n-grid>

        <!-- 活动版块下的活动列表 -->
        <Transition
          enter-active-class="animate__animated animate__fadeIn"
          class="activity-content-wrapper"
          tag="div"
          @animationend="activityContentAnimationEnd"
        >
          <div v-if="showActivity" ref="activityContentRef">
            <div class="activity-content-header">
              <div class="activity-content-header-back">
                <n-image
                  src="../assets/image/activity/back-arrow.png"
                  width="30"
                  height="30"
                  preview-disabled
                  @click="closeActivity"
                />
              </div>
              <div class="activity-content-header-title">
                {{ currentActivitySection?.name }}
              </div>
              <!-- 占位，用于布局 -->
              <div class="spacer"></div>
            </div>
            <TransitionGroup
              enter-active-class="animate__animated animate__fadeIn"
              tag="div"
              class="activity-content"
              appear
            >
              <div
                class="activity-item"
                v-for="(actItem, index) in activityInfoList"
                :key="actItem.id"
                ref="contentItemRefs"
                :style="{ animationDelay: index * 100 + 'ms' }"
                :class="{
                  'activity-item-locked': checkActivityLocked(
                    actItem.requirement
                  ),
                }"
                @animationend="contentAnimationEnd"
                @mouseenter="handleActItemPopover($event, actItem)"
                @click="showModal(actItem)"
              >
                <div class="activity-item-header">
                  <div class="activity-item-name">{{ actItem.name }}</div>
                </div>
                <div class="activity-item-content">
                  <div class="activity-item-icon">
                    <n-image
                      :src="getImageURL(actItem.url, 'activity') ?? ''"
                      width="50"
                      height="50"
                      preview-disabled
                      object-fit="contain"
                    />
                  </div>
                  <div class="activity-item-info">
                    <div class="activity-item-time-wrapper">
                      <span class="activity-item-emoji">⌛</span>
                      <span>{{
                        computeActivityTime(actItem.consume.spendingTime)
                      }}</span>
                    </div>
                    <div class="activity-item-requirement-wrapper">
                      <span class="activity-item-emoji">🎯</span>
                      <div class="activity-item-requirement">
                        <span
                          v-for="(value, key) in actItem.requirement"
                          :key="key"
                          >{{ convertActivityText(String(key)) }}
                          {{ value }}</span
                        >
                      </div>
                    </div>
                  </div>
                </div>

                <div class="activity-item-reward">
                  <span class="activity-item-emoji">🏆</span>
                  <span>{{ actItem.rewardSummary }}</span>
                </div>

                <!-- 活动未解锁时的状态 -->
                <div
                  v-if="checkActivityLocked(actItem.requirement)"
                  class="activity-item-locked-overlay"
                >
                  <div class="lock-icon">🔒</div>
                  <div class="locked-requirements">
                    <div class="locked-title">解锁条件:</div>
                    <div class="locked-requirements-list">
                      <div
                        v-for="requirement in getMissingRequirements(
                          actItem.requirement
                        )"
                        :key="requirement"
                        class="locked-requirement-item"
                      >
                        {{ requirement }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TransitionGroup>
          </div>
        </Transition>
      </div>
    </div>
    <ActivityPopover
      :popoverX="popoverX"
      :popoverY="popoverY"
      :show="isActItemEnter"
      :popoverWidth="popoverWidth"
      :actItem="popoverActItem!"
      :isLocked="isActItemLocked"
    />
    <ActivityModal
      v-model:show="isModalShow"
      :actItem="modalActItem!"
      :type="modalType"
      :petmateId="currentPetmateID"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import AttributeBar from "../components/AttributeBar.vue";
import ActivityPopover from "@/components/activity/ActivityPopover.vue";
import ActivityModal from "@/components/activity/ActivityModal.vue";
import { openMessageModal } from "../hooks/useInteract";
import { ActivityInfo } from "../types/common";
import { usePlayer } from "../hooks/usePlayer";
import { useShow } from "../hooks/useShow";
import { showActItemPopover, popoverX, popoverY, popoverWidth, popoverActItem, isActItemEnter } from "../hooks/useInteract";
import { checkLocked } from "../utils/check";
import { convertActivityText, computeActivityTime } from "../utils/activity";
import { PetMateAttribute } from "../types/petmate";

const { playerData, refreshPlayerData, claimActivityReward } = usePlayer();
const { getActivities, getImageURL } = useShow();

// Petmate相关
const currentPetmateID = ref(0);
const currentActivePetmate = computed(() => {
  return playerData.value?.petmates.find(
    (petmate) => petmate.id === currentPetmateID.value
  );
});

const petmateAttribute = computed(() => {
  return currentActivePetmate.value?.attrs;
});

const petmateStatus = computed(() => {
  return currentActivePetmate.value?.status;
});

// 计算活动倒计时
const countDownSeconds = computed(() => {
  if (!petmateStatus.value?.endTime || !petmateStatus.value?.startTime) {
    return 0;
  }
  console.log(petmateStatus.value.endTime, petmateStatus.value.startTime);
  return petmateStatus.value.endTime.getTime() - new Date().getTime();
});

/**
 * 检查活动是否为不可开启
 * @param requirement 活动的等级要求
 * @returns 是否为不可开启，如果为不可开启，则返回true，否则返回false
 */
const checkActivityLocked = (requirement: ActivityInfo["requirement"]): boolean => {
    if (!petmateAttribute) return false;
    return checkLocked(requirement, petmateAttribute as ComputedRef<PetMateAttribute>);
};


/**
 * 获得不满足的解锁条件
 * @param requirements 活动条件
 * @returns 不满足的条件
 */
const getMissingRequirements = (requirement: ActivityInfo["requirement"]) => {
  const { level, singLevel, drawLevel, gameLevel, affectionLevel } =
    petmateAttribute.value ?? {
      level: 1,
      singLevel: 1,
      drawLevel: 1,
      gameLevel: 1,
      affectionLevel: 1,
    };
  const missing: string[] = [];
  if (level < (requirement.level ?? 0)) {
    missing.push(`等级 Lv.${requirement.level}`);
  }
  if (singLevel < (requirement.singLevel ?? 0)) {
    missing.push(`唱歌 Lv.${requirement.singLevel}`);
  }
  if (drawLevel < (requirement.drawLevel ?? 0)) {
    missing.push(`绘画 Lv.${requirement.drawLevel}`);
  }
  if (gameLevel < (requirement.gameLevel ?? 0)) {
    missing.push(`游戏 Lv.${requirement.gameLevel}`);
  }
  if (affectionLevel < (requirement.affectionLevel ?? 0)) {
    missing.push(`亲密度 Lv.${requirement.affectionLevel}`);
  }
  return missing;
};

const isModalShow = ref(false);
const modalTitle = ref("");
const modalActItem = ref<ActivityInfo | null>(null);
const modalType = ref("");

/**
 * 显示活动弹出框
 * 如果当前角色已有活动，弹出框提示不能开始
 * 如果当前活动尚未解锁，弹出框提升尚未解锁
 * @param actItem 活动信息
 */
const showModal = (actItem: ActivityInfo) => {
  if (checkActivityLocked(actItem.requirement)) {
    openMessageModal("fail", "活动未解锁");
    return;
  }
  if (petmateStatus.value?.activity) {
    openMessageModal("fail", "当前角色已有活动");
    return;
  }
  isModalShow.value = true;
  modalActItem.value = actItem;
  modalType.value = "start";
};

/**
 * 取消活动
 */
const cancelActivity = () => {
  isModalShow.value = true;
  modalActItem.value = petmateStatus.value?.activity as ActivityInfo;
  modalType.value = "cancel";
};

/**
 * 领取活动奖励
 */
const handleClaimReward = async () => {
  const success = await claimActivityReward(currentPetmateID.value);
  if (success) {
    openMessageModal("success", "领取奖励成功");
  } else {
    openMessageModal("fail", "领取奖励失败");
  }
};

const activitySectionList = [
  {
    id: 1,
    type: "study",
    name: "学习",
    description: "每一篇鼓舞诗章，都是时代的远航",
  },
  {
    id: 2,
    type: "work",
    name: "工作",
    description: "真正的工作，在于把每一份付出，都变成你未来版图上的一座新城。",
  },
  {
    id: 3,
    type: "play",
    name: "娱乐",
    description: "休憩是为下一次伟大的远征积蓄最充沛的能量",
  },
  {
    id: 4,
    type: "empty",
    name: "empty",
    description: "最有价值的活动，都在这里了",
  },
];


const isActItemLocked = ref(false);
const handleActItemPopover = (event: MouseEvent, actItem: ActivityInfo) => {
  showActItemPopover(event, actItem);
  isActItemLocked.value = checkActivityLocked(actItem.requirement);
};

const activityItemRefs = ref<HTMLElement[]>([]);
const activityContentRef = ref<HTMLElement>();
const showActivity = ref(false);
const activityInfoList = ref<ActivityInfo[]>([]);
// currentActivitySection是activitySectionList的元素，用于记录当前活动板块
const currentActivitySection = ref<(typeof activitySectionList)[number] | null>(
  null
);

/**
 * 选择活动
 * 移出活动版块，淡入活动详情
 * @param id 活动id
 */
const selectActivitySection = (
  activitySection: (typeof activitySectionList)[number]
) => {
  currentActivitySection.value = activitySection;
  console.log("selectActivitySection", activityItemRefs.value);
  activitySectionList.forEach((activitySection) => {
    const sectionEl = activityItemRefs.value[activitySection.id - 1];
    if (!sectionEl) return;

    // 先移除动画
    sectionEl.classList.remove(
      "activity-move-left",
      "activity-move-right",
      "activity-move-left-reverse",
      "activity-move-right-reverse"
    );

    // 添加动画
    if (activitySection.id % 2 !== 0) {
      // 奇数向左滑动
      sectionEl.classList.add("activity-move-left");
    } else {
      // 偶数向右滑动
      sectionEl.classList.add("activity-move-right");
    }
  });
};

/**
 * 活动版块动画结束回调，淡入活动详情
 * 活动板块动画分为移入和移出，此处关注移入
 * @param event 动画事件
 */
const activityAnimationEnd = async (event: AnimationEvent) => {
  if (!event.animationName.includes("Reverse") && !showActivity.value) {
    activityInfoList.value = await getActivities(
      currentActivitySection.value?.type as ActivityInfo["type"]
    );
    showActivity.value = true;
  }
};

const contentItemRefs = ref<HTMLElement[]>([]);
/**
 * 关闭活动详情，触发活动内容折叠动画
 */
const closeActivity = () => {
  console.log(activityContentRef.value);
  const len = contentItemRefs.value.length;
  contentItemRefs.value.forEach((item, index) => {
    // 从底部向上折叠，设置动画延迟
    item.style.animationDelay = (len - index - 1) * 50 + "ms";
    item.classList.add("activity-item-collapse");
  });

  // 如果活动列表未空，直接触发主体弹出动画
  if (activityInfoList.value.length === 0) {
    activityContentRef.value?.classList.add("activity-content-fade-out");
  }
};

const contentExitCount = ref(0);
/**
 * 活动内容折叠动画结束回调
 * @param event 动画事件
 */
const contentAnimationEnd = (event: AnimationEvent) => {
  if (contentExitCount.value < activityInfoList.value.length - 1) {
    contentExitCount.value++;
    return;
  }
  contentExitCount.value = 0;
  // 活动内容全部折叠后，再触发淡出活动详情动画
  if (event.animationName.includes("activityItemCollapse")) {
    activityContentRef.value?.classList.add("activity-content-fade-out");
  }
};

/**
 * 活动详情动画结束回调，触发移入活动板块动画
 * @param event 动画事件
 */
const activityContentAnimationEnd = (event: AnimationEvent) => {
  if (event.animationName.includes("activityContentFadeOut")) {
    showActivity.value = false;

    // 一定要移除动画样式，否则影响页面布局(宽度变成一半)
    activityContentRef.value?.classList.remove("activity-content-fade-out");

    // 原路返回
    activitySectionList.forEach((activity) => {
      const sectionEl = activityItemRefs.value[activity.id - 1];
      if (!sectionEl) return;

      sectionEl.classList.remove("activity-move-left", "activity-move-right");

      if (activity.id % 2 !== 0) {
        sectionEl.classList.add("activity-move-left-reverse");
      } else {
        sectionEl.classList.add("activity-move-right-reverse");
      }
    });
  }
};
</script>

<style scoped lang="scss">
.activity-container {
  flex: 1;
  padding: 0 3%;
  background: $system-bgc;
  display: flex;
  flex-direction: column;
  gap: 0;
  .activity-grade-layout {
    height: 18vh;
    margin-top: 20px;
  }
  .activity-layout {
    flex: 1;
  }
}

.activity-grade-wrapper {
  width: 100%;
  height: 100%;
  background: $content-bgc;
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 3px 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  row-gap: 3px;

  .activity-grade-item {
    display: flex;
    align-items: center;
    justify-content: space-around;
    .activity-grade-label {
      color: rgba(255, 255, 255, 0.8);
      font-size: 14px;
    }
    .activity-grade-value {
      color: $color-pink-100;
      font-weight: bold;
    }
  }
}

.activity-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.activity-section-wrapper {
  height: 28vh;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 15px 10px;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.5) 50%,
      rgba(255, 255, 255, 0) 100%
    );
  }

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 3px 10px rgba(255, 234, 167, 0.5);

    .activity-section-icon {
      transform: rotate(15deg) scale(1.1);
    }

    .activity-section-dots span {
      transform: scale(1.2);
    }
  }

  &.activity-theme-study,
  &.activity-theme-empty {
    background: linear-gradient(
      135deg,
      rgba(64, 169, 255, 0.15) 0%,
      rgba(64, 169, 255, 0.05) 100%
    );
    border: 1px solid rgba(64, 169, 255, 0.2);

    .activity-section-icon {
      background: rgba(64, 169, 255, 0.15);
      &::before {
        background: rgba(64, 169, 255, 0.8);
      }
    }
  }

  &.activity-theme-work,
  &.activity-theme-play {
    background: linear-gradient(
      135deg,
      rgba(250, 84, 28, 0.15) 0%,
      rgba(250, 84, 28, 0.05) 100%
    );
    border: 1px solid rgba(250, 84, 28, 0.2);

    .activity-section-icon {
      background: rgba(250, 84, 28, 0.15);
      &::before {
        background: rgba(250, 84, 28, 0.8);
      }
    }
  }
  .activity-section-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
    z-index: 1;

    .activity-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .activity-section-title {
        font-size: 1.2rem;
        font-weight: bold;
        color: #fff;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .activity-section-icon {
        width: 35px;
        height: 35px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        transition: all 0.3s ease;
        position: relative;

        &::before {
          content: "";
          position: absolute;
          width: 24px;
          height: 24px;
          mask-size: contain;
          mask-repeat: no-repeat;
          mask-position: center;
        }

        &.study::before {
          mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z'/%3E%3C/svg%3E");
        }

        &.work::before,
        &.empty::before {
          mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M20,6C20.58,6 21.05,6.2 21.42,6.59C21.8,7 22,7.45 22,8V19C22,19.55 21.8,20 21.42,20.41C21.05,20.8 20.58,21 20,21H4C3.42,21 2.95,20.8 2.58,20.41C2.2,20 2,19.55 2,19V8C2,7.45 2.2,7 2.58,6.59C2.95,6.2 3.42,6 4,6H8V4C8,3.42 8.2,2.95 8.58,2.58C8.95,2.2 9.42,2 10,2H14C14.58,2 15.05,2.2 15.42,2.58C15.8,2.95 16,3.42 16,4V6H20M4,8V19H20V8H4M14,6V4H10V6H14Z'/%3E%3C/svg%3E");
        }

        &.play::before {
          mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M21,6H3A2,2 0 0,0 1,8V16A2,2 0 0,0 3,18H21A2,2 0 0,0 23,16V8A2,2 0 0,0 21,6M21,16H3V8H21M6,15H8V13H10V11H8V9H6V11H4V13H6M14.5,12A1.5,1.5 0 0,1 16,13.5A1.5,1.5 0 0,1 14.5,15A1.5,1.5 0 0,1 13,13.5A1.5,1.5 0 0,1 14.5,12M18.5,9A1.5,1.5 0 0,1 20,10.5A1.5,1.5 0 0,1 18.5,12A1.5,1.5 0 0,1 17,10.5A1.5,1.5 0 0,1 18.5,9Z'/%3E%3C/svg%3E");
        }
      }
    }

    .activity-section-description {
      flex: 1;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.8);
      line-height: 1.6;
      margin: 8px 0;
    }

    .activity-section-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .activity-section-type {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: rgba(255, 255, 255, 0.6);
        background: rgba(255, 255, 255, 0.1);
        padding: 4px 12px;
        border-radius: 12px;
      }

      .activity-section-dots {
        display: flex;
        gap: 4px;

        span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          transition: transform 0.3s ease;

          &:nth-child(2) {
            transition-delay: 0.1s;
          }

          &:nth-child(3) {
            transition-delay: 0.2s;
          }
        }
      }
    }
  }
}

// 当前开启的活动
.active-activity-wrapper {
  width: 100%;
  height: 15vh;
  border-radius: 8px;
  margin: 10px 0;
  padding: 3px 10px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  position: relative;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(255, 234, 167, 0.3);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .active-activity {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    position: relative;
    z-index: 1;

    .active-activity-countdown {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #fff;
      font-size: 16px;
      font-weight: 500;
      letter-spacing: 0.1em;
      background: rgba(255, 255, 255, 0.1);
      padding: 8px 10px;
      border-radius: 12px;
      backdrop-filter: blur(5px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      transition: all 0.3s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.15);
        transform: scale(1.02);
      }
    }

    .active-activity-info {
      height: 100%;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-around;

      .active-activity-title {
        font-size: 12px;
        font-weight: 600;
        color: #fff;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        line-height: 1.4;
        text-align: center;
      }

      .active-activity-info-reward {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 4px;

        span {
          background: linear-gradient(
            135deg,
            rgba(64, 169, 255, 0.2) 0%,
            rgba(64, 169, 255, 0.1) 100%
          );
          color: #409eff;
          padding: 2px 10px;
          border-radius: 5px;
          font-size: 10px;
          font-weight: 500;
          border: 1px solid rgba(64, 169, 255, 0.3);
          backdrop-filter: blur(5px);
          transition: all 0.3s ease;

          &:hover {
            background: linear-gradient(
              135deg,
              rgba(64, 169, 255, 0.3) 0%,
              rgba(64, 169, 255, 0.2) 100%
            );
            transform: translateY(-1px);
          }
        }
      }
    }
  }

  // 未开始活动的样式
  .active-activity-none {
    color: $font-light;
    font-size: 14px;
    font-weight: 500;
    text-align: center;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 15px;
    backdrop-filter: blur(5px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  // 活动可领取奖励的样式
  .active-activity-ready-to-claim {
    background: rgba(76, 175, 80, 0.1);
    border: 1px solid rgba(76, 175, 80, 0.3);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 15px;
    backdrop-filter: blur(5px);

    .activity-claim-header {
      display: flex;
      align-items: center;
      gap: 10px;
      justify-content: center;

      .activity-complete-text {
        color: #4caf50;
        font-size: 16px;
        font-weight: 600;
      }
    }

    .active-activity-info {
      text-align: center;
    }

    .activity-claim-actions {
      display: flex;
      justify-content: center;
      align-items: center;
    }
  }
}

// 活动主体
.activity-wrapper {
  .activity-content-wrapper {
    width: 100%;
    height: 58vh;
    border-radius: 8px;
    background: $content-bgc;
    box-shadow: 0 4px 24px 0 rgba(253, 203, 110, 0.2);
    padding: 10px;
    display: flex;
    flex-direction: column;
    .activity-content-header {
      display: flex;
      justify-content: space-around;
      align-items: center;
      .activity-content-header-back {
        width: 20%;
      }
      .activity-content-header-title {
        flex: 1;
        text-align: center;
        font-size: 22px;
        font-weight: bold;
        color: #e0a6a6;
        letter-spacing: 1em;
        text-indent: 1em; // 首字缩进，不加布局会偏移
      }
      .spacer {
        width: 20%;
      }
    }

    .activity-content {
      width: 100%;
      flex: 1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      row-gap: 10px;
      overflow-y: auto;
      padding-top: 10px;
      .activity-item {
        width: calc(50% - 4px);
        height: 160px;
        border: 1px solid pink;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        position: relative;
        overflow: hidden;

        &::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.5) 50%,
            rgba(255, 255, 255, 0) 100%
          );
        }

        &:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
          border-color: rgba(255, 255, 255, 0.3);

          .activity-item-icon {
            transform: scale(1.05);
          }
        }

        .activity-item-header {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 3px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          .activity-item-name {
            font-size: 13px;
            color: #fff;
          }
        }

        .activity-item-content {
          display: flex;
          justify-content: center;
          align-items: center;
          column-gap: 10px;
          flex: 1;

          .activity-item-icon {
            width: 50px;
            height: 50px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            transition: transform 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(5px);
            border: 1px solid rgba(255, 255, 255, 0.15);

            img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
          }

          .activity-item-info {
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 2px;
            padding: 3px 0;
            font-size: 12px;

            .activity-item-time-wrapper {
              color: rgba(255, 255, 255, 0.8);
              display: flex;
              align-items: center;
              gap: 5px;
            }

            .activity-item-requirement-wrapper {
              display: flex;
              align-items: center;
              column-gap: 5px;
              color: rgba(255, 255, 255, 0.7);
            }
          }
        }

        .activity-item-reward {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          font-size: 12px;
        }
        .activity-item-emoji {
          font-size: 16px;
        }
        .activity-item-requirement {
          display: flex;
          flex-direction: column;
          row-gap: 1px;
        }
      }
    }
  }
}

// 自定义动画
.activity-move-left {
  animation: activityMoveLeft 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.activity-move-right {
  animation: activityMoveRight 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.activity-move-left-reverse {
  animation: activityMoveLeftReverse 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.activity-move-right-reverse {
  animation: activityMoveRightReverse 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.activity-content-fade-out {
  animation: activityContentFadeOut 1s ease forwards;
}

.activity-item-collapse {
  animation: activityItemCollapse 0.5s ease forwards;
}

@keyframes activityMoveLeft {
  from {
    transform: translateX(0) rotate(0);
    opacity: 1;
  }
  to {
    transform: translateX(-150%) rotate(-10deg);
    opacity: 0;
  }
}

@keyframes activityMoveRight {
  from {
    transform: translateX(0) rotate(0);
    opacity: 1;
  }
  to {
    transform: translateX(150%) rotate(10deg);
    opacity: 0;
  }
}

@keyframes activityMoveLeftReverse {
  from {
    transform: translateX(-150%) rotate(-10deg);
    opacity: 0;
  }
  to {
    transform: translateX(0) rotate(0);
    opacity: 1;
  }
}

@keyframes activityMoveRightReverse {
  from {
    transform: translateX(150%) rotate(10deg);
    opacity: 0;
  }
  to {
    transform: translateX(0) rotate(0);
    opacity: 1;
  }
}

@keyframes activityContentFadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@keyframes activityItemCollapse {
  from {
    transform-origin: top;
    transform: scaleY(1);
    opacity: 1;
  }
  to {
    transform-origin: top;
    transform: scaleY(0);
    opacity: 0;
  }
}

// 不满足活动开启条件的锁样式
.activity-item-locked {
  opacity: 0.5;
  filter: grayscale(70%) brightness(0.7);
  position: relative;
}

.activity-item-locked-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px;
  z-index: 10;

  .lock-icon {
    font-size: 24px;
    margin-bottom: 8px;
    opacity: 0.9;
    animation: lockPulse 2s ease-in-out infinite;
  }

  .locked-requirements {
    text-align: center;
    color: rgba(255, 255, 255, 0.9);
    font-size: 10px;

    .locked-title {
      font-weight: bold;
      margin-bottom: 4px;
      color: #ff6b6b;
      font-size: 11px;
    }
    .locked-requirements-list {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 4px;
      .locked-requirement-item {
        margin: 1px 0;
        padding: 1px 4px;
        background: rgba(255, 107, 107, 0.2);
        border-radius: 4px;
        border: 1px solid rgba(255, 107, 107, 0.3);
        font-size: 9px;
      }
    }
  }
}

// 锁图标的动画，无限闪烁
@keyframes lockPulse {
  0%,
  100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}

// 底下的文本隐藏
.activity-item-locked {
  .activity-item-header,
  .activity-item-content,
  .activity-item-reward {
    pointer-events: none;
  }

  .activity-item-name {
    color: rgba(255, 255, 255, 0.4) !important;
  }

  .activity-item-icon {
    filter: grayscale(100%);
    opacity: 0.5;
  }

  .activity-item-time-wrapper,
  .activity-item-requirement-wrapper,
  .activity-item-reward {
    color: rgba(255, 255, 255, 0.3) !important;
  }
}
</style>
