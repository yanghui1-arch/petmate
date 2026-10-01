import { randomUUID } from 'node:crypto'

import { app, BrowserWindow, dialog, ipcMain } from 'electron'

import type { Response } from '../../../types/response'
import type { BackupPreview, FarmCommand, FarmOperation, FarmPreview, FarmResult, FarmView } from '../../types/farm'
import { backupSummary, captureGameSaves, listAutomaticBackup, loadBackupFile, makeBackup, restoreGameBackup } from '../save/backup'
import { freezeGameWrites, gameWritesFrozen } from '../save/coordinator'
import { writeJsonAtomic } from '../save/files'
import { playerChanges, playerManager } from '../store'
import { FarmService } from './service'

const service = new FarmService(
  { read: () => playerManager.getFarmSnapshot(), commit: snapshot => playerManager.commitFarmSnapshot(snapshot) },
  { wall: () => Date.now(), monotonic: () => performance.now() },
  randomUUID
)
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
ipcMain.handle('farm-execute', (_event, command: FarmCommand): Response<FarmResult> => result(() => service.execute(command)))
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
