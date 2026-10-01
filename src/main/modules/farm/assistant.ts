import { farmExperience } from '../../../shared/farmExperience'
import type { FarmAssistantEvent, FarmAssistantStatus, FarmOperation, FarmView } from '../../types/farm'
import { plantProgress } from './rules'
import { type FarmClock,FarmService } from './service'

export type AssistantPlan = { status: FarmAssistantStatus['state']; orderId?: string; operation?: FarmOperation }
export function planFarmAssistant(view: FarmView): AssistantPlan {
    const farm = view.farm
    if (!farm) return { status: 'waitingPlayer' }
    const empty = farm.plots.slice(0, view.unlockedPlots).find(p => !p.plant)
    const plans = farm.orders.flatMap<AssistantPlan & { priority: number }>(order => {
        if (!('templateId' in order)) return []
        const definition = view.catalog.orders.find(o => o.id === order.templateId)!
        const needs = Object.entries(definition.requirements)
        if (needs.every(([crop, amount]) => (farm.produce[crop] ?? 0) >= amount))
            return [{ priority: 0, status: 'working' as const, orderId: order.instanceId, operation: { type: 'deliver' as const, instanceId: order.instanceId } }]
        const missing = needs.filter(([crop, amount]) => (farm.produce[crop] ?? 0) < amount)
        const planted = missing.flatMap(([crop]) => farm.plots.slice(0, view.unlockedPlots).filter(p => p.plant?.cropId === crop))
        const deficits = missing.map(([crop, amount]) => ({
            crop, amount: Math.max(0, amount - (farm.produce[crop] ?? 0) - farm.plots.filter(p => p.plant?.cropId === crop).length * view.catalog.crops.find(c => c.id === crop)!.yield)
        })).filter(d => d.amount > 0)
        const mature = planted.find(p => plantProgress(p.plant!) >= 1)
        const dry = planted.find(p => !p.plant!.watered && plantProgress(p.plant!) < 1)
        const seed = deficits.find(d => (farm.seeds[d.crop] ?? 0) > 0 && view.catalog.crops.find(c => c.id === d.crop)!.level <= view.level)
        const operation: FarmOperation | undefined = mature ? { type: 'harvest', plotIds: [mature.id] }
            : dry ? { type: 'water', plotIds: [dry.id] }
            : seed && empty ? { type: 'sow', cropId: seed.crop, plotIds: [empty.id] } : undefined
        const status: FarmAssistantStatus['state'] = operation ? 'working' : !deficits.length || !empty ? 'waitingGrowth' : 'missingSeeds'
        return [{ priority: !deficits.length ? 1 : operation ? 2 : 3, status, orderId: order.instanceId, operation }]
    })
    plans.sort((a,b) => a.priority - b.priority)
    const plan = plans.find(p => p.operation) ?? plans.find(p => p.status === 'waitingGrowth') ?? plans[0]
    return plan ?? { status: 'waitingOrders' }
}

