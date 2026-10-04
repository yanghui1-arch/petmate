import { farmLifeConfig, type FarmLifeEvent } from '../../shared/farmLife'
/** Playback acknowledgements are independent of resources and trips. */
export class FarmDiaryPlayback {
    private queued = new Set<string>()
    private known = new Set<string>()
    private elapsed = new Map<string, number>()
    readonly revealed = new Set<string>()
    readonly acknowledged = new Set<string>()
    update(events: FarmLifeEvent[]) {
        const fresh = events.filter((event) => !this.known.has(event.id))
        for (const event of fresh.slice(-5)) if (!event.shown) this.queued.add(event.id)
        for (const event of events) {
            this.known.add(event.id)
            if (event.shown) this.acknowledged.add(event.id)
        }
    }
    current(events: FarmLifeEvent[]): string | undefined {
        return events.find((event) => this.queued.has(event.id) && !this.acknowledged.has(event.id))
            ?.id
    }
    hidden(id: string, current?: string) {
        return this.queued.has(id) && !this.revealed.has(id) && id !== current
    }
    step(
        events: FarmLifeEvent[],
        visible: Set<string>,
        elapsedMs: number,
        paused: boolean,
        automatic = true
    ): string[] {
        if (paused) return []
        const current = this.current(events)
        if (current && automatic) this.revealed.add(current)
        const done: string[] = []
        for (const event of events) {
            if (event.shown || this.acknowledged.has(event.id)) continue
            if (!visible.has(event.id)) {
                this.elapsed.delete(event.id)
                continue
            }
            const elapsed = (this.elapsed.get(event.id) ?? 0) + elapsedMs
            this.elapsed.set(event.id, elapsed)
            if (elapsed >= farmLifeConfig.diaryMs) {
                this.acknowledged.add(event.id)
                done.push(event.id)
            }
        }
        return done
    }
    retry(id: string) {
        this.acknowledged.delete(id)
        this.elapsed.delete(id)
    }
}
