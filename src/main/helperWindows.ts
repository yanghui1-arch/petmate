import type { BrowserWindow } from 'electron'

const windows = new Set<number>()
export const isHelperWindow = (id: number) => windows.has(id)
export function registerHelperWindow(window: BrowserWindow) {
    windows.add(window.id)
    window.once('closed', () => windows.delete(window.id))
}
