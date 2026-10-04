<template>
    <div class="farm-shell" :style="{ '--game-cursor': `url(${gameArrow}) 4 3, default`, '--loading-background': `url(${background})` }" @pointerdown.capture="manualActivity" @keydown.capture="manualActivity">
    <main v-if="view?.farm" ref="host" class="farm" @contextmenu.prevent="dismiss">
        <div class="window-drag" aria-hidden="true"></div>
        <section class="field" aria-label="农场场景">
            <farm-scene :key="sceneKey" :state="sceneState" @target="sceneTarget" @hover="sceneHover" @progress="assetLoaded" @ready="sceneLoaded" @error="sceneFailure = $event" />
        </section>
            <farm-diary
                :events="view.farm.life?.events ?? []"
                :ready="sceneReady && dataReady && !loadError && !sceneFailure"
                :blocked="blocked || !!panel || seedTarget !== null"
            />
            <farm-entrances
                ref="entrances"
                :layout="entranceLayout"
                :enabled="sceneState.enabled"
                :hovered="entranceHovered"
                @hover="entranceHover"
                @activate="openEntrance"
            />
        <button class="profile" :aria-label="t('farm.level')" @click="openPanel('level')">
            <span class="portrait"><img :src="youmeiAvatar" alt="" /></span>
            <span class="profile-content"
                ><strong>{{ t('farm.title') }}</strong>
                <span class="experience"
                    ><i :style="{ width: experiencePercent + '%' }"></i
                    ><span>{{ experienceText }}</span></span
                > </span
            ><span class="level-star">{{ view.level }}</span>
        </button>
        <div class="top-actions">
            <button class="store-entry" :aria-label="t('farm.store')" @click="openPanel('store')">
                <farm-ui-icon name="shop" /><strong>{{ t('farm.store') }}</strong>
            </button>
            <button
                v-if="farmSettingsVisible"
                class="settings-button"
                :aria-label="t('farm.settings')"
                @click="openPanel('settings')"
            >
                <farm-icon :index="6" />
            </button>
            <button v-else class="exit-button" :aria-label="t('farm.closeWindow')" @click="windowClose">×</button>
        </div>
        <nav class="side-actions" :aria-label="t('farm.title')">
            <button class="game-button orders-entry" @click="openPanel('orders')">
                <span class="entry-art"
                    ><farm-ui-icon name="orders" /><span v-if="deliverable" class="badge">{{
                        deliverable
                    }}</span></span
                ><strong>{{ t('farm.ordersShort') }}</strong>
            </button>
            <button
                ref="backpack"
                class="game-button backpack-entry"
                @click="openPanel('warehouse')"
            >
                <span class="entry-art"><farm-ui-icon name="backpack" /></span
                ><strong>{{ t('farm.backpack') }}</strong>
            </button>
            <button class="game-button codex-entry" @click="openPanel('codex')">
                <span class="entry-art"><farm-ui-icon name="codex" /></span
                ><strong>{{ t('farm.codex') }}</strong>
            </button>
        </nav>
        <aside
            v-if="hovered !== null && !panel && seedTarget === null"
            ref="tooltip"
            class="tooltip"
            role="tooltip"
            :style="popoverPosition(hovered, 232, 154)"
        >
            <template v-if="hovered >= view.unlockedPlots"
                ><strong>{{ t('farm.locked') }}</strong>
                <p>{{ t('farm.unlockAt', { level: hovered < 9 ? 3 : 5 }) }}</p></template
            >
            <template v-else-if="hoverPlant">
                <strong>{{ cropName(hoverPlant.cropId) }}</strong>
                <p>
                    {{ t('farm.stage' + plantStage(hoverPlant)) }} · {{ remainingTime(hoverPlant) }}
                </p>
                <div class="growth">
                    <i :style="{ width: plantProgress(hoverPlant) * 100 + '%' }"></i>
                </div>
                <p>
                    {{ t('farm.expectedYield') }} ×{{ cropDefinition(hoverPlant.cropId).yield }} ·
                    {{ t(hoverPlant.watered ? 'farm.watered' : 'farm.notWatered') }}
                </p> </template
            ><template v-else
                ><strong>{{ t('farm.empty') }}</strong></template
            >
        </aside>
        <section
            v-if="seedTarget !== null"
            ref="seedPicker"
            class="seed-picker"
            :style="popoverPosition(seedTarget, 338, 330)"
            role="dialog"
            :aria-label="t('farm.selectSeed')"
            @contextmenu.prevent.stop="dismiss"
        >
            <header>
                <strong>{{ t('farm.selectSeed') }}</strong
                ><button class="close-button" :aria-label="t('farm.closePanel')" @click="dismiss">
                    ×
                </button>
            </header>
            <div class="seed-grid">
                <button
                    v-for="crop in view.catalog.crops"
                    :key="crop.id"
                    class="seed-option"
                    :data-crop="crop.id"
                    :disabled="
                        busy ||
                        !!view.saveError ||
                        crop.level > view.level ||
                        !view.farm.seeds[crop.id]
                    "
                    @click="sow(crop.id)"
                >
                    <farm-item-art :id="crop.id" :muted="crop.level > view.level" />
                    <strong>{{ cropName(crop.id) }}</strong
                    ><span>×{{ view.farm.seeds[crop.id] || 0 }}</span>
                    <small>{{
                        crop.level > view.level
                            ? t('farm.unlockAt', { level: crop.level })
                            : seedMinutes(crop.id) + ' ' + t('farm.minutes')
                    }}</small>
                </button>
            </div>
            <small v-if="view.farm.tutorialRemaining">{{
                t('farm.tutorialRemaining', { count: view.farm.tutorialRemaining })
            }}</small>
            <button class="action-button secondary" @click="openPanel('store')">
                {{ t('farm.restockSeeds') }}
            </button>
        </section>
        <div class="effects" aria-hidden="true">
                <template v-for="effect in effects" :key="effect.id">
                    <div
                        class="plot-feedback"
                        :style="{ left: effect.x + 'px', top: effect.y + 'px' }"
                    >
                        {{ effect.text }}
                    </div>
                    <div
                        v-if="effect.water"
                        class="water-splash"
                        :style="{
                            left: effect.x + 'px',
                            top: effect.y + 35 + 'px',
                            '--splash-scale': effect.scale
                        }"
                    >
                        <span
                            v-for="drop in 5"
                            :key="drop"
                            class="water-drop"
                            :style="{
                                left: (drop - 3) * 12 + 'px',
                                '--drift': (drop - 3) * 16 + 'px',
                                animationDelay: (drop - 1) * 0.045 + 's'
                            }"
                        />
                    </div>
                </template>
            <farm-item-art
                v-for="fly in flights"
                :key="fly.id"
                class="harvest-flight"
                :id="fly.crop"
                :style="{
                    left: fly.x + 'px',
                    top: fly.y + 'px',
                    '--fly-x': fly.dx + 'px',
                    '--fly-y': fly.dy + 'px'
                }"
            />
        </div>
        <div v-if="notice" class="notice" role="status" aria-live="polite">{{ notice }}</div>
        <div v-if="view.saveError || loadError" class="save-error" role="alert">
            {{ view.saveError || loadError }}
            <button :disabled="busy" @click="refresh()">{{ t('farm.retry') }}</button>
        </div>
        <div v-if="panel" class="overlay" @click.self="dismiss" @contextmenu.prevent="dismiss">
            <section
                ref="dialog"
                class="modal"
                role="dialog"
                aria-modal="true"
                :aria-label="panelTitle"
            >
                <header>
                    <h2>{{ panelTitle }}</h2>
                    <div class="modal-header-actions">
                        <span v-if="panel === 'store' || panel === 'buy'" class="store-balance" :aria-label="t('attributes.cash') + ' ' + view.cash">◈ {{ view.cash }}</span>
                        <button
                            class="close-button"
                            :aria-label="t('farm.closePanel')"
                            @click="dismiss"
                        >
                            ×
                        </button>
                    </div>
                </header>
                <template v-if="panel === 'orders'">
                    <div class="order-list">
                        <article
                            v-for="(order, index) in view.farm.orders"
                            :key="index"
                            class="order-card"
                        >
                            <template v-if="'templateId' in order">
                                <h3>{{ t('farm.orderNumber', { number: index + 1 }) }}</h3>
                                <div
                                    class="order-need"
                                    v-for="(required, crop) in orderDefinition(order.templateId)
                                        .requirements"
                                    :key="crop"
                                >
                                    <farm-item-art :id="String(crop)" /><strong>{{
                                        cropName(String(crop))
                                    }}</strong
                                    ><span
                                        :class="{
                                            enough:
                                                (view.farm.produce[String(crop)] || 0) >= required
                                        }"
                                        >{{ view.farm.produce[String(crop)] || 0 }}/{{
                                            required
                                        }}</span
                                    >
                                </div>
                                <p>
                                    ◈ {{ orderCash(order.templateId) }} · +{{
                                        orderDefinition(order.templateId).exp
                                    }}
                                    EXP
                                </p>
                                <div class="card-actions">
                                    <button
                                        class="action-button"
                                        :disabled="!canDeliver(order.templateId) || blocked"
                                        @click="
                                            run({ type: 'deliver', instanceId: order.instanceId })
                                        "
                                    >
                                        {{ t('farm.deliver') }}</button
                                    ><button
                                        class="action-button secondary"
                                        :disabled="blocked"
                                        @click="
                                            run({ type: 'discard', instanceId: order.instanceId })
                                        "
                                    >
                                        {{ t('farm.discard') }}
                                    </button>
                                </div> </template
                            ><template v-else
                                ><h3>{{ t('farm.restocking') }}</h3>
                                <p>{{ formatTime(order.remainingMs) }}</p></template
                            >
                        </article>
                    </div>
                </template>
                <template v-else-if="panel === 'warehouse'">
                    <div class="tabs">
                        <button
                            v-for="tab in warehouseTabs"
                            :key="tab"
                            :class="{ active: warehouseTab === tab }"
                            @click="warehouseTab = tab"
                        >
                            {{ t('farm.' + tab) }}
                        </button>
                    </div>
                    <div class="item-list">
                        <article
                            v-for="crop in view.catalog.crops"
                            :key="crop.id"
                            class="item-card"
                        >
                            <farm-item-art :id="crop.id" :muted="crop.level > view.level" /><span
                                class="quantity"
                                >×{{ view.farm[warehouseTab][crop.id] || 0 }}</span
                            >
                            <h3>{{ cropName(crop.id) }}</h3>
                            <p>
                                {{
                                    warehouseTab === 'seeds'
                                        ? seedMinutes(crop.id) + ' ' + t('farm.minutes')
                                        : '◈ ' + crop.sell + ' / ' + t('farm.each')
                                }}
                            </p>
                            <button
                                class="action-button"
                                :disabled="
                                    blocked ||
                                    (warehouseTab === 'seeds'
                                        ? crop.level > view.level
                                        : !view.farm.produce[crop.id])
                                "
                                @click="
                                    warehouseTab === 'seeds' ? openBuy(crop.id) : openSell(crop.id)
                                "
                            >
                                {{
                                    t(warehouseTab === 'seeds' ? 'farm.restockSeeds' : 'farm.sell')
                                }}
                            </button>
                        </article>
                    </div>
                </template>
                <template v-else-if="panel === 'store'">
                    <div class="item-list">
                        <article
                            v-for="crop in view.catalog.crops"
                            :key="crop.id"
                            class="item-card"
                        >
                            <farm-item-art :id="crop.id" :muted="crop.level > view.level" />
                            <h3>{{ cropName(crop.id) }}</h3>
                            <p>
                                {{ seedMinutes(crop.id) }} {{ t('farm.minutes') }} ·
                                {{ t('farm.owned') }} ×{{ view.farm.seeds[crop.id] || 0 }}
                            </p>
                            <button
                                class="action-button"
                                :disabled="blocked || crop.level > view.level"
                                @click="openBuy(crop.id)"
                            >
                                {{
                                    crop.level > view.level
                                        ? t('farm.unlockAt', { level: crop.level })
                                        : '◈ ' + crop.price + ' · ' + t('farm.buy')
                                }}
                            </button>
                        </article>
                    </div>
                </template>
                <template v-else-if="panel === 'buy' || panel === 'sell'">
                    <div class="trade-details">
                        <farm-item-art :id="tradeCrop" />
                        <div>
                            <h3>{{ cropName(tradeCrop) }}</h3>
                            <p>
                                {{ t('farm.owned') }} ×{{
                                    panel === 'buy'
                                        ? view.farm.seeds[tradeCrop] || 0
                                        : view.farm.produce[tradeCrop] || 0
                                }}
                            </p>
                            <p>◈ {{ tradePrice }} / {{ t('farm.each') }}</p>
                        </div>
                    </div>
                    <div class="quantities">
                        <button
                            :disabled="blocked || count <= 1"
                            @click="count = Math.max(1, count - 1)"
                        >
                            −</button
                        ><input
                            v-model.number="count"
                            type="number"
                            min="1"
                            :max="tradeMaximum"
                            :disabled="blocked"
                            :aria-label="t('farm.tradeQuantity')"
                        /><button :disabled="blocked || count >= tradeMaximum" @click="count++">
                            +</button
                        ><button
                            v-for="value in [1, 5, 10]"
                            :key="value"
                            :disabled="blocked || value > tradeMaximum"
                            @click="count = value"
                        >
                            {{ value }}
                        </button>
                    </div>
                    <button
                        class="action-button trade-confirm"
                        :disabled="
                            blocked ||
                            !Number.isSafeInteger(count) ||
                            count < 1 ||
                            count > tradeMaximum
                        "
                        @click="confirmTrade"
                    >
                        {{ t('farm.confirm') }} · ◈ {{ tradePrice * count }}
                    </button>
                </template>
                <template v-else-if="panel === 'codex'">
                        <div class="tabs">
                            <button
                                class="action-button secondary"
                                :class="{ active: codexTab === 'crops' }"
                                @click="codexTab = 'crops'"
                            >
                                {{ t('farm.produce') }}
                            </button>
                            <button
                                class="action-button secondary achievements-tab"
                                :class="{ active: codexTab === 'achievements' }"
                                @click="codexTab = 'achievements'"
                            >
                                {{ t('farm.achievements') }}
                            </button>
                        </div>
                        <farm-achievements v-if="codexTab === 'achievements'" :view="view" />
                    <div v-else class="item-list">
                        <article
                            v-for="crop in view.catalog.crops"
                            :key="crop.id"
                            class="item-card"
                        >
                            <farm-item-art :id="crop.id" :muted="crop.level > view.level" />
                            <h3>{{ cropName(crop.id) }}</h3>
                            <span class="codex-label">{{
                                crop.level > view.level
                                    ? t('farm.unlockAt', { level: crop.level })
                                    : view.farm.harvests[crop.id]
                                      ? t('farm.lit')
                                      : t('farm.notHarvested')
                            }}</span>
                            <p>{{ t('farm.cropDescriptions.' + crop.id) }}</p>
                            <p>
                                {{ crop.minutes }} {{ t('farm.minutes') }} ·
                                {{ t('farm.harvested') }} ×{{ view.farm.harvests[crop.id] || 0 }}
                            </p>
                            <div class="crop-stages">
                                <div v-for="phase in [0, 1, 2, 3]" :key="phase">
                                    <farm-item-art
                                        :id="crop.id"
                                        :stage="phase"
                                        :muted="crop.level > view.level"
                                    /><small>{{ t('farm.stage' + phase) }}</small>
                                </div>
                            </div>
                        </article>
                    </div>
                </template>
                <template v-else-if="panel === 'level'"
                    ><div class="level-display">Lv.{{ view.level }} · {{ experienceText }}</div>
                    <div class="unlock-list">
                        <p v-for="(_, index) in view.catalog.levels" :key="index">
                            <strong
                                >Lv.{{ index + 1 }} · {{ view.catalog.levels[index] }} EXP</strong
                            ><span>{{ unlockText(index + 1) }}</span>
                        </p>
                    </div></template
                >
                <template v-else-if="panel === 'settings'"
                    ><div class="settings-list">
                        <button @click="openPanel('backup')">{{ t('farm.backup') }}</button
                        ><button @click="goBack">{{ t('farm.back') }}</button
                        ><button @click="windowClose">{{ t('farm.closeWindow') }}</button>
                    </div></template
                >
                <template v-else-if="panel === 'backup'"
                    ><p>{{ t('farm.backupScope') }}</p>
                    <div class="settings-list">
                        <button :disabled="busy" @click="exportBackup">
                            {{ t('farm.exportBackup') }}</button
                        ><button :disabled="busy" @click="selectBackup">
                            {{ t('farm.selectBackup') }}</button
                        ><button :disabled="busy" @click="automaticBackup">
                            {{ t('farm.lastAutomatic') }}
                        </button>
                    </div>
                    <div v-if="backupPreview" class="backup-summary">
                        <p>{{ backupPreview.createdAt }}</p>
                        <p>Lv.{{ backupPreview.level }} · ◈ {{ backupPreview.cash }}</p>
                        <p>{{ backupPreview.scope }}</p>
                        <button class="action-button" :disabled="busy" @click="restoreBackup">
                            {{ t('farm.restoreConfirm') }}
                        </button>
                    </div></template
                >
            </section>
        </div>
    </main>
    <Transition name="farm-loading">
        <section v-if="!sceneReady || loadError || sceneFailure" class="game-loading" :aria-busy="!loadError && !sceneFailure">
            <button class="exit-button loading-exit" :aria-label="t('farm.closeWindow')" @click="windowClose">×</button>
            <div class="loading-card" role="status" aria-live="polite">
                <h1>{{ t('farm.title') }}</h1>
                <p>{{ loadError || sceneFailure || t(!dataReady ? 'farm.loadingData' : sceneReady ? 'farm.loadingReady' : 'farm.loadingArt') }}</p>
                <progress :value="loadingProgress" max="100" :aria-label="t('farm.loading')"></progress>
                <strong>{{ loadingProgress }}%</strong>
                <button v-if="loadError || sceneFailure" @click="retryLoading">{{ t('farm.retry') }}</button>
            </div>
        </section>
    </Transition>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { plantProgress, plantStage } from '../../main/modules/farm/rules'
