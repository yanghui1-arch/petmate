import { app, BrowserWindow } from 'electron'
import * as path from 'path'
import './ipc'

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

  // 加载渲染进程页面
  console.log("nihao")
  win.loadURL('http://localhost:5173')
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})