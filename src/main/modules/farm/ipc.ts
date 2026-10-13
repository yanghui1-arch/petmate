import { BrowserWindow, ipcMain } from 'electron'

import type { Response } from '../../../types/response'
import type { FarmCommand, FarmOperation, FarmPreview, FarmResult, FarmView } from '../../types/farm'
import { gameWritesFrozen } from '../save/coordinator'
import { playerChanges } from '../store'
import { farmAssistant, farmLife, farmService as service,finishFarmLifeSpeech,isFarmWindow, leaveFarmWindow, moveCoveredFarmDeparture, registerFarmWindow, setFarmLifePetState } from './runtime'

const result = <T>(action: () => T): Response<T> => {
  try {
    if (gameWritesFrozen()) throw new Error('正在恢复存档')
    return { code: 200, data: action() }
  } catch (error) {
    return { code: 400, message: error instanceof Error ? error.message : '农场操作失败' }
  }
}

playerChanges.on('changed', () => {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send('game-save-changed')
  }
})

ipcMain.handle('farm-get', (): Response<FarmView> => result(() => service.getView()))
ipcMain.handle('farm-preview', (_event, operation: FarmOperation): Response<FarmPreview> => result(() => service.preview(operation)))
ipcMain.handle('farm-execute', (_event, command: FarmCommand): Response<FarmResult> => result(() => { farmLife.activity(); farmAssistant.manualActivity(); return service.execute(command) }))
ipcMain.handle('farm-assistant-get', () => result(() => farmAssistant.getStatus()))
ipcMain.handle('farm-manual-activity', () => result(() => { farmLife.activity(); farmAssistant.manualActivity() }))
ipcMain.handle('farm-life-get', () => ({ code: 200, data: farmLife.getView() }))
ipcMain.handle('farm-life-enter', event => result(() => {
  const window = BrowserWindow.fromWebContents(event.sender)
  if (!window || !/#\/farm(?:$|\?)/.test(event.sender.getURL())) throw new Error('农场页面不存在')
  registerFarmWindow(window)
  return farmLife.getView()
}))
ipcMain.handle('farm-life-leave', event => { const window = BrowserWindow.fromWebContents(event.sender); if (window) leaveFarmWindow(window.id); return { code: 200 } })
ipcMain.handle('farm-life-ready', event => { const window = BrowserWindow.fromWebContents(event.sender); if (window && isFarmWindow(window.id)) farmLife.farmReady(); return { code: 200 } })
ipcMain.on('farm-life-pet-state', (event, state) => { if (state && typeof state === 'object') setFarmLifePetState(event.sender.id, state.ready, state.blocked) })
ipcMain.on('farm-life-speech-finished', (event, id) => finishFarmLifeSpeech(event.sender.id, id))
ipcMain.handle('farm-life-departure-covered', (event, id) => result(() => moveCoveredFarmDeparture(event.sender.id, id)))
ipcMain.on('farm-life-interaction', () => { farmLife.interaction() })
ipcMain.handle('farm-life-diary-shown', (event, id: string) => result(() => {
  const window = BrowserWindow.fromWebContents(event.sender)
  if (!window || !isFarmWindow(window.id) || typeof id !== 'string' || id.length > 120) throw new Error('日记请求无效')
  const view = service.getView()
  if (!view.farm?.life?.events.some(event => event.id === id && !event.shown)) return
  service.lifeTransaction(view.revision, data => { const entry = data.events.find(event => event.id === id); if (entry) entry.shown = true })
}))
ipcMain.handle('farm-checkpoint', (): Response<void> => result(() => service.checkpoint()))
