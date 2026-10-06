import './restore-preflight'
import './ipc'

import { is } from '@electron-toolkit/utils'
import { app, BrowserWindow, ipcMain, Menu, nativeImage, powerMonitor, screen, shell, Tray } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { join } from 'path'

import trayIcon from '../../resources/icon.png?asset'
import { isDevelopmentWindow } from './developmentWindows'
import { isHelperWindow } from './helperWindows'
import { PetSpeechWindow, registerPetSpeechIpc } from './pet-speech-window'
import { greenworksManager } from './greenworks'
import { appInit } from './init'
import { saveChatHistoryMessages } from './llm'
import { localAIManager } from './local-ai'
import logger from './log'
import { attachFarmLifeDesktop, farmAssistant, farmLife, startFarmAssistant } from './modules/farm/runtime'
import { playerManager } from './modules/store'
import { SystemAudioActivityMonitor } from './packages/system-audio-activity'
import { openPageWindow } from './page-window'
import { destroyScheduler, startOnlineAttributeDecay, startWishGeneration } from './scheduler'
import { getOnTop, updateSettings } from './settings'
import { diagnosticError, observeWindowStartup, recordStartup, runStartupStage } from './startupDiagnostics'

app.commandLine.appendSwitch('--in-process-gpu')

let mainWindow: BrowserWindow | null = null
let speechWindow: PetSpeechWindow | null = null
registerPetSpeechIpc(() => speechWindow)
let tray: Tray | null = null
let systemAudioActivityMonitor: SystemAudioActivityMonitor | null = null
const PETMATE_WINDOW_WIDTH = 300
const PETMATE_WINDOW_HEIGHT = 300
const PETMATE_DRAG_FRAME_MS = 1000 / 60

type PetmateWindowDragSession = {
    win: BrowserWindow
    timer: ReturnType<typeof setInterval>
    cursorStartX: number
    cursorStartY: number
    windowStartX: number
    windowStartY: number
}

let petmateWindowDragSession: PetmateWindowDragSession | null = null

function getDefaultPetmateWindowBounds() {
    const { workArea } = screen.getPrimaryDisplay()
    return {
        width: PETMATE_WINDOW_WIDTH,
        height: PETMATE_WINDOW_HEIGHT,
        x: workArea.x + workArea.width - PETMATE_WINDOW_WIDTH - 24,
        y: workArea.y + workArea.height - PETMATE_WINDOW_HEIGHT - 24
    }
}

function enforcePetmateWindowSize(win: BrowserWindow) {
    if (win.isDestroyed()) return
    if (['leaving', 'visiting', 'exiting'].includes(farmLife.getView().visit?.phase ?? '')) return

    const { x, y } = win.getBounds()
    win.setResizable(false)
    win.setMinimumSize(PETMATE_WINDOW_WIDTH, PETMATE_WINDOW_HEIGHT)
    win.setMaximumSize(PETMATE_WINDOW_WIDTH, PETMATE_WINDOW_HEIGHT)
    win.setBounds({
        x,
        y,
        width: PETMATE_WINDOW_WIDTH,
        height: PETMATE_WINDOW_HEIGHT
    }, false)
}

function stopPetmateWindowDrag() {
    if (!petmateWindowDragSession) return

    clearInterval(petmateWindowDragSession.timer)
    petmateWindowDragSession = null
}

function updatePetmateWindowDragPosition() {
    if (!petmateWindowDragSession) return

    const { win, cursorStartX, cursorStartY, windowStartX, windowStartY } = petmateWindowDragSession
    if (win.isDestroyed()) {
        stopPetmateWindowDrag()
        return
    }

    const cursor = screen.getCursorScreenPoint()
    win.setBounds({
        x: Math.round(windowStartX + cursor.x - cursorStartX),
        y: Math.round(windowStartY + cursor.y - cursorStartY),
        width: PETMATE_WINDOW_WIDTH,
        height: PETMATE_WINDOW_HEIGHT
    }, false)
}

function startPetmateWindowDrag(win: BrowserWindow) {
    stopPetmateWindowDrag()
    enforcePetmateWindowSize(win)

    const cursor = screen.getCursorScreenPoint()
    const [windowStartX, windowStartY] = win.getPosition()
    petmateWindowDragSession = {
        win,
        timer: setInterval(updatePetmateWindowDragPosition, PETMATE_DRAG_FRAME_MS),
        cursorStartX: cursor.x,
        cursorStartY: cursor.y,
        windowStartX,
        windowStartY
    }
    updatePetmateWindowDragPosition()
}

