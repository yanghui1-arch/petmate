<template>
    <main class="farm" v-if="view">
        <header class="topbar">
            <button class="back" @click="goBack">← {{ t('farm.back') }}</button>
            <div class="title">
                <strong>{{ t('farm.title') }}</strong
                ><button class="level-link" @click="openPanel('level')">{{ levelText }}</button>
            </div>
            <img class="exp-icon" :src="statusSprites.experience" alt="" />
            <div class="experience"><div :style="{ width: `${experiencePercent}%` }"></div></div>
            <button class="cash" :disabled="busy" @click="openPanel('store')">
                <img class="top-icon" :src="toolSprites.store" alt="" />{{ t('farm.store') }} ·
                {{ view.cash }}
            </button>
            <button @click="openPanel('warehouse')">
                <img class="top-icon" :src="statusSprites.warehouse" alt="" />{{
                    t('farm.warehouse')
                }}
            </button>
            <button class="close" @click="windowClose">×</button>
        </header>

        <div class="body">
            <section class="field" aria-label="农场场景">
                <div class="skyline" v-if="tool.kind !== 'place' && tool.kind !== 'move'">
                    <span>{{ t('farm.greeting') }}</span>
                </div>
                <farm-scene :state="sceneState" @target="sceneTarget" />
                <div class="companion">
                    <span v-if="bubble">{{ bubble }}</span>
                </div>
                <div
                    class="tool-status"
                    v-if="tool.kind === 'place' || tool.kind === 'move'"
                    role="status"
                >
                    <span>{{ toolText }}</span>
                    <button :disabled="busy" :title="t('farm.cancelHint')" @click="cancelTool">
                        {{ t('farm.cancelTool') }}
                    </button>
                </div>
            </section>

            <aside class="sidebar" v-if="drawerOpen" :aria-label="drawerTitle">
                <header class="drawer-header">
                    <h2>{{ drawerTitle }}</h2>
                    <button
                        class="drawer-close"
                        :aria-label="t('farm.closeDrawer')"
                        @click="closeDrawer"
                    >
                        ×
                    </button>
                </header>
                <section v-if="side === 'orders'" class="orders">
                    <article
                        v-for="(order, index) in view.farm!.orders"
                        :key="index"
                        class="order-card"
                    >
                        <template v-if="'templateId' in order">
                            <strong>{{ t('farm.orderNumber', { number: index + 1 }) }}</strong>
                            <p
                                v-for="(count, crop) in orderDefinition(order.templateId)
                                    .requirements"
                                :key="crop"
                            >
                                {{ cropName(String(crop)) }}
                                {{ view.farm!.produce[String(crop)] || 0 }}/{{ count }}
                            </p>
                            <small
                                >◈ {{ orderCash(order.templateId) }} · +{{
                                    orderDefinition(order.templateId).exp
                                }}
                                EXP</small
                            >
                            <div class="card-actions">
                                <button
                                    :disabled="!canDeliver(order.templateId) || busy"
                                    @click="run({ type: 'deliver', instanceId: order.instanceId })"
                                >
                                    {{ t('farm.deliver') }}</button
                                ><button
                                    :disabled="busy"
                                    @click="run({ type: 'discard', instanceId: order.instanceId })"
                                >
                                    {{ t('farm.discard') }}
                                </button>
                            </div>
                        </template>
                        <template v-else
                            ><strong>{{ t('farm.restocking') }}</strong>
                            <p>{{ formatTime(order.remainingMs) }}</p></template
                        >
                    </article>
                </section>
                <section v-else class="plot-detail">
                    <template v-if="selectedPlot === null"
                        ><p>{{ t('farm.choosePlot') }}</p></template
                    >
                    <template v-else-if="view.farm!.plots[selectedPlot].plant">
                        <h3>{{ cropName(view.farm!.plots[selectedPlot].plant!.cropId) }}</h3>
                        <p>{{ stageLabel(view.farm!.plots[selectedPlot].plant!) }}</p>
                        <p>
                            {{ t('farm.remaining') }}
                            {{ remainingTime(view.farm!.plots[selectedPlot].plant!) }}
                        </p>
                        <p>
                            {{ t('farm.expectedYield') }} ×{{
                                cropDefinition(view.farm!.plots[selectedPlot].plant!.cropId).yield
                            }}
                        </p>
                        <button
                            v-if="stage(view.farm!.plots[selectedPlot].plant!) === 3"
                            :disabled="busy"
                            @click="plotAction('harvest')"
                        >
                            {{ t('farm.harvest') }}
                        </button>
                        <button
                            v-else
                            :disabled="busy || view.farm!.plots[selectedPlot].plant!.watered"
                            @click="plotAction('water')"
                        >
                            {{
                                view.farm!.plots[selectedPlot].plant!.watered
                                    ? t('farm.watered')
                                    : t('farm.water')
                            }}
                        </button>
                    </template>
                    <template v-else>
                        <h3>{{ t('farm.selectSeed') }}</h3>
                        <p v-if="view.saveError" class="seed-error" role="alert">
                            {{ view.saveError }}
                        </p>
                        <div class="seed-list">
                            <button
                                v-for="crop in view.catalog.crops"
                                :key="crop.id"
                                class="seed-option"
                                :disabled="
                                    busy ||
                                    !!view.saveError ||
                                    crop.level > view.level ||
                                    !view.farm!.seeds[crop.id]
                                "
                                @click="sow(crop.id)"
                            >
                                <farm-item-art
                                    class="seed-icon"
                                    :id="crop.id"
                                    kind="seed"
                                    :muted="crop.level > view.level"
                                />
                                <span class="seed-info">
                                    <strong
                                        >{{ cropName(crop.id) }}
                                        <span>×{{ view.farm!.seeds[crop.id] || 0 }}</span></strong
                                    >
                                    <small v-if="crop.level > view.level"
                                        >Lv.{{ crop.level }} · {{ t('farm.locked') }}</small
                                    >
                                    <template v-else>
                                        <small
                                            >{{ seedMinutes(crop.id) }}
                                            {{ t('farm.minutes') }}</small
                                        >
                                        <small
                                            v-if="
                                                crop.id === 'wheat' &&
                                                view.farm!.tutorialRemaining > 0
                                            "
                                            >{{
                                                t('farm.tutorialRemaining', {
                                                    count: view.farm!.tutorialRemaining
                                                })
                                            }}</small
                                        >
                                    </template>
                                </span>
                                <span class="seed-action">{{
                                    busy
                                        ? t('farm.submitting')
                                        : crop.level > view.level
                                          ? t('farm.locked')
                                          : !view.farm!.seeds[crop.id]
                                            ? t('farm.noSeeds')
                                            : t('farm.sow')
                                }}</span>
                            </button>
                        </div>
                        <button class="seed-shop" @click="openSeedShop">
                            <img :src="toolSprites.store" alt="" />{{ t('farm.store') }}
                        </button>
                    </template>
                </section>
            </aside>
        </div>

        <nav class="toolbar">
            <button
                :disabled="busy || !!view.saveError"
                :class="{ active: tool.kind === 'water' }"
                @click="equipWater"
            >
                <img :src="toolSprites.water" alt="" />{{ t('farm.water') }}
            </button>
            <button
                :disabled="busy || !!view.saveError"
                :class="{ 'has-ready': matureCount > 0 }"
                @click="harvestAll"
            >
                <img :src="toolSprites.harvest" alt="" />{{ t('farm.harvestAll')
                }}<span v-if="matureCount">{{ matureCount }}</span>
            </button>
            <button @click="showOrders">
                <img :src="toolSprites.orders" alt="" />{{ t('farm.orders') }}
            </button>
            <button :disabled="busy" @click="openPanel('decorate')">
                <img :src="toolSprites.decorate" alt="" />{{ t('farm.decorate') }}
            </button>
            <button :disabled="busy" @click="openPanel('codex')">
                <img :src="toolSprites.codex" alt="" />{{ t('farm.codex') }}
            </button>
            <button :disabled="busy" @click="openPanel('backup')">
                <img :src="toolSprites.backup" alt="" />{{ t('farm.backup') }}
            </button>
        </nav>
        <div class="notice" v-if="notice" role="status" aria-live="polite">{{ notice }}</div>

        <div class="overlay" v-if="panel" @click.self="panel = null">
            <section class="modal">
                <header>
                    <h2>{{ panelTitle }}</h2>
                    <button @click="panel = null">×</button>
                </header>
                <template v-if="panel === 'warehouse'">
                    <div class="tabs">
                        <button
                            v-for="tab in warehouseTabs"
                            :key="tab"
                            :class="{ active: warehouseTab === tab }"
                            @click="warehouseTab = tab"
                        >
                            {{ t(`farm.${tab}`) }}
                        </button>
                    </div>
                    <div class="item-list" v-if="warehouseTab === 'seeds'">
                        <article
                            v-for="crop in view.catalog.crops"
                            :key="crop.id"
                            class="illustrated-card"
                        >
                            <farm-item-art
                                :id="crop.id"
                                kind="seed"
                                :muted="crop.level > view.level"
                            />
                            <strong>{{ cropName(crop.id) }}</strong
                            ><span>×{{ view.farm!.seeds[crop.id] || 0 }}</span
                            ><small
                                >{{ seedMinutes(crop.id) }} {{ t('farm.minutes') }} · Lv.{{
                                    crop.level
                                }}</small
                            ><small v-if="crop.id === 'wheat' && view.farm!.tutorialRemaining > 0">
                                {{
                                    t('farm.tutorialRemaining', {
                                        count: view.farm!.tutorialRemaining
                                    })
                                }} </small
                            ><button
                                :disabled="
                                    !view.farm!.seeds[crop.id] ||
                                    crop.level > view.level ||
                                    busy ||
                                    !!view.saveError
                                "
                                @click="sow(crop.id)"
                            >
                                {{ t('farm.sow') }}
                            </button>
                        </article>
                    </div>
                    <div class="item-list" v-else-if="warehouseTab === 'produce'">
                        <article
                            v-for="crop in view.catalog.crops"
                            :key="crop.id"
                            class="illustrated-card"
                        >
                            <farm-item-art
                                :id="crop.id"
                                kind="crop"
                                :muted="crop.level > view.level"
                            />
                            <strong>{{ cropName(crop.id) }}</strong
                            ><span>×{{ view.farm!.produce[crop.id] || 0 }}</span
                            ><small>◈ {{ crop.sell }} / {{ t('farm.each') }}</small
                            ><button
                                :disabled="!view.farm!.produce[crop.id]"
                                @click="openSell(crop.id)"
                            >
                                {{ t('farm.sell') }}
                            </button>
                        </article>
                    </div>
                    <div class="item-list" v-else>
                        <article
                            v-for="item in view.catalog.decorations"
                            :key="item.id"
                            class="illustrated-card decoration-stock"
                            @click="openDecoration(item.id)"
                        >
                            <farm-item-art
                                :id="item.id"
                                kind="decoration"
                                :muted="item.level > view.level"
                            />
                            <strong>{{ decorationName(item.id) }}</strong
                            ><span>×{{ view.farm!.decorations[item.id] || 0 }}</span
                            ><small
                                >{{ t('farm.placed') }} {{ placedCount(item.id) }} ·
                                {{ t('farm.available') }} {{ availableDecoration(item.id) }} ·
                                {{ item.width }}×1</small
                            ><button
                                :disabled="!canEquipDecoration(item.id)"
                                @click.stop="openDecoration(item.id)"
                            >
                                {{ t('farm.place') }}
                            </button>
                        </article>
                    </div>
                </template>
                <template v-else-if="panel === 'store'"
                    ><div class="tabs">
                        <button
                            :class="{ active: storeTab === 'seeds' }"
                            @click="storeTab = 'seeds'"
                        >
                            {{ t('farm.seeds') }}</button
                        ><button
                            :class="{ active: storeTab === 'decorations' }"
                            @click="storeTab = 'decorations'"
                        >
                            {{ t('farm.decorations') }}
                        </button>
                    </div>
                    <div class="item-list">
                        <article v-for="item in storeItems" :key="item.id" class="illustrated-card">
                            <farm-item-art
                                :id="item.id"
                                :kind="storeTab === 'seeds' ? 'seed' : 'decoration'"
                                :muted="item.level > view.level"
                            />
                            <strong>{{
                                storeTab === 'seeds' ? cropName(item.id) : decorationName(item.id)
                            }}</strong
                            ><span>◈ {{ item.price }}</span
                            ><small
                                >Lv.{{ item.level }} · {{ t('farm.owned') }} ×{{
                                    storeTab === 'seeds'
                                        ? view.farm!.seeds[item.id] || 0
                                        : view.farm!.decorations[item.id] || 0
                                }}</small
                            ><button :disabled="item.level > view.level" @click="openBuy(item.id)">
                                {{ item.level > view.level ? t('farm.locked') : t('farm.buy') }}
                            </button>
                        </article>
                    </div></template
                >
                <template v-else-if="panel === 'buy' || panel === 'sell'">
                    <farm-item-art
                        class="trade-art"
                        :id="panel === 'sell' ? sellCrop : buyId"
                        :kind="
                            panel === 'sell' ? 'crop' : storeTab === 'seeds' ? 'seed' : 'decoration'
                        "
                    />
                    <p>
                        {{
                            panel === 'buy'
                                ? storeTab === 'seeds'
                                    ? cropName(buyId)
                                    : decorationName(buyId)
                                : cropName(sellCrop)
                        }}
                    </p>
                    <div class="quantities">
                        <button v-for="value in [1, 5, 10]" :key="value" @click="count = value">
                            {{ value }}</button
                        ><button
                            v-if="panel === 'sell'"
                            @click="count = view.farm!.produce[sellCrop] || 0"
                        >
                            {{ t('farm.all') }}</button
                        ><input v-model.number="count" type="number" min="1" />
                    </div>
                    <p v-if="panel === 'sell' && orderNeeds(sellCrop) && !sellWarningShown">
                        {{ t('farm.sellWarning') }}
                    </p>
                    <button
                        :disabled="busy || !Number.isSafeInteger(count) || count < 1"
                        @click="confirmTrade"
                    >
                        {{ t('farm.confirm') }} · ◈ {{ tradeTotal }}
                    </button></template
                >
                <template v-else-if="panel === 'codex'"
                    ><div class="item-list">
                        <article
                            v-for="crop in view.catalog.crops"
                            :key="crop.id"
                            class="illustrated-card"
                        >
                            <farm-item-art
                                :id="crop.id"
                                kind="crop"
                                :muted="crop.level > view.level"
                            />
                            <strong>{{ cropName(crop.id) }}</strong
                            ><span>{{
                                crop.level > view.level
                                    ? t('farm.notUnlocked')
                                    : view.farm!.harvests[crop.id] || 0
                                      ? t('farm.lit')
                                      : t('farm.notHarvested')
                            }}</span
                            ><small
                                >{{ crop.minutes }} {{ t('farm.minutes') }} ·
                                {{ t('farm.harvested') }} ×{{
                                    view.farm!.harvests[crop.id] || 0
                                }}</small
                            >
                            <div class="crop-stages">
                                <div v-for="phase in [0, 1, 2, 3]" :key="phase">
                                    <farm-item-art
                                        :id="crop.id"
                                        :stage="phase"
                                        :muted="
                                            crop.level > view.level || !view.farm!.harvests[crop.id]
                                        "
                                    /><small>{{ t(`farm.stage${phase}`) }}</small>
                                </div>
                            </div>
                            <p>{{ crop.description }}</p>
                        </article>
                    </div></template
                >
                <template v-else-if="panel === 'level'">
                    <p>{{ t('farm.totalExperience') }}：{{ view.farm!.exp }} EXP</p>
                    <p v-if="view.level === 10">{{ t('farm.maxLevel') }}</p>
                    <p v-else>
                        {{ t('farm.nextLevel') }}：{{ view.catalog.levels[view.level] }} EXP
                    </p>
                    <div class="item-list">
                        <article v-for="(threshold, index) in view.catalog.levels" :key="index">
                            <strong>Lv.{{ index + 1 }}</strong>
                            <span>{{ threshold }} EXP</span>
                            <small>{{
                                index + 1 <= view.level ? t('farm.unlocked') : t('farm.locked')
                            }}</small>
                            <small>{{ unlockText(index + 1) }}</small>
                        </article>
                    </div>
                </template>
                <template v-else-if="panel === 'decorate'">
                    <p>{{ t('farm.decorationHint') }}</p>
                    <div class="decoration-list">
                        <button
                            v-for="item in view.catalog.decorations"
                            :key="item.id"
                            class="decoration-card"
                            :disabled="!canEquipDecoration(item.id)"
                            @click="openDecoration(item.id)"
                        >
                            <farm-item-art
                                :id="item.id"
                                kind="decoration"
                                :muted="!canEquipDecoration(item.id)"
                            />
                            <strong>{{ decorationName(item.id) }}</strong>
                            <small
                                >{{ t('farm.available') }} ×{{ availableDecoration(item.id) }} ·
                                {{ item.width }}×1</small
                            >
                            <small v-if="item.level > view.level"
                                >Lv.{{ item.level }} · {{ t('farm.locked') }}</small
                            >
                            <small v-else-if="!availableDecoration(item.id)">{{
                                t('farm.noDecorations')
                            }}</small>
                            <small v-else-if="view.farm!.placed.length >= 12">{{
                                t('farm.decorationLimit')
                            }}</small>
                        </button>
                    </div>
                </template>
                <template v-else-if="panel === 'backup'"
                    ><p>{{ t('farm.backupScope') }}</p>
                    <button @click="exportBackup">{{ t('farm.exportBackup') }}</button
                    ><button @click="selectBackup">{{ t('farm.selectBackup') }}</button
                    ><button @click="automaticBackup">{{ t('farm.lastAutomatic') }}</button>
                    <div v-if="backupPreview" class="backup-summary">
                        <p>{{ backupPreview.createdAt }}</p>
                        <p>Lv.{{ backupPreview.level }} · ◈ {{ backupPreview.cash }}</p>
                        <p>{{ backupPreview.scope }}</p>
                        <button :disabled="busy" @click="restoreBackup">
                            {{ t('farm.restoreConfirm') }}
                        </button>
                    </div></template
                >
            </section>
        </div>
    </main>
    <main v-else class="loading">
        {{ loadError || t('farm.loading')
        }}<button v-if="loadError" @click="refresh()">{{ t('farm.retry') }}</button>
    </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { plantProgress, plantStage } from '../../main/modules/farm/rules'
