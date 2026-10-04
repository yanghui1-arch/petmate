import { contextBridge, ipcRenderer } from 'electron'

import type { FarmCommand, FarmOperation } from '../../src/main/types/farm'
import type { LabCommand } from './types'

function listen(channel: string, callback: (_value: unknown) => void) {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
}
contextBridge.exposeInMainWorld('api', {
    getFarm: () => ipcRenderer.invoke('farm-get'),
    previewFarm: (operation: FarmOperation) => ipcRenderer.invoke('farm-preview', operation),
    executeFarm: (command: FarmCommand) => ipcRenderer.invoke('farm-execute', command),
    checkpointFarm: () => ipcRenderer.invoke('farm-checkpoint'),
    farmManualActivity: () => ipcRenderer.invoke('farm-manual-activity'),
    enterFarmLife: () => ipcRenderer.invoke('farm-life-enter'),
    leaveFarmLife: () => ipcRenderer.invoke('farm-life-leave'),
    readyFarmLife: () => ipcRenderer.invoke('farm-life-ready'),
    markFarmDiaryShown: (id: string) => ipcRenderer.invoke('farm-life-diary-shown', id),
    onFarmLifeState: (callback: (_value: unknown) => void) => listen('farm-life-state', callback),
    onFarmLifeSpeech: (callback: (_value: unknown) => void) => listen('farm-life-speech', callback),
    onGameSaveChanged: (callback: (_value: unknown) => void) =>
        listen('game-save-changed', callback),
    closeWindow: () => ipcRenderer.send('lab-close-farm')
})
contextBridge.exposeInMainWorld('farmLab', {
    state: () => ipcRenderer.invoke('lab-get'),
    command: (command: LabCommand) => ipcRenderer.invoke('lab-command', command),
    subscribe: (callback: (_value: unknown) => void) => listen('lab-state', callback),
    speech: (callback: (_value: unknown) => void) => listen('farm-life-speech', callback),
    ready: () => ipcRenderer.send('lab-pet-ready'),
    finishSpeech: (id: string) => ipcRenderer.send('lab-pet-speech-finished', id),
    interaction: () => ipcRenderer.send('lab-pet-interaction')
})
