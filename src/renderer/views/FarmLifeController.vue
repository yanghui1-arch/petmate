<template>
    <main class="life-controller">
        <header>
            <span class="dev-label">开发验收 · 真实游戏</span>
            <h1>尤美农场控制器</h1>
            <p>跳过等待，完整播放气泡 → 换装 → 出门。出门后由你点击入口卡。</p>
        </header>
        <section class="live-state">
            <span class="phase">{{ phaseName }}</span>
            <p v-if="state?.life.visit">
                {{ eventNames[state.life.visit.kind] }} ·
                {{ state.life.visit.committed ? '结果已保存' : '尚未提交工作' }}
            </p>
            <p v-else>{{ state?.reason || '可以选择下面的合格事件。' }}</p>
            <div v-if="state?.daily" class="quota">
                今日：出行 {{ state.daily.trips }}/{{ config.maxTrips }} · 劳动
                {{ state.daily.work }}/{{ config.maxWorkTrips }} · 生活
                {{ state.daily.life }}/{{ config.maxLifeTrips }} <br />已浇水
                {{ state.daily.watered }} 块 · 已收获 {{ state.daily.harvested }} 块
                <br />每次浇水、收获最多 3 块；生活后等待劳动，连续两小时无劳动机会才可再生活。
            </div>
        </section>
        <section class="events">
            <button
                v-for="(name, kind) in eventNames"
                :key="kind"
                :data-life-event="kind"
                :disabled="busy || !canTrigger(kind)"
                :title="
                    canTrigger(kind)
                        ? '在真实游戏中触发'
                        : state?.reason || '没有合格目标，或受到作物、成就、每日额度保护'
                "
                @click="command('trigger', kind)"
            >
                <strong>{{ name }}</strong>
                <small>{{ targetText(kind) }}</small>
            </button>
        </section>
        <section class="setup">
            <h2>农田与金币</h2>
            <p>
                金币 {{ state?.resources.cash ?? '—' }} · 已种植
                {{ state?.resources.planted ?? '—' }} 块
            </p>
            <div class="events">
                <button
                    v-for="(name, action) in setupActions"
                    :key="action"
                    :data-farm-action="action"
                    :disabled="busy || !state || (action !== 'addCoins' && !!state.setupReason)"
                    :title="action !== 'addCoins' && state?.setupReason ? state.setupReason : name"
                    @click="command(action)"
                >
                    {{ name }}
                </button>
            </div>
            <p v-if="state?.setupReason" class="save-note">{{ state.setupReason }}</p>
            <p class="save-note">直接保存当前进度。铲除无收益；催熟不自动收获，不增加收获次数。</p>
            <p class="save-note">
                重置今日出行、劳动、生活额度及浇水、收获统计，保留历史与成就。
            </p>
        </section>
        <section class="actions">
            <button :disabled="busy || !state?.life.visit" @click="command('recall')">
                召回尤美
            </button>
            <button :disabled="busy" @click="refresh">刷新状态</button>
        </section>
        <p class="instruction">
            不自动打开农场。看到“尤美去农场啦”卡片后，手动点击“去看看”或“主页”验证。
        </p>
        <p class="save-note">
            使用当前游戏进度。真实劳动会保存作物、额度和日记；出行仍遵守成就保护。
        </p>
        <p v-if="message" class="feedback" role="status">{{ message }}</p>
    </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { farmLifeConfig as config, type FarmLifeKind } from '../../shared/farmLife'
import {
    farmDevelopmentActions as setupActions,
    type FarmLifeDevelopmentCommand,
    farmLifeDevelopmentEvents as eventNames,
    type FarmLifeDevelopmentState
} from '../../shared/farmLifeDevelopment'

const state = ref<FarmLifeDevelopmentState>()
const busy = ref(false)
const message = ref('')
const phases = {
    preparing: '出发气泡',
    leaving: '换装与出门',
    visiting: '已到农场 · 桌面保留卡片',
    exiting: '准备返回',
    returning: '返回桌面'
}
const phaseName = computed(() =>
    state.value?.life.visit ? phases[state.value.life.visit.phase] : '待命'
)
const canTrigger = (kind: FarmLifeKind) =>
    !state.value?.reason && !!state.value?.choices.some((choice) => choice.kind === kind)