import type { BackupPreview, FarmOperation, FarmPlant, FarmView } from '../../main/types/farm'
import { statusSprites, toolSprites } from '../assets/farm'
import FarmItemArt from '../components/farm/FarmItemArt.vue'
import FarmScene from '../components/farm/FarmScene.vue'
import type { FarmSceneState } from '../game/FarmScene'
import type { FarmCell, FarmTarget, FarmTool } from '../game/farmSceneModel'
import { placementAllowed, plotIssue } from '../game/farmSceneModel'

const { t } = useI18n()
const router = useRouter()
const view = ref<FarmView | null>(null)
const loadError = ref('')
const notice = ref('')
const bubble = ref('')
const youmeiAction = ref<'idle' | 'water' | 'plant' | 'harvest' | 'walk'>('idle')
const youmeiFrame = ref(0)
const busy = ref(false)
const panel = ref<
    'warehouse' | 'store' | 'buy' | 'sell' | 'codex' | 'level' | 'decorate' | 'backup' | null
>(null)
const side = ref<'orders' | 'plot'>('orders')
const drawerOpen = ref(false)
const warehouseTab = ref<'seeds' | 'produce' | 'decorations'>('seeds')
const warehouseTabs = ['seeds', 'produce', 'decorations'] as const
const storeTab = ref<'seeds' | 'decorations'>('seeds')
const selectedPlot = ref<number | null>(null)
const selectedEmptyPlot = computed(() => {
    const v = view.value
    const id = selectedPlot.value
    return !!v?.farm && id !== null && id < v.unlockedPlots && !v.farm.plots[id]?.plant
})
const drawerTitle = computed(() =>
    t(
        side.value === 'orders'
            ? 'farm.orders'
            : selectedEmptyPlot.value
              ? 'farm.seeds'
              : 'farm.plotDetail'
    )
)
const tool = ref<FarmTool>({ kind: 'inspect' })
const buyId = ref('')
const sellCrop = ref('')
const count = ref(1)
const sellWarningShown = ref(false)
const backupPreview = ref<BackupPreview | null>(null)
let timer: ReturnType<typeof setInterval> | null = null
let frameTimer: ReturnType<typeof setInterval> | null = null
let actionTimer: ReturnType<typeof setTimeout> | null = null
let bubbleTimer: ReturnType<typeof setTimeout> | null = null
let noticeTimer: ReturnType<typeof setTimeout> | null = null
let unsubscribe: (() => void) | null = null
let bubbleUntil = 0

