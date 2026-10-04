import { randomUUID } from 'node:crypto'

import { farmCatalog, getCrop, unlockedPlots } from '../../src/main/modules/farm/catalog'
import { FarmLife, type FarmLifeHost } from '../../src/main/modules/farm/life'
import { lifeChoices } from '../../src/main/modules/farm/lifeRules'
import { createFarm, validateFarm } from '../../src/main/modules/farm/rules'
import {
    type FarmClock,
    type FarmRepository,
    FarmService
} from '../../src/main/modules/farm/service'
import type { FarmSnapshot } from '../../src/main/types/farm'
import { farmAchievementEntries, updateFarmAchievements } from '../../src/shared/farmAchievements'
import type { FarmLifeKind, FarmLifeVisit } from '../../src/shared/farmLife'
import { ensureFarmLife, farmLifeConfig as config, isFarmLifeWork } from '../../src/shared/farmLife'
import type { LabAction, LabSkin, Preset } from './types'

function generator(seed: number) {
    return () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
        return seed / 4294967296
    }
}

/** Only imported by the standalone lab. Production state and IPC are not touched. */
export class LabSession {
    private offset = 0
    private random = generator(1)
    private sequence = 0
    readonly clock: FarmClock
    service!: FarmService
    life!: FarmLife
    skin: LabSkin = 'classic'
    preview: LabAction | null = null
    conditions = { energy: false, sleep: false, saveFailure: false }
    log: { id: number; text: string; at: number }[] = []
    private repository: FarmRepository
    private readonly host: FarmLifeHost
    private readonly notify: () => void
    constructor(
        repository: FarmRepository,
        host: FarmLifeHost,
        notify: () => void,
        wall = () => Date.now(),
        mono = () => performance.now()
    ) {
        this.host = host
        this.notify = notify
        this.clock = { wall, monotonic: () => mono() + this.offset }
        this.repository = {
            read: () => repository.read(),
            commit: (snapshot) => {
                if (this.conditions.saveFailure) throw Error('验收模拟：磁盘写入失败')
                repository.commit(snapshot)
            }
        }
        this.replaceController()
    }
    private replaceController() {
        this.service = new FarmService(this.repository, this.clock, randomUUID, () => 0)
        this.life = new FarmLife(this.service, this.clock, this.host, randomUUID, () =>
            this.random()
        )
    }
    note(text: string) {
        this.log = [{ id: ++this.sequence, text, at: this.clock.wall() }, ...this.log].slice(0, 80)
    }
    prepare(preset: Preset = 'water') {
        this.life.stop()
        this.conditions = { energy: false, sleep: false, saveFailure: false }
        this.preview = null
        this.offset = 0
        const farm = createFarm(this.clock.wall(), randomUUID)
        farm.exp = 420
        farm.tutorialRemaining = 0
        farm.seeds = Object.fromEntries(farmCatalog.crops.map((crop) => [crop.id, 30]))
        farm.achievements = {
            harvestedPlots: { wheat: 10 },
            manualHarvestedPlots: { wheat: 10 },
            completedOrders: 0,
            unlocked: []
        }
        farm.harvests = { wheat: 30 }
        const data = ensureFarmLife(farm, this.clock.wall())
        data.entered = true
        data.tutorialDone = true
        const growing = ['water', 'seedlings', 'quota', 'energy', 'manualWater'].includes(preset)
        if (growing || ['harvest', 'order', 'first', '99', '499', '999'].includes(preset)) {
            const count = preset === 'manualWater' ? 12 : 6
            if (count === 12) farm.exp = 900
            for (let id = 0; id < count; id++) {
                const crop = getCrop(growing ? 'carrot' : 'wheat')
                farm.plots[id].plant = {
                    cropId: crop.id,
                    plantedAt: this.clock.wall(),
                    durationMs: crop.minutes * 60_000,
                    elapsedMs: growing ? crop.minutes * 60_000 * 0.15 : crop.minutes * 60_000,
                    watered: preset === 'manualWater' && id < 11,
                    ...(preset === 'manualWater' && id < 11 ? { wateredBy: 'player' as const } : {})
                }
            }
        }
        if (['first', '99', '499', '999'].includes(preset)) {
            const count = preset === 'first' ? 0 : Number(preset)
            farm.achievements.harvestedPlots = { wheat: count }
            farm.achievements.manualHarvestedPlots = count ? { wheat: count } : {}
            farm.harvests = { wheat: count * getCrop('wheat').yield }
        }
        if (preset === 'quota')
            data.daily = { trips: 4, work: 3, life: 1, watered: 10, harvested: 3 }
        if (preset === 'empty')
            data.daily = { trips: 1, work: 0, life: 1, watered: 0, harvested: 0 }
        data.trips = data.daily.trips
        if (preset === 'flower') data.trips = 3
        if (preset === 'energy') this.conditions.energy = true
        updateFarmAchievements(farm, farmCatalog, unlockedPlots(farm.exp))
        validateFarm(farm)
        const old = this.repository.read()
        this.repository.commit({ farm, cash: 10000, revision: old.revision + 1, receipts: [] })
        this.replaceController()
        this.service.getView()
        this.note('已重置隔离场景：' + preset + '；不会读取或修改玩家进度。')
        this.notify()
    }
    candidates() {
        return lifeChoices(this.service.getView(), this.clock.wall(), () => 0.5)
    }
    reason(kind?: FarmLifeKind) {
        const visit = this.life.getView().visit
        if (visit && !kind) {
            if (visit.committed)
                return visit.cancelled
                    ? '玩家已接管；已保存的真实结果保留，人物按流程返回。'
                    : '工作已保存；可打开农场观看，也可推进离场与返回。'
            return '正在演出，工作尚未保存；提前打开农场或召回会取消未完成工作。'
        }
        if (this.host.farmOpen()) return '农场仍打开：先关闭测试农场才能安排新出行；离开后打开只观看本次演出。'
        if (this.conditions.energy) return '低精力：禁止出行。'
        if (this.conditions.sleep) return '睡眠 / 活动阻止出行。'
        if (!this.host.available()) return '测试桌宠不可见或尚未就绪。'
        const view = this.service.getView()
        if (view.saveError)
            return '模拟保存失败：没有提交奖励；取消勾选保存失败以恢复存档，再重试。'
        const data = ensureFarmLife(view.farm!, this.clock.wall())
        if (data.daily.trips >= config.maxTrips) return '今日 4 次出行额度已满。'
        if (kind === 'harvest' || kind === 'order') {
            const manual = view.farm!.achievements?.manualHarvestedPlots ?? {}
            if (!Object.values(manual).some((count) => count > 0))
                return '玩家尚未首次收获：助手不能替玩家完成第一次。'
            const harvest = farmAchievementEntries(
                view.farm!,
                farmCatalog,
                view.unlockedPlots
            ).find((entry) => entry.metric === 'harvest')!.value
            if ([99, 499, 999].includes(harvest))
                return `累计 ${harvest} 次：下一次成就收获必须由玩家亲自完成。`
            if (data.daily.harvested >= config.maxHarvest) return '今日 3 块助手收获额度已满。'
        }
        if (kind && !this.candidates().some((choice) => choice.kind === kind))
            return '当前没有该事件的合格候选：检查作物成熟度、成就保护、订单缺口与每日额度。'
        return '资格与保护正常；触发按钮仅跳过等待和随机抽取。'
    }
    /** Find a controlled seed through the actual weighted selection, without bypassing guards. */
    trigger(kind: FarmLifeKind | 'tutorial') {
        if (this.life.getView().visit) throw Error('已有出行，请先完成或召回。')
        this.preview = null
        if (this.host.farmOpen() || this.host.blocked() || !this.host.available())
            throw Error(this.reason())
        if (kind === 'tutorial') {
            this.service.lifeTransaction(this.service.getView().revision, (data) => {
                data.tutorialDone = false
                data.tutorialPending = true
            })
            this.life.farmEntered()
            this.life.farmLeft()
            this.offset += config.tutorialMs + 1
        } else {
            this.life.activity()
            this.offset += config.idleMaxMs + 1
        }
        const view = this.service.getView(),
            data = ensureFarmLife(view.farm!, this.clock.wall())
        let found = false
        for (let seed = 1; seed <= 10000; seed++) {
            const random = generator(seed)
            const choices = lifeChoices(structuredClone(view), this.clock.wall(), random)
            if (!choices.length) break
            const pool =
                kind === 'tutorial'
                    ? choices.filter(
                          (choice) => choice.kind === 'water' || !isFarmLifeWork(choice.kind)
                      )
                    : choices
            const varied = pool.filter((choice) => choice.kind !== data.recent.at(-1))
            const selected = varied.length ? varied : pool
            let pick = random() * selected.reduce((n, choice) => n + choice.weight, 0)
            const chosen =
                kind === 'tutorial' && pool.some((choice) => choice.kind === 'water')
                    ? pool.find((choice) => choice.kind === 'water')
                    : (selected.find((choice) => (pick -= choice.weight) < 0) ?? selected.at(-1))
            if (chosen && (kind === 'tutorial' || chosen.kind === kind)) {
                this.random = generator(seed)
                found = true
                break
            }
        }
        if (!found) {
            if (data.recent.at(-1) === kind)
                throw Error('最近一次已做过该事件：真实规则优先换一种。可重新准备场景测试此事件。')
            throw Error(this.reason(kind === 'tutorial' ? undefined : kind))
        }
        this.life.tick()
        const visit = this.life.getView().visit
        if (!visit || (kind !== 'tutorial' && visit.kind !== kind))
            throw Error(this.reason(kind === 'tutorial' ? undefined : kind))
        this.note(
            '真实出行开始：' +
                visit.kind +
                '；目标地块 ' +
                visit.plotIds.map((id) => id + 1).join('、')
        )
        this.notify()
    }
    next() {
        const visit = this.life.getView().visit
        if (!visit) throw Error('当前没有出行。')
        if (visit.phase === 'preparing') {
            this.life.speechFinished(visit.id)
            this.note('推进真实阶段：对白结束，开始换装。')
            this.notify()
            return
        }
        const duration =
            visit.phase === 'leaving'
                  ? config.walkMs
                  : visit.phase === 'visiting'
                    ? config.maxVisitMs
                    : visit.phase === 'exiting'
                      ? config.exitMs
                      : config.returnMs
        this.offset += duration + 1
        this.life.tick()
        this.note('推进真实阶段：' + (this.life.getView().visit?.phase ?? '已返回'))
        this.notify()
    }
    tick() {
        // Ordinary idle scheduling is explicit in the lab; active visits use real elapsed time.
        if (this.life.getView().visit) this.life.tick()
    }
    restart() {
        // Simulate abandoned runtime without normal stop clearing its durable identity.
        this.host.restore()
        this.replaceController()
        this.life.start()
        this.life.stop()
        this.note('已模拟重启恢复：未完成任务不重放，已提交库存与日记保留。')
        this.notify()
    }
    get skippedMs() {
        return this.offset
    }
    snapshot(): FarmSnapshot {
        return this.repository.read()
    }
    get currentSkin(): FarmLifeVisit['skin'] {
        return this.skin
    }
}
