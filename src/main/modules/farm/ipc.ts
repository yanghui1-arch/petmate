import { randomUUID } from 'node:crypto'

import { app, BrowserWindow, dialog, ipcMain } from 'electron'

import type { Response } from '../../../types/response'
import type { BackupPreview, FarmCommand, FarmOperation, FarmPreview, FarmResult, FarmView } from '../../types/farm'
import { backupSummary, captureGameSaves, listAutomaticBackup, loadBackupFile, makeBackup, restoreGameBackup } from '../save/backup'
import { freezeGameWrites, gameWritesFrozen } from '../save/coordinator'
import { writeJsonAtomic } from '../save/files'
import { playerChanges, playerManager } from '../store'
import { farmAssistant, farmLife, farmService as service,finishFarmLifeSpeech,isFarmWindow, leaveFarmWindow, moveCoveredFarmDeparture, registerFarmWindow, setFarmLifePetState } from './runtime'

const selectedBackups = new Map<string, { path: string; checksum: string }>()

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

function currentOwner(): string | null {
  const owner = playerManager.getPlayer().steamId
  return typeof owner === 'string' ? owner : null
}

function previewFile(path: string, automatic: boolean): BackupPreview {
  const backup = loadBackupFile(path, currentOwner())
  const token = randomUUID()
  selectedBackups.clear()
  selectedBackups.set(token, { path, checksum: backup.checksum })
  return { token, ...backupSummary(backup), automatic }
}

ipcMain.handle('farm-backup-export', async (): Promise<Response<string | null>> => {
  if (gameWritesFrozen()) return { code: 400, message: '正在恢复存档' }
  const chosen = await dialog.showSaveDialog({
    title: '导出完整游戏进度', defaultPath: `petmate-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'Petmate 备份', extensions: ['json'] }]
  })
  if (chosen.canceled || !chosen.filePath) return { code: 200, data: null }
  return result(() => {
    service.checkpoint()
    const backup = makeBackup(captureGameSaves(playerManager.getSaveDirectory()), app.getVersion())
    writeJsonAtomic(chosen.filePath!, backup)
    return chosen.filePath!
  })
})

ipcMain.handle('farm-backup-select', async (): Promise<Response<BackupPreview | null>> => {
  const chosen = await dialog.showOpenDialog({ title: '选择完整游戏备份', properties: ['openFile'], filters: [{ name: 'Petmate 备份', extensions: ['json'] }] })
  if (chosen.canceled || !chosen.filePaths[0]) return { code: 200, data: null }
  return result(() => previewFile(chosen.filePaths[0], false))
})

ipcMain.handle('farm-backup-automatic', (): Response<BackupPreview | null> => result(() => {
  const path = listAutomaticBackup(playerManager.getSaveDirectory())
  return path ? previewFile(path, true) : null
}))

ipcMain.handle('farm-backup-restore', (_event, token: string): Response<void> => result(() => {
  const selected = selectedBackups.get(token)
  if (!selected) throw new Error('请先选择并预览备份')
  // The backup is re-read and verified at confirmation time, so replacing a selected file cannot bypass validation.
  const target = loadBackupFile(selected.path, currentOwner())
  if (target.checksum !== selected.checksum) throw new Error('备份文件已变化，请重新选择')
  service.checkpoint()
  freezeGameWrites(true)
  try {
    restoreGameBackup(playerManager.getSaveDirectory(), target, app.getVersion())
    selectedBackups.delete(token)
    setImmediate(() => { app.relaunch(); app.exit(0) })
    return undefined
  } catch (error) {
    freezeGameWrites(false)
    throw error
  }
}))
