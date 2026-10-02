import type { FarmAssistantEvent } from '../../main/types/farm'
import { farmAssistantEnabled, farmExperience } from '../../shared/farmExperience'

/** One fresh summary, never a backlog of speech. */
export class FarmDialogue {
    private seen = new Set<string>()
    private pending?: FarmAssistantEvent
    private lastShown = -Infinity
    constructor(private readonly _enabled: () => boolean = () => farmAssistantEnabled) {}
    offer(event: FarmAssistantEvent) {
        if (!this._enabled()) {
            this.clear()
            return
        }
        if (this.seen.has(event.id)) return
        this.seen.add(event.id)
        if (this.seen.size > 64) this.seen.delete(this.seen.values().next().value!)
        const priority = { started: 0, missingSeeds: 1, harvested: 2, resting: 3, delivered: 4 }
        if (!this.pending || priority[event.kind] >= priority[this.pending.kind])
            this.pending = event
    }
    clear() {
        this.pending = undefined
    }
    next(now: number, blocked: boolean) {
        if (!this._enabled() || blocked) {
            this.clear()
            return
        }
        if (this.pending && now - this.pending.at > farmExperience.bubbleCooldownMs) this.clear()
        if (!this.pending || now - this.lastShown < farmExperience.bubbleCooldownMs) return
        const event = this.pending
        this.pending = undefined
        this.lastShown = now
        return event.kind
    }
}
