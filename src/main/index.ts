import { app, BrowserWindow, Menu, nativeImage, screen, Tray } from 'electron'
import * as path from 'path'
import './ipc'
import { destroyScheduler, startWishGeneration } from './scheduler'
import { saveChatHistoryMessages } from './llm'

let mainWindow: BrowserWindow | null = null;
let tray = null

const createWindow = () => {
  const { width, height } = screen.getPrimaryDisplay().bounds;

  const win = new BrowserWindow({
    width: width,
    height: height,
    frame: false,
    resizable: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: true,
      webgl: true
    },
  })

  mainWindow = win;
  mainWindow.setIgnoreMouseEvents(true);

  // 加载渲染进程页面
  win.loadURL('http://localhost:5173')
  win.on('blur', () => {
    win.setTitle('')  // 清除标题
  })

  mainWindow.setSkipTaskbar(true);
  const icon = nativeImage.createFromPath('src/renderer/assets/image/card.jpg')
  tray = new Tray(icon)
  // 创建托盘菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示', click: () => {
        mainWindow?.show()
      }
    },
    {
      label: '退出', click: () => {
        app.quit()
      }
    }
  ])
  tray.setContextMenu(contextMenu)
  tray.setToolTip('Petmate')
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