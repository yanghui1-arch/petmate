<template>
  <div class="wish-container">
    <div class="wish-layout">
      <!-- 页面标题 -->
      <div class="wish-header">
        <div class="wish-title">
          <span style="font-family: Petmate; font-size: 30px"
            >{{ petmateName }} Wish</span
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
              src="../assets/image/petmate-1.jpg"
              object-fit="cover"
            />
            <div class="affection-glow"></div>
          </div>
          <div class="affection-info">
            <div class="petmate-name">{{ petmateName }}</div>
            <div class="affection-level">好感 LV. {{ affectionLevel }}</div>
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
                {{ currentAffectionExp }} / {{ nextAffectionExp }}
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
                <img src="../../assets/image/wish.png" alt="wish" />
              </div>
              <div class="wish-detail-text">
                <div class="wish-name">{{ checkWishInfo?.name }}</div>
                <div class="wish-deadline">
                  截止: {{ formatTime(checkWishInfo?.endTime) }}
                </div>
              </div>
            </div>
          </div>

          <div class="progress-section">
            <div class="progress-title">完成进度</div>

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
                    <img :src="progress.src" class="requirement-icon" />
                    <span class="requirement-name">{{ progress.name }}</span>
                    <div class="requirement-status">
                      <img
                        v-if="progress.status === 'finished'"
                        src="../../assets/image/right.png"
                        class="status-icon"
                      />
                      <img
                        v-else
                        src="../../assets/image/wrong.png"
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
                    <img :src="progress.src" class="requirement-icon" />
                    <span class="requirement-name">
                      {{ progress.name }}
                      <span v-if="progress.type === 'item'" class="item-count">
                        ({{ progress.userCount }} / {{ progress.count }})
                      </span>
                    </span>
                    <div class="requirement-status">
                      <img
                        v-if="progress.status === 'finished'"
                        src="../../assets/image/right.png"
                        class="status-icon"
                      />
                      <img
                        v-else
                        src="../../assets/image/wrong.png"
                        class="status-icon"
                      />
                    </div>
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
import { ref } from "vue";
import WishItem from "../components/wish/WishItem.vue";
import { useShow } from "../hooks/useShow";
import { usePlayer } from "../hooks/usePlayer";
import { PetMate } from "../types/petmate";
import { WishRequirement } from "../types/common";
import { formatTime } from "../utils/time";

const { getPetmateCompletedWishesNum, getPetmateOneWish } = useShow();

const petmateCompletedWishesNum = ref<number>(0);
const { playerData } = usePlayer();

const currentPetmateID = ref<number>(0);
const petmate: PetMate = playerData.value?.petmates[
  currentPetmateID.value
] as PetMate;

onMounted(async () => {
  petmateCompletedWishesNum.value =
    (await getPetmateCompletedWishesNum(currentPetmateID.value)) ?? -1;
});

// 好感度相关
const petmateName = petmate?.name ?? "Dass";
const affectionLevel = ref(petmate?.attrs.affection_level ?? -1);
const currentAffectionExp = ref(petmate?.attrs.affection_exp ?? -1);
const nextAffectionExp = ref(petmate?.attrs.affection_next_exp ?? -1);
const progressWishNum = ref(
  petmate?.wishes.filter((wish) => wish.status === "doing").length ?? -1
);

// 计算好感度进度百分比
const affectionProgressPercent = computed(() => {
  if (nextAffectionExp.value <= 0) return 0;
  return Math.round((currentAffectionExp.value / nextAffectionExp.value) * 100);
});

// 心愿列表
const wishList = ref(petmate?.wishes ?? []);

// 按下心愿后，显示心愿的详细信息
const check = ref(false);
const checkWishID = ref<string | null>(null);
const checkWishInfo = ref();
const checkWish = async (wishID: string) => {
  checkWishID.value = wishID;
  check.value = true;
  const wish = await getPetmateOneWish(currentPetmateID.value, wishID);
  checkWishInfo.value = wish;

  // 更新要求列表
  updateRequirements();
};

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

// 心愿的物品、活动要求和玩家目前的进度
const itemProgress = ref<WishRequirement[]>([]);
const activityProgress = ref<WishRequirement[]>([]);
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
      font-size: 18px;
      font-weight: 600;
      color: $font-light;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid rgba(224, 166, 166, 0.3);
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
</style>