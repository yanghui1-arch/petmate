import { BrowserWindow, screen } from 'electron'

import { farmAwayCard, farmDeparture, type FarmLifeView } from '../../../shared/farmLife'

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
    private awayPosition: { x: number; y: number } | null = null
    private phase = ''
    private shift: { id: string; target: { x: number; y: number }; moved: boolean } | null = null
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
        this.shift = null
    }
    /** Let the current costume fade out before changing native coordinates. */
    prepareRelocation(id: string): boolean {
        if (this.window.isDestroyed() || this.phase !== 'preparing') return false
        if (this.shift?.id === id) {
            if (!this.shift.moved) return true
            this.shift = null
            return false
        }
        const bounds = this.window.getBounds()
        const area = screen.getDisplayMatching(bounds).workArea
        const target = clampPetPosition(bounds, area, { width: farmDeparture.windowWidth, height: farmDeparture.windowHeight })
        if (target.x === bounds.x && target.y === bounds.y) return false
        this.shift = { id, target, moved: false }
        this.window.webContents.send('farm-life-departure-shift', { id })
        return true
    }
    moveCovered(id: string): boolean {
        if (this.window.isDestroyed() || this.phase !== 'preparing' || this.shift?.id !== id) return false
        if (!this.shift.moved) {
            this.window.setPosition(this.shift.target.x, this.shift.target.y)
            this.shift.moved = true
        }
        return true
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
            if (this.awayPosition) {
                const bounds = this.window.getBounds()
                this.origin.x += bounds.x - this.awayPosition.x
                this.origin.y += bounds.y - this.awayPosition.y
            }
            this.awayPosition = null
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
        } else if (visit.phase === 'leaving') {
            this.origin ??= bounds
            const size = { width: farmDeparture.windowWidth, height: farmDeparture.windowHeight }
            const area = screen.getDisplayMatching(bounds).workArea
            this.resize({ ...clampPetPosition(bounds, area, size), ...size })
        } else if (visit.phase === 'visiting' || visit.phase === 'exiting') {
            this.hiddenForVisit = true
            if (!this.awayPosition) {
                const origin = this.origin ??= bounds
                const area = screen.getDisplayMatching(origin).workArea
                const point = {
                    x: origin.x + (origin.width - farmAwayCard.width) / 2,
                    y: origin.y + origin.height - farmAwayCard.height
                }
                this.resize({ ...clampPetPosition(point, area, farmAwayCard), ...farmAwayCard })
                const card = this.window.getBounds()
                this.awayPosition = { x: card.x, y: card.y }
            }
            this.window.setIgnoreMouseEvents(false)
            if (!this.hiddenByPlayer) this.show()
        } else if (visit.phase === 'returning') {
            this.restore()
            this.phase = 'returning'
        }
    }
}
