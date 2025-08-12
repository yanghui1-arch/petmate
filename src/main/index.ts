import { app, BrowserWindow, ipcMain, Menu, nativeImage, screen, shell, Tray } from 'electron'
import * as path from 'path'
import './ipc'
import { destroyScheduler, startWishGeneration } from './scheduler'
import { saveChatHistoryMessages } from './llm'
import { is } from '@electron-toolkit/utils'
import { join } from 'path'
import trayIcon from '../../resources/icon.png?asset'
import { playerManager } from './modules/store'
import { greenworksManager } from './greenworks'
import { getOnTop, updateSettings } from './settings'
import { appInit } from './init'

app.commandLine.appendSwitch('--in-process-gpu')

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

const createWindow = (): void => {
    const { width, height } = screen.getPrimaryDisplay().bounds

    const win = new BrowserWindow({
        width: width,
        height: height,
        frame: false,
        resizable: false,
        transparent: true,
        alwaysOnTop: getOnTop(),
        focusable: true,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, '../preload/index.js'),
            contextIsolation: true,
            nodeIntegration: true,
            webgl: true
        }
    })

    win.once('ready-to-show', () => {
        win.show()
    })

    mainWindow = win
    const WM_INITMENU = 0x0116
    mainWindow.hookWindowMessage(WM_INITMENU, () => {
        mainWindow?.setEnabled(false)
        mainWindow?.setEnabled(true)
        mainWindow?.webContents.send('show-context-menu')
    })
    // 加载渲染进程页面
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
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
            label: '操作教程',
            click: () => {
                const htmlPath = path.join(__dirname, '../../resources/html/opt.html');
                const fileUrl = "file://" + htmlPath;
                shell.openExternal(fileUrl);
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
                mainWindow?.webContents.send('reset-petmate-position')
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
}

app.whenReady().then(async () => {
    appInit()

    // 更新玩家信息，添加Steam数据
    try {
        const steamInfo = greenworksManager.getSteamInfo()
        console.log(steamInfo)
        console.log('Username:', steamInfo.screenName)
        console.log('Steam ID:', steamInfo.steamId, "type", typeof steamInfo.steamId)
        playerManager.updateSteamInfo(steamInfo.steamId)
        console.log('Steam information saved to player manager')
    } catch (error) {
        console.log('Failed to save Steam information:', error)
        app.quit()
        return
    }

    // 创建窗口
    createWindow()
    startWishGeneration(0)

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
ipcMain.on('quit-app', () => {
    app.quit()
})

app.on('before-quit', () => {
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
    const allWindowsExcludeMain: BrowserWindow[] = BrowserWindow.getAllWindows().filter(window => window.id !== mainWindow?.id)
    if (allWindowsExcludeMain.length > 1) {
        throw new Error(`页面窗口数量不正确，最多只有一个页面窗口，但是有${allWindowsExcludeMain.length}个`)
    }
    return allWindowsExcludeMain.length === 1 ? allWindowsExcludeMain[0] : null
}

ipcMain.on('set-ignore-mouse-events', (event, ignore) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.setIgnoreMouseEvents(ignore, { forward: true })
})
