<template>
  <div class="wish-container">
    <div class="wish-layout">
      <!-- 页面标题 -->
      <div class="wish-header">
        <div class="wish-title">
          <span style="font-family: Petmate; font-size: 30px"
            >{{ currentActivePetmate?.name ?? "Dass" }} Wish</span
          >
        </div>
      </div>

      <!-- petmate好感度信息展示 -->
      <div class="petmate-affection-section">
        <div class="affection-card">
          <div class="affection-avatar">
            <n-avatar
              round
              :size="70"
              :src="petmateAvatar"
              object-fit="cover"
            />
            <div class="affection-glow"></div>
          </div>
          <div class="affection-info">
            <div class="petmate-name">
              {{ currentActivePetmate?.name ?? "Dass" }}
            </div>
            <div class="affection-level">
              好感 LV. {{ petmateAttribute?.affectionLevel ?? -1 }}
            </div>
            <div class="affection-progress">
              <n-progress
                type="line"
                :height="12"
                :percentage="affectionProgressPercent"
                :show-indicator="false"
                color="#e28fac"
                rail-color="rgba(255, 255, 255, 0.2)"
                processing
              />
              <div class="progress-text">
                {{ petmateAttribute?.affectionExp ?? -1 }} /
                {{ petmateAttribute?.affectionNextExp ?? -1 }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 完成心愿和正在进行的心愿的总览 -->
      <div class="wish-stats-section">
        <div class="stats-card completed-stats">
          <div class="stats-icon">✅</div>
          <div class="stats-content">
            <div class="stats-label">已完成</div>
            <div class="stats-value">
              <n-number-animation :from="0" :to="petmateCompletedWishesNum" />
            </div>
          </div>
        </div>
        <div class="stats-card progress-stats">
          <div class="stats-icon">⏳</div>
          <div class="stats-content">
            <div class="stats-label">进行中</div>
            <div class="stats-value">
              <n-number-animation :from="0" :to="progressWishNum" />
            </div>
          </div>
        </div>
      </div>

      <!-- 心愿列表或详情 -->
      <div class="wish-content-section">
        <div v-if="!check" class="wish-list-view">
          <div class="wish-list-header">
            <span>心愿列表</span>
            <div class="wish-count">{{ wishList.length }} 个心愿</div>
          </div>
          <div class="wish-list-wrapper">
            <n-infinite-scroll style="height: 100%">
              <div>
                <div v-if="wishList.length > 0" class="wish-list">
                  <div
                    v-for="wish in wishList"
                    :key="wish.id"
                    class="wish-item-wrapper"
                    @click="checkWish(wish.id)"
                  >
                    <WishItem :wishItemName="wish.name" />
                  </div>
                </div>
                <div v-else class="empty-wishes">
                  <div class="empty-icon">💭</div>
                  <div class="empty-text">暂无心愿</div>
                  <div class="empty-subtitle">快去多和它互动吧！</div>
                </div>
              </div>
            </n-infinite-scroll>
          </div>
        </div>

        <!-- 心愿详情视图 -->
        <div v-else class="wish-detail-view">
          <div class="wish-detail-header">
            <n-button
              @click="check = false"
              circle
              size="large"
              color="#55484b"
              class="back-button"
            >
              <template #icon>
                <span style="font-size: 18px">←</span>
              </template>
            </n-button>
            <div class="wish-detail-info">
              <div class="wish-icon">
                <img :src="wishIcon" alt="wish" />
              </div>
              <div class="wish-detail-text">
                <div class="wish-name">{{ checkWishInfo?.name }}</div>
                <div class="wish-deadline">
                  截止: {{ formatTime(checkWishInfo?.endTime ?? new Date()) }}
                </div>
              </div>
            </div>
          </div>

          <div class="progress-section">
            <div class="progress-title">
              <span>完成进度</span>
              <n-button
                  v-if="isWishFinished"
                  @click="handleClaimReward"
                  :loading="isClaimingReward"
                  type="success"
                  class="claim-button"
                >
                <span class="claim-icon">🎁</span>
                <span class="claim-text">领取奖励</span>
              </n-button>
              <div
                  v-if="isWishFinished && checkWishInfo?.status === 'claimed'"
                  class="claimed-status"
                >
                <span class="claimed-icon">✅</span>
                <span class="claimed-text">已领取</span>
              </div>
            </div>

            <div class="requirements-container">
              <!-- 活动要求 -->
              <div
                v-if="activityProgress.length > 0"
                class="requirement-category"
              >
                <h4>活动要求</h4>
                <div class="requirement-list">
                  <div
                    v-for="progress in activityProgress"
                    :key="progress.id"
                    class="requirement-item"
                    :class="{ completed: progress.status === 'finished' }"
                  >
                    <img :src="getImageURL('activity', progress.src) ?? ''" class="requirement-icon" />
                    <span class="requirement-name">{{ progress.name }}</span>
                    <div class="requirement-status">
                      <img
                        v-if="progress.status === 'finished'"
                        :src="rightIcon"
                        class="status-icon"
                      />
                      <img
                        v-else
                        :src="wrongIcon"
                        class="status-icon"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- 物品要求 -->
              <div v-if="itemProgress.length > 0" class="requirement-category">
                <h4>物品要求</h4>
                <div class="requirement-list">
                  <div
                    v-for="progress in itemProgress"
                    :key="progress.id"
                    class="requirement-item"
                    :class="{ completed: progress.status === 'finished' }"
                  >
                    <img :src="getImageURL('item', progress.src) ?? ''" class="requirement-icon" />
                    <span class="requirement-name">
                      {{ progress.name }}
                      <span v-if="progress.type === 'item'" class="item-count">
                        ({{ progress.userCount }} / {{ progress.count }})
                      </span>
                    </span>
                    <div class="requirement-status">
                      <img
                        v-if="progress.status === 'finished'"
                        :src="rightIcon"
                        class="status-icon"
                      />
                      <img
                        v-else
                        :src="wrongIcon"
                        class="status-icon"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 心愿奖励展示 -->
            <div class="rewards-display-section">
              <div class="rewards-title">心愿奖励</div>
              <div class="rewards-container">
                <!-- 完成心愿给好感度 -->
                <div class="reward-item">
                  <div class="reward-info">
                    <span class="reward-name">好感度</span>
                    <span v-if="checkWishInfo?.affectionExp" class="reward-count">
                      + {{ checkWishInfo?.affectionExp }}
                    </span>
                  </div>
                </div>
                <!-- 心愿物品奖励，可能没有，因此需要判断 -->
                <div class="reward-item" v-if="wishReward" >
                  <template v-if="wishReward.type === 'item'">
                    <img :src="getImageURL('item', wishReward.src) ?? ''" class="reward-icon" />
                    <div class="reward-info">
                      <span class="reward-name">{{ wishReward.name }}</span>
                      <span v-if="wishReward.count" class="reward-count">
                        x{{ wishReward.count }}
                      </span>
                    </div>
                  </template>
                  <template v-else>
                    <img :src="getImageURL('buff', wishReward.src) ?? ''" class="reward-icon" />
                    <div class="reward-info">
                      <span class="reward-name">{{ wishReward.name }}</span>
                    </div>
                  </template>
                  <div class="reward-badge">
                    <span>🎁</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from "vue";
import WishItem from "../components/wish/WishItem.vue";
import { usePlayer } from "../hooks/usePlayer";
import { WishRequirement } from "../types/common";
import { formatTime } from "../utils/time";
import { openMessageModal } from "../hooks/useInteract";
import { useShow } from "../hooks/useShow";
import { Wish, WishReward } from "../types/common";
const { playerData, claimWishReward } = usePlayer();
const { getItemInfo, getImageURL } = useShow();
import petmateAvatar from "../assets/image/petmate-1.jpg";
import wishIcon from "../assets/image/wish.png";
import rightIcon from "../assets/image/right.png";
import wrongIcon from "../assets/image/wrong.png";

const currentPetmateID = ref(0);
const currentActivePetmate = computed(() => {
  return playerData.value?.petmates.find(
    (petmate) => petmate.id === currentPetmateID.value
  );
});

const petmateAttribute = computed(() => {
  return currentActivePetmate.value?.attrs;
});

const petmateCompletedWishesNum = computed(() => {
  return currentActivePetmate.value?.completedWishesNum ?? -1;
});

const progressWishNum = computed(() => {
  return (
    currentActivePetmate.value?.wishes.filter((wish) => wish.status === "doing")
      .length ?? -1
  );
});

// 计算好感度进度百分比
const affectionProgressPercent = computed(() => {
  const affectionExp = petmateAttribute.value?.affectionExp ?? -1;
  const nextAffectionExp = petmateAttribute.value?.affectionNextExp ?? -1;
  if (nextAffectionExp <= 0) return 0;
  return Math.round((affectionExp / nextAffectionExp) * 100);
});

// 心愿列表
const wishList = computed(() => {
  return currentActivePetmate.value?.wishes ?? [];
});

// 心愿的物品、活动要求和玩家目前的进度
const itemProgress = ref<WishRequirement[]>([]);
const activityProgress = ref<WishRequirement[]>([]);
// 更新要求列表
const updateRequirements = () => {
  if (checkWishInfo.value?.requirements) {
    itemProgress.value =
      checkWishInfo.value.requirements.filter(
        (requirement: WishRequirement) => requirement.type === "item"
      ) ?? [];
    activityProgress.value =
      checkWishInfo.value.requirements.filter(
        (requirement: WishRequirement) => requirement.type === "act"
      ) ?? [];
  }
};

// 按下心愿后，显示心愿的详细信息
const check = ref(false);
const checkWishID = ref<string | null>(null);
const checkWishInfo = ref<Wish | null>(null);
// 心愿奖励
const wishReward = ref<WishReward | null>(null);
const checkWish = async (wishID: string) => {
  checkWishID.value = wishID;
  check.value = true;
  checkWishInfo.value = wishList.value.find((wish) => wish.id === wishID) as Wish;
  if(checkWishInfo.value) {
  // 更新要求列表
  updateRequirements();
  // 更新奖励
  wishReward.value = checkWishInfo.value?.reward as WishReward;
  }
};

// 奖励领取相关
const isClaimingReward = ref(false);

// 检查心愿是否已完成
const isWishFinished = computed(() => {
  if (!checkWishInfo.value) return false;
  return checkWishInfo.value?.status === "finished" || checkWishInfo.value?.status === "claimed";
});

// 处理奖励领取
const handleClaimReward = async () => {
  if (!checkWishInfo.value) {
    openMessageModal("fail", "心愿不存在");
    return;
  }
  const success = await claimWishReward(
    currentPetmateID.value,
    checkWishInfo.value.id
  );
  if (success) {
    openMessageModal("success", "领取奖励成功");
    // 重新check一下
    checkWish(checkWishInfo.value.id);
  }
};
</script>

<style lang="scss" scoped>
.wish-container {
  flex: 1;
  padding: 0 6%;
  background: $system-bgc;

  .wish-layout {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
}

/* ==========================================
   页面标题
   ========================================== */
.wish-header {
  padding: 10px 0 0 0;

  .wish-title {
    font-size: 18px;
    text-align: center;
    color: $font-light;
    font-weight: 500;
  }
}

/* ==========================================
   好感度信息卡片
   ========================================== */
.petmate-affection-section {
  .affection-card {
    display: flex;
    align-items: center;
    padding: 10px 20px;
    background: $content-bgc;
    border-radius: 12px;
    box-shadow: 0 4px 24px 0 rgba(253, 203, 110, 0.2);
    gap: 20px;
    position: relative;
    overflow: hidden;

    .affection-avatar {
      position: relative;

      .affection-glow {
        position: absolute;
        top: -10px;
        left: -10px;
        right: -10px;
        bottom: -10px;
        border-radius: 50%;
        background: radial-gradient(
          circle,
          rgba(224, 166, 166, 0.3),
          transparent
        );
        opacity: 0.7;
        animation: pulse 3s ease-in-out infinite;
      }
    }

    .affection-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 5px;

      .petmate-name {
        font-size: 24px;
        font-weight: bold;
        color: $font-light;
        margin-bottom: 4px;
      }

      .affection-level {
        font-size: 16px;
        color: $color-pink-100;
        font-weight: 500;
      }

      .affection-progress {
        position: relative;

        .progress-text {
          font-size: 12px;
          color: $font-muted-light;
          text-align: center;
          margin-top: 4px;
        }
      }
    }
  }
}

/* ==========================================
   统计信息卡片
   ========================================== */
.wish-stats-section {
  display: flex;
  gap: 15px;
  margin: 20px 0;

  .stats-card {
    flex: 1;
    display: flex;
    align-items: center;
    padding: 10px 20px;
    background: $content-bgc;
    border-radius: 12px;
    box-shadow: 0 4px 24px 0 rgba(253, 203, 110, 0.15);
    gap: 15px;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 30px 0 rgba(253, 203, 110, 0.25);
    }

    .stats-icon {
      font-size: 28px;
      opacity: 0.8;
    }

    .stats-content {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .stats-label {
        font-size: 14px;
        color: $font-muted-light;
        font-weight: 500;
      }

      .stats-value {
        font-size: 28px;
        font-weight: bold;
        color: $font-light;
      }
    }

    &.completed-stats {
      background: linear-gradient(
        135deg,
        rgba(46, 213, 115, 0.1),
        $content-bgc
      );
      border-left: 4px solid #2ed573;
    }

    &.progress-stats {
      background: linear-gradient(
        135deg,
        rgba(255, 159, 67, 0.1),
        $content-bgc
      );
      border-left: 4px solid #ff9f43;
    }
  }
}