export class FarmAssistant {
    private lastManual: number
    private nextAction = 0
    private restDeadline = 0
    private blockedBySave = false
    private suspended = false
    private startedWorking = false
    private owner: string | null = null
    private timer?: ReturnType<typeof setTimeout>
    private running = false
    private status: FarmAssistantStatus = { state: 'waitingPlayer' }
    constructor(private readonly service: FarmService, private readonly clock: FarmClock,
        private readonly canWork: () => boolean, private readonly isFrozen: () => boolean,
        private readonly playerId: () => string | null,
        private readonly publish: (status: FarmAssistantStatus, event?: FarmAssistantEvent) => void,
        private readonly id: () => string, startedAt = clock.monotonic()) {
        this.lastManual = startedAt
    }
    getStatus() { return { ...this.status } }
    private update(state: FarmAssistantStatus['state'], orderId?: string, event?: FarmAssistantEvent['kind']) {
        const changed = this.status.state !== state || this.status.orderId !== orderId
        this.status = { state, orderId }
        if (changed || event) this.publish(this.getStatus(), event ? { id: this.id(), kind: event, at: this.clock.wall() } : undefined)
    }
    manualActivity() {
        this.lastManual = this.clock.monotonic()
        this.startedWorking = false
        this.update('waitingPlayer')
        this.service.recordManualActivity()
    }
    suspend(value: boolean) {
        this.suspended = value
        this.startedWorking = false
        if (value) this.update('paused')
        else this.nextAction = this.clock.monotonic() + farmExperience.actionMs
    }
    start() {
        if (this.running) return
        this.running = true
        const schedule = () => {
            if (!this.running) return
            this.tick()
            const now = this.clock.monotonic()
            const waitingForPlayer = this.status.state === 'waitingPlayer'
            const due = waitingForPlayer ? this.lastManual + farmExperience.idleMs : this.nextAction
            const delay = this.status.state === 'working' ? farmExperience.actionMs
                : this.status.state === 'paused' ? farmExperience.checkMs
                : Math.max(farmExperience.actionMs, Math.min(farmExperience.checkMs, due - now || farmExperience.checkMs))
            this.timer = setTimeout(schedule, delay)
        }
        schedule()
    }
    stop() { this.running = false; if (this.timer) clearTimeout(this.timer); this.timer = undefined }
    tick() {
        const now = this.clock.monotonic()
        if (this.suspended || this.isFrozen() || !this.canWork()) { this.startedWorking = false; this.update('paused'); return }
        const owner = this.playerId()
        if (!owner) return
        if (this.owner && this.owner !== owner) { this.lastManual = now; this.restDeadline = 0; this.nextAction = 0; this.blockedBySave = false }
        this.owner = owner
        if (now - this.lastManual < farmExperience.idleMs) { this.update('waitingPlayer'); return }
        if (this.blockedBySave && this.service.storageError) { this.update('saveError'); return }
        if (now < this.nextAction) return
        try {
            const view = this.service.getView()
            if (view.saveError) throw Error(view.saveError)
            this.blockedBySave = false
            const meta = view.farm!.assistant ?? { successfulActions: 0, restUntil: 0, lastManualAt: 0 }
            if (!this.restDeadline && meta.restUntil > this.clock.wall())
                this.restDeadline = now + Math.min(farmExperience.restMs, meta.restUntil - this.clock.wall())
            if (now < this.restDeadline) { this.update('resting'); this.nextAction = Math.min(this.restDeadline, now + farmExperience.checkMs); return }
            const plan = planFarmAssistant(view)
            if (!plan.operation) {
                this.startedWorking = false
                const changed = this.status.state !== plan.status
                this.update(plan.status, plan.orderId, changed && plan.status === 'missingSeeds' ? 'missingSeeds' : undefined)
                this.nextAction = now + farmExperience.checkMs
                return
            }
            const count = meta.successfulActions + 1
            const resting = count >= farmExperience.actionsBeforeRest
            const result = this.service.execute({ requestId: this.id(), expectedRevision: view.revision, operation: plan.operation }, {
                successfulActions: resting ? 0 : count, restUntil: resting ? this.clock.wall() + farmExperience.restMs : 0, lastManualAt: meta.lastManualAt
            })
            this.nextAction = now + farmExperience.actionMs
            if (!this.startedWorking) { this.startedWorking = true; this.update('working', plan.orderId, 'started') }
            this.update('working', plan.orderId, result.feedback.kind === 'harvest' ? 'harvested' : plan.operation.type === 'deliver' ? 'delivered' : undefined)
            if (resting) { this.restDeadline = now + farmExperience.restMs; this.startedWorking = false; this.update('resting', plan.orderId, 'resting') }
        } catch {
            this.startedWorking = false
            this.blockedBySave = !!this.service.storageError
            this.update(this.blockedBySave ? 'saveError' : 'waitingOrders')
            this.nextAction = now + farmExperience.checkMs
        }
    }
}
