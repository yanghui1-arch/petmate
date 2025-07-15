import { app, BrowserWindow } from 'electron'
import * as path from 'path'
import './ipc'
import { destroyScheduler, startWishGeneration } from './scheduler'

let mainWindow: BrowserWindow | null = null;

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
})

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}