const levelText = computed(() =>
    view.value?.level === 10 ? 'Lv.10 · 满级' : `Lv.${view.value?.level ?? 1}`
)
const experiencePercent = computed(() => {
    const v = view.value
    if (!v) return 0
    if (v.level === 10) return 100
    const low = v.catalog.levels[v.level - 1],
        high = v.catalog.levels[v.level]
    return Math.max(0, Math.min(100, ((v.farm!.exp - low) / (high - low)) * 100))
})
const matureCount = computed(
    () =>
        view.value?.farm?.plots.filter((plot) => plot.plant && plantStage(plot.plant) === 3)
            .length ?? 0
)
const panelTitle = computed(() => (panel.value ? t(`farm.${panel.value}`) : ''))
const storeItems = computed(() =>
    storeTab.value === 'seeds'
        ? (view.value?.catalog.crops ?? [])
        : (view.value?.catalog.decorations ?? [])
)
const tradeTotal = computed(() => {
    const v = view.value
    if (!v) return 0
    const item =
        panel.value === 'sell'
            ? v.catalog.crops.find((c) => c.id === sellCrop.value)
            : storeTab.value === 'seeds'
              ? v.catalog.crops.find((c) => c.id === buyId.value)
              : v.catalog.decorations.find((d) => d.id === buyId.value)
    return (
        (panel.value === 'sell' && item && 'sell' in item ? item.sell : (item?.price ?? 0)) *
        count.value
    )
})
const cropDefinition = (id: string) => view.value!.catalog.crops.find((c) => c.id === id)!
const seedMinutes = (id: string) =>
    id === 'wheat' && (view.value?.farm?.tutorialRemaining ?? 0) > 0
        ? 5
        : cropDefinition(id).minutes
