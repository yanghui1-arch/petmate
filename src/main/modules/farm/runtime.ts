import { randomUUID } from 'node:crypto'

import { BrowserWindow } from 'electron'

import { gameWritesFrozen } from '../save/coordinator'
import { playerManager } from '../store'
import { syncFarmAchievements } from './achievements'
import { FarmAssistant } from './assistant'
import { FarmService } from './service'

// Captured during main-process startup, independently of any farm renderer.
const startedAt = performance.now()
export const farmService = new FarmService(
    { read: () => playerManager.getFarmSnapshot(), commit: snapshot => playerManager.commitFarmSnapshot(snapshot) },
    { wall: () => Date.now(), monotonic: () => performance.now() }, randomUUID, Math.random,
    farm => {
        const owner = playerManager.getPlayer().steamId
        if (owner) syncFarmAchievements(owner, farm)
    }
)
export const farmAssistant = new FarmAssistant(farmService,
    { wall: () => Date.now(), monotonic: () => performance.now() },
    () => {
        const pet = playerManager.getPlayer().petmates[0]
        return !!pet && ['idle', 'finished'].includes(pet.status.status) && pet.attrs.energy >= pet.attrs.maxEnergy * 0.1
    }, gameWritesFrozen, () => playerManager.getPlayer().steamId ?? null,
    (status, event) => {
        for (const win of BrowserWindow.getAllWindows()) {
            if (win.isDestroyed()) continue
            win.webContents.send('farm-assistant-state', status)
            if (event && win.isVisible() && !win.isMinimized()) win.webContents.send('farm-assistant-event', event)
        }
    }, randomUUID, startedAt)
export function startFarmAssistant() {
    // Initializes farm data through its normal transaction, without opening a window.
    try { farmService.checkpoint() } catch { /* Existing storage diagnostics stay authoritative. */ }
    farmAssistant.start()
}
