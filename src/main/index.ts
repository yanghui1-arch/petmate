import { app, BrowserWindow, screen } from 'electron'
import * as path from 'path'
import './ipc'
import { destroyScheduler, startWishGeneration } from './scheduler'
import { saveChatHistoryMessages } from './llm'

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const win = new BrowserWindow({
    width: width,
    height: height,
    // frame: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: true,
      webgl: true
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

app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('ignore-gpu-blacklist');

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}