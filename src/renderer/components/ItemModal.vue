<template>
  <div>
    <n-modal v-model:show="isModalShow">
      <div class="item-modal-wrapper">
        <div class="item-modal-title">{{ title }}</div>
        <div class="item-modal-content">
          <!-- 计数器 -->
          <div class="counter">
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
            <button class="cancel-btn" @click="isModalShow = false">
              取消
            </button>
          </div>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { defineProps, ref, PropType } from "vue";
import { usePlayer } from "../hooks/usePlayer";
import { openMessageModal, closeMessageModal } from "../hooks/useInteract";
const { buyItem, consumeItem } = usePlayer();

const props = defineProps({
  show: { type: Boolean, required: true }, // 是否显示
  title: { type: String, required: true }, // 弹出框标题
  type: { type: String, required: true }, // 弹出框类型：使用、购买
  item: { type: Object, required: true }, // 物品
  petmateId: { type: Number, required: false, default: 0 }, // petmaetId
});

const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
  (e: "consumeItemFinished"): void;
}>();

const isModalShow = computed({
  get: () => props.show,
  set: (val) => emit("update:show", val),
});

// 计数器相关
const count = ref(1);
let minCount = 1;
let maxCount = 999;
const subCount = () => {
  if (count.value > minCount) {
    count.value--;
  }
};
const addCount = () => {
  maxCount = props.type === "use" ? props.item.count : 999;
  if (count.value < maxCount) {
    count.value++;
  }
};
// 监听输入边界值
const checkCount = () => {
  if (count.value < minCount) {
    count.value = minCount;
  }
  if (count.value > maxCount) {
    count.value = maxCount;
  }
};

// 确定按钮相关
const confirm = async () => {
  let success = false;
  let title = "";
  if (props.type === "buy") {
    success = await buyItem(props.item.id, count.value);
    title = success ? "购买成功" : "购买失败";
  } else if (props.type === "use") {
    success = await consumeItem(props.item.id, count.value, props.petmateId);
    title = success ? "使用成功" : "使用失败";
    if (success) {
      emit("consumeItemFinished");
    }
  }
  isModalShow.value = false;
  success
    ? openMessageModal("success", title)
    : openMessageModal("fail", title);
};
</script>

<style scoped lang="scss">
.item-modal-wrapper {
  width: 280px;
  height: 220px;
  background: $content-bgc;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  border: 1px solid rgba(253, 203, 110, 0.3);

  .item-modal-title {
    margin-bottom: 20px;
    font-size: 16px;
    font-weight: 500;
    color: $font-light;
    text-align: center;
    letter-spacing: 1px;
  }

  .item-modal-content {
    width: 100%;

    .counter {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      column-gap: 12px;
      margin-bottom: 20px;

      .counter-input {
        width: 100px;
        height: 30px;
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

        // 取出默认样式
        &::-webkit-outer-spin-button,
        &::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      }

      .counter-sub-btn,
      .counter-add-btn {
        width: 30px;
        height: 30px;
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
        width: 80px;
        height: 30px;
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