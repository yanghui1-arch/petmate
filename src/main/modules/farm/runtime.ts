import { randomUUID } from 'node:crypto'

import { BrowserWindow } from 'electron'

import { farmLifeConfig, type FarmLifeVisit } from '../../../shared/farmLife'
import { playerResourceManager } from '../player/resource'
import { gameWritesFrozen } from '../save/coordinator'
import { playerManager } from '../store'
import { syncFarmAchievements } from './achievements'
import { FarmAssistant } from './assistant'
import { FarmLife } from './life'
import { FarmLifeDesktop } from './lifeDesktop'
import { FarmService } from './service'

// Captured during main-process startup, independently of any farm renderer.
const startedAt = performance.now()
let desktop: FarmLifeDesktop | undefined
let petReady = false, petBlocked = true, heartbeatAt = 0
const farmWindows = new Set<number>()
export const isFarmWindow = (id: number) => farmWindows.has(id)
export function registerFarmWindow(window: BrowserWindow) {
    if (farmWindows.has(window.id)) return
    farmWindows.add(window.id)
    farmLife.farmEntered()
    window.once('closed', () => { farmWindows.delete(window.id); farmLife.farmLeft() })
}
export function leaveFarmWindow(id: number) { if (farmWindows.delete(id)) farmLife.farmLeft() }
export function setFarmLifePetState(sender: number, ready: boolean, blocked: boolean) {
    if (sender !== desktop?.window.webContents.id) return
    petReady = ready === true; petBlocked = blocked !== false; heartbeatAt = performance.now()
    if (petBlocked) { farmLife.activity(); farmLife.recall() }
}
export function attachFarmLifeDesktop(window: BrowserWindow) { desktop = new FarmLifeDesktop(window, () => { farmLife.activity(); farmLife.recall() }) }
export function finishFarmLifeSpeech(sender: number, id: unknown) {
    if (sender === desktop?.window.webContents.id && typeof id === 'string') farmLife.speechFinished(id)
}
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
export const farmLife = new FarmLife(farmService, { wall: () => Date.now(), monotonic: () => performance.now() }, {
    available: () => !!desktop && !desktop.window.isDestroyed() && desktop.window.isVisible() && !desktop.hiddenByPlayer && petReady && performance.now() - heartbeatAt < 10_000,
    blocked: () => {
        const pet = playerManager.getPlayer().petmates[0]
        return gameWritesFrozen() || !pet || !petReady || performance.now() - heartbeatAt >= 10_000 || petBlocked || !['idle', 'finished'].includes(pet.status.status) || pet.attrs.energy < pet.attrs.maxEnergy * 0.1 || !!desktop?.hiddenByPlayer
    },
    farmOpen: () => farmWindows.size > 0 || BrowserWindow.getAllWindows().some(window => /#\/farm(?:$|\?)/.test(window.webContents.getURL())),
    skin: () => {
        const resources = playerResourceManager.getResources()
        return (resources.skins.find(skin => skin.id === resources.equippedSkinId)?.animationSkin ?? 'classic') as FarmLifeVisit['skin']
    },
    publish: (state, speech) => {
        desktop?.update(state)
        for (const window of BrowserWindow.getAllWindows()) {
            if (window.isDestroyed()) continue
            window.webContents.send('farm-life-state', { ...state, direction: desktop?.direction ?? 'right' })
            if (speech && window === desktop?.window && window.isVisible() && !window.isMinimized()) window.webContents.send('farm-life-speech', speech)
        }
    },
    restore: () => desktop?.restore()
}, randomUUID)
export function startFarmAssistant() {
    // Initializes farm data through its normal transaction, without opening a window.
    try { farmService.checkpoint() } catch { /* Existing storage diagnostics stay authoritative. */ }
    farmAssistant.start()
    if (farmLifeConfig.enabled) farmLife.start()
}