import type { BackupPreview, FarmOperation, FarmPlant, FarmView } from '../../main/types/farm'
import { farmSettingsVisible } from '../../shared/farmExperience'
import type { FarmLifeView } from '../../shared/farmLife'
import { background } from '../assets/farm-game'
import gameArrow from '../assets/farm-game/game-arrow.svg'
import youmeiAvatar from '../assets/image/youmei-avatar.png'
import FarmAchievements from '../components/farm/FarmAchievements.vue'
import FarmDiary from '../components/farm/FarmDiary.vue'
import FarmEntrances from '../components/farm/FarmEntrances.vue'
import FarmIcon from '../components/farm/FarmIcon.vue'
import FarmItemArt from '../components/farm/FarmItemArt.vue'
import FarmScene from '../components/farm/FarmScene.vue'
import FarmUiIcon from '../components/farm/FarmUiIcon.vue'
import type { FarmSceneState } from '../game/FarmScene'
import type { FarmEntranceId, FarmHover, FarmTarget } from '../game/farmSceneModel'
import { farmLayout, plotMode } from '../game/farmSceneModel'
const { t } = useI18n(),
    router = useRouter()
const sceneKey = ref(0), sceneReady = ref(false), sceneFailure = ref(''), assetProgress = ref(0), dataReady = ref(false)
let lastManualIntent = -Infinity
const loadingProgress = computed(() => sceneReady.value && dataReady.value && !loadError.value && !sceneFailure.value ? 100 : Math.min(99, Math.round((dataReady.value ? 20 : 0) + assetProgress.value * 70)))
function assetLoaded(value: number) { assetProgress.value = Math.max(assetProgress.value, value) }
function sceneLoaded() {
    sceneReady.value = true
    void window.api.readyFarmLife?.()
}
function retryLoading() { sceneReady.value = false; dataReady.value = false; sceneFailure.value = ''; assetProgress.value = 0; sceneKey.value++; void refresh() }
function manualActivity() {
    if (disposed || Date.now() - lastManualIntent < 250) return
    lastManualIntent = Date.now()
    void window.api.farmManualActivity?.().catch(() => {})
}
const host = ref<HTMLElement | null>(null),
    dialog = ref<HTMLElement | null>(null),
    backpack = ref<HTMLElement | null>(null)
