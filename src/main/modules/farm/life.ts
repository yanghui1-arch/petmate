import {
    ensureFarmLife,
    farmLifeConfig as config,
    type FarmLifeData,
    farmLifeDay,
    type FarmLifeEvent,
    type FarmLifeView,
    type FarmLifeVisit,
    isFarmLifeWork
} from '../../../shared/farmLife'
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
    private timer?: ReturnType<typeof setInterval>
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
    private retryTutorial() {
        const data = this.service.getView().farm?.life
        if (data?.tutorialPending && !data.tutorialDone)
            this.tutorialAt = this.clock.monotonic() + config.tutorialMs
    }
    getView(): FarmLifeView {
        return { visit: this.visit ? structuredClone(this.visit) : null, enabled: this.enabled }
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
        if (this.timer) return
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
            this.timer = setInterval(() => this.tick(), 250)
        }
    }
    stop() {
        if (this.timer) clearInterval(this.timer)
        this.timer = undefined
        this.visit = null
        this.host.restore()
        this.publish()
    }
    suspend(value: boolean) {
        this.suspended = value
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
    }
    private transition(phase: FarmLifeVisit['phase']) {
        this.visit!.phase = phase
        this.visit!.since = this.clock.wall()
        this.phaseAt = this.clock.monotonic()
        this.publish()
    }
    private depart() {
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
            this.edit((data) => {
                event = data.events.find((e) => e.id === visit.id)
                data.active = null
            })
        } catch {
            /* Returning is mandatory even when storage is unavailable. */
        }
        this.visit = null
        this.schedule()
        this.retryTutorial()
        this.host.restore()
        this.publish(event ? { stage: 'return', event } : undefined)
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
            if (!this.host.available() || this.host.blocked() || this.host.farmOpen()) return
            const view = this.service.getView()
            if (!view.farm || view.saveError) return
            const data = ensureFarmLife(view.farm, this.clock.wall())
            if (data.active) {
                this.edit((data) => {
                    data.active = null
                })
                return
            }
            if (!data.entered || now < this.protectedUntil) return
            const tutorial = !data.tutorialDone && now >= this.tutorialAt
            if (!tutorial && now < this.nextAt) return
            const choices = lifeChoices(view, this.clock.wall(), this.random)
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
