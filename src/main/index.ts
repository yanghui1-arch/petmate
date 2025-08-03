import { app, BrowserWindow } from 'electron'
import greenworks from 'greenworks'
import * as path from 'path'
import './ipc'
import { destroyScheduler, startWishGeneration } from './scheduler'
import { saveChatHistoryMessages } from './llm'
import { playerManager } from './modules/store'

app.commandLine.appendSwitch('--in-process-gpu')

let mainWindow: BrowserWindow | null = null;

// 游戏在 steam 中的 应用id
const appId = 3657100

const createWindow = () => {
  const win = new BrowserWindow({
    width: 400,
    height: 580,
    // frame: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow = win;

  // 加载渲染进程页面
  console.log("nihao")
  win.loadURL('http://localhost:5173')

  win.on('closed', () => {
    mainWindow = null;
  })
}

app.whenReady().then(() => {
  // restartAppIfNecessary 方法将查看游戏可执行文件是否通过 Steam 启动
  let hasLaunchInSteam = greenworks.restartAppIfNecessary(appId)
  // 如果游戏可执行文件已经通过 Steam 启动，则关闭应用
  if (hasLaunchInSteam) {
    console.log("relaunch")
    app.quit()
  }
  // 如果游戏可执行文件没有通过 Steam 启动，则初始化 Steam 并创建窗口
  else {
    console.log("not relaunch")
    if (greenworks.init()) {
      // 更新玩家信息，添加Steam数据
      try {
        const steamInfo = greenworks.getSteamId()
        console.log('Username:', steamInfo.screenName)
        console.log('Steam ID:', steamInfo.steamId)
        console.log('Steam inited successfully')
        playerManager.updateSteamInfo(steamInfo.steamId)
        console.log('Steam information saved to player manager')
      } catch (error) {
        console.log('Failed to save Steam information:', error)
        app.quit()
      }
      // 创建窗口
      createWindow()
    }
    else {
      app.quit()
    }
  }
  startWishGeneration(0)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  // 清理定时任务
  destroyScheduler()
  // 保存聊天记录
  saveChatHistoryMessages()
})

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}