/* ==========================================
   心愿内容区域
   ========================================== */
.wish-content-section {
  flex: 1;
  background: $content-bgc;
  border-radius: 12px;
  box-shadow: 0 4px 24px 0 rgba(253, 203, 110, 0.15);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  margin-bottom: 15px;
}

/* ==========================================
   心愿列表视图
   ========================================== */
.wish-list-view {
  flex: 1;
  display: flex;
  flex-direction: column;

  .wish-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    span {
      font-size: 18px;
      font-weight: 600;
      color: $font-light;
    }

    .wish-count {
      font-size: 14px;
      color: $font-muted-light;
      background: rgba(224, 166, 166, 0.2);
      padding: 4px 12px;
      border-radius: 20px;
    }
  }

  .wish-list-wrapper {
    flex: 1;
    padding: 15px 20px;

    .wish-list {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;

      .wish-item-wrapper {
        width: 100%;
        display: flex;
        justify-content: center;
        transition: all 0.3s ease;

        &:hover {
          transform: translateY(-2px);
        }
      }
    }

    .empty-wishes {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;

      .empty-icon {
        font-size: 54px;
        opacity: 0.5;
      }

      .empty-text {
        font-size: 18px;
        color: $font-light;
        font-weight: 500;
      }

      .empty-subtitle {
        font-size: 14px;
        color: $font-muted-light;
      }
    }
  }
}

