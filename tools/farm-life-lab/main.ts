import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'

import { app, BrowserWindow, ipcMain, screen } from 'electron'

import { FarmLifeDesktop } from '../../src/main/modules/farm/lifeDesktop'
import { farmWindowSize, fixedFarmWindow } from '../../src/main/modules/farm/window'
import type { FarmCommand, FarmOperation, FarmSnapshot } from '../../src/main/types/farm'
import type { FarmLifeView, FarmLifeVisit } from '../../src/shared/farmLife'
import { LabSession } from './session'
import { eventNames, type LabCommand, type LabSpeech, type LabState, presetNames } from './types'

// This entry is launched separately. Never import production main/store/Steam modules here.
const directory = resolve(process.argv[2]),
    url = process.argv[3]
if (
    dirname(directory) !== resolve(tmpdir()) ||
    !basename(directory).startsWith('petmate-farm-life-lab-') ||
    !/^http:\/\/127\.0\.0\.1:\d+\/$/.test(url)
)
    throw Error('仅支持隔离验收启动器')
mkdirSync(join(directory, 'user-data'), { recursive: true })
app.setPath('userData', join(directory, 'user-data'))
app.setName('Petmate Farm Life Lab')
if (process.env.FARM_LAB_SMOKE === '1' && process.env.FARM_LAB_GPU !== 'native') {
    app.commandLine.appendSwitch('use-angle', 'swiftshader')
    app.commandLine.appendSwitch('enable-unsafe-swiftshader')
    app.commandLine.appendSwitch('force-device-scale-factor', '1')
}
const savePath = join(directory, 'farm-lab.json')
let snapshot: FarmSnapshot = { farm: null, cash: 10000, revision: 0, receipts: [] }
let controller: BrowserWindow,
    pet: BrowserWindow,
    farm: BrowserWindow | null = null
let desktop: FarmLifeDesktop,
    session: LabSession,
    petReady = false,
    watchAfterResult = false
let timer: ReturnType<typeof setInterval>
let lastCommit = ''
let previewVisit: FarmLifeVisit | null = null
function visualLife(): FarmLifeView {
    return previewVisit ? { enabled: true, visit: previewVisit } : session.life.getView()
}
const alive = (window: BrowserWindow | null | undefined): window is BrowserWindow =>
    !!window && !window.isDestroyed()