const cropName = (id: string) => t(`farm.crops.${id}`)
const decorationName = (id: string) => t(`farm.decorNames.${id}`)
const unlockText = (level: number) => {
    const crops =
        view.value?.catalog.crops
            .filter((crop) => crop.level === level)
            .map((crop) => cropName(crop.id)) ?? []
    const decorations =
        view.value?.catalog.decorations
            .filter((item) => item.level === level)
            .map((item) => decorationName(item.id)) ?? []
    const plots =
        level === 1
            ? [t('farm.plotCount', { count: 6 })]
            : level === 3
              ? [t('farm.plotCount', { count: 9 })]
              : level === 5
                ? [t('farm.plotCount', { count: 12 })]
                : []
    return [...crops, ...decorations, ...plots].join(' · ')
}
const orderDefinition = (id: string) => view.value!.catalog.orders.find((o) => o.id === id)!
const orderCash = (id: string) =>
    Math.ceil(
        Object.entries(orderDefinition(id).requirements).reduce(
            (total, [crop, n]) => total + n * cropDefinition(crop).sell,
            0
        ) * 1.25
    )
const canDeliver = (id: string) =>
    Object.entries(orderDefinition(id).requirements).every(
        ([crop, n]) => (view.value!.farm!.produce[crop] || 0) >= n
    )
const orderNeeds = (crop: string) =>
    view.value?.farm?.orders.some(
        (o) => 'templateId' in o && orderDefinition(o.templateId).requirements[crop]
    ) ?? false
