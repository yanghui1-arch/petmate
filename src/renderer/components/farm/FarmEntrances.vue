<template>
    <div class="scene-entrances">
        <button
            v-for="entry in layout.entrances"
            :key="entry.id"
            type="button"
            class="entrance-sign"
            :class="{
                highlighted: enabled && hovered === entry.id,
                direction: entry.id === 'explore',
                'cabin-lock': entry.id === 'cabin'
            }"
            :data-entrance="entry.id"
            :disabled="!enabled"
            :aria-label="`${t('farm.entrances.' + entry.id)} · ${t('farm.entranceUnavailable')}`"
            :style="{
                left: entry.x + 'px',
                top: entry.y - (entry.id === 'fishing' ? signFootOffset : 0) + 'px',
                '--sign-scale': Math.max(0.8, layout.scale)
            }"
            @pointerenter="emit('hover', $event.pointerType === 'touch' ? null : entry.id)"
            @pointerleave="emit('hover', null)"
            @focus="emit('hover', entry.id)"
            @blur="emit('hover', null)"
            @click.stop="emit('activate', entry.id)"
            @contextmenu.prevent="dismiss"
        >
            <svg class="entrance-lock" viewBox="0 0 16 18" aria-hidden="true">
                <path
                    d="M4 7V5a4 4 0 0 1 8 0v2"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                />
                <rect x="1" y="7" width="14" height="10" rx="3" fill="currentColor" />
                <circle cx="8" cy="11" r="1.4" fill="#96633e" />
            </svg>
            <span v-if="entry.id !== 'cabin'">{{ t('farm.entrances.' + entry.id) }}</span>
        </button>
        <aside
            v-if="visibleEntry"
            class="entrance-tip"
            :class="{ 'entrance-feedback': notice !== null }"
            :data-entry-tip="visibleEntry"
            :style="tipPosition"
            :role="notice ? 'status' : 'tooltip'"
            :aria-live="notice ? 'polite' : 'off'"
        >
            <strong>{{ t('farm.entrances.' + visibleEntry) }}</strong>
            <span v-if="!notice"> · {{ t('farm.entranceUnavailable') }}</span>
            <p v-else>
                {{ t('farm.entrancePreparing', { name: t('farm.entrances.' + visibleEntry) }) }}
            </p>
        </aside>
    </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { FarmEntranceId, FarmLayout } from '../../game/farmSceneModel'

const props = defineProps<{
    layout: FarmLayout
    enabled: boolean
    hovered: FarmEntranceId | null
}>()
const emit = defineEmits<{
    hover: [id: FarmEntranceId | null]
    activate: [id: FarmEntranceId]
}>()
const { t } = useI18n()
const hint = ref<FarmEntranceId | null>(null)
const notice = ref<FarmEntranceId | null>(null)
let hoverTimer: ReturnType<typeof setTimeout> | undefined
let noticeTimer: ReturnType<typeof setTimeout> | undefined
const visibleEntry = computed(() => notice.value ?? hint.value)
// From the 43px board's centre to its post's foot: 21.5 + 3 + 20 - 2px border.
const signFootOffset = computed(() => 42.5 * Math.max(0.8, props.layout.scale))
const tipPosition = computed(() => {
    const p = props.layout.entrances.find((entry) => entry.id === visibleEntry.value)
    if (!p) return {}
    const width = Math.min(notice.value ? 250 : 200, props.layout.width - 24)
    return {
        width: width + 'px',
        left: Math.max(12, Math.min(props.layout.width - width - 12, p.x - width / 2)) + 'px',
        top:
            Math.max(
                12,
                Math.min(
                    props.layout.height - 120,
                    p.y -
                        (p.id === 'fishing' ? signFootOffset.value : 0) -
                        (notice.value ? 118 : 82)
                )
            ) + 'px'
    }
})
function clearHover() {
    clearTimeout(hoverTimer)
    hoverTimer = undefined
    hint.value = null
}
function dismiss() {
    clearHover()
    clearTimeout(noticeTimer)
    noticeTimer = undefined
    notice.value = null
}
function activate(id: FarmEntranceId) {
    if (!props.enabled) return
    dismiss()
    notice.value = id
    noticeTimer = setTimeout(() => {
        notice.value = null
        noticeTimer = undefined
    }, 2000)
}
watch(
    () => props.hovered,
    (id) => {
        clearHover()
        if (!id || !props.enabled || notice.value) return
        hoverTimer = setTimeout(() => {
            hint.value = id
            hoverTimer = undefined
        }, 250)
    }
)
watch(
    () => props.enabled,
    (enabled) => {
        if (!enabled) {
            dismiss()
            emit('hover', null)
        }
    }
)
onUnmounted(dismiss)
defineExpose({ activate, dismiss })
</script>

