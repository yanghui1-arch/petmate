import { ref, readonly } from 'vue'

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

export const isMessageModalShow = readonly(_isMessageModalShow)
export const messageModalType = readonly(_messageModalType)
export const messageModalTitle = readonly(_messageModalTitle)