const placedCount = (id: string) =>
    view.value?.farm?.placed.filter((item) => item.decorationId === id).length ?? 0
const stage = (plant: FarmPlant) => plantStage(plant)
const stageLabel = (plant: FarmPlant) => t(`farm.stage${stage(plant)}`)
const formatTime = (ms: number) =>
    ms <= 0
        ? t('farm.ready')
        : ms >= 3600000
          ? `${Math.ceil(ms / 3600000)} ${t('farm.hours')}`
          : `${Math.ceil(ms / 60000)} ${t('farm.minutes')}`
const remainingTime = (plant: FarmPlant) =>
    formatTime(Math.max(0, plant.durationMs * (1 - plantProgress(plant))))
const sceneLabels = computed(() => ({
    empty: t('farm.empty'),
    stages: [0, 1, 2, 3].map((phase) => t(`farm.stage${phase}`)),
    crops: Object.fromEntries(
        (view.value?.catalog.crops ?? []).map((crop) => [crop.id, cropName(crop.id)])
    )
}))
const sceneState = computed<FarmSceneState>(() => ({
    view: view.value!,
    tool: tool.value,
    selected: selectedPlot.value,
    enabled: !busy.value && !panel.value,
    action: youmeiAction.value,
    frame: youmeiFrame.value,
    labels: sceneLabels.value
}))
const toolText = computed(() => {
    const current = tool.value
    if (current.kind === 'place' || current.kind === 'move')
        return t(current.kind === 'move' ? 'farm.moveTool' : 'farm.placeTool', {
            name: decorationName(current.decorationId)
        })
    return ''
})
function cancelTool() {
    tool.value = { kind: 'inspect' }
}
function closeDrawer() {
    drawerOpen.value = false
}
function openPanel(name: NonNullable<typeof panel.value>) {
    if (busy.value) return
    cancelTool()
    closeDrawer()
    panel.value = name
}
function showOrders() {
    if (busy.value) return
    cancelTool()
    side.value = 'orders'
    drawerOpen.value = true
}
function equipWater() {
    if (busy.value || view.value?.saveError) return
    panel.value = null
    closeDrawer()
    tool.value = tool.value.kind === 'water' ? { kind: 'inspect' } : { kind: 'water' }
}
const availableDecoration = (id: string) =>
    Math.max(0, (view.value?.farm?.decorations[id] ?? 0) - placedCount(id))
const canEquipDecoration = (id: string) =>
    !busy.value &&
    !view.value?.saveError &&
    availableDecoration(id) > 0 &&
    (view.value?.farm?.placed.length ?? 12) < 12 &&
    (view.value?.catalog.decorations.find((item) => item.id === id)?.level ?? Infinity) <=
        (view.value?.level ?? 0)
