import { is } from '@electron-toolkit/utils'
import { BrowserWindow, screen } from 'electron'
import * as path from 'path'

import type { Response } from '../types/response'
import { NotFoundError } from './error'
import { isDevelopmentWindow } from './developmentWindows'
import { isHelperWindow } from './helperWindows'
import logger from './log'
import { registerFarmWindow } from './modules/farm/runtime'
import { farmWindowSize, fixedFarmWindow, observeFarmWorkArea } from './modules/farm/window'
import { observeWindowStartup } from './startupDiagnostics'

// Shared by renderer entries and the tray, with the same single-page policy.
export function openPageWindow(
    mainWindow: BrowserWindow | null,
    route: string,
    width = 400,
    height = 580
): Response<void> {
    try {
        if (!mainWindow) throw new NotFoundError('主窗口未找到')
        const mainWindowID: number = mainWindow.id
        const currentWindowNum: number = BrowserWindow.getAllWindows().length
        // 最多只能一个主窗口 + 一个新窗口
        if (currentWindowNum > 1) {
            const currentWindows: BrowserWindow[] = BrowserWindow.getAllWindows()
            for (const win of currentWindows) {
                if (win.id !== mainWindowID && !isDevelopmentWindow(win.id) && !isHelperWindow(win.id)) win.close()
            }
        }

        const farm = route === '/farm'
        const farmSize = farmWindowSize(
            screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workAreaSize
        )
        const newWindow = new BrowserWindow({
            width: farm ? farmSize.width : width,
            height: farm ? farmSize.height : height,
            minWidth: farm ? farmSize.width : width,
            minHeight: farm ? farmSize.height : height,
            resizable: false,
            ...(farm ? fixedFarmWindow : {}),
            frame: false,
            transparent: false,
            alwaysOnTop: false,
            show: false,
            modal: false, // 确保不是模态窗口
            webPreferences: {
                preload: path.join(__dirname, '../preload/index.js'),
                contextIsolation: true,
                nodeIntegration: true,
                webgl: true
            }
        })

        observeWindowStartup(newWindow, farm ? 'farm' : 'page')
        newWindow.once('ready-to-show', () => {
            newWindow.show()
        })
        if (farm) registerFarmWindow(newWindow)
        observeFarmWorkArea(newWindow, screen)

        // 加载指定路由的页面
        if (is.dev) {
            newWindow.loadURL(`http://localhost:5173/#${route}`)
            newWindow.webContents.openDevTools({ mode: 'detach' })
        } else {
            newWindow.loadFile(path.join(__dirname, '../renderer/index.html'), {
                hash: route
            })
        }

        logger.info(`成功打开新窗口，路由: ${route}`)
        return {
            code: 200,
            message: '打开新窗口成功'
        } as Response<void>
    } catch (error) {
        logger.error(`打开新窗口失败: ${error}`)
        return {
            code: 400,
            message: '打开新窗口失败'
        } as Response<void>
    }
}
