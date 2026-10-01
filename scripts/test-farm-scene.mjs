import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { build } from 'esbuild'
import { compileScript, compileStyle, parse } from 'vue/compiler-sfc'

const require = createRequire(import.meta.url)
const temporary = await mkdtemp(join(tmpdir(), 'petmate-farm-scene-'))
const styles = []
try {
    await build({
        stdin: {
            contents: `import { createApp, nextTick } from 'vue';
                import { createI18n } from 'vue-i18n';
                import { createMemoryHistory, createRouter } from 'vue-router';
                import Farm from './src/renderer/views/Farm.vue';
                import zhCN from './src/renderer/i18n/locales/zh-CN';
                import enUS from './src/renderer/i18n/locales/en-US';
                import zhTW from './src/renderer/i18n/locales/zh-TW';
                import { FarmService } from './src/main/modules/farm/service';
                import { farmLayout, cellRect } from './src/renderer/game/farmSceneModel';
                let now = 1800000000000, sequence = 0;
                let persisted = { farm: null, cash: 500, revision: 0, receipts: [] };
                let commands = [], notify;
                const service = new FarmService({ read: () => structuredClone(persisted),
                  commit: value => persisted = structuredClone(value) },
                  { wall: () => now, monotonic: () => now }, () => 'scene-' + ++sequence, () => 0);
                service.getView(); persisted.farm.exp = 420;
                persisted.farm.decorations = { barrel: 2, bench: 1 };
                persisted.farm.placed = [{ instanceId: 'initial-barrel', decorationId: 'barrel', region: 'bottom', x: 0, y: 0 }];
                window.api = {
                  getFarm: async () => ({ code: 200, data: service.getView() }),
                  previewFarm: async operation => ({ code: 200, data: service.preview(operation) }),
                  executeFarm: async command => { commands.push(command); return { code: 200, data: service.execute(command) }; },
                  onGameSaveChanged: callback => { notify = callback; return () => { notify = null }; },
                  checkpointFarm: async () => {}, closeWindow: () => {}
                };
                const i18n = createI18n({ legacy: false, locale: 'zh-CN', messages: { 'zh-CN': zhCN, 'en-US': enUS, 'zh-TW': zhTW } });
                const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/farm', component: Farm }] });
                let app;
                async function mount() { await router.push('/farm'); app = createApp(Farm).use(i18n).use(router); app.mount('#app'); }
                window.farmTest = {
                  snapshot: () => structuredClone(persisted), commands: () => structuredClone(commands),
                  point: (kind, value) => {
                    const canvas = document.querySelector('.farm-scene canvas');
                    const bounds = canvas.getBoundingClientRect();
                    const layout = farmLayout(bounds.width, bounds.height);
                    const rect = kind === 'plot' ? layout.plots[value] : kind === 'blank' ? { x: 2, y: bounds.height - 6, width: 2, height: 2 } : cellRect(layout, value);
                    return { x: Math.round(bounds.x + rect.x + rect.width / 2), y: Math.round(bounds.y + rect.y + rect.height / 2) };
                  }, locale: async value => { i18n.global.locale.value = value; await nextTick(); },
                  unmount: () => app.unmount(), mount
                };
                mount();`,
            resolveDir: process.cwd(),
            loader: 'ts'
        },
        bundle: true,
        format: 'esm',
        platform: 'browser',
        splitting: true,
        outdir: temporary,
        entryNames: 'app',
        chunkNames: 'chunk-[hash]',
        define: {
            __VUE_OPTIONS_API__: 'true',
            __VUE_PROD_DEVTOOLS__: 'false',
            __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false'
        },
        loader: { '.png': 'file' },
        assetNames: 'assets/[name]-[hash]',
        plugins: [
            {
                name: 'actual-farm-sfc',
                setup(builder) {
                    builder.onLoad({ filter: /\.vue$/ }, async (args) => {
                        const source = await readFile(args.path, 'utf8')
                        const { descriptor, errors } = parse(source, { filename: args.path })
                        assert.deepEqual(errors, [])
                        const id = `data-v-${basename(args.path).replace(/\W/g, '').toLowerCase()}`
                        const compiled = compileScript(descriptor, { id, inlineTemplate: true })
                        for (const style of descriptor.styles) {
                            const result = compileStyle({
                                source: style.content,
                                filename: args.path,
                                id,
                                scoped: style.scoped
                            })
                            assert.deepEqual(result.errors, [])
                            styles.push(result.code)
                        }
                        return {
                            contents:
                                compiled.content.replace(
                                    'export default ',
                                    'const __component = '
                                ) +
                                `\n__component.__scopeId = '${id}'; export default __component;`,
                            loader: 'ts',
                            resolveDir: dirname(args.path)
                        }
                    })
                }
            }
        ]
    })
    await writeFile(
        join(temporary, 'index.html'),
        `<!doctype html><html lang="zh"><meta charset="utf-8"><style>html,body,#app{margin:0;width:100%;height:100%;} ${styles.join('\n')}</style><div id="app"></div><script type="module" src="app.js"></script></html>`
    )
    // The Electron process resolves its built-in module, rather than the npm launcher.
    await writeFile(
        join(temporary, 'main.cjs'),
        `
const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');
app.setPath('userData', join(__dirname, 'isolated-user-data'));
app.commandLine.appendSwitch('use-angle', 'swiftshader');
app.commandLine.appendSwitch('enable-unsafe-swiftshader');
let window;
const errors = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function js(code) { return window.webContents.executeJavaScript(code); }
async function wait(code) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) { if (await js(code)) return; await sleep(50); }
  throw new Error('Timed out: ' + code + '\\n' + errors.join('\\n'));
}
async function button(selector, text) {
  await js('Array.from(document.querySelectorAll(' + JSON.stringify(selector) + ')).find(b => b.textContent.trim() === ' + JSON.stringify(text) + ').click()');
  await sleep(120);
}
async function pointer(kind, value, right = false) {
  await wait("document.querySelector('.farm-scene canvas').height === document.querySelector('.field').clientHeight");
  await sleep(80);
  const point = await js('window.farmTest.point(' + JSON.stringify(kind) + ',' + JSON.stringify(value) + ')');
  window.webContents.sendInputEvent({ type: 'mouseMove', ...point });
  await sleep(70);
  window.webContents.sendInputEvent({ type: 'mouseDown', ...point, button: right ? 'right' : 'left', clickCount: 1 });
  window.webContents.sendInputEvent({ type: 'mouseUp', ...point, button: right ? 'right' : 'left', clickCount: 1 });
  await sleep(140);
}
async function screenshot(name) {
  const page = await window.webContents.capturePage();
  writeFileSync(join(${JSON.stringify(resolve('spec/002-farm-tools'))}, name), page.toPNG());
}
async function layoutSnapshot() {
  await sleep(120);
  return js("(() => { const rect = selector => { const b = document.querySelector(selector).getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; }; const canvas = document.querySelector('.farm-scene canvas'); return { field: rect('.field'), canvas: rect('.farm-scene canvas'), pixels: [canvas.width, canvas.height], toolbar: rect('.toolbar'), plots: Array.from({ length: 12 }, (_, i) => window.farmTest.point('plot', i)) }; })()");
}
async function assertFloatingHint(baseline) {
  assert.deepEqual(await layoutSnapshot(), baseline, 'equipping or switching tools must not move the scene, plots or toolbar');
  const hint = await js("(() => { const node = document.querySelector('.tool-status'); const b = node.getBoundingClientRect(); const field = document.querySelector('.field'); return { parent: node.parentElement === field, position: getComputedStyle(node).position, left: b.left, right: b.right, top: b.top, bottom: b.bottom, buttons: Array.from(node.querySelectorAll('button'), button => { const r = button.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, pointer: getComputedStyle(button).pointerEvents }; }) }; })()");
  assert.equal(hint.parent, true);
  assert.equal(hint.position, 'absolute');
  assert.ok(hint.left >= baseline.field.x && hint.right <= baseline.field.x + baseline.field.width);
  assert.ok(hint.top >= baseline.field.y && hint.bottom < baseline.plots[0].y - 40, 'the hint must stay above the plots');
  for (const button of hint.buttons) {
    assert.equal(button.pointer, 'auto');
    assert.ok(button.left >= hint.left && button.right <= hint.right && button.top >= hint.top && button.bottom <= hint.bottom);
  }
  assert.equal(await js("document.querySelector('.skyline') === null"), true);
}
async function cancelHint() {
  const point = await js("(() => { const b = document.querySelector('.tool-status button:last-child').getBoundingClientRect(); return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) }; })()");
  window.webContents.sendInputEvent({ type: 'mouseMove', ...point });
  window.webContents.sendInputEvent({ type: 'mouseDown', ...point, button: 'left', clickCount: 1 });
  window.webContents.sendInputEvent({ type: 'mouseUp', ...point, button: 'left', clickCount: 1 });
  await wait("document.querySelector('.tool-status') === null");
  assert.equal(await js("document.querySelector('.skyline') !== null"), true);
}
async function clickNative(selector) {
  const point = await js('(() => { const b = document.querySelector(' + JSON.stringify(selector) + ').getBoundingClientRect(); return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) }; })()');
  window.webContents.sendInputEvent({ type: 'mouseMove', ...point });
  window.webContents.sendInputEvent({ type: 'mouseDown', ...point, button: 'left', clickCount: 1 });
  window.webContents.sendInputEvent({ type: 'mouseUp', ...point, button: 'left', clickCount: 1 });
  await sleep(240);
}
async function escape() {
  window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
  window.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' });
  await sleep(120);
}
async function assertCleanTool(baseline) {
  assert.deepEqual(await layoutSnapshot(), baseline, 'sowing/watering must not move the scene or plots');
  assert.equal(await js("document.querySelector('.tool-status') === null && document.querySelector('.sidebar') === null"), true);
  assert.equal(await js("document.querySelector('.skyline') !== null"), true);
  assert.equal(await js("Array.from(document.querySelectorAll('.farm button')).some(b => /^(全部浇水|全部澆水|Water all|批量种|批量播種|Plant all)$/.test(b.textContent.trim()))"), false);
}
async function checkDrawer(baseline, size) {
  const before = (await js('window.farmTest.commands()')).length;
  await pointer('plot', 0);
  await sleep(100);
  assert.equal(await js("document.querySelectorAll('.sidebar .seed-option').length"), 6);
  assert.deepEqual(await layoutSnapshot(), baseline, 'opening the drawer must not resize the scene');
  await screenshot('farm-drawer-seeds-' + size + '.png');
  await clickNative('.drawer-close');
  assert.equal(await js("document.querySelector('.sidebar') === null"), true);
  await pointer('plot', 0);
  await sleep(100);
  await clickNative('.seed-option');
  await assertCleanTool(baseline);
  await escape();
  await clickNative('.toolbar button:nth-child(3)');
  assert.equal(await js("document.querySelectorAll('.sidebar .order-card').length"), 3);
  assert.deepEqual(await layoutSnapshot(), baseline);
  await screenshot('farm-drawer-orders-' + size + '.png');
  await pointer('plot', 0);
  assert.equal(await js("document.querySelectorAll('.sidebar .seed-option').length"), 6);
  await pointer('blank', null);
  assert.equal(await js("document.querySelector('.sidebar') === null"), true, 'empty scene click closes the drawer');
  await clickNative('.toolbar button:nth-child(3)');
  await escape();
  assert.equal(await js("document.querySelector('.sidebar') === null"), true, 'Escape closes the drawer');
  assert.equal((await js('window.farmTest.commands()')).length, before, 'drawer and seed selection send no operations');
  assert.deepEqual(await layoutSnapshot(), baseline);
}
app.whenReady().then(async () => {
  window = new BrowserWindow({ width: 1080, height: 720, useContentSize: true, show: false,
    webPreferences: { offscreen: true, backgroundThrottling: false, contextIsolation: true, nodeIntegration: false } });
  window.webContents.on('console-message', event => { if (event.level === 'error' && !event.message.includes('Electron Security Warning')) errors.push(event.message); });
  window.webContents.on('render-process-gone', (_event, details) => errors.push(JSON.stringify(details)));
  await window.loadFile(join(__dirname, 'index.html'));
  await wait("document.querySelector('.farm-scene canvas') && !document.querySelector('.scene-error')");
  await sleep(200);
  assert.equal(await js("document.querySelectorAll('.toolbar button').length"), 6);
  const blankPage = await window.webContents.capturePage();
  assert.ok(blankPage.toPNG().length > 40000, 'the scene must actually render');
  await screenshot('farm-phaser-initial.png');
  const fullLayout = await layoutSnapshot();
  assert.ok(Math.abs(fullLayout.field.width - await js('window.innerWidth')) < 1, 'the closed drawer leaves the scene full width, including Windows DPI rounding');
  assert.equal(await js("document.querySelector('.sidebar') === null"), true);
  await checkDrawer(fullLayout, '1080');
  await button('.topbar button', '仓库');
  await button('.modal button', '播种');
  await assertCleanTool(fullLayout);
  await screenshot('farm-clean-tools-1080.png');
  await escape();
  assert.deepEqual(await layoutSnapshot(), fullLayout, 'cancelling the tool must not move the scene');
  await button('.topbar button', '仓库');
  await button('.modal button', '播种');
  assert.equal((await js('window.farmTest.commands()')).length, 0);
  await pointer('plot', 2);
  const commands = await js('window.farmTest.commands()');
  assert.deepEqual(commands[0].operation, { type: 'sow', cropId: 'wheat', plotIds: [2] });
  await assertCleanTool(fullLayout);
  await sleep(1100);
  await button('.toolbar button', '浇水');
  await assertCleanTool(fullLayout);
  const wateredAt = Date.now();
  await pointer('plot', 2);
  assert.equal((await js('window.farmTest.snapshot()')).farm.plots[2].plant.watered, true);
  await assertCleanTool(fullLayout);
  assert.match(await js("document.querySelector('.notice').textContent"), /浇了水/);
  const toast = await js("(() => { const n = document.querySelector('.notice'), r = n.getBoundingClientRect(); return { top: r.top, center: r.x + r.width / 2, pointer: getComputedStyle(n).pointerEvents }; })()");
  assert.ok(toast.top < fullLayout.field.y);
  assert.ok(Math.abs(toast.center - await js('window.innerWidth / 2')) < 1);
  assert.equal(toast.pointer, 'none');
  await screenshot('farm-toast-1080.png');
  await sleep(1000);
  assert.match(await js("document.querySelector('.notice').textContent"), /浇了水/, 'a new result must reset the previous result timer');
  await wait("document.querySelector('.notice') === null");
  assert.ok(Date.now() - wateredAt >= 1900 && Date.now() - wateredAt < 3500, 'watering feedback disappears after about two seconds');
  assert.deepEqual(await layoutSnapshot(), fullLayout);
  await button('.toolbar button', '浇水');
  await pointer('plot', 2);
  await sleep(100);
  assert.equal(await js("document.querySelector('.sidebar .plot-detail button').disabled"), true, 'viewing a watered crop opens its actual details');
  assert.deepEqual(await layoutSnapshot(), fullLayout);
  await screenshot('farm-drawer-detail-1080.png');
  await clickNative('.drawer-close');
  await button('.toolbar button', '布置');
  await js("document.querySelector('.decoration-card').click()");
  await assertFloatingHint(fullLayout);
  await cancelHint();
  await button('.toolbar button', '布置');
  await js("document.querySelector('.decoration-card').click()");
  await pointer('cell', { region: 'bottom', x: 2, y: 0 });
  assert.equal((await js('window.farmTest.snapshot()')).farm.placed.length, 2, JSON.stringify(await js('({commands: window.farmTest.commands(), status: document.querySelector(".tool-status")?.textContent, notice: document.querySelector(".notice")?.textContent})')));
  await pointer('cell', { region: 'bottom', x: 2, y: 0 }, true);
  const reclaimed = await js('window.farmTest.snapshot()');
  assert.equal(reclaimed.farm.placed.length, 1);
  assert.equal(reclaimed.farm.decorations.barrel, 2);
  await screenshot('farm-phaser-1080.png');
  await button('.toolbar button', '图鉴');
  assert.equal(await js("document.querySelectorAll('.crop-stages .item-art').length"), 24);
  assert.equal(await js("Array.from(document.querySelectorAll('.modal img')).every(img => img.complete && img.naturalWidth > 0)"), true);
  await screenshot('farm-codex-1080.png');
  await button('.modal button', '×');
  window.setContentSize(800, 600);
  await wait("document.querySelector('.farm-scene canvas').width === Math.round(document.querySelector('.field').clientWidth)");
  await sleep(150);
  const smallLayout = await layoutSnapshot();
  assert.ok(Math.abs(smallLayout.field.width - await js('window.innerWidth')) < 1);
  await checkDrawer(smallLayout, '800');
  await button('.toolbar button', '浇水');
  await assertCleanTool(smallLayout);
  await pointer('plot', 0);
  assert.equal((await js('window.farmTest.commands()')).length, 4, 'empty target after resize sends no operation');
  await screenshot('farm-phaser-800.png');
  await wait("document.querySelector('.notice') === null");
  assert.deepEqual(await layoutSnapshot(), smallLayout, 'invalid target feedback also expires without moving the scene');
  await button('.toolbar button', '浇水');
  await button('.toolbar button', '布置');
  await screenshot('farm-decorations-800.png');
  await js("document.querySelectorAll('.decoration-card')[3].click()");
  await assertFloatingHint(smallLayout);
  await pointer('cell', { region: 'left', x: 0, y: 0 });
  assert.equal((await js('window.farmTest.snapshot()')).farm.placed.some(item => item.decorationId === 'bench'), true);
  await pointer('cell', { region: 'left', x: 0, y: 0 });
  await pointer('plot', 0);
  assert.equal((await js('window.farmTest.commands()')).length, 5, 'clicking a plot cancels movement instead of modifying land');
  await pointer('cell', { region: 'left', x: 0, y: 0 });
  await pointer('cell', { region: 'bottom', x: 4, y: 0 });
  assert.equal((await js('window.farmTest.snapshot()')).farm.placed.find(item => item.decorationId === 'bench').x, 4);
  await pointer('cell', { region: 'bottom', x: 4, y: 0 }, true);
  assert.equal((await js('window.farmTest.snapshot()')).farm.decorations.bench, 1);
  await button('.topbar button', '仓库');
  await screenshot('farm-warehouse-800.png');
  await button('.modal button', '×');
  await js("document.querySelector('.cash').click()");
  await screenshot('farm-store-800.png');
  await button('.modal button', '×');
  for (const locale of ['en-US', 'zh-TW', 'zh-CN']) {
    await js('window.farmTest.locale(' + JSON.stringify(locale) + ')');
    assert.equal(await js("document.querySelector('.farm').textContent.includes('farm.')"), false);
    const localeLayout = await layoutSnapshot();
    await js("document.querySelector('.toolbar button').click()");
    await assertCleanTool(localeLayout);
    await escape();
    assert.deepEqual(await layoutSnapshot(), localeLayout);
    await js("document.querySelector('.topbar button:nth-last-child(2)').click()");
    await js("document.querySelector('.modal .illustrated-card button').click()");
    await assertCleanTool(localeLayout);
    await screenshot('farm-clean-tools-' + locale + '-800.png');
    await escape();
    assert.deepEqual(await layoutSnapshot(), localeLayout);
    await clickNative('.toolbar button:nth-child(3)');
    assert.equal(await js("document.querySelector('.drawer-close').getAttribute('aria-label').includes('farm.')"), false);
    assert.deepEqual(await layoutSnapshot(), localeLayout);
    await clickNative('.drawer-close');
    assert.equal(await js("document.querySelector('.sidebar') === null"), true);
    if (locale === 'en-US') {
      await button('.toolbar button', 'Water');
      await assertCleanTool(localeLayout);
      await button('.toolbar button', 'Decorate');
      assert.equal(await js("document.querySelectorAll('.decoration-card').length"), 10);
      await screenshot('farm-decorations-en-800.png');
      await button('.modal button', '×');
    }
  }
  await js('window.farmTest.unmount()');
  await wait("document.querySelectorAll('canvas').length === 0");
  await js('window.farmTest.mount()');
  await wait("document.querySelector('.farm-scene canvas') && !document.querySelector('.scene-error')");
  await js('window.farmTest.unmount()');
  await wait("document.querySelectorAll('canvas').length === 0");
  assert.deepEqual(errors.filter(message => !message.includes('WebGL warning') && !message.includes('ReadPixels')), []);
  console.log('Electron + actual Vue/Phaser: full-width stable scene, on-demand drawers with native close/Escape/seed selection, top two-second feedback and timer reset, no sow/water bars or batch entries, 1080/800 and three locales, native operations and destroy/remount: passed');
  window.destroy(); app.exit(0);
}).catch(error => { console.error(error); if (window) window.destroy(); app.exit(1); });
`
    )
    const environment = { ...process.env }
    delete environment.ELECTRON_RUN_AS_NODE
    const child = spawn(require('electron'), [join(temporary, 'main.cjs')], {
        env: environment,
        stdio: 'pipe'
    })
    let output = ''
    child.stdout.on('data', (data) => {
        output += data
    })
    child.stderr.on('data', (data) => {
        output += data
    })
    const limit = setTimeout(() => child.kill(), 90000)
    const code = await new Promise((resolveExit, reject) => {
        child.once('error', reject)
        child.once('exit', resolveExit)
    })
    clearTimeout(limit)
    assert.equal(code, 0, output)
    console.log(output.trim())
} finally {
    // Verify the exact generated target before recursive cleanup on Windows.
    assert.equal(dirname(resolve(temporary)), resolve(tmpdir()))
    assert.ok(basename(temporary).startsWith('petmate-farm-scene-'))
    await rm(temporary, { recursive: true, force: true })
}
