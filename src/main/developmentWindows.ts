import type { BrowserWindow } from 'electron'

const windows = new Set<number>()
export const isDevelopmentWindow = (id: number) => windows.has(id)
export function registerDevelopmentWindow(window: BrowserWindow) {
    windows.add(window.id)
    window.once('closed', () => windows.delete(window.id))
}
