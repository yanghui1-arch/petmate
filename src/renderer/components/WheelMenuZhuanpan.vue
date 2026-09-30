<template>
    <div
        v-if="isOpen"
        ref="overlayRef"
        class="wheel-overlay"
        tabindex="0"
        role="dialog"
        aria-modal="true"
        :aria-label="t('wheel.title')"
        @click="closeMenu"
        @keydown="handleKeydown"
    >
        <div
            class="wheel-shell"
            :style="{ aspectRatio: `${artwork.width} / ${artwork.height}` }"
            @click.stop
        >
            <div class="wheel-art" :class="{ 'is-closing': isClosing }">
                <img class="wheel-image" :src="artwork.src" alt="" draggable="false" />

                <svg
                    class="wheel-hit-areas"
                    :viewBox="`0 0 ${artwork.width} ${artwork.height}`"
                    @click="closeMenu"
                >
                    <defs>
                        <clipPath
                            v-for="(_, index) in menuItems"
                            :id="`${selectionClipId}-${index}`"
                            :key="index"
                        >
                            <path :d="getSectorPath(index)" />
                        </clipPath>
                    </defs>
                    <g
                        v-for="(_, index) in menuItems"
                        :key="`highlight-${index}`"
                        class="wheel-highlight"
                        :class="{
                            'is-active': !languageOpen && !isClosing && activeIndex === index
                        }"
                        :style="{ transformOrigin: getSectorOrigin(index) }"
                        aria-hidden="true"
                    >
                        <image
                            :href="artwork.src"
                            :width="artwork.width"
                            :height="artwork.height"
                            :clip-path="`url(#${selectionClipId}-${index})`"
                        />
                    </g>
                    <path
                        v-for="(item, index) in menuItems"
                        :key="item.id"
                        class="wheel-hit-area"
                        :d="getSectorPath(index)"
                        :aria-label="item.title"
                        role="button"
                        :tabindex="!languageOpen && selectedIndex === index ? 0 : -1"
                        :aria-haspopup="item.id === 'language' ? 'menu' : undefined"
                        :aria-expanded="item.id === 'language' ? languageOpen : undefined"
                        @mouseenter="hoverSector(index)"
                        @mouseleave="hoveredIndex = -1"
                        @focus="focusSector(index)"
                        @click.stop="selectItem(item)"
                    />
                </svg>

                <button
                    class="wheel-close"
                    type="button"
                    :tabindex="languageOpen ? -1 : 0"
                    :aria-label="t('wheel.close')"
                    :title="t('wheel.close')"
                    :style="{
                        top: `${(artwork.centerY / artwork.height) * 100}%`,
                        left: `${(artwork.centerX / artwork.width) * 100}%`
                    }"
                    @click="closeMenu"
                >
                    <span aria-hidden="true">×</span>
                </button>
            </div>

            <div
                v-if="languageOpen"
                ref="languagePanelRef"
                class="language-panel"
                role="menu"
                :aria-label="t('wheel.language')"
                :aria-busy="savingLanguage"
                @click.stop
            >
                <div class="language-panel__title">{{ t('wheel.language') }}</div>
                <button
                    v-for="language in languages"
                    :key="language.id"
                    type="button"
                    role="menuitemradio"
                    :aria-checked="locale === language.id"
                    :class="{ 'is-current': locale === language.id }"
                    :disabled="savingLanguage"
                    @click="selectLanguage(language.id)"
                >
                    {{ language.title }}
                </button>
                <p v-if="languageError" class="language-panel__error" role="alert">
                    {{ languageError }}
                </p>
                <button type="button" class="language-panel__back" @click="closeLanguageMenu">
                    {{ t('wheel.back') }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocale } from '../hooks/useLocale'
import type { AppLocale } from '../../types/config'
import wheelImage from '../assets/image/wheel-menu-national-day.png'
import traditionalWheelImage from '../assets/image/wheel-menu-national-day-zh-TW.png'
import englishWheelImage from '../assets/image/wheel-menu-national-day-en-US.png'

interface MenuItem {
    id: string
    title: string
    action?: () => void | Promise<void>
}

const props = withDefaults(
    defineProps<{
        closeOnClick?: boolean
    }>(),
    { closeOnClick: true }
)

