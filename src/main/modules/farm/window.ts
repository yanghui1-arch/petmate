import type { BrowserWindow, Screen } from 'electron'

import { farmExperience } from '../../../shared/farmExperience'
export function farmWindowSize(area: { width: number; height: number }) {
    const scale = Math.min(1, area.width / farmExperience.width, area.height / farmExperience.height)
    return { width: Math.max(1, Math.floor(farmExperience.width * scale)), height: Math.max(1, Math.floor(farmExperience.height * scale)) }
}
export const fixedFarmWindow = { resizable: false, maximizable: false, fullscreenable: false }
export function observeFarmWorkArea(window: BrowserWindow, display: Screen) {
    const update = () => {
        if (window.isDestroyed() || !window.webContents.getURL().includes('#/farm')) return
        const area = display.getDisplayMatching(window.getBounds()).workArea
        const size = farmWindowSize(area), current = window.getBounds()
        if (current.width === size.width && current.height === size.height) return
        window.setMinimumSize(1, 1)
        window.setBounds({ ...size, x: Math.max(area.x, Math.min(current.x, area.x + area.width - size.width)), y: Math.max(area.y, Math.min(current.y, area.y + area.height - size.height)) })
        window.setMinimumSize(size.width, size.height)
    }
    display.on('display-metrics-changed', update)
    // Resize after a drag completes; resizing during `move` changes the pointer's
    // window offset and can make the window oscillate between displays.
    window.on('moved', update)
    window.once('closed', () => display.removeListener('display-metrics-changed', update))
}
