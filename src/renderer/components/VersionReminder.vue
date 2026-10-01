<template>
    <n-modal
        :show="stage !== null"
        :mask-closable="false"
        :close-on-esc="false"
        transform-origin="center"
    >
        <section
            class="celebration-dialog"
            :class="{ 'is-reward': stage === 'reward', 'locale-en': locale === 'en-US' }"
            :aria-labelledby="titleId"
            role="dialog"
            aria-modal="true"
        >
            <header class="celebration-topline">
                <span
                    >Petmate <b>{{ state?.version }}</b></span
                >
                <span>{{ stage === 'reward' ? t('giftKicker') : t('edition') }}</span>
            </header>

            <div v-if="stage === 'announcement'" class="celebration-scroll">
                <div class="announcement-heading">
                    <span class="event-status" v-if="state?.eventActive">{{ t('live') }}</span>
                    <h1 :id="titleId">{{ state?.eventActive ? t('title') : t('versionTitle') }}</h1>
                    <p class="celebration-subtitle">{{ t('subtitle') }}</p>
                    <img class="travel-art" :src="travelImage" alt="" />
                    <span class="event-period">{{ t('period') }}</span>
                    <p class="celebration-intro">
                        {{ state?.eventActive ? t('intro') : t('inactive') }}
                    </p>
                </div>
                <h2 class="updates-heading">
                    <span>{{ t('updates') }}</span
                    ><b>v{{ state?.version }}</b>
                </h2>
                <ol class="update-list">
                    <li v-for="(item, index) in updates" :key="item" :class="`update-${item}`">
                        <div class="update-index" aria-hidden="true">
                            {{ String(index + 1).padStart(2, '0') }}
                        </div>
                        <div>
                            <h3>
                                <span class="update-tag">{{ t(`${item}.tag`) }}</span
                                >{{ t(`${item}.title`) }}
                            </h3>
                            <p>
                                {{ t(`${item}.lead`) }}<strong>{{ t(`${item}.focus`) }}</strong
                                >{{ t(`${item}.tail`) }}
                            </p>
                        </div>
                    </li>
                </ol>
            </div>

            <div v-else class="celebration-scroll reward-content">
                <span class="reward-stamp">{{ t('received') }}</span>
                <h1 :id="titleId">{{ t('giftTitle') }}</h1>
                <p class="celebration-intro">{{ t('giftIntro') }}</p>
                <img class="gift-art" :src="giftImage" alt="" />
                <div class="reward-slots">
                    <article class="reward-slot coin-slot">
                        <span class="coin-art" aria-hidden="true">G</span>
                        <span class="reward-name">{{ t('cashName') }}</span>
                        <strong class="reward-amount"
                            >+{{ state?.cash.toLocaleString(locale) }}</strong
                        >
                        <small>{{ t('cashHint') }}</small>
                    </article>
                    <article class="reward-slot buff-slot">
                        <img :src="buffImage" :alt="t('buffName')" />
                        <strong class="reward-name">{{ t('buffName') }}</strong>
                        <span class="reward-amount">{{ t('buffValue') }}</span>
                        <small>{{ t('buffHint') }}</small>
                    </article>
                </div>
                <p class="buff-expiry">
                    <b>{{ state?.eventActive ? t('until') : t('expired') }}</b>
                </p>
                <p class="delivery-note">{{ t('oneTime') }}</p>
            </div>

            <footer class="celebration-footer">
                <p v-if="failure" class="reminder-error" role="alert">{{ t('retry') }}</p>
                <template v-if="stage === 'announcement'">
                    <span v-if="state?.eventActive" class="next-reward"
                        >{{ t('next') }} <b>3,000 G / EXP +50%</b></span
                    >
                    <button
                        type="button"
                        class="celebration-action"
                        :disabled="busy"
                        :aria-busy="busy"
                        @click="acknowledge"
                    >
                        {{ busy ? t('processing') : t('acknowledge') }}
                    </button>
                </template>
                <template v-else>
                    <button
                        type="button"
                        class="celebration-action"
                        :disabled="busy"
                        :aria-busy="busy"
                        @click="dismiss(false)"
                    >
                        {{ busy ? t('processing') : t('close') }}
                    </button>
                    <button
                        v-if="state?.eventActive"
                        type="button"
                        class="celebration-link"
                        :disabled="busy"
                        @click="dismiss(true)"
                    >
                        {{ t('explore') }} <span aria-hidden="true">→</span>
                    </button>
                </template>
            </footer>
        </section>
    </n-modal>
    <button v-if="loadFailed" type="button" class="reminder-retry" @click="loadReminder">
        {{ t('loadError') }} · {{ t('retryLoad') }}
    </button>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { VersionReminderState } from '@main/types/version-reminder'
