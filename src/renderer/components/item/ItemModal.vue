<template>
  <div>
    <n-modal v-model:show="isModalShow">
      <div class="item-modal-wrapper">
        <!-- 商品特写 -->
        <div class="item-modal-preview">
          <n-image
            width="100"
            height="100"
            :src="itemImageURL ?? ''"
            preview-disabled
            class="item-preview-image"
          />
          <div class="item-preview-name">{{ itemName }}</div>
        </div>
        <!-- 描述和效果 -->
        <div class="item-modal-info">
          <div class="item-modal-description">{{ itemDescription }}</div>
          <div class="item-modal-effects">
            <div class="effects-label">{{ effectsTip }}</div>
            <div class="effects-tags">
              <span v-for="effect in itemEffectList" :key="effect">{{ effect }}</span>
            </div>
          </div>
        </div>
        <!-- 数量选择 -->
        <div class="item-modal-title">{{ displayTitle }}</div>
        <div class="item-modal-content">
          <div v-if="!isFashionItem" class="counter">
            <button class="counter-sub-btn" @click="subCount">-</button>
            <input
              type="number"
              class="counter-input"
              v-model="count"
              @input="checkCount"
            />
            <button class="counter-add-btn" @click="addCount">+</button>
          </div>
          <div class="confirm">
            <button class="confirm-btn" @click="confirm">{{ t("common.confirm") }}</button>
            <button class="cancel-btn" @click="cancel">{{ t("common.cancel") }}</button>
          </div>
        </div>
      </div>
    </n-modal>
    <n-modal v-model:show="showSupplyBoxRewardModal" :mask-closable="false">
      <div class="supply-box-reward-wrapper">
          <span class="supply-box-reward-kicker">{{ rewardModalKicker }}</span>
        <h2>{{ rewardModalTitle }}</h2>
        <p class="supply-box-reward-description">{{ rewardModalDescription }}</p>
        <div class="supply-box-reward-list">
          <div
            v-for="reward in supplyBoxRewards"
            :key="reward.id"
            class="supply-box-reward-item"
          >
            <div
              class="supply-box-reward-image"
              :class="{ 'supply-box-reward-image-cash': reward.type === 'cash' }"
            >
              <span v-if="reward.type === 'cash'" aria-hidden="true">🪙</span>
              <img
                v-else
                :src="rewardImageURL(reward) ?? ''"
                :alt="reward.name"
              />
            </div>
            <span class="supply-box-reward-name">{{ rewardName(reward) }}</span>
            <strong class="supply-box-reward-count">{{ rewardAmount(reward) }}</strong>
          </div>
        </div>
        <button type="button" class="supply-box-reward-close" @click="closeSupplyBoxRewards">
          {{ rewardModalClose }}
        </button>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, defineProps, ref, PropType, watch } from "vue";
import { useI18n } from "vue-i18n";
import { usePlayer } from "../../hooks/usePlayer";
import { useShow } from "../../hooks/useShow";
import { Item, Buff, getItemTypes } from "../../types/common";
import { openMessageModal } from "../../hooks/useInteract";
import { canUseItemFromPackage, convertItemEffect } from "../../utils/item";
import { getBuffName, getItemDescription, getItemName } from "../../utils/content";
import type { SchoolHandbookRewardGrant } from "@main/types/school-handbook";

const { buyItem, consumeItem } = usePlayer();
const { getImageURL } = useShow();
const { t } = useI18n();

const props = defineProps({
  show: { type: Boolean, required: true },
  title: { type: String, required: true },
  type: { type: String, required: true },
  item: { type: Object as PropType<Item>, required: true },
  hasCount: { type: Number, required: false, default: 0 },
  petmateId: { type: Number, required: false, default: 0 },
});

const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
}>();

const isModalShow = computed({
  get: () => props.show,
  set: (val) => emit("update:show", val),
});

const itemImageURL = computed(() => {
  if (!props.item?.url) return null;
  return getImageURL("item", props.item.url);
});

const isFashionItem = computed(() =>
  getItemTypes(props.item.type).includes("fashion")
);

const isSchoolHandbookLimitedItem = computed(
  () => props.item.url === "others/school-handbook-limited-item.png"
);
const rewardModalKicker = computed(() =>
  t(isSchoolHandbookLimitedItem.value ? "item.limitedItemRewardKicker" : "item.supplyBoxRewardKicker")
);
const rewardModalTitle = computed(() =>
  t(isSchoolHandbookLimitedItem.value ? "item.limitedItemRewardTitle" : "item.supplyBoxRewardTitle")
);
const rewardModalDescription = computed(() =>
  t(isSchoolHandbookLimitedItem.value ? "item.limitedItemRewardDescription" : "item.supplyBoxRewardDescription")
);
const rewardModalClose = computed(() =>
  t(isSchoolHandbookLimitedItem.value ? "item.limitedItemRewardClose" : "item.supplyBoxRewardClose")
);

const displayTitle = computed(() =>
  isFashionItem.value ? t("item.buyFashion") : props.title
);
const itemName = computed(() => getItemName(props.item));
const itemDescription = computed(() => getItemDescription(props.item));

