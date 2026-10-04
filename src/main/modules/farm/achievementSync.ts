import type { farmAchievementEntries } from '../../../shared/farmAchievements'

type Entries = ReturnType<typeof farmAchievementEntries>
export interface FarmAchievementSteam {
    ready(): boolean
    names(): string[]
    getStat(_name: string): number | undefined
    setStat(_name: string, value: number): boolean
    achieved(id: string): Promise<boolean>
    unlock(id: string): Promise<void>
    store(): Promise<void>
}

// Absolute saved totals make repeated checkpoints and failed uploads idempotent.
export class FarmAchievementSync {
    private pending?: { owner: string; entries: Entries }
    private running = false
    private lastOwner = ''
    private lastSignature = ''
    private readonly steam: FarmAchievementSteam
    private readonly failure: (error: unknown) => void

    constructor(steam: FarmAchievementSteam, failure: (error: unknown) => void) {
        this.steam = steam
        this.failure = failure
    }

    async sync(owner: string, entries: Entries): Promise<void> {
        this.pending = { owner, entries }
        if (this.running) return
        this.running = true
        try {
            while (this.pending) {
                const next = this.pending
                this.pending = undefined
                if (!this.steam.ready()) continue
                const signature = JSON.stringify(
                    next.entries.map((entry) => [entry.id, entry.value, entry.unlocked])
                )
                if (next.owner === this.lastOwner && signature === this.lastSignature) continue
                const names = new Set(this.steam.names())
                // Leave missing definitions eligible for retry after backend publishing.
                const configured = next.entries.filter((entry) => {
                    if (!names.has(entry.id)) return false
                    // Player-only statistics retain their original, unpublished API names.
                    // Missing backend statistics must not block unrelated achievements.
                    if (['collection', 'minimum', 'watered'].includes(entry.metric)) {
                        const current = this.steam.getStat(entry.stat)
                        return Number.isInteger(current) && current! >= 0
                    }
                    return true
                })
                if (!configured.length) continue
                const stats = new Map<string, number>()
                for (const entry of configured)
                    stats.set(entry.stat, Math.max(stats.get(entry.stat) ?? 0, entry.value))
                let changed = false
                for (const [name, value] of stats) {
                    const current = this.steam.getStat(name)
                    if (!Number.isInteger(current) || current! < 0)
                        throw new Error(`Steam statistic is not configured or ready: ${name}`)
                    const target = Math.min(2_147_483_647, Math.max(current!, value))
                    if (target > current!) {
                        if (!this.steam.setStat(name, target))
                            throw new Error(`Steam rejected statistic: ${name}`)
                        changed = true
                    }
                }
                for (const entry of configured) {
                    if (entry.unlocked && !(await this.steam.achieved(entry.id))) {
                        await this.steam.unlock(entry.id)
                        changed = true
                    }
                }
                // Store even unchanged values on a retry: a previous StoreStats may have failed.
                if (changed || this.lastOwner !== next.owner || this.lastSignature !== signature)
                    await this.steam.store()
                this.lastOwner = next.owner
                this.lastSignature = configured.length === next.entries.length ? signature : ''
            }
        } catch (error) {
            this.lastSignature = ''
            this.failure(error)
        } finally {
            this.running = false
        }
    }
}