import { usePlayer } from '../hooks/usePlayer'
import messages from '../i18n/version-reminder'
import travelImage from '../assets/image/activity/national-day-2026/national-day-travel.png'
import giftImage from '../assets/image/special_activity/national-day-2026/national-day-gift-package.png'
import buffImage from '../assets/image/buff/positive/national-day-celebration.webp'

const { t, locale } = useI18n({ useScope: 'local', messages })
const router = useRouter()
const { refreshPlayerData } = usePlayer()
const titleId = useId()
const updates = ['activity', 'exchange', 'buff', 'companion', 'polish'] as const
const state = ref<VersionReminderState>()
const stage = ref<'announcement' | 'reward' | null>(null)
const busy = ref(false)
const failure = ref(false)
const loadFailed = ref(false)
let unmounted = false
onUnmounted(() => {
    unmounted = true
})

async function loadReminder() {
    loadFailed.value = false
    try {
        const response = await window.api.getVersionReminder()
        if (response.code !== 200 || !response.data) throw new Error(response.message)
        if (unmounted) return
        state.value = response.data
        stage.value = response.data.announcementPending
            ? 'announcement'
            : response.data.rewardPending
              ? 'reward'
              : null
        if (stage.value === 'reward') await refreshPlayerData()
    } catch {
        if (!unmounted) loadFailed.value = true
    }
}

async function acknowledge() {
    if (busy.value) return
    busy.value = true
    failure.value = false
    try {
        const response = await window.api.acknowledgeVersionReminder()
        if (response.code !== 200 || !response.data) throw new Error(response.message)
        await refreshPlayerData()
        if (unmounted) return
        state.value = response.data
        stage.value = response.data.rewardPending ? 'reward' : null
    } catch {
        failure.value = true
    } finally {
        busy.value = false
    }
}

async function dismiss(explore: boolean) {
    if (busy.value) return
    busy.value = true
    failure.value = false
    try {
        const response = await window.api.dismissVersionReward()
        if (response.code !== 200 || !response.data) throw new Error(response.message)
        stage.value = null
        if (explore && !unmounted) await router.push('/school-handbook')
    } catch {
        failure.value = true
    } finally {
        busy.value = false
    }
}

onMounted(loadReminder)
</script>

