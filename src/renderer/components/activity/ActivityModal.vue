<template>
  <div>
    <n-modal :show="isModalShow">
      <div class="message-modal-wrapper">
        <div class="message-modal-header">
          <div class="message-modal-title">
            <span v-if="type === 'start'"
              >{{ t("activity.modal.startTitle", { activity: activityName }) }}</span
            >
            <span v-if="type === 'cancel'"
              >{{ t("activity.modal.cancelTitle", { activity: activityName }) }}</span
            >
          </div>
          <div class="message-modal-tip">
            <span v-if="type === 'start'"
              >{{ t("activity.modal.duration", { duration: computeActivityTime(actItem.consume.spendingTime) }) }}</span
            >
            <span v-if="type === 'cancel'">{{ t("activity.modal.cancelTip") }}</span>
          </div>
        </div>

        <div class="message-modal-content">
          <div class="confirm">
            <button class="confirm-btn" @click="confirm">{{ t("common.confirm") }}</button>
            <button class="cancel-btn" @click="cancel">{{ t("common.cancel") }}</button>
          </div>
        </div>
      </div>
    </n-modal>
  </div>
</template>
    
    <script setup lang="ts">
import { defineProps } from "vue";
import { useI18n } from "vue-i18n";
import { usePlayer } from "../../hooks/usePlayer";
import { ActivityInfo } from "../../types/common";
import { computeActivityTime } from "../../utils/activity";
import { getActivityName } from "../../utils/content";
import { openMessageModal } from "../../hooks/useInteract";
const { startActivity, cancelActivity } = usePlayer();
const { t } = useI18n();

const props = defineProps({
  show: { type: Boolean, required: true }, // 是否显示
  actItem: { type: Object as PropType<ActivityInfo>, required: true }, // 活动信息
  petmateId: { type: Number, required: true }, // petmate的id
  type: { type: String, required: true }, // 弹出框类型：开始、取消
});

const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
}>();

const isModalShow = computed({
  get: () => props.show,
  set: (val) => emit("update:show", val),
});

const activityName = computed(() => getActivityName(props.actItem));

// 按钮相关
const confirm = async () => {
  if (props.type === "start") {
    const success = await startActivity(props.petmateId, props.actItem.id);
    if (success) {
      isModalShow.value = false;
      openMessageModal("success", t("activity.messages.startSuccess"));
    } else {
      openMessageModal("fail", t("activity.messages.startFailed"));
    }
  }
  if (props.type === "cancel") {
    const success = await cancelActivity(props.petmateId);
    if (success) {
      isModalShow.value = false;
      openMessageModal("success", t("activity.messages.cancelSuccess"));
    }
  }
};

const cancel = () => {
  isModalShow.value = false;
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
    flex-direction: column;
    align-items: center;
    justify-content: center;
    row-gap: 10px;
    margin-bottom: 20px;
    .message-modal-title,
    .message-modal-tip {
      font-size: 16px;
      color: #e0a6a6;
      text-align: center;
      letter-spacing: 1px;
    }
    .message-modal-title {
      font-weight: 500;
    }
    .message-modal-tip {
      font-size: 12px;
      color: $font-light;
    }
  }

  .message-modal-content {
    width: 100%;
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