/* ==========================================
   心愿详情视图
   ========================================== */
.wish-detail-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 20px;

  .wish-detail-header {
    display: flex;
    align-items: center;
    gap: 0;

    .back-button {
      flex-shrink: 0;
      transition: all 0.3s ease;

      &:hover {
        transform: translateX(-2px);
      }
    }

    .wish-detail-info {
      display: flex;
      align-items: center;
      gap: 15px;
      flex: 1;

      .wish-icon {
        img {
          width: 50px;
          height: 50px;
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.2));
        }
      }

      .wish-detail-text {
        .wish-name {
          font-size: 20px;
          font-weight: bold;
          color: $font-light;
          margin-bottom: 4px;
        }

        .wish-deadline {
          font-size: 14px;
          color: $font-muted-light;
        }
      }
    }
  }

  .progress-section {
    flex: 1;

    .progress-title {
      height: 42px;
      font-size: 18px;
      font-weight: 600;
      color: $font-light;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid rgba(224, 166, 166, 0.3);
      display: flex;
      justify-content: space-between;
      .claim-button {
        font-size: 14px;
        height: auto;
        padding: 6px 12px;
        .claim-icon {
          font-size: 16px;
          animation: bounce 2s infinite;
          margin-bottom: 2px;
        }
        .claim-text {
          padding-right: 6px;
        }
      }
      .claimed-status {
        display: flex;
        align-items: center;
        gap: 2px;
        font-size: 14px;
        font-weight: normal;
        padding: 6px 12px;
        background: rgba(46, 213, 115, 0.2);
        border-radius: 3px;
        border: 1px solid rgba(46, 213, 115, 0.3);
      }
    }

    .requirements-container {
      display: flex;
      flex-direction: column;
      gap: 20px;

      .requirement-category {
        h4 {
          font-size: 16px;
          color: $color-pink-100;
          margin-bottom: 12px;
          font-weight: 600;
        }

        .requirement-list {
          display: flex;
          flex-direction: column;
          gap: 10px;

          .requirement-item {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            gap: 12px;
            transition: all 0.3s ease;
            border-left: 3px solid transparent;

            &:hover {
              background: rgba(255, 255, 255, 0.08);
              transform: translateX(4px);
            }

            &.completed {
              border-left-color: #2ed573;
              background: rgba(46, 213, 115, 0.1);
            }

            .requirement-icon {
              width: 24px;
              height: 24px;
              flex-shrink: 0;
            }

            .requirement-name {
              flex: 1;
              color: $font-light;
              font-weight: 500;

              .item-count {
                color: $font-muted-light;
                font-size: 14px;
                margin-left: 8px;
              }
            }

            .requirement-status {
              .status-icon {
                width: 20px;
                height: 20px;
              }
            }
          }
        }
      }
    }
  }
}