const emit = defineEmits<{
    clicked: [item: MenuItem]
    opened: []
    closed: []
}>()

const { t } = useI18n()
const { locale, changeLocale } = useLocale()
const artworks = {
    'zh-CN': {
        src: wheelImage,
        width: 1278,
        height: 1230,
        centerX: 639,
        centerY: 600,
        outerRadius: 537
    },
    'zh-TW': {
        src: traditionalWheelImage,
        width: 1254,
        height: 1254,
        centerX: 627,
        centerY: 610,
        outerRadius: 550
    },
    'en-US': {
        src: englishWheelImage,
        width: 1254,
        height: 1254,
        centerX: 623,
        centerY: 610,
        outerRadius: 550
    }
}
const artwork = computed(() => artworks[locale.value])
const selectionClipId = `wheel-selection-${useId()}`
const isOpen = ref(false)
const isClosing = ref(false)
const languageOpen = ref(false)
const selectedIndex = ref(6)
const hoveredIndex = ref(-1)
const keyboardHighlight = ref(false)
const activeIndex = computed(() =>
    hoveredIndex.value >= 0
        ? hoveredIndex.value
        : keyboardHighlight.value
          ? selectedIndex.value
          : -1
)
const overlayRef = ref<HTMLElement>()
const languagePanelRef = ref<HTMLElement>()
const savingLanguage = ref(false)
const languageError = ref('')
let closeTimer: ReturnType<typeof setTimeout> | undefined
let previousFocus: HTMLElement | null = null
let unmounted = false

const menuItems = computed<MenuItem[]>(() => [
    { id: 'quit', title: t('wheel.quit'), action: () => window.api.quitApp() },
    { id: 'home', title: t('wheel.character'), action: () => window.api.openNewWindow('/home') },
    { id: 'shop', title: t('wheel.shop'), action: () => window.api.openNewWindow('/shop') },
    {
        id: 'activity',
        title: t('wheel.activity'),
        action: () => window.api.openNewWindow('/activity')
    },
    {
        id: 'school-handbook',
        title: t('wheel.schoolHandbook'),
        action: () => window.api.openNewWindow('/school-handbook')
    },
    { id: 'chat', title: t('wheel.chat'), action: () => window.api.openNewWindow('/chat') },
    { id: 'language', title: t('wheel.language') }
])

const languages = computed(() => [
    { id: 'zh-CN' as AppLocale, title: t('language.options.simplifiedChinese') },
    { id: 'zh-TW' as AppLocale, title: t('language.options.traditionalChinese') },
    { id: 'en-US' as AppLocale, title: t('language.options.english') }
])

const INNER_RADIUS = 228
// The illustrated panels are not equally spaced; follow their gold dividers.
const SECTOR_ANGLES = [-141, -90, -28, 21, 62, 119, 161, 219]

function getSectorPath(index: number): string {
    const { centerX: CENTER_X, centerY: CENTER_Y, outerRadius: OUTER_RADIUS } = artwork.value
    const start = (SECTOR_ANGLES[index] * Math.PI) / 180
    const end = (SECTOR_ANGLES[index + 1] * Math.PI) / 180
    const points = [
        [CENTER_X + INNER_RADIUS * Math.cos(start), CENTER_Y + INNER_RADIUS * Math.sin(start)],
        [CENTER_X + OUTER_RADIUS * Math.cos(start), CENTER_Y + OUTER_RADIUS * Math.sin(start)],
        [CENTER_X + OUTER_RADIUS * Math.cos(end), CENTER_Y + OUTER_RADIUS * Math.sin(end)],
        [CENTER_X + INNER_RADIUS * Math.cos(end), CENTER_Y + INNER_RADIUS * Math.sin(end)]
    ]
    return `M ${points[0][0]} ${points[0][1]} L ${points[1][0]} ${points[1][1]} A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 0 1 ${points[2][0]} ${points[2][1]} L ${points[3][0]} ${points[3][1]} A ${INNER_RADIUS} ${INNER_RADIUS} 0 0 0 ${points[0][0]} ${points[0][1]} Z`
}