<style scoped>
.scene-entrances {
    position: absolute;
    inset: 0;
    z-index: 2;
    pointer-events: none;
}
.entrance-sign {
    --game-cursor: var(--cursor-pointer);
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: 104px;
    height: 43px;
    padding: 5px 12px;
    border: 2px solid #8f5934;
    border-radius: 7px 10px 8px 6px;
    background: linear-gradient(#ca965b, #b57a43 48%, #b9844e 51%, #ae713c);
    box-shadow:
        inset 0 2px 0 #f1c88a,
        0 3px 0 #754828,
        0 5px 5px #374a3033;
    color: #fff1cf;
    font-family: inherit;
    font-weight: 800;
    font-size: 19px;
    letter-spacing: 1px;
    text-shadow: 0 1px 1px #734727;
    transform: translate(-50%, -50%) scale(var(--sign-scale));
    transition: filter 0.15s ease;
    pointer-events: auto;
}
.entrance-sign::before {
    content: '';
    position: absolute;
    width: 10px;
    height: 20px;
    left: calc(50% - 5px);
    top: calc(100% + 3px);
    background: linear-gradient(90deg, #a36e3d, #cd9c62 60%, #8a5933);
    border-radius: 0 0 3px 3px;
    box-shadow: 1px 2px 1px #37563433;
    pointer-events: none;
}
.entrance-sign.cabin-lock {
    min-width: 44px;
    width: 44px;
    height: 48px;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: transparent;
    box-shadow: none;
    color: #f2c35f;
    filter: drop-shadow(0 2px 2px #483222aa);
}
.entrance-sign.cabin-lock.highlighted,
.entrance-sign.cabin-lock:focus-visible {
    filter: brightness(1.15) drop-shadow(0 2px 3px #483222aa);
}
.entrance-sign.cabin-lock::before {
    display: none;
}
.entrance-sign.direction {
    border-radius: 7px 18px 18px 7px;
}
.entrance-sign.highlighted,
.entrance-sign:focus-visible {
    filter: brightness(1.15);
}
.entrance-sign:disabled {
    pointer-events: none;
}
.entrance-lock {
    width: 13px;
    height: 16px;
    flex-shrink: 0;
    opacity: 0.9;
}
.cabin-lock .entrance-lock {
    width: 30px;
    height: 36px;
    opacity: 1;
}
.cabin-lock .entrance-lock rect {
    stroke: #87572a;
    stroke-width: 1;
}
.entrance-tip {
    position: absolute;
    padding: 12px 14px;
    border: 1px solid #e0c591;
    border-radius: 15px;
    background: #fff6dfed;
    box-shadow: 0 5px 14px #354b3030;
    color: #694a30;
    font-size: 14px;
    line-height: 1.6;
    pointer-events: none;
}
.entrance-tip strong {
    font-size: 16px;
}
.entrance-tip p {
    margin: 5px 0 0;
}
@media (prefers-reduced-motion: reduce) {
    .entrance-sign {
        transition: none;
    }
}
</style>