<style scoped lang="scss">
.celebration-dialog {
    width: min(420px, calc(100vw - 48px));
    max-height: min(520px, calc(100dvh - 60px));
    display: flex;
    flex-direction: column;
    overflow: hidden;
    color: #44343f;
    background: #fffafa;
    border: 2px solid #e5b04e;
    border-radius: 8px;
    box-shadow:
        0 0 0 3px #8f283d,
        0 18px 50px #35152666;
    letter-spacing: 0;
    font-size: 13px;
    line-height: 1.65;
    h1,
    h2,
    h3,
    p {
        margin: 0;
    }
    button {
        font: inherit;
    }
}
.celebration-topline {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    padding: 8px 14px;
    background: #9f2942;
    color: #fff3dc;
    font-size: 10px;
    span:last-child {
        text-align: right;
    }
    b {
        margin-left: 5px;
        color: #ffdc83;
        font-size: 12px;
    }
}
.celebration-scroll {
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: #dba9b3 transparent;
}
.celebration-scroll::-webkit-scrollbar {
    display: block;
    width: 4px;
}
.celebration-scroll::-webkit-scrollbar-thumb {
    background: #dba9b3;
    border-radius: 2px;
}
.announcement-heading {
    padding: 12px 16px 10px;
    text-align: center;
}
.event-status {
    color: #25816a;
    font-weight: 700;
    font-size: 11px;
}
.celebration-dialog h1 {
    color: #a52b43;
    font-size: 25px;
    line-height: 1.35;
    font-weight: 900;
    overflow-wrap: anywhere;
}
.celebration-subtitle {
    color: #97671d;
    font-size: 12px;
    font-weight: 700;
}
.travel-art {
    display: block;
    width: 100%;
    height: 116px;
    object-fit: contain;
    margin: 4px auto;
}
.event-period {
    display: block;
    color: #aa3d4e;
    font-size: 11px;
    font-weight: 700;
}
.celebration-intro {
    font-size: 12px;
    line-height: 1.8;
    margin-top: 7px !important;
}
.updates-heading {
    margin: 0 18px !important;
    padding: 9px 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid #eed3d9;
    border-bottom: 1px solid #eed3d9;
    font-size: 14px;
    b {
        color: #a52b43;
        font-size: 12px;
    }
}
.update-list {
    list-style: none;
    margin: 0;
    padding: 0 18px 12px;
}
.update-list li {
    --ink: #b24458;
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr);
    gap: 8px;
    padding: 10px 0;
    border-bottom: 1px dashed #e8d6dc;
    &:last-child {
        border-bottom: 0;
    }
}
.update-list .update-exchange {
    --ink: #946518;
}
.update-list .update-buff {
    --ink: #247862;
}
.update-list .update-companion {
    --ink: #7955a3;
}
.update-list .update-polish {
    --ink: #367a9c;
}
.update-index {
    color: var(--ink);
    font-size: 16px;
    font-weight: 900;
    line-height: 1.5;
}
.update-list h3 {
    color: var(--ink);
    font-size: 13px;
    line-height: 1.7;
}
.update-tag {
    font-size: 9px;
    display: inline;
    margin-right: 5px;
    font-weight: 500;
}
.update-list p {
    margin-top: 4px;
    font-size: 12px;
}
.update-list strong {
    color: var(--ink);
    font-weight: 800;
}
.celebration-footer {
    flex-shrink: 0;
    padding: 8px 14px 10px;
    background: #fff;
    border-top: 1px solid #e8c3cb;
    text-align: center;
}
.next-reward {
    display: block;
    color: #8a6571;
    font-size: 10px;
    margin-bottom: 7px;
    b {
        color: #97671d;
        margin-left: 5px;
    }
}
.celebration-action {
    width: 100%;
    min-height: 40px;
    padding: 8px 12px;
    color: #fff5df;
    font-weight: 800 !important;
    background: linear-gradient(#c9475d, #a42a43);
    border: 1px solid #8f283d;
    border-bottom: 3px solid #742335;
    border-radius: 5px;
    box-shadow: inset 0 1px 0 #ffb9c5;
    transition:
        filter 0.15s,
        transform 0.15s;
    &:hover:not(:disabled) {
        filter: brightness(1.1);
    }
    &:active:not(:disabled) {
        transform: translateY(1px);
    }
    &:focus-visible {
        outline: 2px solid #278674;
        outline-offset: 2px;
    }
    &:disabled {
        opacity: 0.65;
    }
}
.celebration-link {
    background: none;
    border: 0;
    color: #287d68;
    padding: 6px 8px 0;
    font-size: 12px !important;
    font-weight: 700 !important;
}
.reminder-error {
    color: #b12840;
    font-size: 12px;
    margin-bottom: 6px !important;
}
.reward-content {
    padding: 10px 14px 4px;
    text-align: center;
    position: relative;
}
.reward-content h1 {
    font-size: 21px;
}
.reward-stamp {
    display: inline-block;
    color: #287d68;
    font-size: 10px;
    font-weight: 900;
    border-bottom: 2px solid #63ab90;
    margin-bottom: 6px;
}
.gift-art {
    display: block;
    width: 100%;
    height: 96px;
    object-fit: contain;
    margin: 4px auto;
    animation: gift-arrival 0.5s ease-out;
}
.locale-en.is-reward {
    .gift-art {
        height: 72px;
    }
    h1 {
        font-size: 21px;
    }
}
.reward-slots {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
}
.reward-slot {
    min-width: 0;
    padding: 8px 6px;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    border: 1px solid #ddba6c;
    background: #fff7da;
    box-shadow: inset 0 0 0 3px #fffdf1;
    img {
        height: 48px;
        width: 58px;
        object-fit: contain;
        margin-bottom: 7px;
    }
    small {
        color: #78695b;
        font-size: 10px;
    }
}
.buff-slot {
    background: #edf8f2;
    border-color: #83b79e;
    box-shadow: inset 0 0 0 3px #f6fffa;
}
.reward-name {
    font-size: 12px;
    line-height: 1.5;
    font-weight: 700;
    min-height: 18px;
}
.reward-amount {
    color: #986017;
    font-size: 24px;
    font-weight: 900;
    line-height: 1.5;
}
.buff-slot .reward-amount {
    color: #247862;
}
.coin-art {
    width: 44px;
    height: 44px;
    border: 4px solid #e2a126;
    border-radius: 50%;
    background: #ffd962;
    color: #a36b1b;
    display: grid;
    place-items: center;
    font-size: 26px;
    font-weight: 900;
    box-shadow:
        inset 0 0 0 2px #fff0aa,
        2px 4px 0 #bb7e1a;
    margin: 0 0 11px;
}
.buff-expiry {
    color: #287d68;
    font-size: 11px;
    margin-top: 10px !important;
}
.delivery-note {
    color: #8a6571;
    font-size: 10px;
    margin: 4px 0 7px !important;
}
.reminder-retry {
    position: fixed;
    bottom: 12px;
    left: 12px;
    right: 12px;
    padding: 8px;
    color: #a52b43;
    background: #fff;
    border: 1px solid #e8c3cb;
    border-radius: 4px;
}
@keyframes gift-arrival {
    from {
        opacity: 0;
        transform: translateY(10px) scale(0.9);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}
@media (max-height: 520px) {
    .travel-art {
        height: 108px;
    }
    .gift-art {
        height: 88px;
    }
}
@media (prefers-reduced-motion: reduce) {
    .gift-art {
        animation: none;
    }
    .celebration-action {
        transition: none;
    }
}
</style>