function getSectorOrigin(index: number): string {
    const angle = ((SECTOR_ANGLES[index] + SECTOR_ANGLES[index + 1]) * Math.PI) / 360
    const radius = (INNER_RADIUS + artwork.value.outerRadius) / 2
    return `${artwork.value.centerX + radius * Math.cos(angle)}px ${artwork.value.centerY + radius * Math.sin(angle)}px`
}

function hoverSector(index: number) {
    hoveredIndex.value = index
    selectedIndex.value = index
    keyboardHighlight.value = false
}

function focusSector(index: number) {
    selectedIndex.value = index
    keyboardHighlight.value = true
}

function selectItem(item: MenuItem) {
    if (isClosing.value || languageOpen.value) return
    if (item.id === 'language') {
        languageOpen.value = true
        languageError.value = ''
        void nextTick(() =>
            languagePanelRef.value?.querySelector<HTMLButtonElement>('button')?.focus()
        )
        return
    }

    void item.action?.()
    emit('clicked', item)
    if (props.closeOnClick) closeMenu()
}

async function selectLanguage(locale: AppLocale) {
    if (savingLanguage.value) return
    savingLanguage.value = true
    languageError.value = ''
    try {
        const changed = await changeLocale(locale)
        if (changed) closeLanguageMenu()
        else languageError.value = t('language.saveFailed')
    } finally {
        savingLanguage.value = false
    }
}

function closeLanguageMenu() {
    languageOpen.value = false
    void nextTick(() => overlayRef.value?.focus())
}

function handleKeydown(event: KeyboardEvent) {
    if (isClosing.value) return
    if (event.key === 'Tab') {
        const focusable = languageOpen.value
            ? Array.from(
                  languagePanelRef.value?.querySelectorAll<HTMLButtonElement>(
                      'button:not(:disabled)'
                  ) ?? []
              )
            : Array.from(
                  overlayRef.value?.querySelectorAll<HTMLElement>('[tabindex="0"], button') ?? []
              )
        const currentIndex = focusable.indexOf(document.activeElement as HTMLElement)
        const nextIndex =
            (currentIndex + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length
        event.preventDefault()
        focusable[nextIndex]?.focus()
        return
    }
    if (languageOpen.value) {
        if (event.key === 'Escape' || event.key === 'Backspace') {
            event.preventDefault()
            closeLanguageMenu()
        } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            const options = Array.from(
                languagePanelRef.value?.querySelectorAll<HTMLButtonElement>(
                    'button:not(:disabled)'
                ) ?? []
            )
            const currentIndex = options.indexOf(document.activeElement as HTMLButtonElement)
            const direction = ['ArrowUp', 'ArrowLeft'].includes(event.key) ? -1 : 1
            event.preventDefault()
            options[(currentIndex + direction + options.length) % options.length]?.focus()
        }
        return
    }

    if (event.target instanceof HTMLButtonElement && (event.key === 'Enter' || event.key === ' '))
        return

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault()
        selectedIndex.value =
            (selectedIndex.value + menuItems.value.length - 1) % menuItems.value.length
        hoveredIndex.value = -1
        keyboardHighlight.value = true
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault()
        selectedIndex.value = (selectedIndex.value + 1) % menuItems.value.length
        hoveredIndex.value = -1
        keyboardHighlight.value = true
    } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        selectItem(menuItems.value[selectedIndex.value])
    } else if (event.key === 'Escape' || event.key === 'Backspace') {
        event.preventDefault()
        closeMenu()
    }
}

function openMenu() {
    clearTimeout(closeTimer)
    if (unmounted) return
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    isOpen.value = true
    isClosing.value = false
    languageOpen.value = false
    selectedIndex.value = 6
    hoveredIndex.value = -1
    keyboardHighlight.value = false
    emit('opened')
    void nextTick(() => overlayRef.value?.focus())
}

function closeMenu() {
    if (!isOpen.value || isClosing.value) return
    isClosing.value = true
    languageOpen.value = false
    closeTimer = setTimeout(() => {
        if (unmounted) return
        isOpen.value = false
        isClosing.value = false
        emit('closed')
        previousFocus?.focus()
    }, 260)
}

defineExpose({ open: openMenu, close: closeMenu })

onMounted(openMenu)
onUnmounted(() => {
    unmounted = true
    clearTimeout(closeTimer)
})
</script>

