import { appendFileSync, mkdirSync, renameSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { app, type BrowserWindow } from 'electron'

const session = `${Date.now()}-${process.pid}`
let logDirectory: string | undefined

export function diagnosticError(error: unknown) {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: (error as NodeJS.ErrnoException).code
        }
    }
    return { message: String(error) }
}

export function getDiagnosticDirectory() {
    if (logDirectory) return logDirectory
    const candidates = [] as string[]
    try {
        candidates.push(join(app.getPath('userData'), 'logs'))
    } catch {
        /* Try temporary storage. */
    }
    candidates.push(join(tmpdir(), 'Petmate', 'logs'))
    for (const directory of candidates) {
        try {
            mkdirSync(directory, { recursive: true })
            appendFileSync(join(directory, 'startup.log'), '')
            logDirectory = directory
            return directory
        } catch (error) {
            console.error('[startup] Cannot write diagnostic directory:', directory, error)
        }
    }
    return undefined
}

// Synchronous writes survive immediate Steam exits and early module failures.
export function recordStartup(event: string, details: Record<string, unknown> = {}) {
    try {
        const directory = getDiagnosticDirectory()
        const line =
            JSON.stringify({ time: new Date().toISOString(), session, event, ...details }) + '\n'
        if (!directory) {
            console.error('[startup]', line)
            return
        }
        const file = join(directory, 'startup.log')
        try {
            if (statSync(file).size > 2 * 1024 * 1024) renameSync(file, `${file}.1`)
        } catch {
            /* Logging still works if rotation is unavailable. */
        }
        appendFileSync(file, line)
    } catch (error) {
        console.error('[startup] Diagnostic write failed:', error)
    }
}

export async function runStartupStage<T>(stage: string, action: () => T | Promise<T>): Promise<T> {
    recordStartup('stage-start', { stage })
    try {
        const result = await action()
        recordStartup('stage-complete', { stage })
        return result
    } catch (error) {
        recordStartup('stage-failed', { stage, error: diagnosticError(error) })
        throw error
    }
}

export function observeWindowStartup(window: BrowserWindow, role: string) {
    const identity = { role, windowId: window.id }
    recordStartup('window-created', identity)
    window.once('ready-to-show', () => recordStartup('window-ready-to-show', identity))
    window.once('show', () => recordStartup('window-first-shown', identity))
    window.once('closed', () => recordStartup('window-closed', identity))
    window.webContents.on('did-finish-load', () => recordStartup('window-page-loaded', identity))
    window.webContents.on('did-fail-load', (_event, code, description, _url, mainFrame) => {
        if (mainFrame) recordStartup('window-load-failed', { ...identity, code, description })
    })
    window.webContents.on('preload-error', (_event, _path, error) =>
        recordStartup('window-preload-failed', { ...identity, error: diagnosticError(error) })
    )
    window.webContents.on('render-process-gone', (_event, details) =>
        recordStartup('renderer-process-gone', { ...identity, ...details })
    )
    window.webContents.on('console-message', (_event, level, message) => {
        // Only explicit startup reports; never mirror chat, player data or API configuration.
        if (level === 3 && message.startsWith('[startup]'))
            recordStartup('renderer-startup-failed', { ...identity, message })
    })
}

export function installStartupDiagnostics() {
    recordStartup('bootstrap-entered', {
        version: app.getVersion(),
        packaged: app.isPackaged,
        platform: process.platform,
        arch: process.arch,
        electron: process.versions.electron,
        node: process.versions.node,
        workingDirectory: process.cwd(),
        executable: process.execPath,
        logDirectory: getDiagnosticDirectory()
    })
    // Monitor preserves Node's default uncaught-exception handling.
    process.on('uncaughtExceptionMonitor', (error, origin) =>
        recordStartup('uncaught-exception', { origin, error: diagnosticError(error) })
    )
    process.once('exit', (code) => recordStartup('process-exit', { code }))
    app.on('before-quit', () => recordStartup('before-quit'))
    app.on('will-quit', () => recordStartup('will-quit'))
    app.on('quit', (_event, code) => recordStartup('app-quit', { code }))
    app.on('child-process-gone', (_event, details) =>
        recordStartup('child-process-gone', { ...details })
    )
}