watch(panel, (value) => {
    if (value) {
        cancelTool()
        closeDrawer()
    }
})
watch(view, (value) => {
    const current = tool.value
    if (!value?.farm || value.saveError) {
        cancelTool()
        return
    }
    if (
        current.kind === 'sow' &&
        (!(value.farm.seeds[current.cropId] > 0) ||
            cropDefinition(current.cropId).level > value.level)
    ) {
        cancelTool()
        showNotice(t('farm.noSeeds'))
    } else if (
        current.kind === 'place' &&
        !canEquipDecorationAfterRefresh(current.decorationId, value)
    )
        cancelTool()
    else if (
        current.kind === 'move' &&
        !value.farm.placed.some((item) => item.instanceId === current.instanceId)
    )
        cancelTool()
})
function canEquipDecorationAfterRefresh(id: string, value: FarmView) {
    return (
        !!value.farm &&
        availableDecoration(id) > 0 &&
        value.farm.placed.length < 12 &&
        (value.catalog.decorations.find((item) => item.id === id)?.level ?? Infinity) <= value.level
    )
}
async function sceneTarget(target: FarmTarget, right: boolean) {
    if (busy.value || panel.value || !view.value) return
    if (right) {
        cancelTool()
        closeDrawer()
        if (target.kind === 'decoration')
            await run({ type: 'reclaim', instanceId: target.instanceId })
        return
    }
    const current = tool.value
    if (current.kind === 'place' || current.kind === 'move') {
        if (target.kind !== 'cell' || !placementAllowed(view.value, current, target.cell)) {
            cancelTool()
            showNotice(t('farm.placementCancelled'))
        } else await placeDecoration(target.cell, current)
        return
    }
    if (target.kind === 'plot') {
        if (current.kind === 'sow' || current.kind === 'water') {
            const issue = plotIssue(view.value, current, target.id)
            if (issue) {
                showNotice(t(`farm.${issue}`))
                return
            }
            selectedPlot.value = target.id
            side.value = 'plot'
            await run(
                current.kind === 'sow'
                    ? { type: 'sow', cropId: current.cropId, plotIds: [target.id] }
                    : { type: 'water', plotIds: [target.id] }
            )
        } else selectPlot(target.id)
    } else if (current.kind === 'inspect') {
        if (target.kind === 'decoration') openPlaced(target.instanceId)
        else closeDrawer()
    }
}
function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
        cancelTool()
        closeDrawer()
        panel.value = null
    }
}
function harvestAll() {
    if (!busy.value) {
        cancelTool()
        plotAction('harvest', true)
    }
}
function playAction(action: typeof youmeiAction.value) {
    youmeiAction.value = action
    if (actionTimer) clearTimeout(actionTimer)
    actionTimer = setTimeout(() => {
        youmeiAction.value = 'idle'
    }, 1900)
}
function openSeedShop() {
    if (busy.value) return
    cancelTool()
    closeDrawer()
    storeTab.value = 'seeds'
    panel.value = 'store'
}
function openSell(id: string) {
    if (busy.value) return
    sellCrop.value = id
    count.value = 1
    sellWarningShown.value = false
    panel.value = 'sell'
}
function openBuy(id: string) {
    if (busy.value) return
    buyId.value = id
    count.value = 1
    panel.value = 'buy'
}
function openDecoration(id: string) {
    if (!canEquipDecoration(id)) return
    panel.value = null
    closeDrawer()
    tool.value = { kind: 'place', decorationId: id }
}
function openPlaced(id: string) {
    if (busy.value || view.value?.saveError) return
    const item = view.value?.farm?.placed.find((item) => item.instanceId === id)
    if (item) {
        closeDrawer()
        tool.value = { kind: 'move', decorationId: item.decorationId, instanceId: id }
    }
}
function speak(message: string) {
    if (Date.now() < bubbleUntil) return
    bubble.value = message
    bubbleUntil = Date.now() + 60000
    if (bubbleTimer) clearTimeout(bubbleTimer)
    bubbleTimer = setTimeout(() => {
        bubble.value = ''
    }, 4000)
}
async function refresh(force = false) {
    if (busy.value && !force) return
    try {
        const response = await window.api.getFarm()
        if (response.code === 200 && response.data) {
            const earlier = view.value
            const newlyMature = response.data.farm?.plots.some((plot, index) => {
                if (!plot.plant || plantStage(plot.plant) !== 3) return false
                const old = earlier?.farm?.plots[index].plant
                return !old || (old.plantedAt === plot.plant.plantedAt && plantStage(old) < 3)
            })
            view.value = response.data
            loadError.value = ''
            if (newlyMature) speak(t('farm.matureBubble'))
        } else loadError.value = response.message || t('farm.loadFailed')
    } catch (error) {
        loadError.value = error instanceof Error ? error.message : t('farm.loadFailed')
    }
}
function showNotice(message: string) {
    notice.value = message
    if (noticeTimer) clearTimeout(noticeTimer)
    noticeTimer = setTimeout(() => {
        notice.value = ''
        noticeTimer = null
    }, 2000)
}
async function run(operation: FarmOperation): Promise<boolean> {
    if (!view.value || busy.value || view.value.saveError) return false
    busy.value = true
    const before = view.value.level
    try {
        const response = await window.api.executeFarm({
            requestId: crypto.randomUUID(),
            expectedRevision: view.value.revision,
            operation
        })
        if (response.code !== 200 || !response.data) {
            showNotice(response.message || t('farm.failed'))
            await refresh(true)
            return false
        }
        view.value = response.data.view
        if (operation.type === 'sow') playAction('plant')
        else if (operation.type === 'water') playAction('water')
        else if (operation.type === 'harvest') playAction('harvest')
        const feedback = response.data.feedback
        const gains = Object.entries(feedback.items).map(
            ([crop, count]) => `${cropName(crop)}×${count}`
        )
        if (feedback.exp) gains.push(`+${feedback.exp} EXP`)
        if (feedback.cashDelta)
            gains.push(`◈ ${feedback.cashDelta > 0 ? '+' : ''}${feedback.cashDelta}`)
        if (response.data.view.level > before) gains.push(`Lv.${response.data.view.level}`)
        showNotice([feedback.message, ...gains].join(' · '))
        if (operation.type === 'sow') speak(t('farm.sowBubble'))
        else if (operation.type === 'water') speak(t('farm.waterBubble'))
        else if (operation.type === 'harvest') speak(t('farm.harvestBubble'))
        return true
    } catch (error) {
        showNotice(error instanceof Error ? error.message : t('farm.failed'))
        await refresh(true)
        return false
    } finally {
        busy.value = false
    }
}
function selectPlot(id: number) {
    if (!view.value || busy.value || id >= view.value.unlockedPlots) return
    playAction('walk')
    selectedPlot.value = id
    side.value = 'plot'
    drawerOpen.value = true
}
function plotAction(type: 'water' | 'harvest', batch = false) {
    if (!view.value || busy.value || view.value.saveError) return
    if (!batch && selectedPlot.value === null) return
    const ids = batch
        ? view.value.farm!.plots.filter((p) => p.id < view.value!.unlockedPlots).map((p) => p.id)
        : [selectedPlot.value!]
    void previewAndRun({ type, plotIds: ids })
}
async function previewAndRun(operation: FarmOperation) {
    if (busy.value || view.value?.saveError) return
    busy.value = true
    let approved: FarmOperation | null = null
    try {
        const preview = await window.api.previewFarm(operation)
        if (preview.code !== 200 || !preview.data) {
            showNotice(preview.message || t('farm.failed'))
            return
        }
        if (!preview.data.eligible) {
            showNotice(t('farm.noEligible'))
            return
        }
        approved = preview.data.operation
    } catch (error) {
        showNotice(error instanceof Error ? error.message : t('farm.failed'))
    } finally {
        busy.value = false
    }
    if (approved) await run(approved)
}
function sow(cropId: string) {
    if (
        !view.value ||
        busy.value ||
        view.value.saveError ||
        !view.value.farm?.seeds[cropId] ||
        cropDefinition(cropId).level > view.value.level
    )
        return
    panel.value = null
    closeDrawer()
    tool.value = { kind: 'sow', cropId }
}
function confirmTrade() {
    if (panel.value === 'buy') {
        void run(
            storeTab.value === 'seeds'
                ? { type: 'buySeed', cropId: buyId.value, count: count.value }
                : { type: 'buyDecoration', decorationId: buyId.value, count: count.value }
        )
    } else if (panel.value === 'sell') {
        if (orderNeeds(sellCrop.value) && !sellWarningShown.value) {
            sellWarningShown.value = true
            showNotice(t('farm.sellWarning'))
            return
        }
        void run({ type: 'sell', cropId: sellCrop.value, count: count.value })
    }
}
async function placeDecoration(
    cell: FarmCell,
    current: Extract<FarmTool, { kind: 'place' | 'move' }>
) {
    const success = await run(
        current.kind === 'move'
            ? { type: 'move', instanceId: current.instanceId, ...cell }
            : { type: 'place', decorationId: current.decorationId, ...cell }
    )
    if (success) cancelTool()
}
async function exportBackup() {
    const r = await window.api.exportFarmBackup()
    showNotice(r.code === 200 ? t('farm.exported') : r.message || t('farm.failed'))
}
async function selectBackup() {
    const r = await window.api.selectFarmBackup()
    if (r.code === 200) backupPreview.value = r.data || null
    else showNotice(r.message || t('farm.failed'))
}
async function automaticBackup() {
    const r = await window.api.getAutomaticFarmBackup()
    if (r.code === 200) backupPreview.value = r.data || null
    else showNotice(r.message || t('farm.failed'))
}
async function restoreBackup() {
    if (!backupPreview.value || !confirm(t('farm.restoreWarning'))) return
    busy.value = true
    const r = await window.api.restoreFarmBackup(backupPreview.value.token)
    if (r.code !== 200) {
        busy.value = false
        showNotice(r.message || t('farm.failed'))
    } else showNotice(t('farm.restarting'))
}
function goBack() {
    void router.push('/home')
}
function windowClose() {
    window.api.closeWindow()
}
onMounted(() => {
    window.addEventListener('keydown', onKeydown)
    void refresh()
    timer = setInterval(() => {
        if (!document.hidden) void refresh()
    }, 10000)
    frameTimer = setInterval(() => {
        if (!document.hidden) youmeiFrame.value = 1 - youmeiFrame.value
    }, 450)
    unsubscribe = window.api.onGameSaveChanged(() => {
        void refresh()
    })
})
onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown)
    cancelTool()
    if (timer) clearInterval(timer)
    if (frameTimer) clearInterval(frameTimer)
    if (actionTimer) clearTimeout(actionTimer)
    if (bubbleTimer) clearTimeout(bubbleTimer)
    if (noticeTimer) clearTimeout(noticeTimer)
    unsubscribe?.()
    void window.api.checkpointFarm()
})
</script>

