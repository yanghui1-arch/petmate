import {
    ensureFarmLife,
    farmLifeConfig as config,
    type FarmLifeData,
    farmLifeDay,
    type FarmLifeEvent,
    type FarmLifeKind,
    type FarmLifeView,
    type FarmLifeVisit,
    isFarmLifeWork
} from '../../../shared/farmLife'
import type { FarmDevelopmentAction, FarmLifeDevelopmentState } from '../../../shared/farmLifeDevelopment'
import type { FarmView } from '../../types/farm'
import { getOrder } from './catalog'
import { type LifeChoice, lifeChoices, revalidateVisit } from './lifeRules'
import type { FarmClock } from './service'
import { FarmService } from './service'

export interface FarmLifeHost {
    available(): boolean
    blocked(): boolean
    farmOpen(): boolean
    skin(): FarmLifeVisit['skin']
    publish(
        _view: FarmLifeView,
        _speech?: { stage: 'start' | 'return'; event: FarmLifeEvent }
    ): void
    restore(): void
}
/** One bounded visit. All resources and diary results are committed by FarmService. */
export class FarmLife {
    private visit: FarmLifeVisit | null = null
    private phaseAt = 0
    private returnAt = 0
    private nextAt = Infinity
    private protectedUntil = 0
    private tutorialAt = Infinity
    private suspended = false
    private enteredOpen = false
    private timer?: ReturnType<typeof setTimeout>
    private running = false
    private workUnavailableSince: number | null = null
    private readyAt: number | null = null
    private recalled = false
    private service: FarmService
    private clock: FarmClock
    private host: FarmLifeHost
    private id: () => string
    private random: () => number
    private enabled: boolean
    constructor(
        service: FarmService,
        clock: FarmClock,
        host: FarmLifeHost,
        id: () => string,
        random = Math.random,
        enabled: boolean = config.enabled
    ) {
        this.service = service
        this.clock = clock
        this.host = host
        this.id = id
        this.random = random
        this.enabled = enabled
        this.schedule()
    }
    private schedule() {
        this.nextAt = this.clock.monotonic() + config.idleMs +
            this.random() * (config.idleMaxMs - config.idleMs)
    }
    /** Online-only continuity: sleep/restart cannot unlock another leisure trip. */
    private choices(view: FarmView, random = this.random): LifeChoice[] {
        const choices = lifeChoices(view, this.clock.wall(), random)
        const last = view.farm!.life!.recent.at(-1)
        if (!last || isFarmLifeWork(last)) {
            this.workUnavailableSince = null
            return choices
        }
        const work = choices.filter(choice => isFarmLifeWork(choice.kind))
        if (work.length) {
            this.workUnavailableSince = null
            return work
        }
        const now = this.clock.monotonic()
        this.workUnavailableSince ??= now
        return now - this.workUnavailableSince >= config.lifeFallbackMs ? choices : []
    }
    private queueTick() {
        if (!this.running) return
        if (this.timer) clearTimeout(this.timer)
        this.timer = setTimeout(() => {
            this.timer = undefined
            this.tick()
            this.queueTick()
        }, this.visit ? config.activeCheckMs : config.idleCheckMs)
    }
    private retryTutorial() {
        const data = this.service.getView().farm?.life
        if (data?.tutorialPending && !data.tutorialDone)
            this.tutorialAt = this.clock.monotonic() + config.tutorialMs
    }
    getView(): FarmLifeView {
        return { visit: this.visit ? structuredClone(this.visit) : null, enabled: this.enabled }
    }
    /** Dev IPC calls this on the live controller; no timer, save or guard is replaced. */
    developmentState(): FarmLifeDevelopmentState {
        const view = this.service.getView()
        const data = view.farm ? ensureFarmLife(view.farm, this.clock.wall()) : null
        const reason = !this.enabled ? '农场生活功能已关闭。'
            : this.suspended ? '应用处于休眠状态。'
            : this.visit ? '已有出行，请等待返回或点击召回。'
            : !this.host.available() ? '桌宠尚未就绪或已隐藏，请先显示桌宠。'
            : this.host.blocked() ? '桌宠正在活动、睡眠、低精力或显示提醒，暂时不能出行。'
            : this.host.farmOpen() ? '请先关闭农场，再触发出行；出门后手动点击卡片去看看。'
            : view.saveError ? view.saveError
            : !data?.entered ? '请先进入农场一次，再关闭农场。'
            : data.active ? '上一趟出行尚未收尾，请等待或重启游戏。'
            : data.daily.trips >= config.maxTrips ? '今日出行次数已用完。'
            : ''
        const candidates = new Map<FarmLifeKind, LifeChoice>()
        if (!reason) {
            // Enumerate the existing life choices without changing production randomness.
            for (let index = 0; index < 8; index++)
                for (const choice of this.choices(view, () => index / 8))
                    if (!candidates.has(choice.kind)) candidates.set(choice.kind, choice)
        }
        return {
            life: this.getView(), reason,
            choices: [...candidates.values()].map(({ kind, plotIds }) => ({ kind, plotIds })),
            daily: data ? structuredClone(data.daily) : null,
            resources: { cash: view.cash, planted: view.farm?.plots.filter(plot => plot.plant).length ?? 0 },
            setupReason: this.suspended ? '应用处于休眠状态。'
                : this.visit || data?.active ? '尤美正在出行，请等待返回后再调整农田或额度。'
                : view.saveError ?? ''
        }
    }
    editForDevelopment(action: FarmDevelopmentAction) {
        if (this.suspended) throw Error('应用处于休眠状态。')
        if (action !== 'addCoins' && this.visit)
            throw Error('尤美正在出行，请等待返回后再调整农田或额度。')
        this.service.editForDevelopment(action)
        this.publish()
    }
    triggerForDevelopment(kind: FarmLifeKind) {
        const state = this.developmentState()
        if (state.reason) throw Error(state.reason)
        if (!state.choices.some(choice => choice.kind === kind))
            throw Error('该事件没有合格目标：请检查作物状态、成就保护、每日劳动或生活额度。')
        const view = this.service.getView()
        for (let index = 0; index < 8; index++) {
            const choice = this.choices(view, () => index / 8).find(choice => choice.kind === kind)
            if (choice) {
                this.begin(choice, false, ensureFarmLife(view.farm!, this.clock.wall()))
                return this.getView()
            }
        }
        throw Error('目标状态已变化，请刷新后重试。')
    }
    private publish(speech?: { stage: 'start' | 'return'; event: FarmLifeEvent }) {
        this.host.publish(this.getView(), speech)
    }
    private edit(change: (data: FarmLifeData) => void) {
        const view = this.service.getView()
        if (view.saveError) throw new Error(view.saveError)
        return this.service.lifeTransaction(view.revision, change)
    }
    start() {
        if (this.running) return
        // Recover visibility, never replay an abandoned task or fabricate a successful event.
        this.host.restore()
        if (this.enabled) {
            try {
                this.edit((data) => {
                    if (data.active?.tutorial && !data.tutorialDone) data.tutorialPending = true
                    data.active = null
                    if (data.tutorialPending && !data.tutorialDone)
                        this.tutorialAt = this.clock.monotonic() + config.tutorialMs
                })
            } catch {
                /* Storage errors prevent departures. */
            }
            this.running = true
            this.queueTick()
        }
    }
    stop() {
        this.running = false
        if (this.timer) clearTimeout(this.timer)
        this.timer = undefined
        this.workUnavailableSince = null
        this.visit = null
        this.host.restore()
        this.publish()
    }
    suspend(value: boolean) {
        this.suspended = value
        this.workUnavailableSince = null
        this.recall()
        if (this.visit) {
            try {
                if (!this.visit.committed) this.work()
                this.finish()
            } catch {
                this.visit = null
                this.host.restore()
                this.publish()
            }
        }
        this.schedule()
        this.retryTutorial()
        this.queueTick()
    }
    activity() {
        this.schedule()
        this.retryTutorial()
        if (this.visit && ['preparing', 'leaving'].includes(this.visit.phase))
            this.cancelBeforeDeparture()
    }
    interaction() {
        this.protectedUntil = this.clock.monotonic() + config.interactionMs
        this.recall()
    }
    farmEntered() {
        this.enteredOpen = true
        this.activity()
        this.readyAt = null
        this.holdForViewer()
        try {
            this.edit((data) => {
                data.entered = true
            })
        } catch {
            /* Cannot depart without durable entry. */
        }
    }
    farmLeft() {
        if (!this.enteredOpen) return
        this.enteredOpen = false
        this.schedule()
        try {
            const data = ensureFarmLife(this.service.getView().farm!, this.clock.wall())
            if (!data.tutorialDone) this.tutorialAt = this.clock.monotonic() + config.tutorialMs
            if (!data.tutorialDone)
                this.edit((data) => {
                    data.tutorialPending = true
                })
        } catch {
            /* Defer until storage is available. */
        }
    }
    farmReady() {
        if (!this.host.farmOpen() || this.readyAt !== null ||
            !this.visit || !['visiting', 'exiting'].includes(this.visit.phase)) return
        this.readyAt = this.clock.monotonic()
        this.holdForViewer()
    }
    private holdForViewer() {
        if (!this.visit || this.recalled || this.suspended || this.host.blocked() ||
            !['visiting', 'exiting'].includes(this.visit.phase)) return
        const now = this.clock.monotonic()
        this.returnAt = Math.max(this.returnAt, now + config.watchGraceMs)
        this.visit.returnAt = this.clock.wall() + this.returnAt - now
        if (this.visit.phase === 'exiting') this.transition('visiting')
        else this.publish()
    }
    speechFinished(id: string) {
        if (!this.enabled || this.suspended || this.visit?.id !== id || this.visit.phase !== 'preparing') return
        if (!this.host.available() || this.host.blocked() || this.host.farmOpen()) {
            this.cancelBeforeDeparture()
            return
        }
        this.transition('leaving')
    }
    recall() {
        if (!this.visit) return
        this.recalled = true
        if (this.visit.phase === 'returning') {
            this.finish()
            return
        }
        if (['preparing', 'leaving'].includes(this.visit.phase)) {
            this.cancelBeforeDeparture()
            return
        }
        if (!this.visit.committed) this.visit.cancelled = true
        this.returnAt = this.clock.monotonic()
    }
    private cancelBeforeDeparture() {
        this.visit = null
        this.queueTick()
        this.host.restore()
        this.publish()
        try {
            this.edit((data) => {
                data.active = null
            })
        } catch {
            /* Startup also clears pending identity. */
        }
        this.retryTutorial()
    }
    private event(
        visit: FarmLifeVisit,
        plots = 0,
        items: Record<string, number> = {},
        interrupted = false,
        orderReady = false
    ): FarmLifeEvent {
        return {
            id: visit.id,
            at: this.clock.wall(),
            day: ensureFarmLife(this.service.getView().farm!, this.clock.wall()).day,
            kind: visit.kind,
            plots,
            items,
            line: visit.line,
            shown: false,
            interrupted,
            orderReady
        }
    }
    private begin(choice: LifeChoice, tutorial: boolean, data: FarmLifeData) {
        const variants = isFarmLifeWork(choice.kind) ? 3 : 2
        const lines = Array.from({ length: variants }, (_, n) => n).filter(
            (n) => n !== data.lines.at(-1)
        )
        const line = lines[Math.min(lines.length - 1, Math.floor(this.random() * lines.length))]
        const visit: FarmLifeVisit = {
            ...choice,
            id: this.id(),
            tutorial,
            phase: 'preparing',
            since: this.clock.wall(),
            returnAt: 0,
            committed: false,
            cancelled: false,
            line,
            skin: this.host.skin()
        }
        this.edit((data) => {
            if (data.active) throw new Error('出行尚未结束')
            data.active = visit
            if (tutorial) data.tutorialPending = true
        })
        this.visit = visit
        this.phaseAt = this.clock.monotonic()
        this.readyAt = null
        this.recalled = false
        this.publish({ stage: 'start', event: this.event(visit) })
        this.queueTick()
    }
    private transition(phase: FarmLifeVisit['phase']) {
        this.visit!.phase = phase
        this.visit!.since = this.clock.wall()
        this.phaseAt = this.clock.monotonic()
        this.publish()
    }
    private depart() {
        // A crop may become eligible while the goodbye/door animation is playing.
        if (!isFarmLifeWork(this.visit!.kind) &&
            !this.choices(this.service.getView()).some(choice => !isFarmLifeWork(choice.kind))) {
            this.cancelBeforeDeparture()
            return
        }
        const duration = this.visit!.tutorial
            ? 30_000
            : config.minVisitMs + this.random() * (config.maxVisitMs - config.minVisitMs)
        const visit = {
            ...this.visit!,
            phase: 'visiting' as const,
            since: this.clock.wall(),
            returnAt: this.clock.wall() + duration
        }
        this.edit((data) => {
            if (
                data.daily.trips >= config.maxTrips ||
                (isFarmLifeWork(visit.kind)
                    ? data.daily.work >= config.maxWorkTrips
                    : data.daily.life >= config.maxLifeTrips)
            )
                throw new Error('今日出行额度已用完')
            data.active = visit
            data.trips++
            data.daily.trips++
            if (isFarmLifeWork(visit.kind)) data.daily.work++
            else data.daily.life++
            data.recent = [...data.recent, visit.kind].slice(-6)
            data.lines = [...data.lines, visit.line].slice(-6)
        })
        this.visit = visit
        this.workUnavailableSince = null
        this.phaseAt = this.clock.monotonic()
        this.returnAt = this.phaseAt + duration
        // Commit exactly once at real departure; scene playback cannot execute another action.
        this.work()
    }
    private work() {
        const visit = this.visit!,
            view = this.service.getView()
        if (view.saveError) throw new Error(view.saveError)
        const projected = structuredClone(view),
            budget = ensureFarmLife(projected.farm!, this.clock.wall()).daily
        // Revalidation sees the remaining working budget, excluding this reserved visit.
        if (farmLifeDay(visit.since) === projected.farm!.life!.day) {
            budget.trips--
            if (isFarmLifeWork(visit.kind)) budget.work--
            else budget.life--
        }
        const operation = visit.cancelled
            ? null
            : revalidateVisit(projected, visit, this.clock.wall())
        const interrupted = visit.cancelled || (isFarmLifeWork(visit.kind) && !operation)
        const event = this.event(
            visit,
            operation && 'plotIds' in operation ? operation.plotIds.length : 0,
            {},
            interrupted
        )
        this.service.lifeTransaction(
            view.revision,
            (data, farm, feedback) => {
                if (
                    data.active?.id !== visit.id ||
                    data.active.committed ||
                    data.events.some((e) => e.id === visit.id)
                )
                    throw new Error('出行结果已经处理')
                if (feedback) event.items = feedback.items
                if (operation?.type === 'water') data.daily.watered += event.plots
                if (operation?.type === 'harvest') data.daily.harvested += event.plots
                if (visit.kind === 'order' && operation) {
                    const order = farm.orders.find(
                        (order) => 'instanceId' in order && order.instanceId === visit.orderId
                    )
                    event.orderReady =
                        !!order &&
                        'templateId' in order &&
                        Object.entries(getOrder(order.templateId).requirements).every(
                            ([crop, count]) => (farm.produce[crop] ?? 0) >= count
                        )
                }
                if (visit.kind === 'flower' && !interrupted) data.flower = true
                data.events = [...data.events, event]
                if (visit.tutorial) {
                    data.tutorialDone = !interrupted
                    data.tutorialPending = interrupted
                }
                data.active!.committed = true
                data.active!.cancelled = interrupted
            },
            operation ?? undefined
        )
        visit.committed = true
        visit.cancelled = interrupted
        this.publish()
    }
    private finish() {
        const visit = this.visit!
        let event: FarmLifeEvent | undefined
        try {
            const view = this.edit((data) => {
                event = data.events.find((e) => e.id === visit.id)
                data.active = null
            })
            this.choices(view)
        } catch {
            /* Returning is mandatory even when storage is unavailable. */
        }
        this.visit = null
        this.schedule()
        this.retryTutorial()
        this.host.restore()
        this.publish(event ? { stage: 'return', event } : undefined)
        this.queueTick()
    }
    tick() {
        if (!this.enabled || this.suspended) return
        try {
            const now = this.clock.monotonic()
            if (this.visit) {
                const phase = this.visit.phase
                if (this.host.blocked()) this.recall()
                if (!this.visit) return
                if (this.host.farmOpen() && ['preparing', 'leaving'].includes(phase))
                    this.cancelBeforeDeparture()
                if (!this.visit) return
                // A lost/hidden dialogue cancels the visit instead of starting an unread departure.
                if (phase === 'preparing' && now - this.phaseAt >= config.speechTimeoutMs)
                    this.cancelBeforeDeparture()
                else if (phase === 'leaving' && now - this.phaseAt >= config.walkMs) this.depart()
                else if (phase === 'visiting') {
                    if (now >= this.returnAt) this.transition('exiting')
                } else if (phase === 'exiting' && now - this.phaseAt >= config.exitMs)
                    this.transition('returning')
                else if (phase === 'returning' && now - this.phaseAt >= config.returnMs)
                    this.finish()
                return
            }
            const view = this.service.getView()
            if (!view.farm || view.saveError) return
            const data = ensureFarmLife(view.farm, this.clock.wall())
            // Observe work opportunities during cooldown too, so a brief opportunity
            // breaks the continuous two-hour wait instead of being ignored until due.
            const last = data.recent.at(-1)
            const alternating = !!last && !isFarmLifeWork(last)
            const observedChoices = alternating ? this.choices(view) : null
            if (!this.host.available() || this.host.blocked() || this.host.farmOpen()) return
            if (data.active) {
                this.edit((data) => {
                    data.active = null
                })
                return
            }
            if (!data.entered || now < this.protectedUntil) return
            const tutorial = !data.tutorialDone && now >= this.tutorialAt
            if (!tutorial && now < this.nextAt) return
            const choices = observedChoices ?? this.choices(view)
            if (!choices.length) return
            const pool = tutorial
                ? choices.filter((c) => c.kind === 'water' || !isFarmLifeWork(c.kind))
                : choices
            if (!pool.length) return
            const withoutRecent = pool.filter((c) => c.kind !== data.recent.at(-1)),
                varied = withoutRecent.length ? withoutRecent : pool
            let pick = this.random() * varied.reduce((sum, c) => sum + c.weight, 0)
            const choice =
                tutorial && pool.some((c) => c.kind === 'water')
                    ? pool.find((c) => c.kind === 'water')!
                    : (varied.find((c) => (pick -= c.weight) < 0) ?? varied.at(-1)!)
            this.begin(choice, tutorial, data)
        } catch {
            // No success bubble is sent on failure. Restore the visible companion immediately.
            this.visit = null
            this.schedule()
            this.retryTutorial()
            this.host.restore()
            this.publish()
        }
    }
}