function startSystemAudioActivityMonitor() {
    if (process.platform !== 'win32' || systemAudioActivityMonitor) return

    systemAudioActivityMonitor = new SystemAudioActivityMonitor()
    systemAudioActivityMonitor.start((active) => {
        mainWindow?.webContents.send('system-audio-active', active)
    })
}

const createWindow = (): void => {
    const bounds = getDefaultPetmateWindowBounds()

    const win = new BrowserWindow({
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        minWidth: PETMATE_WINDOW_WIDTH,
        minHeight: PETMATE_WINDOW_HEIGHT,
        maxWidth: PETMATE_WINDOW_WIDTH,
        maxHeight: PETMATE_WINDOW_HEIGHT,
        frame: false,
        resizable: false,
        maximizable: false,
        fullscreenable: false,
        transparent: true,
        hasShadow: false,
        alwaysOnTop: getOnTop(),
        focusable: true,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, '../preload/index.js'),
            contextIsolation: true,
            nodeIntegration: true,
            webgl: true,
            backgroundThrottling: false
        }
    })

    enforcePetmateWindowSize(win)
    observeWindowStartup(win, 'desktop-pet')
    win.once('ready-to-show', () => {
        enforcePetmateWindowSize(win)
        win.show()
    })
    win.webContents.on('did-finish-load', () => {
        enforcePetmateWindowSize(win)
    })
    win.on('closed', () => {
        if (speechWindow?.owner === win) speechWindow = null
        if (petmateWindowDragSession?.win === win) stopPetmateWindowDrag()
        if (mainWindow === win) mainWindow = null
    })

    mainWindow = win
    attachFarmLifeDesktop(win)
    speechWindow = new PetSpeechWindow(win, join(__dirname, '../preload/index.js'), bubble =>
        is.dev && process.env['ELECTRON_RENDERER_URL']
            ? bubble.loadURL(process.env['ELECTRON_RENDERER_URL'].replace(/\/$/, '') + '/#/pet-speech')
            : bubble.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/pet-speech' }))
    const WM_INITMENU = 0x0116
    mainWindow.hookWindowMessage(WM_INITMENU, () => {
        if (['visiting', 'exiting'].includes(farmLife.getView().visit?.phase ?? '')) return
        mainWindow?.setEnabled(false)
        mainWindow?.setEnabled(true)
        mainWindow?.webContents.send('show-context-menu')
    })
    // 加载渲染进程页面
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
        mainWindow.webContents.openDevTools({ mode: 'detach' })
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    mainWindow.setSkipTaskbar(true)
    const icon = nativeImage.createFromPath(trayIcon)
    console.log("getOnTop", getOnTop())
    tray = new Tray(icon)
    // 创建托盘菜单
    const contextMenu = Menu.buildFromTemplate([
        {
            label: '显示',
            click: () => {
                mainWindow?.show()
            }
        },
        {
            label: '主页',
            click: () => {
                openPageWindow(mainWindow, '/home')
            }
        },
        {
            label: '操作教程',
            click: () => {
                try {
                    let htmlPath: string;
                    if (is.dev) {
                        // 开发环境：直接使用相对路径
                        htmlPath = path.join(__dirname, '../../resources/html/opt.html');
                    } else {
                        // 打包环境：使用 extraResources，文件在 resources/html/ 目录
                        htmlPath = path.join(process.resourcesPath, 'html/opt.html');
                    }

                    if (!fs.existsSync(htmlPath)) {
                        logger.error(`操作手册文件不存在: ${htmlPath}, 尝试的路径: ${htmlPath}, process.resourcesPath: ${process.resourcesPath}`);
                        return;
                    }
                    const fileUrl = "file://" + htmlPath;
                    shell.openExternal(fileUrl);
                } catch (error) {
                    logger.error("打开操作手册失败:", error);
                }
            }
        },
        {
            label: "模型处于最顶层",
            type: "checkbox",
            checked: getOnTop(),
            click: () => {
                const newOnTop = !getOnTop();
                mainWindow?.setAlwaysOnTop(newOnTop)
                updateSettings({ onTop: newOnTop })
            }
        },
        {
            label: "重置位置",
            click: () => {
                mainWindow?.setBounds(getDefaultPetmateWindowBounds())
                if (mainWindow) enforcePetmateWindowSize(mainWindow)
            }
        },
        {
            label: '退出',
            click: () => {
                app.quit()
            }
        }
    ])
    tray.setContextMenu(contextMenu)
    tray.setToolTip('Petmate')
    recordStartup('tray-created')
}

