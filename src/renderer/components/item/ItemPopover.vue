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
            <span v-if="isLocked">{{ itemlockedName }}</span>
            <span v-else>{{ item.name }}</span>
          </div>
          <div class="popover-content">
            <div class="popover-description">
              <span v-if="isLocked">???</span>
              <span v-else>{{ item.description }}</span>
            </div>
            <div>
              <div class="popover-tip">{{ itemEffectTip }}</div>
              <div class="popover-effect">
                <template v-if="isLocked">
                  <span>???</span>
                </template>
                <template v-else>
                  <span v-for="effect in itemEffectList" :key="effect">
                    {{ effect }}
                  </span>
                </template>
              </div>
            </div>
            <div v-if="isRequirementShow">
              <div class="popover-tip">要求</div>
              <div class="popover-requirement">
                <span
                  v-for="(value, key) in item.requirement"
                  :key="'requirement-' + key"
                  >{{ convertRequirementText(String(key)) }} {{ value }}</span
                >
              </div>
            </div>
            <div v-if="isSourceShow">
              <div class="popover-tip">获得方式</div>
              <div class="popover-source">
                <span>黑市</span>
                <span>活动</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </n-popover>
  </div>
</template>

<script setup lang="ts">
import { defineProps, PropType } from "vue";
import { canUseItemFromPackage, convertItemEffect } from "../../utils/item";
import { Item, Buff } from "../../types/common";
import { convertRequirementText } from "../../utils/check";

const props = defineProps({
  // 悬浮矩形框的坐标，经过实践，popoverX和popoverY 表示'底部中心' 距离视口边缘的坐标
  popoverX: { type: Number, required: true },
  popoverY: { type: Number, required: true },
  show: { type: Boolean, required: true }, // 是否显示
  popoverWidth: { type: Number, default: 180 }, // 悬浮矩形框的宽度
  isRequirementShow: { type: Boolean, default: true }, // 是否显示要求
  isSourceShow: { type: Boolean, default: false }, // 是否显示获得方式
  item: { type: Object as PropType<Item>, required: true }, // 物品
  isLocked: { type: Boolean, default: false }, // 是否锁定
});

const itemlockedName = computed(() => {
  const name = props.item.name;
  if(!name) {
    return "??"
  }
  if(name.length === 2) {
    return `${name[0]}?`
  }
  // 保留第一个字和最后一个字
  return `${name[0]} ? ${name[name.length - 1]}`
});

const itemEffectTip = computed(() => {
  return canUseItemFromPackage(props.item) ? "使用后获得以下效果" : "用途";
});

const itemEffectList = computed(() => {
  if (!canUseItemFromPackage(props.item)) {
    return ["不能在背包中直接使用"];
  }
  const effectList: string[] = [];
  const effect = props.item.effect;
  for(const key in effect) {
    // 数值型属性
    if(effect[key] && typeof effect[key] === 'number') {
      effectList.push(effect[key] > 0 ? `${convertItemEffect(String(key))} + ${effect[key]}` : `${convertItemEffect(String(key))} - ${-effect[key]}`);
      continue;
    }
    // buff类型
    if(effect[key] && typeof effect[key] === 'object' && 'name' in effect[key]) {
      const buff = effect[key] as Buff;
      effectList.push(`${buff.name} buff`);
      continue;
    }
  }
  return effectList.length ? effectList : ["无"];
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
    .popover-tip {
      color: #ecf0f1;
      font-size: 11px;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
      opacity: 0.9;
    }

    .popover-description {
      color: #e0a6a6;
      padding-left: 5px;
    }

    .popover-tip {
      margin-bottom: 8px;
      padding-left: 5px;
    }
    .popover-effect,
    .popover-requirement,
    .popover-source {
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
    .popover-effect {
      span {
        color: #27ae60;
        border: 1px solid rgba(39, 174, 96, 0.3);
        &:hover {
          border-color: rgba(39, 174, 96, 0.5);
        }
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
    .popover-source {
      span {
        color: #04bbbb;
        border: 1px solid rgba(39, 131, 174, 0.3);
        &:hover {
          border-color: rgba(39, 131, 174, 0.5);
        }
      }
    }
  }
}
</style>
