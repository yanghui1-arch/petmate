import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { build } from 'esbuild'

const directory = mkdtempSync(join(tmpdir(), 'petmate-startup-test-'))
const require = createRequire(import.meta.url)
const lines = (file) =>
    readFileSync(file, 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line))
try {
    for (const fallback of [false, true]) {
        const root = join(directory, fallback ? 'fallback' : 'normal')
        mkdirSync(root)
        const userData = join(root, 'user-data')
        if (fallback) writeFileSync(userData, 'not a directory')
        const app = Object.assign(new EventEmitter(), {
            getPath: () => userData,
            getVersion: () => 'test',
            isPackaged: true
        })
        globalThis.startupDiagnosticTest = { app, temporary: root }
        const compiled = await build({
            entryPoints: ['src/main/startupDiagnostics.ts'],
            bundle: true,
            platform: 'node',
            format: 'esm',
            write: false,
            plugins: [
                {
                    name: 'isolated-startup',
                    setup(builder) {
                        builder.onResolve({ filter: /^(electron|node:os)$/ }, (args) => ({
                            path: args.path,
                            namespace: 'mock'
                        }))
                        builder.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
                            contents:
                                args.path === 'electron'
                                    ? `export const app = globalThis.startupDiagnosticTest.app; // ${fallback}`
                                    : 'export const tmpdir = () => globalThis.startupDiagnosticTest.temporary;',
                            loader: 'js'
                        }))
                    }
                }
            ]
        })
        const diagnostics = await import(
            'data:text/javascript;base64,' +
                Buffer.from(compiled.outputFiles[0].text).toString('base64') +
                '#' +
                fallback
        )
        const expected = fallback ? join(root, 'Petmate', 'logs') : join(userData, 'logs')
        const originalConsoleError = console.error
        const expectedWarnings = []
        if (fallback) console.error = (...args) => expectedWarnings.push(args)
        try {
            assert.equal(diagnostics.getDiagnosticDirectory(), expected)
        } finally {
            console.error = originalConsoleError
        }
        if (fallback) assert.equal(expectedWarnings.length, 1)
        diagnostics.recordStartup('test-start')
        assert.equal(await diagnostics.runStartupStage('normal-stage', () => 42), 42)
        await assert.rejects(
            diagnostics.runStartupStage('player-save', () => {
                throw Object.assign(new Error('injected save failure'), { code: 'EACCES' })
            }),
            /injected save failure/
        )

        const window = Object.assign(new EventEmitter(), { id: 1, webContents: new EventEmitter() })
        diagnostics.observeWindowStartup(window, 'desktop-pet')
        window.emit('ready-to-show')
        window.emit('show')
        window.webContents.emit('did-finish-load')
        window.webContents.emit(
            'did-fail-load',
            {},
            -6,
            'ERR_FILE_NOT_FOUND',
            'file:///missing.html',
            true
        )
        window.webContents.emit(
            'preload-error',
            {},
            '/preload',
            new Error('injected preload failure')
        )
        window.webContents.emit('render-process-gone', {}, { reason: 'crashed', exitCode: 1 })
        window.webContents.emit('console-message', {}, 3, 'private chat and API settings')
        window.webContents.emit(
            'console-message',
            {},
            3,
            '[startup] renderer-entry-failed: missing chunk'
        )
        const events = lines(join(expected, 'startup.log'))
        assert.ok(events.some((row) => row.event === 'window-load-failed' && row.code === -6))
        assert.ok(
            events.some((row) => row.event === 'renderer-process-gone' && row.reason === 'crashed')
        )
        assert.equal(events.filter((row) => row.event === 'renderer-startup-failed').length, 1)
        assert.ok(events.every((row) => !JSON.stringify(row).includes('private chat')))
        const failure = events.find((row) => row.event === 'stage-failed')
        assert.equal(failure.stage, 'player-save')
        assert.equal(failure.error.code, 'EACCES')
        assert.match(failure.error.stack, /injected save failure/)
    }

    // Exercise the actual built Electron entry; never call the real Steam SDK or use real saves.
    const builtEntry = resolve('out/main/index.js')
    assert.match(
        readFileSync(builtEntry, 'utf8'),
        /business-modules-loading/,
        'Run npm run build before this test to verify the diagnostic bootstrap.'
    )
    const electron = require('electron')
    for (const scenario of [
        'native-module-failure',
        'corrupt-settings',
        'corrupt-restore-journal',
        'steam-relaunch',
        'steam-init-failure',
        'successful-startup'
    ]) {
        const root = join(directory, scenario)
        mkdirSync(root)
        if (scenario === 'corrupt-settings') writeFileSync(join(root, 'settings.json'), '{broken')
        if (scenario === 'corrupt-restore-journal')
            writeFileSync(join(root, 'restore-journal.json'), '{broken')
        // Suppress the legacy server import for the fresh, isolated test account.
        if (scenario === 'successful-startup')
            writeFileSync(join(root, 'player-resource-store.json'), '{}')
        const harness = join(root, 'harness.cjs')
        writeFileSync(
            harness,
            `
const { app, BrowserWindow } = require('electron');
app.setPath('userData', ${JSON.stringify(root)});
${
    scenario === 'successful-startup'
        ? `
const cp = require('node:child_process');
const originalSpawn = cp.spawn;
cp.spawn = function(command, ...args) {
    if (command !== 'powershell.exe') return originalSpawn.call(this, command, ...args);
    const { EventEmitter } = require('node:events');
    const child = new EventEmitter();
    child.stdout = new EventEmitter(); child.stderr = new EventEmitter();
    child.kill = () => child.emit('exit', 0, null);
    return child;
};
const poll = setInterval(async () => {
    const window = BrowserWindow.getAllWindows().find(win =>
        win.webContents.getURL().includes('index.html') && !win.webContents.getURL().includes('pet-speech'));
    if (!window || window.webContents.isLoading()) return;
    try {
        if (await window.webContents.executeJavaScript("!!document.querySelector('.petmate-canvas-container canvas')")) {
            clearInterval(poll); console.log('[fixture] pet-model-visible'); app.quit();
        }
    } catch {}
}, 300);
`
        : ''
}
const Module = require('node:module');
const original = Module._load;
Module._load = function(name, ...args) {
    if (name === 'greenworks') {
        ${
            scenario === 'native-module-failure'
                ? "throw new Error('injected native DLL load failure');"
                : scenario === 'successful-startup'
                  ? `return {
            restartAppIfNecessary: () => false, init: () => true,
            getSteamId: () => ({ steamId: 'startup-test', screenName: 'test' }),
            activateAchievement: (_name, success) => success(),
            getAchievementNames: () => [], getAchievement: (_name, success) => success(false),
            getStatInt: () => 0, getStatFloat: () => 0, setStat: () => true,
            storeStats: success => success()
        };`
                  : `return { restartAppIfNecessary: () => ${scenario === 'steam-relaunch'}, init: () => false };`
        }
    }
    return original.call(this, name, ...args);
};
require(${JSON.stringify(builtEntry)});
`
        )
        const env = { ...process.env }
        delete env.ELECTRON_RUN_AS_NODE
        delete env.NODE_OPTIONS
        const result = await new Promise((resolveResult, reject) => {
            const child = spawn(electron, [harness], {
                cwd: root,
                env,
                windowsHide: true,
                stdio: ['ignore', 'pipe', 'pipe']
            })
            let output = ''
            const timer = setTimeout(() => {
                child.kill()
                reject(new Error(`${scenario} timed out: ${output}`))
            }, 30_000)
            child.stdout.on('data', (data) => {
                output += data
            })
            child.stderr.on('data', (data) => {
                output += data
            })
            child.once('error', (error) => {
                clearTimeout(timer)
                reject(error)
            })
            child.once('exit', (code) => {
                clearTimeout(timer)
                resolveResult({ code, output })
            })
        })
        const events = lines(join(root, 'logs', 'startup.log'))
        assert.equal(events[0].event, 'bootstrap-entered')
        if (
            ['native-module-failure', 'corrupt-settings', 'corrupt-restore-journal'].includes(
                scenario
            )
        ) {
            assert.equal(result.code, 1, result.output)
            const failure = events.find((row) => row.event === 'business-modules-failed')
            assert.match(
                failure.error.stack,
                scenario === 'native-module-failure'
                    ? /injected native DLL load failure/
                    : /SyntaxError/
            )
        } else if (scenario === 'successful-startup') {
            assert.equal(result.code, 0, result.output)
            assert.match(result.output, /pet-model-visible/)
            assert.ok(events.some((row) => row.event === 'steam-api-init-success'))
            assert.ok(
                events.some(
                    (row) => row.event === 'window-page-loaded' && row.role === 'desktop-pet'
                )
            )
            assert.ok(
                events.some(
                    (row) => row.event === 'window-first-shown' && row.role === 'desktop-pet'
                )
            )
            assert.ok(events.some((row) => row.event === 'main-services-started'))
            assert.ok(
                !events.some((row) =>
                    ['stage-failed', 'startup-failed', 'renderer-startup-failed'].includes(
                        row.event
                    )
                ),
                JSON.stringify(events)
            )
        } else {
            assert.equal(result.code, 0, result.output)
            assert.ok(
                events.some(
                    (row) =>
                        row.event === 'startup-exit-requested' &&
                        row.reason ===
                            (scenario === 'steam-relaunch'
                                ? 'steam-relaunch-required'
                                : 'steam-api-init-returned-false')
                )
            )
            assert.ok(events.some((row) => row.event === 'before-quit'))
            assert.ok(!events.some((row) => row.event === 'window-created'))
        }
    }
    console.log(
        'Startup diagnostics passed: durable logs, directory fallback, stage stacks, window failures, and real Electron bootstrap/Steam exits.'
    )
} finally {
    delete globalThis.startupDiagnosticTest
    rmSync(directory, { recursive: true, force: true })
}