function targetText(kind: FarmLifeKind) {
    const target = state.value?.choices.find((choice) => choice.kind === kind)
    return target
        ? target.plotIds.length
            ? target.plotIds.length + ' 块合格地块'
            : '可触发'
        : '暂不可触发'
}
async function refresh() {
    try {
        const result = await window.api.getFarmLifeDevelopment()
        if (result.code === 200 && result.data) state.value = result.data
        else message.value = result.message ?? '读取状态失败。'
    } catch (error) {
        message.value = String(error)
    }
}
async function command(action: FarmLifeDevelopmentCommand, kind?: FarmLifeKind) {
    if (busy.value) return
    busy.value = true
    try {
        const result = await window.api.commandFarmLifeDevelopment(action, kind)
        if (result.code === 200 && result.data) {
            state.value = result.data
            message.value =
                action === 'trigger'
                    ? '已开始真实出行，请观看桌宠；出门后自己点击卡片。'
                    : action === 'recall'
                      ? '已请求返回桌面。'
                      : action === 'clearCrops'
                        ? '全部作物已铲除并保存。'
                        : action === 'addCoins'
                          ? '已增加 1000 金币并保存。'
                          : action === 'resetQuota'
                            ? '今日五项出行额度已归零并保存，可以继续验收。'
                            : '全部作物已成熟并保存，可以手动收获。'
        } else message.value = result.message ?? '操作失败。'
    } catch (error) {
        message.value = String(error)
    } finally {
        busy.value = false
    }
}
let timer: ReturnType<typeof setInterval> | undefined
let stop: (() => void) | undefined
onMounted(() => {
    void refresh()
    timer = setInterval(() => void refresh(), 1000)
    stop = window.api.onFarmLifeState(() => void refresh())
})
onUnmounted(() => {
    if (timer) clearInterval(timer)
    stop?.()
})
</script>

<style scoped>
.life-controller {
    height: 100%;
    overflow-y: auto;
    padding: 22px;
    background: #fff8e8;
    color: #704b32;
    font:
        14px/1.6 'Microsoft YaHei',
        sans-serif;
}
.dev-label {
    color: #8b6d35;
    font-size: 12px;
}
h1 {
    margin: 6px 0;
    font-size: 23px;
}
p {
    margin: 8px 0;
}
.live-state {
    margin: 18px 0;
    padding: 14px;
    border: 1px solid #dcc69b;
    border-radius: 14px;
    background: #fffdf4;
}
.phase {
    font-weight: 700;
    color: #597a35;
}
.quota {
    font-size: 12px;
    color: #94734e;
}
.events {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
}
button {
    border: 1px solid #bca16b;
    border-radius: 12px;
    padding: 12px 8px;
    background: #e5efc9;
    color: #5b7038;
    font: inherit;
    cursor: pointer;
}
button:not(:disabled):hover {
    background: #d8e9ae;
}
button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
.events strong,
.events small {
    display: block;
}
.events small {
    font-size: 11px;
    margin-top: 4px;
    font-weight: 400;
}
.actions {
    display: flex;
    gap: 10px;
    margin-top: 16px;
}
.setup {
    margin-top: 18px;
}
.setup h2 {
    font-size: 16px;
    margin: 0;
}
.setup button[data-farm-action='resetQuota'] {
    grid-column: 1 / -1;
    background: #f8e8c4;
    color: #704b32;
}
.actions button {
    flex: 1;
    background: #f8e8c4;
    color: #704b32;
}
.instruction {
    margin-top: 16px;
}
.save-note {
    color: #967758;
    font-size: 12px;
}
.feedback {
    border-left: 3px solid #9bbc60;
    padding: 8px 12px;
    background: #eef3de;
    border-radius: 6px;
}
</style>
