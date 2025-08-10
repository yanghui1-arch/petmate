<template>
  <div>
    <n-modal :show="show">
      <div class="message-modal-wrapper">
        <div class="message-modal-header">
          <n-image
            width="32"
            height="32"
            :src="type === 'success'? successIcon : failIcon"
            preview-disabled
          />
          <div class="message-modal-title">{{ title }}</div>
        </div>

        <div class="message-modal-content">
          <div class="confirm">
            <button class="confirm-btn" @click="confirm">确定</button>
          </div>
        </div>
      </div>
    </n-modal>
  </div>
</template>

  <script setup lang="ts">
import { defineProps } from "vue";
import { closeMessageModal } from "../hooks/useInteract";
import successIcon from "../assets/image/message/success.png";
import failIcon from "../assets/image/message/fail.png";

defineProps({
  show: { type: Boolean, required: true }, // 是否显示
  title: { type: String, required: true }, // 弹出框标题
  type: { type: String, required: true }, // 弹出框类型：成功、失败
});

// 确定按钮相关
const confirm = () => {
  closeMessageModal();
};
</script>

  <style scoped lang="scss">
.message-modal-wrapper {
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

  .message-modal-header {
    display: flex;
    align-items: center;
    justify-content: center;
    column-gap: 10px;
    margin-bottom: 20px;
    .message-modal-title {
      font-size: 16px;
      font-weight: 500;
      color: $font-light;
      text-align: center;
      letter-spacing: 1px;
    }
  }

  .message-modal-content {
    width: 100%;
    .confirm {
      width: 100%;
      display: flex;
      justify-content: center;
      column-gap: 16px;

      .confirm-btn {
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

      .confirm-btn:active {
        transform: translateY(0);
      }
    }
  }
}
</style>