const seedPicker = ref<HTMLElement | null>(null),
    tooltip = ref<HTMLElement | null>(null)
const entrances = ref<InstanceType<typeof FarmEntrances> | null>(null)
const entranceHovered = ref<FarmEntranceId | null>(null)
const view = ref<FarmView | null>(null),
    loadError = ref(''),
    notice = ref(''),
    busy = ref(false)
const life = ref<FarmLifeView>({ visit: null, enabled: false })
let stopLife: (() => void) | undefined
const panel = ref<
    | 'orders'
    | 'warehouse'
    | 'store'
    | 'buy'
    | 'sell'
    | 'codex'
    | 'level'
    | 'settings'
    | 'backup'
    | null
>(null)
const warehouseTab = ref<'seeds' | 'produce'>('seeds'),
    warehouseTabs = ['seeds', 'produce'] as const
const codexTab = ref<'crops' | 'achievements'>('crops')
const seedTarget = ref<number | null>(null),
    hovered = ref<number | null>(null)
const width = ref(1280),
    height = ref(720),
    tradeCrop = ref(''),
    count = ref(1)
const backupPreview = ref<BackupPreview | null>(null)
const effects = ref<
    { id: string; x: number; y: number; text: string; water: boolean; scale: number }[]
>([])
const flights = ref<{ id: string; crop: string; x: number; y: number; dx: number; dy: number }[]>(
    []
)
const effectTimers = new Set<ReturnType<typeof setTimeout>>()
let interval: ReturnType<typeof setInterval> | undefined,
    noticeTimer: ReturnType<typeof setTimeout> | undefined,
    hoverTimer: ReturnType<typeof setTimeout> | undefined