<style scoped>
.farm {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: #e7dfc3;
    color: #443628;
    font-family: 'Microsoft YaHei', 'Noto Sans CJK SC', system-ui, sans-serif;
    overflow: hidden;
}
.farm,
.farm * {
    box-sizing: border-box;
}
.farm button {
    cursor: pointer;
    border: 2px solid #8b7354;
    background: #fff9e6;
    color: #473929;
    border-radius: 5px;
    font: inherit;
    padding: 5px 10px;
}
.farm button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}
.farm button:hover:not(:disabled) {
    background: #f1e5bc;
}
.topbar {
    z-index: 3;
    flex: none;
    height: 78px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 22px;
    background: #f7efd5;
    border-bottom: 3px solid #ae9469;
    box-shadow: 0 3px 0 #d3bb83;
}
.topbar > button {
    min-height: 40px;
    white-space: nowrap;
}
.topbar .title {
    display: flex;
    flex-direction: column;
    min-width: 152px;
}
.title strong {
    font-size: 24px;
}
.title span {
    font-size: 12px;
}
.experience {
    width: 165px;
    height: 13px;
    background: #c9b996;
    border: 1px solid #886f50;
    border-radius: 8px;
    overflow: hidden;
}
.exp-icon,
.top-icon {
    width: 23px;
    height: 23px;
    object-fit: contain;
    image-rendering: pixelated;
}
.topbar button:has(.top-icon) {
    display: flex;
    align-items: center;
    gap: 4px;
}
.experience div {
    height: 100%;
    background: #8caf55;
}
.cash {
    margin-left: auto;
}
.topbar .close {
    font-size: 24px;
    padding: 0 9px;
}
.body {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    overflow: hidden;
}
.field {
    flex: 1;
    position: relative;
    min-width: 0;
    overflow: hidden;
    background: #9cb974;
    isolation: isolate;
}
.field::after {
    content: '';
    position: absolute;
    inset: 20% 0 0;
    z-index: -1;
    background: rgb(125 153 93 / 7.5%);
    pointer-events: none;
}
.skyline {
    position: absolute;
    z-index: 2;
    left: 24px;
    top: 18px;
    color: #456d64;
    font-size: 16px;
    text-shadow: 1px 1px rgb(252 251 225 / 85%);
    pointer-events: none;
}
.topbar .level-link {
    border: 0;
    background: transparent;
    padding: 0;
    text-align: left;
    font-size: 12px;
}
.companion {
    position: absolute;
    z-index: 3;
    left: 4.5%;
    bottom: 6%;
    width: 96px;
    height: 143px;
    pointer-events: none;
}
.companion span {
    position: absolute;
    left: 70px;
    bottom: 115px;
    width: 160px;
    background: #fff9e9;
    border: 2px solid #987e56;
    padding: 5px;
    border-radius: 8px;
    font-size: 11px;
}
.sidebar {
    position: absolute;
    z-index: 4;
    top: 0;
    bottom: 0;
    right: 0;
    width: 320px;
    max-width: calc(100% - 24px);
    background: #f3e7c9;
    border-left: 3px solid #ae9469;
    overflow: auto;
    box-shadow: -6px 0 18px rgb(58 48 26 / 18%);
    animation: farm-drawer-open 180ms ease-out;
}
.drawer-header {
    position: sticky;
    z-index: 1;
    top: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px;
    background: #f3e7c9;
    border-bottom: 1px solid #c9b68c;
}
.drawer-header h2 {
    margin: 0;
    font-size: 18px;
}
@keyframes farm-drawer-open {
    from {
        transform: translateX(100%);
    }
    to {
        transform: translateX(0);
    }
}
@media (prefers-reduced-motion: reduce) {
    .sidebar {
        animation: none;
    }
}
.tabs {
    display: flex;
    gap: 6px;
    padding: 9px;
}
.tabs .active {
    background: #bfd398;
}
.orders,
.plot-detail {
    padding: 0 12px;
}
.plot-detail h3 {
    margin: 12px 0 6px;
    font-size: 17px;
}
.seed-error {
    font-size: 12px;
    color: #933e28;
}
.seed-list {
    display: grid;
    gap: 6px;
}
.farm .seed-option {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 58px;
    padding: 7px;
    text-align: left;
    border-color: #c3aa7d;
}
.farm .seed-option:disabled {
    opacity: 0.65;
}
.seed-icon {
    flex: none;
    width: 40px;
    height: 40px;
    background-size: 400% 100%;
    background-position: right center;
    background-repeat: no-repeat;
    image-rendering: pixelated;
}
.seed-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}
.seed-info strong {
    display: flex;
    justify-content: space-between;
    gap: 4px;
    font-size: 13px;
}
.seed-info strong span,
.seed-info small {
    font-size: 11px;
    font-weight: normal;
}
.seed-action {
    flex: none;
    font-size: 11px;
}
.farm .seed-shop {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    width: 100%;
    margin: 12px 0;
}
.seed-shop img {
    width: 24px;
    height: 24px;
    object-fit: contain;
    image-rendering: pixelated;
}
.order-card {
    padding: 13px;
    margin: 8px 0 10px;
    background: #fff9e9;
    border: 2px solid #c3aa7d;
    border-radius: 6px;
}
.order-card strong {
    display: block;
    margin-bottom: 7px;
    font-size: 17px;
}
.order-card p {
    margin: 4px 0;
    font-size: 13px;
}
.order-card small {
    font-size: 13px;
}
.card-actions {
    display: flex;
    gap: 5px;
    margin-top: 6px;
}
.card-actions button {
    font-size: 11px !important;
    padding: 3px 5px !important;
}
.toolbar {
    z-index: 3;
    flex: none;
    height: 94px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    background: #ead8ad;
    border-top: 3px solid #ad9367;
    padding: 8px 12px;
}
.toolbar button {
    font-size: 14px !important;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 90px;
    height: 73px;
    gap: 2px;
}
.toolbar button.has-ready {
    border-color: #d6a741;
    background: #fff1bc;
}
.toolbar button.has-ready span {
    position: absolute;
    right: 2px;
    top: 1px;
    font-size: 10px;
    font-weight: bold;
}
.toolbar img {
    display: block;
    width: 29px;
    height: 29px;
    object-fit: contain;
    image-rendering: pixelated;
}
.notice {
    position: fixed;
    top: 16px;
    max-width: calc(100% - 32px);
    left: 50%;
    transform: translateX(-50%);
    background: #fff8dc;
    border: 2px solid #9f8858;
    padding: 7px 14px;
    z-index: 6;
    text-align: center;
    overflow-wrap: anywhere;
    pointer-events: none;
}
.overlay {
    position: fixed;
    inset: 0;
    background: #2f2b25a9;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 5;
}
.modal {
    width: min(600px, 90vw);
    max-height: 85vh;
    overflow: auto;
    background: #f8eed5;
    border: 5px solid #a78652;
    box-shadow: 8px 8px #3c3325;
    padding: 15px;
}
.modal header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.modal h2 {
    margin: 0 0 10px;
}
.item-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    max-height: 55vh;
    overflow: auto;
}
.item-list article {
    background: #fff9e9;
    border: 2px solid #d4c6a7;
    padding: 7px;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 4px;
}
.item-list small,
.item-list p {
    grid-column: 1/-1;
}
.item-list button {
    font-size: 11px !important;
}
.quantities {
    display: flex;
    gap: 6px;
}
.quantities input {
    width: 85px;
}
.backup-summary {
    border-top: 2px solid #c4b18d;
    margin-top: 13px;
}
.loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    gap: 12px;
    background: #e7dfc3;
}
@media (max-width: 1000px) {
    .sidebar {
        width: 280px;
    }
    .topbar {
        gap: 8px;
        padding: 8px 12px;
    }
    .topbar .title {
        min-width: 126px;
    }
    .title strong {
        font-size: 20px;
    }
    .experience {
        width: 95px;
    }
    .companion {
        transform: scale(0.78);
        transform-origin: bottom left;
    }
    .toolbar {
        gap: 5px;
    }
    .toolbar button {
        padding: 5px !important;
        width: 70px;
        font-size: 11px !important;
    }
}
@media (max-height: 690px) {
    .topbar {
        height: 64px;
    }
    .toolbar {
        height: 78px;
    }
    .toolbar button {
        height: 62px;
    }
    .toolbar img {
        width: 24px;
        height: 24px;
    }
    .companion {
        transform: scale(0.7);
        transform-origin: bottom left;
    }
    .order-card {
        padding: 8px 10px;
        margin: 6px 0;
    }
}
</style>

