<template>
    <main v-if="state" class="lab">
        <header>
            <span class="badge">隔离验收 · Steam 关闭</span>
            <h1>尤美的农场生活</h1>
            <p>无需等 7 / 20 分钟。事件按钮自动准备场景；正式游戏和当前进度不受影响。</p>
        </header>
        <section class="status" aria-live="polite">
            <strong>{{ phase }}</strong>
            <p>{{ message || state.reason }}</p>
            <small
                >今日出行 {{ daily?.trips }}/4 · 工作 {{ daily?.work }}/3 · 浇水
                {{ daily?.watered }}/10 · 收获 {{ daily?.harvested }}/3</small
            >
        </section>
        <section>
            <h2>一键事件 <small>会重置隔离场景</small></h2>
            <label class="mode"
                ><input
                    v-model="fast"
                    type="checkbox"
                />快速查看结果（跳过出发等待，保留真实工作事务）</label
            >
            <p class="hint">
                完整模式会先对白、扫描换装、推门进入农场，离开桌面时立即保存结果并打开农场。离开前打开取消出发，离开后打开可观看本次演出。
            </p>
            <div class="events">
                <button
                    v-for="(name, kind) in eventNames"
                    :key="kind"
                    :disabled="busy"
                    :data-event="kind"
                    @click="run({ type: 'scenario', kind, fast })"
                >
                    {{ name }}
                </button>
            </div>
        </section>
        <section>
            <h2>流程控制</h2>
            <div class="buttons">
                <button :disabled="busy || !state.life.visit" @click="run({ type: 'next' })">
                    下一阶段
                </button>
                <button :disabled="busy || !state.life.visit" @click="run({ type: 'recall' })">
                    立即召回
                </button>
                <button :disabled="busy" @click="run({ type: 'openFarm' })">
                    打开农场 / 提前接管
                </button>
                <button :disabled="busy || !state.farmOpen" @click="run({ type: 'closeFarm' })">
                    关闭农场
                </button>
                <button :disabled="busy" @click="run({ type: 'restart' })">模拟中途重启</button>
            </div>
        </section>
        <section>
            <h2>规则边界 <small>场景先准备，再触发</small></h2>
            <div class="inline">
                <select v-model="preset">
                    <option v-for="(name, key) in presetNames" :key="key" :value="key">
                        {{ name }}
                    </option>
                </select>
                <button :disabled="busy" @click="run({ type: 'preset', preset })">准备场景</button>
            </div>
            <div class="inline">
                <select v-model="requested">
                    <option v-for="(name, key) in eventNames" :key="key" :value="key">
                        {{ name }}
                    </option>
                </select>
                <button
                    :disabled="busy"
                    data-current-trigger
                    @click="run({ type: 'trigger', kind: requested, fast })"
                >
                    在当前场景触发
                </button>
            </div>
            <p class="hint">
                99 / 499 / 999：尝试触发“收获”应被阻止；打开农场亲自收一次，观察成就。11
                块浇水场景：助手浇最后一块仍不计为亲自浇水。
            </p>
            <div class="checks">
                <label v-for="(name, key) in conditionNames" :key="key"
                    ><input
                        type="checkbox"
                        :checked="state.conditions[key]"
                        :disabled="busy"
                        @change="
                            run({
                                type: 'condition',
                                key,
                                value: ($event.target as HTMLInputElement).checked
                            })
                        "
                    />{{ name }}</label
                >
            </div>
            <p class="hint">
                保存失败请在“推门进入农场”后打开，再推进工作阶段；关闭模拟故障即尝试恢复存档。
            </p>
        </section>
        <section>
            <h2>动画与日记</h2>
            <div class="inline">
                <button :disabled="busy" @click="run({ type: 'diary' })">8 条未读日记</button>
            </div>
            <div class="buttons">
                <button
                    v-for="(name, action) in actionNames"
                    :key="action"
                    :data-animation="action"
                    :disabled="busy || (!!state.life.visit && !state.preview)"
                    @click="run({ type: 'preview', action })"
                >
                    {{ name }}
                </button>
                <button
                    :disabled="busy || (!!state.life.visit && !state.preview)"
                    @click="run({ type: 'preview', action: null })"
                >
                    结束预览
                </button>
            </div>
            <p class="hint">
                纯动作预览不产生任何奖励或记录。桌面推门保留 24
                fps；桥边晃腿循环，擦汗招呼只播一次并保持微笑，门口为静态图。统一工作服。
            </p>
        </section>
        <section>
            <h2>观察结果</h2>
            <p>
                库存：{{ inventory }} · 金币 {{ state.view.cash }} · EXP
                {{ state.view.farm?.exp }} · 版本 {{ state.view.revision }}
            </p>
            <p>
                候选：{{
                    state.candidates
                        .map(
                            (c) =>
                                eventNames[c.kind] +
                                ' ' +
                                (c.plots.length
                                    ? c.plots.map((id) => id + 1).join('、') + '号田'
                                    : '')
                        )
                        .join(' / ') || '没有合格事件'
                }}
            </p>
            <details>
                <summary>成就进度（仅本次测试，不上传 Steam）</summary>
                <ul>
                    <li v-for="entry in achievements" :key="entry.id">
                        {{ entry.id }}：{{ entry.value }} / {{ entry.target }}
                        {{ entry.unlocked ? '✓' : '' }}
                    </li>
                </ul>
            </details>
            <ol class="logs">
                <li v-for="entry in state.log" :key="entry.id">
                    <time>{{ new Date(entry.at).toLocaleTimeString() }}</time> {{ entry.text }}
                </li>
            </ol>
        </section>
        <footer>
            <button :disabled="busy" @click="run({ type: 'reset' })">重置测试存档</button>
            <p>
                关闭此窗口退出整次验收。临时存档：<code>{{ state.path }}</code>
            </p>
        </footer>
    </main>
    <p v-else class="lab">正在启动独立验收环境……</p>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { farmAchievementEntries } from '../../src/shared/farmAchievements'