<style lang="scss" scoped>
.wheel-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: grid;
    place-items: center;
    overflow: hidden;
    outline: none;
    background: transparent;
}

.wheel-shell {
    position: relative;
    width: min(calc(100vw - 40px), calc(100vh - 40px), 560px);
}

.wheel-art {
    position: absolute;
    inset: 0;
    animation: wheel-in 420ms cubic-bezier(0.18, 0.9, 0.25, 1.12) both;
}

.wheel-art.is-closing {
    animation: wheel-out 240ms ease-in both;
}

.wheel-image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    user-select: none;
    pointer-events: none;
}

.wheel-hit-areas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
}

.wheel-hit-area {
    fill: transparent;
    outline: none;
    cursor: pointer;
    --game-cursor: var(--cursor-pointer);
}

.wheel-highlight {
    opacity: 0;
    transform: scale(1);
    transform-box: view-box;
    pointer-events: none;
    transition:
        transform 180ms ease-out,
        opacity 180ms ease-out;

    &.is-active {
        opacity: 1;
        transform: scale(1.075);
        filter: brightness(1.12) drop-shadow(0 0 8px rgba(255, 225, 150, 0.5));
    }
}

.wheel-close {
    position: absolute;
    top: 48.78%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: grid;
    width: 28px;
    height: 28px;
    padding: 0;
    place-items: center;
    border: 1px solid rgba(255, 233, 178, 0.42);
    border-radius: 50%;
    background: rgba(21, 29, 56, 0.55);
    color: #fff5d6;
    font-size: 21px;
    line-height: 1;
    cursor: pointer;
    opacity: 0;
    transition:
        opacity 160ms ease,
        transform 160ms ease,
        background 160ms ease;

    &:hover,
    &:focus-visible {
        opacity: 1;
    }

    &:hover {
        background: rgba(126, 43, 42, 0.8);
    }
}

.language-panel {
    position: absolute;
    top: 50%;
    left: 50%;
    display: grid;
    width: min(68%, 230px);
    gap: 6px;
    padding: 12px;
    border: 1px solid rgba(255, 226, 153, 0.78);
    border-radius: 8px;
    background: linear-gradient(155deg, rgba(30, 44, 78, 0.98), rgba(21, 27, 53, 0.98));
    box-shadow:
        0 12px 34px rgba(7, 11, 28, 0.52),
        inset 0 0 0 1px rgba(255, 255, 255, 0.08);
    transform: translate(-50%, -50%);
    animation: panel-in 180ms ease-out both;

    &__title {
        margin-bottom: 2px;
        color: #ffe6a3;
        font-size: 13px;
        font-weight: 700;
        text-align: center;
    }

    button {
        min-height: 34px;
        border: 1px solid rgba(255, 226, 153, 0.25);
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.08);
        color: #fff8e8;
        font-family: inherit;
        font-size: 13px;
        line-height: 1.4;
        overflow-wrap: anywhere;
        cursor: pointer;
        transition:
            background 140ms ease,
            border-color 140ms ease;

        &:hover,
        &:focus-visible,
        &.is-current {
            border-color: rgba(255, 226, 153, 0.72);
            background: rgba(255, 208, 111, 0.2);
        }
    }

    &__error {
        margin: 0;
        color: #ffd6cb;
        font-size: 12px;
        line-height: 1.4;
        overflow-wrap: anywhere;
    }

    &__back {
        margin-top: 2px;
        color: #f3dba0 !important;
        background: transparent !important;
    }
}

@keyframes wheel-in {
    from {
        opacity: 0;
        transform: scale(0.72) rotate(-8deg);
    }
    to {
        opacity: 1;
        transform: scale(1) rotate(0deg);
    }
}

@keyframes wheel-out {
    from {
        opacity: 1;
        transform: scale(1) rotate(0deg);
    }
    to {
        opacity: 0;
        transform: scale(0.78) rotate(7deg);
    }
}

@keyframes panel-in {
    from {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.92);
    }
    to {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
    }
}

@media (prefers-reduced-motion: reduce) {
    .wheel-art,
    .language-panel {
        animation: none;
    }
    .wheel-highlight {
        transition: none;
    }
}
</style>
