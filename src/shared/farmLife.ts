export type FarmLifeKind =
    | 'water'
    | 'harvest'
    | 'order'
    | 'rest'
    | 'butterfly'
    | 'seedlings'
    | 'walk'
    | 'check'
    | 'flower'
export type FarmLifePhase = 'preparing' | 'leaving' | 'visiting' | 'exiting' | 'returning'
export type FarmLifeEvent = {
    id: string
    at: number
    day: string
    kind: FarmLifeKind
    plots: number
    items: Record<string, number>
    line: number
    shown: boolean
    interrupted: boolean
    orderReady: boolean
}
export type FarmLifeVisit = {
    id: string
    kind: FarmLifeKind
    plotIds: number[]
    orderId?: string
    tutorial: boolean
    phase: FarmLifePhase
    since: number
    returnAt: number
    committed: boolean
    cancelled: boolean
    line: number
    skin: 'classic' | 'labor-skin' | 'school-uniform'
}
export type FarmLifeData = {
    entered: boolean
    tutorialDone: boolean
    tutorialPending?: boolean
    trips: number
    flower: boolean
    day: string
    daily: { trips: number; work: number; life: number; watered: number; harvested: number }
    events: FarmLifeEvent[]
    recent: FarmLifeKind[]
    lines: number[]
    active: FarmLifeVisit | null
}
export function validateFarmLife(data: FarmLifeData): void {
    const nonnegative = (n: number) => Number.isSafeInteger(n) && n >= 0
    const kinds = [
        'water',
        'harvest',
        'order',
        'rest',
        'butterfly',
        'seedlings',
        'walk',
        'check',
        'flower'
    ]
    const day = (value: string) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    if (
        !data ||
        !day(data.day) ||
        ![data.entered, data.tutorialDone, data.flower].every(
            (value) => typeof value === 'boolean'
        ) ||
        !nonnegative(data.trips) ||
        !data.daily ||
        !['trips', 'work', 'life', 'watered', 'harvested'].every((key) =>
            nonnegative(data.daily[key])
        ) ||
        !Array.isArray(data.events) ||
        !Array.isArray(data.recent) ||
        !Array.isArray(data.lines)
    )
        throw new Error('农场生活记录无效')
    if (
        data.recent.some((kind) => !kinds.includes(kind)) ||
        data.lines.some((line) => !nonnegative(line) || line > 2)
    )
        throw new Error('农场生活记忆无效')
    if (
        (data.tutorialPending !== undefined && typeof data.tutorialPending !== 'boolean') ||
        data.daily.trips > farmLifeConfig.maxTrips ||
        data.daily.work > farmLifeConfig.maxWorkTrips ||
        data.daily.life > farmLifeConfig.maxLifeTrips ||
        data.daily.watered > farmLifeConfig.maxWater ||
        data.daily.harvested > farmLifeConfig.maxHarvest ||
        data.daily.work + data.daily.life !== data.daily.trips
    )
        throw new Error('农场生活额度无效')
    const ids = new Set<string>()
    for (const event of data.events) {
        if (
            !event ||
            typeof event.id !== 'string' ||
            ids.has(event.id) ||
            !nonnegative(event.at) ||
            !day(event.day) ||
            !kinds.includes(event.kind) ||
            !nonnegative(event.plots) ||
            event.plots > 12 ||
            !nonnegative(event.line) ||
            event.line > 2 ||
            ![event.shown, event.interrupted, event.orderReady].every(
                (value) => typeof value === 'boolean'
            ) ||
            !event.items ||
            Object.entries(event.items).some(
                ([key, n]) =>
                    !['wheat', 'carrot', 'potato', 'tomato', 'strawberry', 'pumpkin'].includes(
                        key
                    ) || !nonnegative(n)
            )
        )
            throw new Error('农场日记无效')
        ids.add(event.id)
    }
    const visit = data.active
    if (
        visit &&
        (typeof visit.id !== 'string' ||
            !kinds.includes(visit.kind) ||
            !['preparing', 'leaving', 'visiting', 'exiting', 'returning'].includes(visit.phase) ||
            !Array.isArray(visit.plotIds) ||
            new Set(visit.plotIds).size !== visit.plotIds.length ||
            visit.plotIds.some((id) => !nonnegative(id) || id > 11) ||
            !nonnegative(visit.since) ||
            !Number.isFinite(visit.returnAt) ||
            visit.returnAt < 0 ||
            !nonnegative(visit.line) ||
            visit.line > 2 ||
            (visit.orderId !== undefined && typeof visit.orderId !== 'string') ||
            !['classic', 'labor-skin', 'school-uniform'].includes(visit.skin) ||
            ![visit.committed, visit.cancelled, visit.tutorial].every(
                (value) => typeof value === 'boolean'
            ))
    )
        throw new Error('农场出行无效')
}
export type FarmLifeView = { visit: FarmLifeVisit | null; enabled: boolean }
export type FarmLifePose = 'bridge' | 'door' | 'sweat'
export function farmLifePose(kind: FarmLifeKind, interrupted = false): FarmLifePose {
    if (interrupted || kind === 'rest' || kind === 'check') return 'door'
    if (['water', 'harvest', 'order'].includes(kind)) return 'sweat'
    return 'bridge'
}
export const farmDeparture = {
    costumeMs: 1100,
    durationMs: 6583,
    windowWidth: 470,
    windowHeight: 300,
    videoWidth: 421,
    videoHeight: 316,
    left: 39,
    top: -12
} as const
export const farmLifeConfig = {
    enabled: true,
    idleMs: 20 * 60_000,
    idleMaxMs: 35 * 60_000,
    interactionMs: 30_000,
    tutorialMs: 7 * 60_000,
    speechHoldMs: 1_500,
    speechTimeoutMs: 30_000,
    walkMs: farmDeparture.costumeMs + farmDeparture.durationMs,
    exitMs: 1_000,
    returnMs: 4_000,
    minVisitMs: 20_000,
    maxVisitMs: 60_000,
    diaryMs: 2_800,
    watchGraceMs: 6_000,
    waterMin: 3,
    waterMax: 6,
    harvestMinRatio: 0.25,
    harvestMaxRatio: 0.5,
    weights: { water: 40, harvest: 40, order: 30, life: 20 },
    maxTrips: 4,
    maxWorkTrips: 3,
    maxLifeTrips: 1,
    maxWater: 10,
    maxHarvest: 3
} as const
export const isFarmLifeWork = (kind: FarmLifeKind) => ['water', 'harvest', 'order'].includes(kind)
export function farmLifeDay(at: number): string {
    const date = new Date(at)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function ensureFarmLife(farm: { life?: FarmLifeData }, at: number): FarmLifeData {
    const data = (farm.life ??= {
        entered: false,
        tutorialDone: false,
        trips: 0,
        flower: false,
        day: farmLifeDay(at),
        daily: { trips: 0, work: 0, life: 0, watered: 0, harvested: 0 },
        events: [],
        recent: [],
        lines: [],
        active: null
    })
    const day = farmLifeDay(at)
    // A rolled-back date cannot renew an already consumed budget.
    if (day > data.day) {
        data.day = day
        data.daily = { trips: 0, work: 0, life: 0, watered: 0, harvested: 0 }
    }
    const oldest = new Date(`${data.day}T12:00:00`)
    oldest.setDate(oldest.getDate() - 6)
    data.events = data.events.filter((event) => event.day >= farmLifeDay(oldest.getTime()))
    return data
}
