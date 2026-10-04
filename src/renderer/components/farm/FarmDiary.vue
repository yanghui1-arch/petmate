<template>
    <aside
        v-show="ready && !blocked"
        class="farm-diary"
        @pointerdown.stop
        @wheel.stop
        @keydown.stop
    >
        <div class="diary-heading">
            <strong>{{ t('farmLife.title') }}</strong>
            <button
                v-if="unseen"
                :key="events[events.length - 1]?.id"
                class="diary-fresh"
                :aria-label="t('farmLife.readLatest')"
                @click="latest"
            >
                <span aria-hidden="true">✦</span> {{ t('farmLife.fresh') }}
            </button>
        </div>
        <div
            ref="list"
            class="diary-scroll"
            @scroll="history = ($event.target as HTMLElement).scrollTop > 12"
        >
            <p v-if="!events.length" class="diary-empty">{{ t('farmLife.empty') }}</p>
            <TransitionGroup name="diary-story" tag="div">
                <article
                    v-for="event in visibleEvents"
                    :key="event.id"
                    :data-story="event.id"
                    :class="{ unread: !event.shown && !playback.acknowledged.has(event.id) }"
                >
                    <time>{{ dateLabel(event.day) }} · {{ time(event.at) }}</time>
                    <div class="story-heading">
                        <farm-ui-icon
                            :name="event.interrupted ? 'check' : icons[event.kind]"
                        /><strong>{{
                            event.interrupted
                                ? t('farmLife.summary.check')
                                : t('farmLife.summary.' + event.kind, { count: event.plots })
                        }}</strong>
                    </div>
                    <div v-if="Object.keys(event.items).length" class="story-items">
                        <span v-for="(count, crop) in event.items" :key="crop" class="story-item">
                            <farm-item-art :id="crop" />
                            <span>{{ t('farm.crops.' + crop) }}</span
                            ><b>×{{ count }}</b>
                        </span>
                    </div>
                    <p>{{ farmLifeLine(event, 'diary', t) }}</p>
                </article>
            </TransitionGroup>
        </div>
    </aside>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { farmLifeDay, type FarmLifeEvent, type FarmLifeKind } from '../../../shared/farmLife'
import { FarmDiaryPlayback } from '../../utils/farmDiary'
import { farmLifeLine } from '../../utils/farmLifeText'
import FarmItemArt from './FarmItemArt.vue'
import FarmUiIcon from './FarmUiIcon.vue'
const props = defineProps<{ events: FarmLifeEvent[]; ready: boolean; blocked: boolean }>()
const { t, locale } = useI18n()
const list = ref<HTMLElement | null>(null),
    history = ref(false)
const playback = reactive(new FarmDiaryPlayback())
watch(
    () => props.events,
    (events) => playback.update(events),
    { immediate: true }
)
const current = computed(() =>
    props.ready && !props.blocked && !history.value ? playback.current(props.events) : undefined
)
const visibleEvents = computed(() =>
    [...props.events].reverse().filter((event) => !playback.hidden(event.id, current.value))
)
const unseen = computed(() =>
    props.events.some((event) => !event.shown && !playback.acknowledged.has(event.id))
)
const icons = {
    water: 'water',
    harvest: 'harvest',
    order: 'stock',
    rest: 'rest',
    butterfly: 'butterfly',
    seedlings: 'seedlings',
    walk: 'walk',
    check: 'check',
    flower: 'flower'
} as const satisfies Record<FarmLifeKind, string>
const time = (at: number) =>
    new Intl.DateTimeFormat(locale.value, { hour: '2-digit', minute: '2-digit' }).format(at)
const dateLabel = (day: string) => {
    const today = new Date(),
        yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return day === farmLifeDay(today.getTime())
        ? t('farmLife.today')
        : day === farmLifeDay(yesterday.getTime())
          ? t('farmLife.yesterday')
          : new Intl.DateTimeFormat(locale.value, { month: 'long', day: 'numeric' }).format(
                new Date(day + 'T12:00:00')
            )
}
function latest() {
    history.value = false
    if (list.value) list.value.scrollTop = 0
}
let timer: ReturnType<typeof setInterval> | undefined,
    last = 0
