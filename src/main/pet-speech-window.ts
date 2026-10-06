import type { EventEmitter } from 'node:events'

import { BrowserWindow, ipcMain, screen } from 'electron'

import {
    petSpeechLayout,
    type PetSpeechMessage,
    type PetSpeechState,
    positionPetSpeech
} from '../shared/petSpeech'
import { registerHelperWindow } from './helperWindows'
import { observeWindowStartup } from './startupDiagnostics'

export class PetSpeechWindow {
    readonly window: BrowserWindow
    private state: PetSpeechState = {
        message: null,
        side: 'above',
        tail: petSpeechLayout.width / 2
    }
    private height = 0
    constructor(
        readonly owner: BrowserWindow,
        preload: string,
        load: (_window: BrowserWindow) => Promise<unknown>
    ) {
        this.window = new BrowserWindow({
            width: petSpeechLayout.width,
            minWidth: petSpeechLayout.width,
            maxWidth: petSpeechLayout.width,
            height: 80,
            show: false,
            frame: false,
            transparent: true,
            hasShadow: false,
            focusable: false,
            resizable: false,
            maximizable: false,
            minimizable: false,
            fullscreenable: false,
            skipTaskbar: true,
            parent: owner,
            alwaysOnTop: owner.isAlwaysOnTop(),
            webPreferences: {
                preload,
                contextIsolation: true,
                sandbox: true,
                backgroundThrottling: false
            }
        })
        observeWindowStartup(this.window, 'speech-bubble')
        registerHelperWindow(this.window)
        this.window.setIgnoreMouseEvents(true, { forward: true })
        const events: EventEmitter = owner
        for (const event of ['move', 'resize', 'show', 'hide', 'minimize', 'restore'])
            events.on(event, this.sync)
        owner.on('always-on-top-changed', this.onTop)
        owner.once('closed', this.close)
        screen.on('display-metrics-changed', this.sync)
        screen.on('display-removed', this.sync)
        this.window.webContents.on('did-finish-load', () => {
            this.send()
        })
        this.window.once('closed', this.cleanup)
        void load(this.window).catch((error) => {
            console.error('气泡窗口加载失败', error)
            this.close()
        })
    }
    getState() {
        return this.state
    }
    update(message: unknown) {
        if (message === null) {
            this.state.message = null
            this.height = 0
            this.sync()
            this.send()
            return
        }
        if (!validMessage(message)) return
        if (message.id !== this.state.message?.id) {
            this.height = 0
            this.state.message = structuredClone(message)
        } else {
            // Keep one message anchored steadily even while the pose breathes.
            this.state.message = { ...message, anchor: this.state.message.anchor }
        }
        this.sync()
        this.send()
    }
    measured(id: unknown, height: unknown) {
        if (
            id !== this.state.message?.id ||
            typeof height !== 'number' ||
            !Number.isFinite(height) ||
            height < 40 ||
            height > 1200
        )
            return
        this.height = Math.ceil(height)
        this.sync()
    }
    private send() {
        if (!this.window.isDestroyed()) this.window.webContents.send('pet-speech-state', this.state)
    }
    private sync = () => {
        if (this.window.isDestroyed() || this.owner.isDestroyed()) return
        const bounds = this.owner.getContentBounds()
        // Allow native DPI/frame rounding; expanded departure and compact entry
        // windows must still hide a late message before renderer state catches up.
        const normalSize = Math.abs(bounds.width - 300) <= 10 && Math.abs(bounds.height - 300) <= 10
        if (
            !this.state.message ||
            !this.height ||
            !this.owner.isVisible() ||
            this.owner.isMinimized() ||
            !normalSize
        ) {
            this.window.hide()
            return
        }
        const area = screen.getDisplayMatching(bounds).workArea
        const positioned = positionPetSpeech(
            bounds,
            this.state.message.anchor,
            area,
            Math.min(this.height, area.height - 12)
        )
        const changed = this.state.side !== positioned.side || this.state.tail !== positioned.tail
        this.state = { ...this.state, side: positioned.side, tail: positioned.tail }
        const current = this.window.getContentBounds()
        if (
            Object.keys(positioned.bounds).some(
                (key) =>
                    Math.abs(
                        current[key as keyof typeof current] -
                            positioned.bounds[key as keyof typeof current]
                    ) > 1
            )
        )
            this.window.setContentBounds(positioned.bounds, false)
        if (changed) this.send()
        if (!this.window.isVisible()) this.window.showInactive()
    }
    private onTop = (_event: Electron.Event, onTop: boolean) => {
        if (!this.window.isDestroyed()) this.window.setAlwaysOnTop(onTop)
    }
    private close = () => {
        if (!this.window.isDestroyed()) this.window.destroy()
    }
    private cleanup = () => {
        const events: EventEmitter = this.owner
        for (const event of ['move', 'resize', 'show', 'hide', 'minimize', 'restore'])
            events.removeListener(event, this.sync)
        this.owner.removeListener('always-on-top-changed', this.onTop)
        this.owner.removeListener('closed', this.close)
        screen.removeListener('display-metrics-changed', this.sync)
        screen.removeListener('display-removed', this.sync)
    }
}
function validMessage(value: unknown): value is PetSpeechMessage {
    if (!value || typeof value !== 'object') return false
    const message = value as PetSpeechMessage
    return (
        typeof message.id === 'string' &&
        message.id.length > 0 &&
        message.id.length <= 120 &&
        typeof message.key === 'string' &&
        typeof message.text === 'string' &&
        message.text.length > 0 &&
        message.text.length <= 2000 &&
        typeof message.visibleText === 'string' &&
        message.text.startsWith(message.visibleText) &&
        !!message.anchor &&
        Number.isFinite(message.anchor.x) &&
        Number.isFinite(message.anchor.y) &&
        message.anchor.x >= 0 &&
        message.anchor.x <= 300 &&
        message.anchor.y >= 0 &&
        message.anchor.y <= 300
    )
}
export function registerPetSpeechIpc(current: () => PetSpeechWindow | null) {
    ipcMain.on('pet-speech-update', (event, message) => {
        const speech = current()
        if (
            speech &&
            !speech.owner.isDestroyed() &&
            event.sender.id === speech.owner.webContents.id
        )
            speech.update(message)
    })
    ipcMain.on('pet-speech-measured', (event, id, height) => {
        const speech = current()
        if (
            speech &&
            !speech.window.isDestroyed() &&
            event.sender.id === speech.window.webContents.id
        )
            speech.measured(id, height)
    })
    ipcMain.handle('pet-speech-get', (event) => {
        const speech = current()
        return speech &&
            !speech.window.isDestroyed() &&
            event.sender.id === speech.window.webContents.id
            ? { code: 200, data: speech.getState() }
            : { code: 400 }
    })
}
