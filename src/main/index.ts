import { app, BrowserWindow } from 'electron'
import * as path from 'path'
import './ipc'
import { destroyScheduler, startWishGeneration } from './scheduler'
import { saveChatHistoryMessages } from './llm'
import { playerManager } from './modules/store'
import { greenworksManager } from './greenworks'

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

app.on('before-quit', () => {
  // 清理定时任务
  destroyScheduler()
  // 保存聊天记录
  saveChatHistoryMessages()
})

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}