let hoverCandidate: number | null = null,
    unsubscribe: (() => void) | undefined,
    observer: ResizeObserver | undefined,
    loadSequence = 0,
    disposed = false,
    lastFocused: HTMLElement | null = null
const blocked = computed(() => busy.value || !!view.value?.saveError)
const sceneState = computed<FarmSceneState>(() => ({
    view: view.value!,
    visit: life.value.visit,
    enabled: sceneReady.value && dataReady.value && !loadError.value && !sceneFailure.value && !blocked.value && !panel.value && seedTarget.value === null
}))
const entranceLayout = computed(() => farmLayout(width.value, height.value))
const hoverPlant = computed(() =>
    hovered.value === null ? null : view.value?.farm?.plots[hovered.value].plant
)
const cropDefinition = (id: string) => view.value!.catalog.crops.find((c) => c.id === id)!
const cropName = (id: string) => t('farm.crops.' + id)
const seedMinutes = (id: string) =>
    id === 'wheat' && (view.value?.farm?.tutorialRemaining ?? 0) > 0
        ? 5
        : cropDefinition(id).minutes
const experiencePercent = computed(() => {
    const v = view.value
    if (!v) return 0
    if (v.level === 10) return 100
    const low = v.catalog.levels[v.level - 1],
        high = v.catalog.levels[v.level]
    return Math.max(0, Math.min(100, ((v.farm!.exp - low) / (high - low)) * 100))
})
const experienceText = computed(() => {
    const v = view.value
    if (!v) return ''
    return v.level === 10
        ? t('farm.maxLevel')
        : v.farm!.exp -
              v.catalog.levels[v.level - 1] +
              '/' +
              (v.catalog.levels[v.level] - v.catalog.levels[v.level - 1])
})
const panelTitle = computed(() =>
    panel.value ? t('farm.' + (panel.value === 'warehouse' ? 'backpack' : panel.value)) : ''
)
const orderDefinition = (id: string) => view.value!.catalog.orders.find((o) => o.id === id)!
const orderCash = (id: string) =>
    Math.ceil(
        Object.entries(orderDefinition(id).requirements).reduce(
            (n, [crop, qty]) => n + qty * cropDefinition(crop).sell,
            0
        ) * 1.25
    )
const canDeliver = (id: string) =>
    Object.entries(orderDefinition(id).requirements).every(
        ([crop, qty]) => (view.value!.farm!.produce[crop] || 0) >= qty
    )
const deliverable = computed(
    () =>
        view.value?.farm?.orders.filter((o) => 'templateId' in o && canDeliver(o.templateId))
            .length ?? 0
)
const tradePrice = computed(() =>
    tradeCrop.value
        ? panel.value === 'sell'
            ? cropDefinition(tradeCrop.value).sell
            : cropDefinition(tradeCrop.value).price
        : 0
)
const tradeMaximum = computed(() =>
    panel.value === 'sell'
        ? view.value?.farm?.produce[tradeCrop.value] || 0
        : Math.floor((view.value?.cash || 0) / (tradePrice.value || 1))
)
const formatTime = (ms: number) =>
    ms <= 0
        ? t('farm.ready')
        : ms >= 3600000
          ? Math.ceil(ms / 3600000) + ' ' + t('farm.hours')
          : Math.ceil(ms / 60000) + ' ' + t('farm.minutes')
const remainingTime = (plant: FarmPlant) =>
    formatTime(Math.max(0, plant.durationMs * (1 - plantProgress(plant))))
const unlockText = (level: number) =>
    [
        ...view.value!.catalog.crops.filter((c) => c.level === level).map((c) => cropName(c.id)),
        ...([1, 3, 5].includes(level)
            ? [t('farm.plotCount', { count: level === 1 ? 6 : level === 3 ? 9 : 12 })]
            : [])
    ].join(' · ')