const effectsTip = computed(() => {
  if (isFashionItem.value) return t("item.purchasedGain");
  return canUseItemFromPackage(props.item) ? t("item.usedGain") : t("item.purpose");
});

const itemEffectList = computed(() => {
  if (isFashionItem.value) return [t("item.permanentUnlock")];
  if (!props.item?.effect) return [];
  if (!canUseItemFromPackage(props.item)) return [t("item.cannotUse")];
  const effectList: string[] = [];
  const effect = props.item.effect;
  for (const key in effect) {
    if (effect[key] && typeof effect[key] === "number") {
      effectList.push(
        effect[key] > 0
          ? `${convertItemEffect(key)} +${effect[key]}`
          : `${convertItemEffect(key)} ${effect[key]}`
      );
      continue;
    }
    if (effect[key] && typeof effect[key] === "object" && "name" in effect[key]) {
      const buff = effect[key] as Buff;
      effectList.push(`${getBuffName(buff)} buff`);
    }
  }
  return effectList.length ? effectList : [t("item.noEffect")];
});

const count = ref(1);
const showSupplyBoxRewardModal = ref(false);
const supplyBoxRewards = ref<SchoolHandbookRewardGrant[]>([]);
watch(
  () => props.show,
  (newValue) => {
    if (newValue) {
      count.value = 1;
    }
  }
);
let minCount = 1;
let maxCount = 999;
const subCount = () => {
  if (count.value > minCount) {
    count.value--;
  }
};
const addCount = () => {
  maxCount = props.type === "use" ? props.hasCount : 999;
  if (count.value < maxCount) {
    count.value++;
  }
};
const checkCount = () => {
  maxCount = props.type === "use" ? props.hasCount : 999;
  if (count.value < 0) {
    count.value = minCount;
  } else if (count.value > maxCount) {
    count.value = maxCount;
  }
};

const confirm = async () => {
  let success = false;
  let title = "";
  if (count.value == 0) {
    title =
      props.type === "use" ? t("item.useCountZero") : t("item.buyCountZero");
    count.value = 1;
    openMessageModal("fail", title);
    return;
  }
  if (props.type === "buy") {
    success = await buyItem(props.item.id, count.value);
    title = success ? t("item.buySuccess") : t("item.buyFailed");
  } else if (props.type === "use") {
    if (!canUseItemFromPackage(props.item)) {
      isModalShow.value = false;
      openMessageModal("fail", t("item.cannotUse"));
      return;
    }
    const consumeResult = await consumeItem(props.item.id, count.value, props.petmateId);
    success = consumeResult !== null;
    title = success ? t("item.useSuccess") : t("item.useFailed");
    if (success && consumeResult?.rewards?.length) {
      supplyBoxRewards.value = consumeResult.rewards;
      isModalShow.value = false;
      showSupplyBoxRewardModal.value = true;
      return;
    }
  }
  isModalShow.value = false;
  success
    ? openMessageModal("success", title)
    : openMessageModal("fail", title);
};

const rewardImageURL = (reward: SchoolHandbookRewardGrant) => {
  return reward.type === "item" ? getImageURL("item", reward.itemUrl) : null;
};

const rewardName = (reward: SchoolHandbookRewardGrant) => {
  return reward.type === "cash" ? t("item.supplyBoxCash") : reward.name;
};

const rewardAmount = (reward: SchoolHandbookRewardGrant) => {
  return reward.type === "cash" ? `+${reward.amount}` : `× ${reward.count}`;
};

const closeSupplyBoxRewards = () => {
  showSupplyBoxRewardModal.value = false;
  supplyBoxRewards.value = [];
};

const cancel = () => {
  isModalShow.value = false;
};
</script>