function send(channel: string, data: unknown) {
    for (const window of [controller, pet, farm])
        if (alive(window)) window.webContents.send(channel, data)
}
function state(): LabState {
    return {
        life: { ...visualLife(), direction: desktop?.direction ?? 'right' },
        view: session.service.getView(),
        skin: session.skin,
        preview: session.preview,
        farmOpen: alive(farm),
        conditions: { ...session.conditions },
        candidates: session
            .candidates()
            .map((choice) => ({ kind: choice.kind, plots: choice.plotIds })),
        reason: session.reason(),
        log: session.log,
        path: savePath,
        clockSkippedMs: session.skippedMs
    }
}
function changed() {
    if (!session) return
    const visual = visualLife()
    desktop?.update(visual)
    send('farm-life-state', { ...visual, direction: desktop?.direction ?? 'right' })
    send('lab-state', state())
    const visit = session.life.getView().visit
    if (watchAfterResult && visit?.phase === 'visiting' && visit.committed) {
        watchAfterResult = false
        setTimeout(() => {
            if (alive(controller) && session.life.getView().visit?.id === visit.id) void openFarm()
        }, 0)
    }
}
function publish(_value: FarmLifeView, speech?: LabSpeech) {
    if (speech && alive(pet)) pet.webContents.send('farm-life-speech', speech)
    changed()
}
function create(title: string, width: number, height: number, options = {}) {
    const window = new BrowserWindow({
        title,
        width,
        height,
        autoHideMenuBar: true,
        webPreferences: {
            preload: join(directory, 'preload.cjs'),
            contextIsolation: true,
            sandbox: true,
            backgroundThrottling: false
        },
        ...options
    })
    window.webContents.on('console-message', (event) => {
        if (event.level === 'error') console.error(title + ': ' + event.message)
    })
    return window
}
async function openFarm() {
    if (alive(farm)) {
        farm.show()
        farm.focus()
        return
    }
    const size = farmWindowSize(screen.getPrimaryDisplay().workAreaSize)
    const window = create('农场 · 隔离验收', size.width, size.height, {
        ...fixedFarmWindow,
        frame: false
    })
    farm = window
    session.life.farmEntered()
    session.note('已打开真实农场：未提交的工作会取消；已提交结果保留。')
    window.on('closed', () => {
        if (farm === window) {
            farm = null
            session.life.farmLeft()
            changed()
        }
    })
    await window.loadURL(url + '?surface=farm')
    changed()
}
async function closeFarm() {
    if (!alive(farm)) return
    const window = farm
    await new Promise<void>((done) => {
        window.once('closed', () => done())
        window.close()
    })
}
async function clearPreview() {
    if (!previewVisit && !session.preview) return
    previewVisit = null
    session.preview = null
    desktop.restore()
    await closeFarm()
}
const result = <T>(work: () => T) => {
    try {
        return { code: 200, data: work() }
    } catch (error) {
        return { code: 400, message: error instanceof Error ? error.message : String(error) }
    }
}
const farmOnly = (sender: number) => {
    if (!alive(farm) || farm.webContents.id !== sender) throw Error('仅测试农场可操作')
}
ipcMain.handle('farm-get', (event) =>
    result(() => {
        farmOnly(event.sender.id)
        return session.service.getView()
    })
)
ipcMain.handle('farm-preview', (event, operation: FarmOperation) =>
    result(() => {
        farmOnly(event.sender.id)
        return session.service.preview(operation)
    })
)
ipcMain.handle('farm-execute', (event, command: FarmCommand) =>
    result(() => {
        farmOnly(event.sender.id)
        session.life.activity()
        const value = session.service.execute(command)
        session.note('玩家手动操作：' + value.feedback.message)
        changed()
        return value
    })
)
ipcMain.handle('farm-checkpoint', (event) =>
    result(() => {
        farmOnly(event.sender.id)
        session.service.checkpoint()
    })
)
ipcMain.handle('farm-manual-activity', (event) =>
    result(() => {
        farmOnly(event.sender.id)
        session.life.activity()
    })
)
ipcMain.handle('farm-life-enter', (event) =>
    result(() => {
        farmOnly(event.sender.id)
        return visualLife()
    })
)
ipcMain.handle('farm-life-leave', () => ({ code: 200 })) // Native window close is the authoritative leave.
ipcMain.handle('farm-life-ready', (event) =>
    result(() => {
        farmOnly(event.sender.id)
        session.life.farmReady()
    })
)
ipcMain.handle('farm-life-diary-shown', (event, id: string) =>
    result(() => {
        farmOnly(event.sender.id)
        session.service.lifeTransaction(session.service.getView().revision, (data) => {
            const record = data.events.find((record) => record.id === id)
            if (record) record.shown = true
        })
    })
)
ipcMain.on('lab-close-farm', (event) => {
    if (alive(farm) && farm.webContents.id === event.sender.id) farm.close()
})
ipcMain.on('lab-pet-ready', (event) => {
    if (alive(pet) && pet.webContents.id === event.sender.id) {
        petReady = true
        changed()
    }
})
ipcMain.on('lab-pet-interaction', (event) => {
    if (alive(pet) && pet.webContents.id === event.sender.id) {
        session.life.interaction()
        changed()
    }
})
ipcMain.on('lab-pet-speech-finished', (event, id: unknown) => {
    if (alive(pet) && pet.webContents.id === event.sender.id && typeof id === 'string') session.life.speechFinished(id)
})
ipcMain.handle('lab-get', () => state())
ipcMain.handle('lab-command', async (event, command: LabCommand) => {
    if (!alive(controller) || controller.webContents.id !== event.sender.id)
        return { ok: false, message: '仅验收控制器可触发' }
    try {
        if (!command || typeof command !== 'object') throw Error('无效操作')
        if (!['preview', 'closeFarm', 'openFarm'].includes(command.type)) await clearPreview()
        if (command.type === 'scenario' || command.type === 'trigger') {
            if (!(command.kind in eventNames)) throw Error('未知事件')
            await closeFarm()
            watchAfterResult = false
            if (command.type === 'scenario') {
                const preset =
                    command.kind === 'tutorial' || command.kind === 'water'
                        ? 'water'
                        : command.kind === 'harvest' ||
                            command.kind === 'order' ||
                            command.kind === 'seedlings' ||
                            command.kind === 'flower'
                          ? command.kind
                          : 'rest'
                session.prepare(preset)
            }
            session.trigger(command.kind)
            watchAfterResult = true
            if (command.fast) {
                session.next()
                session.next()
            }
        } else if (command.type === 'preset') {
            if (!(command.preset in presetNames)) throw Error('未知场景')
            watchAfterResult = false
            await closeFarm()
            session.prepare(command.preset)
        } else if (command.type === 'next') session.next()
        else if (command.type === 'recall') {
            session.life.recall()
            session.life.tick()
            session.note('玩家召回：未提交工作取消。')
        } else if (command.type === 'openFarm') await openFarm()
        else if (command.type === 'closeFarm') await closeFarm()
        else if (command.type === 'reset') {
            watchAfterResult = false
            await closeFarm()
            session.prepare()
        } else if (command.type === 'restart') {
            watchAfterResult = false
            session.restart()
        } else if (command.type === 'condition') {
            if (
                !['energy', 'sleep', 'saveFailure'].includes(command.key) ||
                typeof command.value !== 'boolean'
            )
                throw Error('无效条件')
            session.conditions[command.key] = command.value
            if (command.key === 'saveFailure' && !command.value) session.service.checkpoint()
            session.life.tick()
            session.note('测试条件 ' + command.key + '：' + command.value)
        } else if (command.type === 'skin') {
            if (!['classic', 'labor-skin', 'school-uniform'].includes(command.skin))
                throw Error('未知服装')
            if (session.life.getView().visit) throw Error('请在出行结束后切换服装。')
            session.skin = command.skin
        } else if (command.type === 'preview') {
            if (
                command.action !== null &&
                !['departure', 'bridge', 'door', 'sweat'].includes(command.action)
            )
                throw Error('未知动作')
            if (session.life.getView().visit) throw Error('请先结束出行。')
            await clearPreview()
            session.preview = command.action
            if (command.action) {
                previewVisit = {
                    id: 'preview-' + crypto.randomUUID(),
                    kind: command.action === 'door' ? 'rest' : command.action === 'sweat' ? 'water' : 'walk',
                    plotIds: [], tutorial: false,
                    phase: command.action === 'departure' ? 'leaving' : 'visiting',
                    since: Date.now(), returnAt: Date.now() + 86400000,
                    committed: true, cancelled: false, line: 0, skin: 'classic'
                }
                if (command.action === 'departure') desktop.update({ enabled: true, visit: { ...previewVisit, phase: 'preparing' } })
                else await openFarm()
            }
            session.note('纯动作预览：不产生工作、奖励或日记。')
        } else if (command.type === 'diary') {
            if (session.life.getView().visit) throw Error('请先结束出行。')
            session.service.lifeTransaction(session.service.getView().revision, (data) => {
                data.events = Array.from({ length: 8 }, (_, index) => ({
                    id: 'lab-diary-' + crypto.randomUUID(),
                    at: Date.now() - (8 - index) * 60_000,
                    day: data.day,
                    kind: index % 2 ? 'rest' : 'walk',
                    plots: 0,
                    items: {},
                    line: index % 2,
                    shown: false,
                    interrupted: false,
                    orderReady: false
                }))
            })
            session.note('已注入 8 条生活日记样例，仅测试展示；没有改库存。')
            await openFarm()
        } else throw Error('未知操作')
        changed()
        return { ok: true }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        session.note('未触发 / 操作失败：' + message)
        changed()
        return { ok: false, message }
    }
})