function popoverPosition(id: number, w: number, h: number) {
    const element = w === 338 ? seedPicker.value : tooltip.value
    w = element?.offsetWidth || w
    h = element?.offsetHeight || h
    const p = farmLayout(width.value, height.value).plots[id]
    const left = Math.max(
        12,
        Math.min(width.value - Math.min(w, width.value - 24) - 12, p.x - w / 2)
    )
    const top = p.y - h - 60 >= 12 ? p.y - h - 60 : Math.min(height.value - h - 12, p.y + 45)
    return { left: left + 'px', top: Math.max(12, top) + 'px' }
}
function hideHover() {
    if (hoverTimer) clearTimeout(hoverTimer)
    hoverTimer = undefined
    hoverCandidate = null
    hovered.value = null
    entranceHovered.value = null
}
function entranceHover(id: FarmEntranceId | null) {
    hideHover()
    if (sceneState.value.enabled) entranceHovered.value = id
}
function openEntrance(id: FarmEntranceId) {
    if (!sceneState.value.enabled) return
    hideHover()
    entrances.value?.activate(id)
}
function sceneHover(value: FarmHover) {
    if (!value || blocked.value || panel.value || seedTarget.value !== null) {
        hideHover()
        return
    }
    if (value.kind === 'entry') {
        if (entranceHovered.value !== value.id) entranceHover(value.id)
        return
    }
    if (hoverCandidate === value.id) return
    hideHover()
    hoverCandidate = value.id
    hoverTimer = setTimeout(() => {
        hovered.value = value.id
    }, 250)
}
function dismiss() {
    seedTarget.value = null
    panel.value = null
    hideHover()
    entrances.value?.dismiss()
}
function openPanel(name: NonNullable<typeof panel.value>) {
    if (!farmSettingsVisible && (name === 'settings' || name === 'backup')) return
    if (busy.value) return
    if (name === 'codex') codexTab.value = 'crops'
    seedTarget.value = null
    hideHover()
    entrances.value?.dismiss()
    panel.value = name
}
watch(panel, async (value, previous) => {
    if (value) {
        if (!previous) lastFocused = document.activeElement as HTMLElement
        await nextTick()
        dialog.value?.querySelector<HTMLElement>('button')?.focus()
    } else lastFocused?.focus()
})
watch(view, (v) => {
    if (
        seedTarget.value !== null &&
        (!v?.farm ||
            seedTarget.value >= v.unlockedPlots ||
            v.farm.plots[seedTarget.value].plant ||
            v.saveError)
    )
        seedTarget.value = null
})
function showNotice(message: string) {
    notice.value = message
    if (noticeTimer) clearTimeout(noticeTimer)
    noticeTimer = setTimeout(() => {
        notice.value = ''
        noticeTimer = undefined
    }, 2000)
}
async function refresh() {
    if (busy.value || disposed) return
    const token = ++loadSequence
    try {
        const response = await window.api.getFarm()
        if (disposed || busy.value || token !== loadSequence) return
        if (response.code === 200 && response.data) {
            view.value = response.data
            loadError.value = ''
            dataReady.value = true
        } else { dataReady.value = false; loadError.value = response.message || t('farm.loadFailed') }
    } catch (error) {
        if (!disposed && token === loadSequence) {
            dataReady.value = false
            loadError.value = error instanceof Error ? error.message : t('farm.loadFailed')
        }
    }
}
function feedbackAt(plot: number, text: string, crop?: string, water = false) {
    const layout = farmLayout(width.value, height.value),
        p = layout.plots[plot],
        id = crypto.randomUUID()
    effects.value.push({ id, x: p.x, y: p.y - 35, text, water, scale: layout.scale })
    if (crop && backpack.value) {
        const r = backpack.value.getBoundingClientRect()
        flights.value.push({
            id,
            crop,
            x: p.x,
            y: p.y - 30,
            dx: r.x + r.width / 2 - p.x,
            dy: r.y + r.height / 2 - p.y + 30
        })
    }
    const timer = setTimeout(() => {
        effects.value = effects.value.filter((e) => e.id !== id)
        flights.value = flights.value.filter((f) => f.id !== id)
        effectTimers.delete(timer)
    }, 1350)
    effectTimers.add(timer)
}
async function run(operation: FarmOperation): Promise<boolean> {
    if (!view.value || blocked.value) return false
    busy.value = true
    ++loadSequence
    hideHover()
    const before = view.value.level
    try {
        const response = await window.api.executeFarm({
            requestId: crypto.randomUUID(),
            expectedRevision: view.value.revision,
            operation
        })
        if (disposed) return false
        if (response.code !== 200 || !response.data) {
            showNotice(response.message || t('farm.failed'))
            return false
        }
        view.value = response.data.view
        const f = response.data.feedback
        if ('plotIds' in operation) {
            const text =
                operation.type === 'sow'
                    ? t('farm.sown')
                    : operation.type === 'water'
                      ? t('farm.watered')
                      : Object.entries(f.items)
                            .map(([crop, n]) => cropName(crop) + ' ×' + n)
                            .join(' · ')
            feedbackAt(
                operation.plotIds[0],
                text,
                operation.type === 'harvest' ? Object.keys(f.items)[0] : undefined,
                operation.type === 'water'
            )
            if (response.data.view.level > before)
                showNotice(t('farm.levelUp', { level: response.data.view.level }))
        } else {
            const label =
                operation.type === 'buySeed'
                    ? 'farm.bought'
                    : operation.type === 'sell'
                      ? 'farm.sold'
                      : operation.type === 'deliver'
                        ? 'farm.delivered'
                        : 'farm.orderDiscarded'
            showNotice(
                t(label) +
                    (f.cashDelta ? ' · ◈ ' + (f.cashDelta > 0 ? '+' : '') + f.cashDelta : '') +
                    (f.exp ? ' · +' + f.exp + ' EXP' : '')
            )
        }
        return true
    } catch (error) {
        if (!disposed) showNotice(error instanceof Error ? error.message : t('farm.failed'))
        return false
    } finally {
        busy.value = false
        if (!disposed) void refresh()
    }
}
async function sceneTarget(target: FarmTarget, right: boolean) {
    if (right) {
        dismiss()
        return
    }
    if (blocked.value || panel.value) return
    if (target.kind === 'entry') {
        openEntrance(target.id)
        return
    }
    entrances.value?.dismiss()
    if (target.kind === 'blank') {
        dismiss()
        return
    }
    if (seedTarget.value !== null) return
    const mode = plotMode(view.value!, target.id)
    if (mode === 'locked') {
        showNotice(t('farm.unlockAt', { level: target.id < 9 ? 3 : 5 }))
        return
    }
    if (mode === 'sow') {
        hideHover()
        seedTarget.value = target.id
    } else if (mode === 'water' || mode === 'harvest')
        await run({ type: mode, plotIds: [target.id] })
}
async function sow(cropId: string) {
    if (
        seedTarget.value === null ||
        blocked.value ||
        !view.value?.farm?.seeds[cropId] ||
        cropDefinition(cropId).level > view.value.level
    )
        return
    const id = seedTarget.value
    if (await run({ type: 'sow', cropId, plotIds: [id] })) seedTarget.value = null
}
function openBuy(id: string) {
    if (busy.value) return
    tradeCrop.value = id
    count.value = 1
    openPanel('buy')
}
function openSell(id: string) {
    if (busy.value) return
    tradeCrop.value = id
    count.value = 1
    openPanel('sell')
}
async function confirmTrade() {
    if (
        blocked.value ||
        !Number.isSafeInteger(count.value) ||
        count.value < 1 ||
        count.value > tradeMaximum.value
    )
        return
    const selling = panel.value === 'sell'
    if (
        await run({
            type: selling ? 'sell' : 'buySeed',
            cropId: tradeCrop.value,
            count: count.value
        })
    )
        openPanel(selling ? 'warehouse' : 'store')
}
async function backupAction(
    action: () => Promise<{ code: number; message?: string; data?: BackupPreview | null }>,
    preview = false
) {
    if (busy.value) return
    busy.value = true
    try {
        const r = await action()
        if (r.code !== 200) showNotice(r.message || t('farm.failed'))
        else if (preview) backupPreview.value = r.data || null
        else showNotice(t('farm.exported'))
    } catch (error) {
        showNotice(error instanceof Error ? error.message : t('farm.failed'))
    } finally {
        busy.value = false
    }
}
function exportBackup() {
    void backupAction(() => window.api.exportFarmBackup())
}
function selectBackup() {
    void backupAction(() => window.api.selectFarmBackup(), true)
}
function automaticBackup() {
    void backupAction(() => window.api.getAutomaticFarmBackup(), true)
}
async function restoreBackup() {
    if (busy.value || !backupPreview.value || !confirm(t('farm.restoreWarning'))) return
    busy.value = true
    try {
        const r = await window.api.restoreFarmBackup(backupPreview.value.token)
        showNotice(r.code === 200 ? t('farm.restarting') : r.message || t('farm.failed'))
        if (r.code !== 200) busy.value = false
    } catch (error) {
        busy.value = false
        showNotice(error instanceof Error ? error.message : t('farm.failed'))
    }
}
function goBack() {
    void router.push('/home')
}
function windowClose() {
    window.api.closeWindow()
}
function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
        dismiss()
        return
    }
    if (event.key === 'Tab' && panel.value && dialog.value) {
        const nodes = Array.from(
                dialog.value.querySelectorAll<HTMLElement>(
                    'button:not(:disabled),input:not(:disabled)'
                )
            ),
            first = nodes[0],
            last = nodes.at(-1)
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first?.focus()
        }
    }
}
onMounted(() => {
    stopLife = window.api.onFarmLifeState?.((state) => {
        life.value = state
    })
    void window.api.enterFarmLife?.().then((result) => {
        if (result.code === 200 && result.data) life.value = result.data
    })
    manualActivity()
    window.addEventListener('keydown', onKeydown)
    window.addEventListener('blur', hideHover)
    observer = new ResizeObserver(() => {
        if (host.value) {
            width.value = host.value.clientWidth
            height.value = host.value.clientHeight
            hideHover()
        }
    })
    watch(
        host,
        (el) => {
            if (el) {
                width.value = el.clientWidth
                height.value = el.clientHeight
                observer?.observe(el)
            }
        },
        { immediate: true }
    )
    void refresh()
    interval = setInterval(() => {
        if (!document.hidden) void refresh()
    }, 1000)
    unsubscribe = window.api.onGameSaveChanged(() => {
        void refresh()
    })
})
onUnmounted(() => {
    stopLife?.()
    void window.api.leaveFarmLife?.()
    disposed = true
    ++loadSequence
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('blur', hideHover)
    hideHover()
    if (interval) clearInterval(interval)
    if (noticeTimer) clearTimeout(noticeTimer)
    effectTimers.forEach(clearTimeout)
    observer?.disconnect()
    unsubscribe?.()
    void window.api.checkpointFarm().catch(() => {})
})
</script>

