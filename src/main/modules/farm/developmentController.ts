import { is } from '@electron-toolkit/utils'
import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron'

import type { FarmLifeKind } from '../../../shared/farmLife'
import { type FarmDevelopmentAction,farmDevelopmentActions, farmLifeDevelopmentEvents } from '../../../shared/farmLifeDevelopment'
import type { Response } from '../../../types/response'
import { registerDevelopmentWindow } from '../../developmentWindows'
import logger from '../../log'
import { farmLife } from './runtime'

export const farmLifeDevelopmentShortcut = 'Control+Alt+F8'

export function installFarmLifeDevelopmentController(
    getPetWindow: () => BrowserWindow | null,
    preload: string
) {
    if (!is.dev || app.isPackaged) return
    let controller: BrowserWindow | null = null
    const authorized = (sender: Electron.WebContents) =>
        is.dev &&
        !app.isPackaged &&
        !!controller &&
        !controller.isDestroyed() &&
        controller.webContents.id === sender.id
    const result = <T>(sender: Electron.WebContents, work: () => T): Response<T> => {
        try {
            if (!authorized(sender)) throw Error('仅开发控制器可执行此操作。')
            return { code: 200, data: work() }
        } catch (error) {
            return { code: 400, message: error instanceof Error ? error.message : '操作失败' }
        }
    }
    ipcMain.handle('farm-life-development-get', (event) =>
        result(event.sender, () => farmLife.developmentState())
    )
    ipcMain.handle('farm-life-development-command', (event, action: unknown, kind: unknown) =>
        result(event.sender, () => {
            if (action === 'trigger') {
                if (typeof kind !== 'string' || !Object.hasOwn(farmLifeDevelopmentEvents, kind))
                    throw Error('未知事件。')
                farmLife.triggerForDevelopment(kind as FarmLifeKind)
            } else if (action === 'recall') {
                farmLife.recall()
                farmLife.tick()
            } else if (typeof action === 'string' && Object.hasOwn(farmDevelopmentActions, action)) {
                farmLife.editForDevelopment(action as FarmDevelopmentAction)
            } else throw Error('未知操作。')
            return farmLife.developmentState()
        })
    )
    const open = () => {
        if (controller && !controller.isDestroyed()) {
            controller.show()
            controller.focus()
            return
        }
        const pet = getPetWindow()
        if (!pet || pet.isDestroyed()) return
        const window = new BrowserWindow({
            title: '真实游戏 · 农场验收控制器',
            width: 520,
            height: 730,
            minWidth: 440,
            minHeight: 540,
            show: false,
            autoHideMenuBar: true,
            webPreferences: {
                preload,
                contextIsolation: true,
                nodeIntegration: false
            }
        })
        controller = window
        registerDevelopmentWindow(window)
        window.once('closed', () => {
            if (controller === window) controller = null
        })
        window.once('ready-to-show', () => window.show())
        void window
            .loadURL(
                new URL(
                    '/#/farm-life-controller',
                    process.env.ELECTRON_RENDERER_URL ?? 'http://localhost:5173'
                ).href
            )
            .catch((error) => logger.error('开发控制器加载失败', error))
    }
    if (!globalShortcut.register(farmLifeDevelopmentShortcut, open))
        logger.error('农场开发控制器快捷键注册失败：Ctrl+Alt+F8')
    else logger.info('真实游戏农场控制器：按 Ctrl+Alt+F8 打开；出行后手动点击去看看。')
    app.once('before-quit', () => {
        globalShortcut.unregister(farmLifeDevelopmentShortcut)
        ipcMain.removeHandler('farm-life-development-get')
        ipcMain.removeHandler('farm-life-development-command')
        controller?.close()
    })
}