app.whenReady()
    .then(async () => {
        const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea
        controller = create(
            '尤美农场 · 验收控制器',
            Math.min(690, area.width - 40),
            Math.min(880, area.height - 40),
            { x: area.x + 25, y: area.y + 20, show: false }
        )
        pet = create('隔离测试桌宠', 300, 300, {
            frame: false,
            transparent: true,
            resizable: false,
            alwaysOnTop: true,
            show: false,
            x: area.x + Math.min(area.width - 310, 780),
            y: area.y + area.height - 300
        })
        desktop = new FarmLifeDesktop(pet, () => {
            session?.life.activity()
            session?.life.recall()
        })
        session = new LabSession(
            {
                read: () => structuredClone(snapshot),
                commit: (value) => {
                    const temporary = savePath + '.pending'
                    writeFileSync(temporary, JSON.stringify(value, null, 2), 'utf8')
                    renameSync(temporary, savePath)
                    snapshot = JSON.parse(readFileSync(savePath, 'utf8'))
                    const visit = value.farm?.life?.active
                    if (visit?.committed && visit.id !== lastCommit) {
                        lastCommit = visit.id
                        const entry = value.farm?.life?.events.find(
                            (entry) => entry.id === visit.id
                        )
                        session.note(
                            entry?.interrupted
                                ? '工作已取消：没有扣资源或发奖。'
                                : `结果已保存：${entry?.plots ?? 0} 块；库存 ${JSON.stringify(entry?.items ?? {})}`
                        )
                    }
                    send('game-save-changed', {})
                }
            },
            {
                available: () =>
                    petReady && alive(pet) && pet.isVisible() && !desktop.hiddenByPlayer,
                blocked: () =>
                    session.conditions.energy || session.conditions.sleep || desktop.hiddenByPlayer,
                farmOpen: () => alive(farm),
                skin: () => session.skin,
                publish,
                restore: () => desktop.restore()
            },
            changed
        )
        session.prepare()
        timer = setInterval(() => {
            session.tick()
            changed()
        }, 250)
        controller.on('closed', () => {
            clearInterval(timer)
            session.life.stop()
            app.quit()
        })
        await Promise.all([
            controller.loadURL(url + '?surface=controller'),
            pet.loadURL(url + '?surface=desktop')
        ])
        pet.showInactive()
        controller.show()
        controller.moveTop()
        controller.focus()
        if (!controller.isVisible() || controller.isMinimized())
            throw Error('验收控制器未显示，请重新启动。')
        console.log('验收控制器已显示，可以点击事件按钮；关闭控制器退出。')
        if (process.env.FARM_LAB_SMOKE === '1')
            await import('./smoke').then((module) =>
                module.smoke({
                    controller,
                    pet,
                    state,
                    openFarm,
                    getFarm: () => farm,
                    session,
                    directory
                })
            )
    })
    .catch((error) => {
        console.error(error)
        app.exit(1)
    })
app.on('window-all-closed', () => app.quit())
