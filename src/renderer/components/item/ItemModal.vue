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
          <div class="item-preview-name">{{ props.item?.name }}</div>
        </div>
        <!-- 描述和效果 -->
        <div class="item-modal-info">
          <div class="item-modal-description">{{ props.item?.description }}</div>
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
            <button class="confirm-btn" @click="confirm">确定</button>
            <button class="cancel-btn" @click="cancel">取消</button>
          </div>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { defineProps, ref, PropType, watch } from "vue";
import { usePlayer } from "../../hooks/usePlayer";
import { useShow } from "../../hooks/useShow";
import { Item, Buff, getItemTypes } from "../../types/common";
import { openMessageModal } from "../../hooks/useInteract";
import { canUseItemFromPackage, convertItemEffect } from "../../utils/item";

const { buyItem, consumeItem } = usePlayer();
const { getImageURL } = useShow();

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

const displayTitle = computed(() =>
  isFashionItem.value ? "确认购买该时装" : props.title
);

const effectsTip = computed(() => {
  if (isFashionItem.value) return "购买后获得";
  return canUseItemFromPackage(props.item) ? "使用后获得以下效果" : "用途";
});

const itemEffectList = computed(() => {
  if (isFashionItem.value) return ["永久解锁，可前往衣橱实装"];
  if (!props.item?.effect) return [];
  if (!canUseItemFromPackage(props.item)) return ["不能在背包中直接使用"];
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
      effectList.push(`${buff.name} buff`);
    }
  }
  return effectList.length ? effectList : ["无"];
});

const count = ref(1);
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
      props.type === "use" ? "使用物品数量不能为0" : "购买物品数量不能为0";
    count.value = 1;
    openMessageModal("fail", title);
    return;
  }
  if (props.type === "buy") {
    success = await buyItem(props.item.id, count.value);
    title = success ? "购买成功" : "购买失败";
  } else if (props.type === "use") {
    if (!canUseItemFromPackage(props.item)) {
      isModalShow.value = false;
      openMessageModal("fail", "该物品不能在背包中直接使用");
      return;
    }
    success = await consumeItem(props.item.id, count.value, props.petmateId);
    title = success ? "使用成功" : "使用失败";
  }
  isModalShow.value = false;
  success
    ? openMessageModal("success", title)
    : openMessageModal("fail", title);
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
  border: 1px solid rgba(253, 203, 110, 0.3);
  row-gap: 14px;

  .item-modal-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    row-gap: 8px;

    .item-preview-image {
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(253, 203, 110, 0.3);
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
    border: 1px solid rgba(253, 203, 110, 0.15);

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
          color: #27ae60;
          padding: 3px 10px;
          border-radius: 4px;
          border: 1px solid rgba(39, 174, 96, 0.35);
          background: rgba(39, 174, 96, 0.08);
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
        border: 1px solid rgba(253, 203, 110, 0.4);
        border-radius: 6px;
        background: linear-gradient(
          135deg,
          $item-bg-start 0%,
          $item-bg-end 100%
        );
        color: $accent-brown;
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
        border: 1px solid rgba(253, 203, 110, 0.3);
        color: $accent-brown;
        font-size: 18px;
        font-weight: bold;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(253, 203, 110, 0.3);

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
        border: 1px solid rgba(253, 203, 110, 0.3);
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
        background: linear-gradient(
          135deg,
          $btn-grad-start 0%,
          $btn-grad-end 100%
        );
        color: $accent-brown;

        &:hover {
          background: linear-gradient(135deg, #e8e8e8 0%, #d4d4d4 100%);
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
</style>