/* ==========================================
   心愿奖励展示
   ========================================== */
.rewards-display-section {
  margin-top: 20px;

  .rewards-title {
    font-size: 18px;
    font-weight: 600;
    color: $font-light;
    margin-bottom: 15px;
    padding-bottom: 8px;
    border-bottom: 2px solid rgba(253, 203, 110, 0.3);
  }

  .rewards-container {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .reward-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: linear-gradient(
        135deg,
        rgba(253, 203, 110, 0.1),
        rgba(255, 255, 255, 0.05)
      );
      border-radius: 8px;
      gap: 12px;
      transition: all 0.3s ease;
      border-left: 3px solid #fdcb6e;

      &:hover {
        background: linear-gradient(
          135deg,
          rgba(253, 203, 110, 0.15),
          rgba(255, 255, 255, 0.08)
        );
        transform: translateX(4px);
      }

      .reward-icon {
        width: 24px;
        height: 24px;
        flex-shrink: 0;
      }

      .reward-info {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 8px;

        .reward-name {
          color: $font-light;
          font-weight: 500;
        }

        .reward-count {
          color: #fdcb6e;
          font-size: 14px;
          font-weight: 600;
          background: rgba(253, 203, 110, 0.2);
          padding: 2px 8px;
          border-radius: 12px;
        }
      }

      .reward-badge {
        span {
          font-size: 16px;
          opacity: 0.8;
        }
      }
    }
  }
}

/* ==========================================
   动画效果
   ========================================== */
@keyframes pulse {
  0% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
  100% {
    opacity: 0.4;
    transform: scale(1);
  }
}

@keyframes bounce {
  0%,
  20%,
  50%,
  80%,
  100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-5px);
  }
  60% {
    transform: translateY(-2px);
  }
}
</style>