<style scoped>
.farm-shell { position: relative; width: 100%; height: 100vh; overflow: hidden; cursor: var(--game-cursor); }
.farm-shell :deep(button), .farm-shell :deep(button:disabled) { cursor: var(--game-cursor) !important; }
.farm-shell :deep(input) { cursor: text; }
.exit-button { width: 58px; height: 58px; border: 3px solid #b77945; border-radius: 50%; background: #fff1d0; color: #68452f; font-size: 36px; line-height: 1; }
.game-loading { position: absolute; inset: 0; z-index: 20; display: grid; place-items: center; background: linear-gradient(#4c743849, #2e563894), var(--loading-background) center/cover; }
.loading-exit { position: absolute; right: 20px; top: 24px; }
.loading-card { width: min(440px, calc(100% - 40px)); padding: 26px; border: 3px solid #b77945; border-radius: 25px; background: #fff2dbeF; color: #68452f; text-align: center; }
.loading-card progress { display: block; width: 100%; height: 20px; accent-color: #87ac4b; margin-bottom: 10px; }
.loading-card button { display: block; margin: 12px auto 0; padding: 8px 20px; border-radius: 12px; }
.farm-loading-leave-active { transition: opacity .25s; pointer-events: none; }
.farm-loading-leave-to { opacity: 0; }
.farm {
    --ink: #664329;
    position: relative;
    height: 100vh;
    width: 100%;
    overflow: hidden;
    color: var(--ink);
    font-family: 'Microsoft YaHei', 'PingFang SC', system-ui, sans-serif;
    background: #80b86a;
    user-select: none;
}
.farm * {
    box-sizing: border-box;
}
.farm button,
.farm input {
    font: inherit;
}
.farm button {
    cursor: pointer;
    color: inherit;
}
.farm button:disabled {
    cursor: default;
    opacity: 0.55;
}
.farm button:focus-visible,
.farm input:focus-visible {
    outline: 3px solid #ffe376;
    outline-offset: 3px;
}
.field {
    position: absolute;
    inset: 0;
}
.window-drag {
    position: absolute;
    top: 0;
    left: 340px;
    right: 280px;
    height: 48px;
    z-index: 2;
    -webkit-app-region: drag;
}
.profile {
    position: absolute;
    left: 18px;
    top: 16px;
    display: flex;
    align-items: center;
    border: 0;
    background: none;
    padding: 0;
    height: 88px;
    z-index: 3;
}
.portrait {
    position: relative;
    z-index: 2;
    width: 88px;
    height: 88px;
    border: 5px solid #fff6dc;
    border-radius: 50%;
    background: #efd5a4;
    overflow: hidden;
    box-shadow: 0 3px 0 #a16e3e;
}
.portrait img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.profile-content {
    margin-left: -16px;
    padding: 10px 16px 11px 28px;
    background: linear-gradient(#fff6d9, #efd5a4);
    border: 3px solid #b77945;
    border-radius: 0 30px 30px 0;
    box-shadow: 0 3px 0 #895a33;
    min-width: 220px;
    text-align: left;
}
.profile-content > strong {
    display: block;
    font-size: 16px;
    letter-spacing: 2px;
    margin: 0 0 7px 14px;
}
.experience {
    position: relative;
    display: block;
    height: 23px;
    width: 180px;
    background: #a5774e;
    border: 2px solid #b98a54;
    border-radius: 14px;
    overflow: hidden;
}
.experience i {
    position: absolute;
    inset: 0 auto 0 0;
    background: linear-gradient(#c7ed77, #83b73f);
    border-radius: 12px;
    transition: width 0.5s;
}
.experience > span {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: #fff9e7;
    font-size: 13px;
    font-weight: 800;
    text-shadow: 0 1px 2px #6f4c30;
}
.level-star {
    position: absolute;
    left: 73px;
    top: 40px;
    width: 43px;
    height: 43px;
    display: grid;
    place-items: center;
    background: #ffd259;
    clip-path: polygon(
        50% 0,
        65% 25%,
        94% 18%,
        87% 48%,
        100% 70%,
        72% 79%,
        65% 100%,
        43% 88%,
        18% 98%,
        16% 70%,
        0 51%,
        22% 34%,
        25% 9%
    );
    font-size: 22px;
    font-weight: 900;
    z-index: 3;
}
.top-actions {
    position: absolute;
    top: 24px;
    right: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    z-index: 3;
}
.store-entry {
    display: flex;
    align-items: center;
    height: 57px;
    gap: 12px;
    border: 3px solid #b77945;
    border-radius: 28px;
    background: linear-gradient(#fff6d9, #efd5a4);
    box-shadow: 0 3px 0 #895a33;
    padding: 0 16px 0 0;
}
.store-entry .farm-icon {
    width: 57px;
    height: 57px;
    margin-left: -7px;
}
.store-entry strong {
    font-size: 25px;
    min-width: 52px;
    text-align: center;
}
.settings-button {
    width: 58px;
    height: 58px;
    border: 0;
    background: none;
    padding: 0;
}
.side-actions {
    position: absolute;
    left: 20px;
    top: 25%;
    display: flex;
    flex-direction: column;
    gap: 20px;
    z-index: 3;
}
.game-button {
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 3px;
    border: 0;
    background: none;
    padding: 0;
    color: #fff9e6 !important;
    min-width: 78px;
}
.entry-art {
    position: relative;
    display: block;
    width: 78px;
    height: 78px;
}
.game-button strong {
    font-size: 21px;
    text-shadow:
        0 2px 1px #714b24,
        2px 0 1px #714b24,
        -2px 0 1px #714b24,
        0 -1px 1px #714b24,
        0 4px 7px #36552d;
}
.game-button:hover .entry-art {
    transform: translateY(-3px);
    filter: brightness(1.08);
}
.badge {
    position: absolute;
    right: 0;
    top: 0;
    min-width: 24px;
    height: 24px;
    display: grid;
    place-items: center;
    padding: 0 5px;
    background: #ed684c;
    color: #fff9e6;
    border: 2px solid #fff4ca;
    border-radius: 50%;
    font-size: 12px;
    font-weight: 900;
}
.tooltip,
.seed-picker {
    position: absolute;
    z-index: 5;
    border: 1px solid #d6c797;
    border-radius: 15px;
    background: rgb(255 249 225 / 90%);
    box-shadow: 0 6px 20px #384e3033;
}
.tooltip {
    width: 232px;
    padding: 13px 15px;
    pointer-events: none;
    font-size: 12px;
}
.tooltip strong {
    font-size: 15px;
}
.tooltip p {
    margin: 8px 0 0;
}
.growth {
    height: 5px;
    margin-top: 8px;
    border-radius: 4px;
    background: #d6d6bd;
    overflow: hidden;
}
.growth i {
    display: block;
    height: 100%;
    background: #91b74a;
}
.seed-picker {
    width: 338px;
    max-width: calc(100% - 24px);
    padding: 10px;
    max-height: calc(100vh - 24px);
    overflow: auto;
}
.seed-picker header,
.modal header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
}
.close-button {
    border: 0;
    border-radius: 50%;
    background: #eddbb5;
    color: #84532c;
    width: 34px;
    height: 34px;
    flex: none;
    font-size: 23px !important;
}
.seed-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    margin: 8px 0;
}
.seed-option {
    position: relative;
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 3px;
    padding: 6px;
    border: 1px solid #e4d4ad;
    border-radius: 10px;
    background: #fff9e6;
    min-width: 0;
    font-size: 12px !important;
}
.seed-option .item-art {
    width: 48px;
    height: 55px;
}
.seed-option span {
    position: absolute;
    right: 4px;
    top: 5px;
    font-size: 10px;
}
.seed-option small {
    font-size: 10px;
}
.seed-picker > .action-button {
    width: 100%;
    margin-top: 8px;
}
.overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
    background: #24402b70;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
}
.modal {
    width: min(720px, 100%);
    max-height: calc(100vh - 40px);
    overflow: auto;
    background: linear-gradient(#fff7dd, #f5e7c1);
    border: 4px solid #b77945;
    border-radius: 24px;
    box-shadow:
        0 7px 0 #7f512d,
        0 20px 60px #172c3750;
    padding: 22px;
}
.modal header {
    position: sticky;
    top: -22px;
    z-index: 1;
    background: #fff7dd;
    padding: 10px 0;
    margin-top: -10px;
}
.modal-header-actions { display: flex; align-items: center; gap: 12px; }
.store-balance {
    padding: 6px 12px;
    border: 2px solid #d4a65d;
    border-radius: 999px;
    background: #fff1c5;
    color: #754520;
    font-size: 18px;
    font-weight: 900;
    white-space: nowrap;
}
.modal h2 {
    margin: 0;
    font-size: 24px;
}
.item-list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin-top: 14px;
}
.item-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: #fff9e9;
    border: 1px solid #dfc797;
    border-radius: 16px;
    padding: 15px;
    gap: 7px;
    min-width: 0;
}
.item-card > .item-art {
    width: 82px;
    height: 88px;
}
.item-card h3 {
    margin: 0;
    font-size: 16px;
}
.item-card p {
    font-size: 12px;
    line-height: 1.6;
    text-align: center;
    margin: 0;
}
.item-card .quantity {
    position: absolute;
    right: 10px;
    top: 8px;
    font-weight: 700;
}
.action-button,
.settings-list button,
.tabs button,
.quantities button {
    padding: 8px 14px;
    border: 1px solid #678b36;
    border-radius: 12px;
    background: linear-gradient(#b9d575, #8db34b);
    box-shadow: 0 2px 0 #587b31;
    font-weight: 700;
}
.action-button.secondary,
.tabs button,
.quantities button,
.settings-list button {
    background: #f3e2b8;
    border-color: #bf9d69;
    box-shadow: 0 2px 0 #b88b53;
}
.item-card > .action-button {
    width: 100%;
    margin-top: auto;
    font-size: 12px;
}
.tabs,
.quantities,
.card-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin: 12px 0;
}
.tabs .active {
    background: #abc868;
    border-color: #65863c;
}
.crop-stages {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 2px;
    border-top: 1px solid #e4d4ad;
    padding-top: 7px;
}
.crop-stages > div {
    display: flex;
    flex-direction: column;
    align-items: center;
}
.crop-stages .item-art {
    width: 38px;
    height: 48px;
}
.crop-stages small {
    font-size: 10px;
    text-align: center;
}
.codex-label {
    font-size: 11px;
    color: #638136;
}
.order-list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin-top: 12px;
}
.order-card {
    border: 1px solid #dfc797;
    border-radius: 15px;
    background: #fff9e9;
    padding: 14px;
    font-size: 12px;
}
.order-card h3 {
    margin: 0 0 8px;
}
.order-need {
    display: flex;
    align-items: center;
    gap: 5px;
    margin: 5px 0;
}
.order-need .item-art {
    width: 40px;
    height: 44px;
}
.order-need strong {
    flex: 1;
}
.order-need .enough {
    color: #6c983c;
}
.card-actions .action-button {
    padding: 6px 10px;
    font-size: 12px;
}
.trade-details {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 25px;
    margin: 20px 0;
}
.trade-details .item-art {
    width: 120px;
    height: 130px;
}
.quantities {
    justify-content: center;
    align-items: center;
}
.quantities input {
    width: 75px;
    padding: 8px;
    border: 1px solid #bfa476;
    border-radius: 8px;
    text-align: center;
    background: #fff9e6;
}
.trade-confirm {
    display: block;
    margin: 20px auto 8px;
}
.unlock-list p {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 12px;
    border-bottom: 1px solid #dec69f;
    font-size: 13px;
}
.level-display {
    text-align: center;
    font-size: 24px;
    padding: 20px;
}
.settings-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin: 24px 0;
}
.backup-summary {
    border-top: 1px solid #dec69f;
    padding-top: 12px;
}
.notice {
    position: absolute;
    z-index: 20;
    top: 110px;
    left: 50%;
    transform: translateX(-50%);
    max-width: calc(100% - 32px);
    border: 1px solid #d8bc80;
    border-radius: 16px;
    background: #fff5d9ee;
    box-shadow: 0 5px 15px #355a3033;
    padding: 10px 20px;
    font-size: 13px;
    text-align: center;
    pointer-events: none;
}
.save-error {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    max-width: calc(100% - 32px);
    z-index: 6;
    padding: 8px 12px;
    border-radius: 12px;
    background: #fff5d9ee;
    color: #923d2b;
    font-size: 12px;
}
.effects {
    position: absolute;
    inset: 0;
    z-index: 7;
    pointer-events: none;
}
.plot-feedback {
    position: absolute;
    font-size: 16px;
    font-weight: 800;
    color: #fff8cc;
    text-shadow:
        0 2px #704925,
        1px 0 #704925,
        -1px 0 #704925;
    animation: feedback 1.3s ease-out forwards;
    white-space: nowrap;
}
.water-splash {
    position: absolute;
    transform: scale(var(--splash-scale));
    transform-origin: 0 0;
}
.water-drop {
    position: absolute;
    top: -20px;
    width: 10px;
    height: 13px;
    border-radius: 60% 60% 60% 0;
    background: linear-gradient(135deg, #c5f2ff, #59b8e3 65%);
    box-shadow:
        inset 1px 1px 0 #effcff,
        0 1px 2px #236a8d40;
    animation: water-splash 0.8s ease-out both;
}
.harvest-flight {
    position: absolute;
    width: 46px;
    height: 55px;
    animation: flight 0.95s ease-in forwards;
}
.loading {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: #f5e7c1;
    color: #664329;
}
@keyframes feedback {
    from {
        transform: translate(-50%, 0);
        opacity: 1;
    }
    to {
        transform: translate(-50%, -55px);
        opacity: 0;
    }
}
@keyframes water-splash {
    from {
        opacity: 1;
        transform: translate(0, -12px) rotate(-45deg) scale(0.7);
    }
    60% {
        opacity: 0.8;
    }
    to {
        opacity: 0;
        transform: translate(var(--drift), 25px) rotate(-45deg) scale(0.3);
    }
}
@keyframes flight {
    from {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
    }
    to {
        transform: translate(var(--fly-x), var(--fly-y)) scale(0.4);
        opacity: 0;
    }
}
@media (max-width: 900px) {
    .profile {
        transform: scale(0.75);
        transform-origin: top left;
    }
    .top-actions {
        top: 18px;
        right: 14px;
        gap: 9px;
        transform: scale(0.85);
        transform-origin: top right;
    }
    .side-actions {
        left: 12px;
        gap: 16px;
    }
    .entry-art {
        width: 58px;
        height: 58px;
    }
    .game-button strong {
        font-size: 16px;
    }
    .game-button {
        min-width: 60px;
    }
    .item-list {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .order-list {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .modal {
        padding: 16px;
    }
    .modal header {
        top: -16px;
    }
    .notice {
        top: 90px;
    }
}
@media (prefers-reduced-motion: reduce) {
    .water-splash {
        display: none;
    }
    .plot-feedback,
    .harvest-flight {
        animation: none;
    }
    .experience i {
        transition: none;
    }
}
</style>
