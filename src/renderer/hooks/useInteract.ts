import { ref, readonly } from 'vue'
import { Item, ActiveBuff, ActivityInfo } from '../types/common'

// 系统消息模态框，用于app显示系统交互信息
type MessageModalType = 'success' | 'fail'
// 全局状态 - 单个实例共享整个应用
const _isMessageModalShow = ref(false)
const _messageModalType = ref<MessageModalType>("fail")
const _messageModalTitle = ref<string>("出了点小差错~")

export function openMessageModal(type: MessageModalType, title: string) {
    _isMessageModalShow.value = true
    _messageModalType.value = type
    _messageModalTitle.value = title
}

export function closeMessageModal() {
    _isMessageModalShow.value = false
}

// 悬浮框信息相关
const popoverX = ref(0);
const popoverY = ref(0);
const popoverWidth = ref(180);

// 悬浮框显示时，鼠标离开下面的范围，则隐藏悬浮框
const leftTopX = ref(0);
const leftTopY = ref(0);
const rightBottomX = ref(0);
const rightBottomY = ref(0);

// 业务信息相关
const popoverItem = ref<Item | null>(null);
const isItemEnter = ref(false);

const popoverBuff = ref<ActiveBuff | null>(null);
const isBuffEnter = ref(false);

const popoverActItem = ref<ActivityInfo | null>(null);
const isActItemEnter = ref(false);

/**
 * 鼠标移动监听，用于判断鼠标是否离开悬浮框范围
 * @param event 鼠标事件
 */
const onMouseMoveForPopover = (event: MouseEvent) => {
  const mouseX = event.clientX;
  const mouseY = event.clientY;
  if (
    mouseX < leftTopX.value ||
    mouseX > rightBottomX.value ||
    mouseY < leftTopY.value ||
    mouseY > rightBottomY.value
  ) {
    if (isItemEnter.value) {
      isItemEnter.value = false;
    }
    if (isBuffEnter.value) {
      isBuffEnter.value = false;
    }
    // 用完就移除
    window.removeEventListener("mousemove", onMouseMoveForPopover);
  }
};

export function listenPopover(rect: DOMRect) {
  // 记录rect的左上角坐标和右下角坐标
  leftTopX.value = rect.x;
  leftTopY.value = rect.y;
  rightBottomX.value = rect.x + rect.width;
  rightBottomY.value = rect.y + rect.height;

  // 目前有一些bug，不知道为什么，物体的范围向右偏移了2px，所以这里减去2px，以后再排查
  leftTopX.value -= 2;
  rightBottomX.value -= 2;

  // 开启一个鼠标移动监听，开启前也做一遍移除，避免特殊情况下造成重复监听，耗费资源
  window.removeEventListener("mousemove", onMouseMoveForPopover);
  window.addEventListener("mousemove", onMouseMoveForPopover);
}

// 背包物品悬浮框
export function showItemPopover(event: MouseEvent, item: Item) {
  // itemElement是item的dom元素，rect是item的矩形框信息，包含坐标，宽高
    const itemElement = event.currentTarget as HTMLElement;
    const rect = itemElement?.getBoundingClientRect();
    // 经过实践，popoverX和popoverY暂时确定是悬浮框矩形 '底部中心' 的坐标
    popoverX.value = rect.x + rect.width / 2 + popoverWidth.value / 2;
    popoverY.value = rect.y + rect.height / 2;
    isItemEnter.value = true;
    popoverItem.value = item;
    listenPopover(rect);
}

// buff悬浮框
export function showBuffPopover(
  event: MouseEvent,
  buff: ActiveBuff,
  index: number
) {
  const buffElement = event.currentTarget as HTMLElement;
  const rect = buffElement?.getBoundingClientRect();
  // 前五个buff，悬浮框在右边；后五个buff，悬浮框在左边，防止buff被遮挡
  if (index < 5) {
    popoverX.value = rect.x + rect.width / 2 + popoverWidth.value / 2;
  } else {
    popoverX.value = rect.x + rect.width / 2 - popoverWidth.value / 2;
  }
  popoverY.value = rect.y + rect.height / 2;
  isBuffEnter.value = true;
  popoverBuff.value = buff;
  listenPopover(rect);
};

export function showActItemPopover(event: MouseEvent, item: ActivityInfo) {
    const itemElement = event.currentTarget as HTMLElement;
    const rect = itemElement?.getBoundingClientRect();
    popoverX.value = rect.x + rect.width / 2 + popoverWidth.value / 2;
    popoverY.value = rect.y + rect.height / 2;
    isActItemEnter.value = true;
    popoverActItem.value = item;
    listenPopover(rect);
}


export const isMessageModalShow = readonly(_isMessageModalShow)
export const messageModalType = readonly(_messageModalType)
export const messageModalTitle = readonly(_messageModalTitle)
export {
    popoverX,
    popoverY,
    popoverWidth,
    popoverItem,
    isItemEnter,
    popoverBuff,
    isBuffEnter,
    popoverActItem,
    isActItemEnter,
}