app.whenReady().then(async () => {
    recordStartup('electron-ready')
    if (!await runStartupStage('application-init', () => appInit())) return

    // 更新玩家信息，添加Steam数据
    try {
        const steamInfo = greenworksManager.getSteamInfo()
        playerManager.updateSteamInfo(steamInfo.steamId)
        recordStartup('steam-player-info-saved')
    } catch (error) {
        recordStartup('startup-exit-requested', { reason: 'steam-player-info-failed', error: diagnosticError(error) })
        console.log('Failed to save Steam information:', error)
        app.quit()
        return
    }

    // 创建窗口
    await runStartupStage('main-window', () => createWindow())
    startFarmAssistant()
    if (import.meta.env.DEV && is.dev && !app.isPackaged) {
        const { installFarmLifeDevelopmentController } = await import('./modules/farm/developmentController')
        installFarmLifeDevelopmentController(getMainWindow, join(__dirname, '../preload/index.js'))
    }
    powerMonitor.on('suspend', () => { farmAssistant.suspend(true); farmLife.suspend(true) })
    powerMonitor.on('resume', () => { farmAssistant.suspend(false); farmLife.suspend(false) })
    await runStartupStage('audio-monitor', () => startSystemAudioActivityMonitor())
    startWishGeneration(0)
    startOnlineAttributeDecay()
    recordStartup('main-services-started')

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
}).catch(error => {
    recordStartup('startup-failed', { error: diagnosticError(error) })
    logger.error('Petmate启动失败', error)
    app.quit()
})

app.on('window-all-closed', () => {
    recordStartup('all-windows-closed')
    if (process.platform !== 'darwin') app.quit()
})
ipcMain.on('quit-app', () => {
    recordStartup('quit-requested', { reason: 'renderer-quit-app' })
    app.quit()
})

app.on('before-quit', () => {
    farmAssistant.stop()
    farmLife.stop()
    localAIManager.cancelModelDownload()
    void localAIManager.stop()
    stopPetmateWindowDrag()
    systemAudioActivityMonitor?.stop()
    // 清理定时任务
    destroyScheduler()
    // 保存聊天记录
    saveChatHistoryMessages()
})

app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('disable-software-rasterizer')
app.commandLine.appendSwitch('ignore-gpu-blacklist')

export function getMainWindow(): BrowserWindow | null {
    return mainWindow
}

/**
 * 获取页面窗口，目前只有一个页面窗口
 * @throws 如果页面窗口数量大于1，则抛出错误
 * @returns 页面窗口
 */
export function getPageWindow(): BrowserWindow | null {
    const allWindowsExcludeMain: BrowserWindow[] = BrowserWindow.getAllWindows().filter(window => window.id !== mainWindow?.id && !isDevelopmentWindow(window.id) && !isHelperWindow(window.id))
    if (allWindowsExcludeMain.length > 1) {
        throw new Error(`页面窗口数量不正确，最多只有一个页面窗口，但是有${allWindowsExcludeMain.length}个`)
    }
    return allWindowsExcludeMain.length === 1 ? allWindowsExcludeMain[0] : null
}
ipcMain.handle('get-petmate-window-position', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const [x, y] = win?.getPosition() ?? [0, 0]
    return { x, y }
})

ipcMain.on('move-petmate-window', (event, x: number, y: number) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.setPosition(Math.round(x), Math.round(y))
})

ipcMain.on('start-petmate-window-drag', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    farmLife.activity()
    farmLife.recall()

    startPetmateWindowDrag(win)
})

ipcMain.on('stop-petmate-window-drag', () => {
    stopPetmateWindowDrag()
})

ipcMain.handle('get-system-audio-active', () => {
    return systemAudioActivityMonitor?.isActive() ?? false
})