<style scoped>
.tool-status {
    position: absolute;
    z-index: 3;
    top: 16px;
    left: 18px;
    width: max-content;
    max-width: calc(100% - 36px);
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    padding: 6px 8px;
    background: rgb(255 248 224 / 94%);
    font-size: 12px;
    border: 1px solid #ad9367;
    border-radius: 6px;
    box-shadow: 0 2px 0 rgb(79 62 35 / 12%);
    pointer-events: none;
}
.tool-status > span {
    flex: 1 1 180px;
    min-width: 0;
    overflow-wrap: anywhere;
}
.tool-status > button {
    flex: none;
    padding: 4px 8px;
    white-space: nowrap;
    pointer-events: auto;
}
.toolbar button.active {
    background: #bfd398;
    border-color: #698348;
}
.item-list .illustrated-card {
    grid-template-columns: 76px minmax(0, 1fr) auto;
    align-items: center;
}
.illustrated-card > .item-art {
    grid-column: 1;
    grid-row: 1 / 4;
}
.illustrated-card > strong {
    grid-column: 2;
}
.illustrated-card > span:not(.item-art) {
    grid-column: 3;
}
.item-list .illustrated-card > small {
    grid-column: 2 / -1;
}
.illustrated-card > button {
    grid-column: 2 / -1;
}
.illustrated-card > p,
.crop-stages {
    grid-column: 1 / -1;
}
.crop-stages {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 3px;
    border-top: 1px solid #ddd0b0;
    padding-top: 7px;
}
.crop-stages > div {
    display: flex;
    align-items: center;
    flex-direction: column;
    min-width: 0;
}
.crop-stages .item-art {
    width: 42px;
    height: 56px;
}
.crop-stages small {
    font-size: 10px;
    text-align: center;
}
.decoration-list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
}
.farm .decoration-card {
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
    padding: 9px;
}
.decoration-card small {
    font-size: 11px;
}
.trade-art {
    width: 96px;
    height: 104px;
}
@media (max-width: 850px) {
    .modal {
        width: 92vw;
    }
    .experience {
        width: 65px;
    }
    .topbar {
        gap: 5px;
    }
    .topbar > button {
        padding: 5px 7px;
        font-size: 12px;
    }
    .topbar .title {
        min-width: 110px;
    }
}
</style>
