import { BrowserWindow, screen } from 'electron'

import { farmDeparture, type FarmLifeView } from '../../../shared/farmLife'

export function clampPetPosition(
    point: { x: number; y: number },
    area: { x: number; y: number; width: number; height: number },
    size: { width: number; height: number }
) {
    return {
        x: Math.round(Math.max(area.x, Math.min(point.x, area.x + area.width - size.width))),
        y: Math.round(Math.max(area.y, Math.min(point.y, area.y + area.height - size.height)))
    }
}

/** The video owns the walk. Move the native window only before it starts. */
export class FarmLifeDesktop {
    private origin: { x: number; y: number; width: number; height: number } | null = null
    private phase = ''
    private timer?: ReturnType<typeof setInterval>
    private internal = false
    private hiddenForVisit = false
    hiddenByPlayer = false
    direction: 'left' | 'right' = 'right'
    readonly window: BrowserWindow
    constructor(window: BrowserWindow, activity: () => void) {
        this.window = window
        window.on('hide', () => {
            if (!this.internal) { this.hiddenByPlayer = true; activity() }
        })
        window.on('show', () => {
            if (!this.internal) { this.hiddenByPlayer = false; activity() }
        })
        window.on('closed', () => this.clear())
    }
    private clear() {
        if (this.timer) clearInterval(this.timer)
        this.timer = undefined
    }
    private show() {
        this.internal = true
        try { this.window.showInactive() } finally { this.internal = false }
    }
    private resize(bounds: { x: number; y: number; width: number; height: number }) {
        this.window.setMinimumSize(1, 1)
        this.window.setMaximumSize(Math.max(bounds.width, farmDeparture.windowWidth), Math.max(bounds.height, farmDeparture.windowHeight))
        this.window.setBounds(bounds, false)
        this.window.setMinimumSize(bounds.width, bounds.height)
        this.window.setMaximumSize(bounds.width, bounds.height)
    }
    restore() {
        this.clear()
        this.phase = ''
        if (this.window.isDestroyed()) return
        if (this.origin) {
            const area = screen.getDisplayMatching(this.origin).workArea
            this.resize({ ...this.origin, ...clampPetPosition(this.origin, area, this.origin) })
            this.origin = null
        }
        this.window.setIgnoreMouseEvents(false)
        if (this.hiddenForVisit && !this.hiddenByPlayer) this.show()
        this.hiddenForVisit = false
    }
    update(state: FarmLifeView) {
        if (this.window.isDestroyed()) return
        const visit = state.visit
        if (!visit) { this.restore(); return }
        if (visit.phase === this.phase) return
        this.clear()
        this.phase = visit.phase
        const bounds = this.window.getBounds()
        if (visit.phase === 'preparing') {
            this.origin = bounds
            const area = screen.getDisplayMatching(bounds).workArea
            const target = clampPetPosition(bounds, area, { width: farmDeparture.windowWidth, height: farmDeparture.windowHeight })
            const started = performance.now()
            if (target.x !== bounds.x || target.y !== bounds.y) this.timer = setInterval(() => {
                if (this.window.isDestroyed()) { this.clear(); return }
                const t = Math.min(1, (performance.now() - started) / 350)
                this.window.setPosition(Math.round(bounds.x + (target.x - bounds.x) * t), Math.round(bounds.y + (target.y - bounds.y) * t))
                if (t === 1) this.clear()
            }, 16)
        } else if (visit.phase === 'leaving') {
            this.origin ??= bounds
            const size = { width: farmDeparture.windowWidth, height: farmDeparture.windowHeight }
            const area = screen.getDisplayMatching(bounds).workArea
            this.resize({ ...clampPetPosition(bounds, area, size), ...size })
        } else if (visit.phase === 'visiting' || visit.phase === 'exiting') {
            this.hiddenForVisit = true
            this.internal = true
            try { this.window.setIgnoreMouseEvents(true); this.window.hide() }
            finally { this.internal = false }
        } else if (visit.phase === 'returning') {
            this.restore()
            this.phase = 'returning'
        }
    }
}
