import { app, BrowserWindow, ipcMain, Menu, nativeImage, screen, Tray } from 'electron'
import * as path from 'path'
import './ipc'
import { destroyScheduler, startWishGeneration } from './scheduler'
import { saveChatHistoryMessages } from './llm'
import { is } from '@electron-toolkit/utils'
import { join } from 'path'
import trayIcon from '../../resources/icon.png?asset'
import { playerManager } from './modules/store'
import { greenworksManager } from './greenworks'

app.commandLine.appendSwitch('--in-process-gpu')

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

// 游戏在 steam 中的 应用id
const appId = 3657100

const createWindow = (): void => {
    const { width, height } = screen.getPrimaryDisplay().bounds

    const win = new BrowserWindow({
        width: width,
        height: height,
        frame: false,
        resizable: false,
        transparent: true,
        alwaysOnTop: true,
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
    // 初始化 Steam
  const initResult = await greenworksManager.initialize(appId)

  if (initResult === false) {
    app.quit()
    return
  }

  // 更新玩家信息，添加Steam数据
  try {
    // 清除成就，用于测试
    greenworksManager.clearAchievement("ACH_FIRST_OPEN", () => { }, (err) => {
      console.log("ACH_FIRST_OPEN clear failed:", err)
    })
    greenworksManager.clearAchievement("ACH_FIRST_CHAT", () => { }, (err) => {
      console.log("ACH_FIRST_CHAT clear failed:", err)
    })
    const steamInfo = greenworksManager.getSteamInfo()
    console.log('Username:', steamInfo.screenName)
    console.log('Steam ID:', steamInfo.steamId)
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

ipcMain.on('set-ignore-mouse-events', (event, ignore) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.setIgnoreMouseEvents(ignore, { forward: true })
})
