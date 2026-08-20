<template>
  <div>
    <n-popover
      trigger="manual"
      :show-arrow="false"
      :x="popoverX"
      :y="popoverY"
      :show="show"
      raw
      ><div
        :style="{
          width: popoverWidth + 'px',
        }"
      >
        <div
          class="popover-wrapper"
        >
          <div class="popover-title">
            <span>{{ buffName }}</span>
          </div>
          <div class="popover-content">
            <div class="popover-description">
              <span>{{ buffDescription }}</span>
            </div>
            <div>
              <div class="popover-remaining-time">{{ remainingTime }}</div>
            </div>
            <div>
              <div class="popover-tip">{{ t("buff.effect") }}</div>
              <div class="popover-effect">
                <span
                  v-for="(value, key) in filteredEffect"
                  :key="'buff-effect-' + key"
                  >{{ convertBuffText(String(key), value) }}</span
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </n-popover>
  </div>
</template>
    
    <script setup lang="ts">
import { defineProps } from "vue";
import { useI18n } from "vue-i18n";
import { convertBuffText } from "../../utils/buff";
import { getBuffDescription, getBuffName } from "../../utils/content";
import { ActiveBuff } from "../../types/common";

const props = defineProps({
  // 悬浮矩形框的坐标，经过实践，popoverX和popoverY 表示'底部中心' 距离视口边缘的坐标
  popoverX: { type: Number, required: true },
  popoverY: { type: Number, required: true },
  show: { type: Boolean, required: true }, // 是否显示
  popoverWidth: { type: Number, default: 180 }, // 悬浮矩形框的宽度
  activeBuff: { type: Object as PropType<ActiveBuff>, required: true }, // buff
  isLocked: { type: Boolean, default: false }, // 是否锁定
});
const { t } = useI18n();
const buffName = computed(() => getBuffName(props.activeBuff.buff));
const buffDescription = computed(() => getBuffDescription(props.activeBuff.buff));
// 过滤掉默认倍率
const filteredEffect = computed(() => {
  let result = {};
  for (const [key, value] of Object.entries(props.activeBuff.buff.effect)) {
    if (value !== 1) {
      (result as any)[key] = value;
    }
  }
  return result;
});

// 定义当前时间，用于响应式更新剩余时间，否则无法触发计算
const nowTime = ref(Date.now());
setInterval(() => {
  nowTime.value = Date.now();
}, 1000);

const remainingTime = computed(() => {
  // 单位秒
  return t("buff.remaining", {
    seconds: Math.floor((props.activeBuff.endTime.getTime() - nowTime.value) / 1000),
  });
});
</script>
    
    <style scoped lang="scss">
.popover-wrapper {
  width: 100%;
  height: 100%;
  border-radius: 3px;
  background: #55484b;
  border: 1px solid #f39c12;
  box-shadow: 0 12px 35px rgba(243, 156, 18, 0.4),
    0 0 20px rgba(243, 156, 18, 0.2), inset 0 1px 3px rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 12px;
  position: relative;

  .popover-title {
    width: 100%;
    font-weight: bold;
    color: #f39c12;
    text-align: center;
    padding: 4px 0;
    background: linear-gradient(
      135deg,
      rgba(243, 156, 18, 0.1),
      rgba(230, 126, 34, 0.1)
    );
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    font-size: 13px;
  }
  .popover-content {
    width: 100%;
    flex: 1;
    padding: 8px 6px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    row-gap: 8px;

    .popover-description,
    .popover-tip,
    .popover-remaining-time {
      color: #ecf0f1;
      font-size: 11px;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
      opacity: 0.9;
      padding-left: 5px;
    }

    .popover-description {
      color: #e0a6a6;
    }

    .popover-tip {
      margin-bottom: 8px;
    }

    .popover-consume,
    .popover-effect,
    .popover-requirement {
      display: flex;
      flex-direction: row;
      // align-items: flex-start;
      justify-content: flex-start;
      flex-wrap: wrap;
      gap: 4px;

      span {
        font-weight: 600;
        font-size: 11px;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
        padding: 2px 6px;
        border-radius: 4px;
        min-width: 70px;
        text-align: center;
        transition: all 0.2s ease;
      }
    }
    .popover-requirement {
      span {
        color: #04bbbb;
        border: 1px solid rgba(39, 131, 174, 0.3);
        &:hover {
          border-color: rgba(39, 131, 174, 0.5);
        }
      }
    }
    .popover-consume {
      span {
        color: #e67676;
        border: 1px solid rgba(236, 77, 56, 0.3);
        &:hover {
          border-color: rgba(236, 77, 56, 0.5);
        }
      }
    }
    .popover-effect {
      span {
        color: #27ae60;
        border: 1px solid rgba(39, 174, 96, 0.3);
        &:hover {
          border-color: rgba(39, 174, 96, 0.5);
        }
      }
    }
  }
}
</style>