import { eventNames, type LabCommand, type LabState, type Preset, presetNames } from './types'
const state = ref<LabState>(),
    fast = ref(false),
    busy = ref(false),
    message = ref('')
const preset = ref<Preset>('first'),
    requested = ref<keyof typeof eventNames>('harvest')
const conditionNames = { energy: '低精力', sleep: '睡眠 / 活动阻止', saveFailure: '模拟保存失败' }
const actionNames = {
    departure: '换装后推门去农场',
    bridge: '桥边晃腿',
    door: '门口休息',
    sweat: '擦汗与招呼'
} as const
const phaseNames = {
    preparing: '准备出发 / 对白',
    leaving: '推门进入农场',
    visiting: '正在农场',
    exiting: '离开农场',
    returning: '回到桌面'
}
const phase = computed(() =>
    state.value?.life.visit
        ? phaseNames[state.value.life.visit.phase] + ' · ' + eventNames[state.value.life.visit.kind]
        : state.value?.preview
          ? '纯动画预览'
          : '待命'
)
const daily = computed(() => state.value?.view.farm?.life?.daily)
const inventory = computed(
    () =>
        Object.entries(state.value?.view.farm?.produce ?? {})
            .map(
                ([key, n]) =>
                    (state.value?.view.catalog.crops.find((crop) => crop.id === key)?.name ?? key) +
                    ' ×' +
                    n
            )
            .join('，') || '空'
)
const achievements = computed(() =>
    state.value?.view.farm
        ? farmAchievementEntries(
              state.value.view.farm,
              state.value.view.catalog,
              state.value.view.unlockedPlots
          )
        : []
)
let stop: (() => void) | undefined
async function run(command: LabCommand) {
    busy.value = true
    message.value = ''
    try {
        const result = await window.farmLab.command(command)
        if (!result.ok) message.value = result.message ?? '操作失败'
    } catch (error) {
        message.value = String(error)
    } finally {
        busy.value = false
    }
}
onMounted(async () => {
    stop = window.farmLab.subscribe((value) => (state.value = value))
    state.value = await window.farmLab.state()
})
onUnmounted(() => stop?.())
</script>
<style scoped>
.lab {
    padding: 24px;
    color: #283632;
    font:
        14px/1.55 'Microsoft YaHei',
        sans-serif;
    background: #f5f6ef;
    min-height: 100%;
    box-sizing: border-box;
}
h1 {
    font-size: 27px;
    margin: 8px 0;
}
h2 {
    font-size: 17px;
    margin: 0 0 12px;
}
h2 small {
    font-size: 12px;
    color: #6e7b73;
    font-weight: 400;
}
p {
    margin: 7px 0;
}
.badge {
    font-size: 12px;
    color: #42714e;
    background: #dfecdd;
    padding: 4px 9px;
    border-radius: 6px;
}
section {
    background: #fff;
    border: 1px solid #dbe3d6;
    border-radius: 12px;
    margin: 16px 0;
    padding: 16px;
}
.status {
    border-left: 4px solid #639856;
    background: #eff7e8;
}
.status strong {
    font-size: 17px;
}
button,
select {
    font: inherit;
    border: 1px solid #c4d4bd;
    border-radius: 8px;
    padding: 8px 11px;
    background: #f1f6eb;
    color: inherit;
    cursor: pointer;
}
button:hover {
    background: #deecd3;
}
button:disabled {
    opacity: 0.45;
    cursor: default;
}
.events {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
}
.events button {
    background: #e5f0da;
}
.buttons,
.checks {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}
.hint,
footer p {
    font-size: 12px;
    color: #69786c;
}
.mode {
    display: block;
    margin-bottom: 8px;
}
.inline {
    display: flex;
    gap: 8px;
    margin: 9px 0;
}
.inline select {
    flex: 1;
    min-width: 0;
}
.checks label {
    padding: 5px;
}
.logs {
    height: 165px;
    overflow: auto;
    padding: 10px 12px;
    list-style: none;
    background: #f4f6f1;
    border-radius: 8px;
    font-size: 12px;
}
.logs li {
    padding: 5px 0;
    border-bottom: 1px solid #e4e8df;
}
.logs time {
    color: #74836d;
}
code {
    word-break: break-all;
}
footer {
    padding-bottom: 15px;
}
details li {
    font-size: 11px;
    word-break: break-word;
}
</style>