<style scoped lang="scss">
.item-modal-wrapper {
  width: 360px;
  background: $content-bgc;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 24px;
  border: 1px solid rgba($color-pink-100, 0.3);
  row-gap: 14px;

  .item-modal-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    row-gap: 8px;

    .item-preview-image {
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba($color-pink-100, 0.24);
    }

    .item-preview-name {
      font-size: 20px;
      font-weight: bold;
      color: $font-light;
      letter-spacing: 1px;
    }
  }

  .item-modal-info {
    width: 100%;
    display: flex;
    flex-direction: column;
    row-gap: 10px;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba($color-pink-100, 0.15);

    .item-modal-description {
      font-size: 13px;
      color: #e0a6a6;
      line-height: 1.6;
      text-align: center;
    }

    .item-modal-effects {
      display: flex;
      flex-direction: column;
      row-gap: 6px;

      .effects-label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
      }

      .effects-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;

        span {
          font-size: 12px;
          font-weight: 600;
          color: $color-pink-100;
          padding: 3px 10px;
          border-radius: 4px;
          border: 1px solid rgba($color-pink-100, 0.35);
          background: rgba($color-pink-100, 0.08);
        }
      }
    }
  }

  .item-modal-title {
    font-size: 14px;
    font-weight: 500;
    color: $font-light;
    letter-spacing: 1px;
    opacity: 0.85;
  }

  .item-modal-content {
    width: 100%;

    .counter {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      column-gap: 12px;
      margin-bottom: 16px;

      .counter-input {
        width: 100px;
        height: 32px;
        border: 1px solid rgba($color-pink-100, 0.4);
        border-radius: 6px;
        background: rgba($system-bgc, 0.62);
        color: $font-light;
        font-size: 16px;
        font-weight: 500;
        text-align: center;
        transition: all 0.3s ease;

        &:focus {
          outline: none;
          border-color: $btn-active-grad-end;
          box-shadow: 0 0 8px rgba(253, 122, 168, 0.3);
        }

        &::-webkit-outer-spin-button,
        &::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      }

      .counter-sub-btn,
      .counter-add-btn {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(
          135deg,
          $btn-grad-start 0%,
          $btn-grad-end 100%
        );
        border: 1px solid rgba($color-pink-100, 0.3);
        color: $color-pink-100;
        font-size: 18px;
        font-weight: bold;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba($color-pink-100, 0.18);

        &:hover {
          background: linear-gradient(
            135deg,
            $btn-active-grad-start 0%,
            $btn-active-grad-end 100%
          );
          color: $color-white;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 118, 117, 0.4);
        }

        &:active {
          transform: translateY(0);
        }
      }
    }

    .confirm {
      width: 100%;
      display: flex;
      justify-content: center;
      column-gap: 16px;

      .confirm-btn,
      .cancel-btn {
        width: 90px;
        height: 32px;
        border: 1px solid rgba($color-pink-100, 0.3);
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.3s ease;
      }

      .confirm-btn {
        background: linear-gradient(
          135deg,
          $btn-active-grad-start 0%,
          $btn-active-grad-end 100%
        );
        color: $color-white;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(255, 118, 117, 0.5);
        }
      }

      .cancel-btn {
        background: rgba($content-bgc, 0.72);
        color: $font-muted-light;

        &:hover {
          background: rgba($color-pink-100, 0.16);
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }
      }

      .confirm-btn:active,
      .cancel-btn:active {
        transform: translateY(0);
      }
    }
  }
}

.supply-box-reward-wrapper {
  width: min(380px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  padding: 24px 20px 20px;
  border: 1px solid rgba($color-pink-100, 0.68);
  border-radius: 16px;
  color: $font-light;
  background:
    radial-gradient(circle at 50% 0%, rgba($color-pink-100, 0.2), transparent 42%),
    linear-gradient(160deg, rgba($content-bgc, 0.99), rgba($system-bgc, 0.99));
  box-shadow: 0 18px 55px rgba(0, 0, 0, 0.44), 0 0 34px rgba($color-pink-100, 0.2);
  text-align: center;
}

.supply-box-reward-kicker {
  display: inline-flex;
  padding: 3px 10px;
  border: 1px solid rgba($color-pink-100, 0.46);
  border-radius: 999px;
  color: $font-muted-light;
  background: rgba($color-pink-100, 0.1);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.supply-box-reward-wrapper h2 {
  margin: 9px 0 0;
  color: $color-pink-100;
  font-size: 24px;
  letter-spacing: 0.08em;
}

.supply-box-reward-description {
  margin: 8px auto 16px;
  color: $font-muted-light;
  font-size: 12px;
  line-height: 1.5;
}

.supply-box-reward-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.supply-box-reward-item {
  display: flex;
  min-width: 0;
  min-height: 126px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 8px;
  border: 1px solid rgba($color-pink-100, 0.24);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  animation: supply-box-reward-float 2400ms ease-in-out infinite;

  &:nth-child(2n) {
    animation-delay: 180ms;
  }

  &:nth-child(3n) {
    animation-delay: 320ms;
  }
}

.supply-box-reward-image {
  display: grid;
  width: 68px;
  height: 68px;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgba($color-pink-100, 0.2);
  border-radius: 12px;
  background: rgba($system-bgc, 0.42);

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.supply-box-reward-image-cash {
  border-color: rgba($color-pink-100, 0.54);
  background: radial-gradient(circle, rgba($color-pink-100, 0.34), rgba($system-bgc, 0.5));
  font-size: 34px;
  filter: drop-shadow(0 5px 8px rgba($color-pink-100, 0.28));
}

.supply-box-reward-name {
  max-width: 100%;
  margin-top: 7px;
  overflow: hidden;
  color: $font-light;
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.supply-box-reward-count {
  margin-top: 4px;
  color: $color-pink-100;
  font-size: 13px;
}

.supply-box-reward-close {
  min-width: 132px;
  height: 36px;
  margin-top: 18px;
  padding: 0 20px;
  border: 1px solid rgba($color-pink-100, 0.72);
  border-radius: 9px;
  color: $font-light;
  background: linear-gradient(135deg, rgba($color-pink-100, 0.92), rgba($color-pink-100, 0.58));
  box-shadow: 0 7px 18px rgba($color-pink-100, 0.18);
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  transition: transform 160ms ease, box-shadow 160ms ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 9px 22px rgba($color-pink-100, 0.28);
  }
}

@keyframes supply-box-reward-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}
</style>