onMounted(() => {
    last = performance.now()
    timer = setInterval(() => {
        const now = performance.now(),
            delta = Math.min(200, now - last)
        last = now
        const paused = !props.ready || props.blocked || document.hidden
        const viewport = list.value?.getBoundingClientRect(),
            visible = new Set<string>()
        if (!paused && viewport && props.events.length)
            for (const node of list.value!.querySelectorAll<HTMLElement>('[data-story]')) {
                const rect = node.getBoundingClientRect()
                if (
                    rect.top >= viewport.top &&
                    rect.bottom <= viewport.bottom &&
                    (history.value || node.dataset.story === current.value)
                )
                    visible.add(node.dataset.story!)
            }
        // History reading can acknowledge visible old stories, but must not advance the automatic queue.
        if (history.value && current.value === undefined)
            for (const id of [...visible])
                if (playback.current(props.events) === id) visible.delete(id)
        const done = playback.step(
            props.events,
            visible,
            delta,
            paused || (history.value && !visible.size),
            !history.value
        )
        for (const id of done)
            void window.api
                .markFarmDiaryShown(id)
                .then((result) => {
                    if (result.code !== 200) playback.retry(id)
                })
                .catch(() => playback.retry(id))
    }, 100)
})
onUnmounted(() => {
    if (timer) clearInterval(timer)
})
</script>
<style scoped>
.farm-diary {
    position: absolute;
    z-index: 4;
    right: 6px;
    bottom: 18px;
    width: 260px;
    color: #fff9df;
    font-family: 'Microsoft YaHei', sans-serif;
    font-size: 13px;
    line-height: 1.45;
    text-shadow:
        0 1px 2px #304329,
        1px 0 2px #304329,
        -1px 0 2px #304329;
    pointer-events: none;
}
.diary-heading {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    column-gap: 5px;
    align-items: center;
}
.diary-heading strong {
    grid-column: 2;
    padding: 4px 0;
    color: #ffe8b1;
    font-size: 15px;
    letter-spacing: 0.5px;
    text-shadow:
        0 2px 0 #74502e,
        1px 0 1px #74502e,
        -1px 0 1px #74502e;
}
.diary-fresh {
    grid-column: 3;
    justify-self: start;
    border: 0;
    padding: 3px 0;
    background: transparent;
    color: #ffe5a2;
    font: inherit;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
    text-shadow: inherit;
    pointer-events: auto;
    animation: diary-glimmer 0.9s ease-in-out 2;
}
.diary-fresh:hover,
.diary-fresh:focus-visible {
    color: #fff6d9;
}
.diary-fresh:focus-visible {
    outline: 1px solid #ffe5a2;
    outline-offset: 2px;
    border-radius: 3px;
}
@keyframes diary-glimmer {
    50% {
        opacity: 0.6;
        text-shadow:
            0 0 5px #ffcf78,
            0 1px 2px #304329;
    }
}
@media (prefers-reduced-motion: reduce) {
    .diary-fresh {
        animation: none;
    }
}
.diary-scroll {
    max-height: 178px;
    overflow: auto;
    overflow-anchor: none;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: #fff8cc66 transparent;
    pointer-events: auto;
}
.diary-scroll article {
    margin: 8px 2px 12px;
    padding: 2px 0;
}
.diary-scroll p {
    margin: 2px 0;
}
.diary-empty {
    opacity: 0.8;
    text-align: right;
}
.story-heading {
    display: flex;
    align-items: center;
    gap: 5px;
}
.story-heading .farm-icon {
    width: 23px;
    height: 23px;
}
time {
    font-size: 11px;
    opacity: 0.86;
}
.story-items {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin: 4px 0;
}
.story-item {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    padding: 2px 6px 2px 3px;
    background: #fff4c72b;
    border: 1px solid #ffe7a62b;
    border-radius: 9px;
    font-size: 11px;
}
.story-item .item-art {
    width: 22px;
    height: 24px;
}
.story-item b {
    color: #ffe2a0;
    font-size: 12px;
}
.unread strong::after {
    content: ' •';
    color: #ffdf75;
}
.diary-story-enter-active {
    transition:
        opacity 0.3s,
        transform 0.3s;
}
.diary-story-enter-from {
    opacity: 0;
    transform: translateY(8px);
}
@media (max-height: 620px), (max-width: 1000px) {
    .farm-diary {
        width: 230px;
        bottom: 8px;
        right: 4px;
        font-size: 12px;
    }
    .diary-scroll {
        max-height: 115px;
    }
}
</style>
