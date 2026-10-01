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
                import { farmLayout, plantingSlots, plotPosition } from './src/renderer/game/farmSceneModel';
                import { cropFrames } from './src/renderer/assets/farm-game';
                let now = 1800000000000, sequence = 0;
                let persisted = { farm: null, cash: 500, revision: 0, receipts: [] };
                let commands = [], notify, failReads = false, readDelay = 900;
                const service = new FarmService({ read: () => structuredClone(persisted),
                  commit: value => persisted = structuredClone(value) },
                  { wall: () => now, monotonic: () => now }, () => 'scene-' + ++sequence, () => 0);
                service.getView(); persisted.farm.exp = 160;
                const cropIds=['tomato','wheat','carrot','potato','wheat','tomato','carrot','potato','tomato'];
                for(let id=0;id<9;id++){
                    if(id===4)continue;
                    const crop=service.getView().catalog.crops.find(c=>c.id===cropIds[id]),phase=id===0||id===2?1:id===1||id===3?3:2;
                    persisted.farm.plots[id].plant={cropId:crop.id,plantedAt:now,durationMs:crop.minutes*60000,elapsedMs:crop.minutes*60000*[0,.15,.6,1][phase],watered:id>=5};
                }
                persisted.farm.produce={wheat:12,carrot:12};
                window.api = {
                  getFarm: async () => { await new Promise(resolve => setTimeout(resolve, readDelay)); return failReads ? { code: 400, message: 'isolated read failure' } : { code: 200, data: service.getView() }; },
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
                  reads: (fail, delay = 450) => { failReads = fail; readDelay = delay },
                  point: (kind, value) => {
                    const canvas = document.querySelector('.farm-scene canvas');
                    const bounds = canvas.getBoundingClientRect();
                    const layout = farmLayout(bounds.width, bounds.height);

                    const p=kind==='plot'?layout.plots[value]:{x:bounds.width-10,y:bounds.height-10};
                    return {x:Math.round(bounds.x+p.x),y:Math.round(bounds.y+p.y)};
                  },
                  scene:()=>window.farmTest.activeScene,
                  roots:()=>window.farmTest.scene().plants.map(({image,plot})=>({plot,slot:image.getData('slot'),x:image.x,y:image.y,phase:image.getData('phase'),originX:image.originX,originY:image.originY,width:image.frame.width,height:image.frame.height,scale:image.scale,frameX:image.frame.cutX,frameY:image.frame.cutY,crop:image.texture.key})),
                  setPhase:async phase=>{
                    persisted.farm.exp=9300;
                    service.getView().catalog.crops.forEach((crop,id)=>persisted.farm.plots[id].plant={cropId:crop.id,plantedAt:now,durationMs:crop.minutes*60000,elapsedMs:crop.minutes*60000*[0,.15,.6,1][phase],watered:false});
                    for(let id=6;id<12;id++)persisted.farm.plots[id].plant=null;
                    notify();await nextTick();
                  },
                  frames:cropFrames,slots:plantingSlots,positions:plotPosition,
                  locale:async value=>{i18n.global.locale.value=value;await nextTick()},
                  unmount:()=>app.unmount(),mount
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
        loader: { '.png': 'file', '.svg': 'file' },
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
                        if (basename(args.path) === 'FarmScene.vue')
                            compiled.content = compiled.content.replace(
                                'scene = created.scene',
                                'scene = created.scene; window.farmTest.activeScene = created.scene'
                            )
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
    await build({ entryPoints: ['src/main/modules/farm/window.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: join(temporary, 'farm-window.cjs') })
    // The Electron process resolves its built-in module, rather than the npm launcher.
    await writeFile(
        join(temporary, 'main.cjs'),
        `
const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { farmWindowSize, fixedFarmWindow } = require('./farm-window.cjs');
app.setPath('userData', join(__dirname, 'isolated-user-data'));
app.commandLine.appendSwitch('use-angle', 'swiftshader');
app.commandLine.appendSwitch('enable-unsafe-swiftshader');
app.commandLine.appendSwitch('force-device-scale-factor', '1');
let window;
const errors = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function js(code) { const result=await window.webContents.executeJavaScript('Promise.resolve().then(()=>('+code+')).catch(e=>({__testError:e.stack}))'); if(result?.__testError)throw Error(result.__testError+' '+code); return result; }
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

async function screenshot(name) {const page=await window.webContents.capturePage();const directory=name==='farm-actual-loading.png'?'004-farm-pet-assistant':'003-farm-game-experience';writeFileSync(join("D:/TSFile/petmate/spec",directory,name),page.toPNG())}
async function clickNative(selector) {
 const point=await js('(()=>{const r=document.querySelector('+JSON.stringify(selector)+').getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()');
 window.webContents.sendInputEvent({type:'mouseMove',...point});await sleep(70);
 window.webContents.sendInputEvent({type:'mouseDown',...point,button:'left',clickCount:1});
 window.webContents.sendInputEvent({type:'mouseUp',...point,button:'left',clickCount:1});await sleep(180);
}
async function escape() {window.webContents.sendInputEvent({type:'keyDown',keyCode:'Escape'});window.webContents.sendInputEvent({type:'keyUp',keyCode:'Escape'});await sleep(100)}
async function bounds(selector) {return js('(()=>{const r=document.querySelector('+JSON.stringify(selector)+').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}})()')}
async function within(selector) {const b=await bounds(selector),size=await js('[innerWidth,innerHeight]');assert.ok(b.x>=0&&b.y>=0&&b.right<=size[0]+1&&b.bottom<=size[1]+1,selector+' fits window: '+JSON.stringify({b,size}))}
async function sceneCoverage() {
 const result=await js('(()=>{const s=window.farmTest.scene(),r=s.world.getAt(0).getBounds();return {width:innerWidth,height:innerHeight,background:{x:r.x,y:r.y,right:r.right,bottom:r.bottom},beds:s.beds.map(b=>{const r=b.getBounds();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom}})}})()');
 const {background:b,width:w,height:h}=result;
 assert.ok(b.x<=0&&b.y<=0&&b.right>=w&&b.bottom>=h,'background covers the complete viewport');
 assert.ok(result.beds.every(r=>r.x>=0&&r.y>=0&&r.right<=w&&r.bottom<=h),'all 12 fields fit the viewport');
}
async function pointerCursor(id,frame) {
 const point=await js('window.farmTest.point("plot",'+id+')');
 const origins={7:[40/313,276/295],8:[295/310,250/267],9:[23/323,154/280]};
 for(const offset of [-12,12]) {
  window.webContents.sendInputEvent({type:'mouseMove',x:point.x,y:point.y+offset});await sleep(90);
  const result=await js('(()=>{const s=window.farmTest.scene(),c=s.cursor;return {visible:c.visible,frame:c.frame.name,x:c.x,y:c.y,originX:c.originX,originY:c.originY,alpha:s.textures.getPixelAlpha(Math.round(c.originX*c.frame.width),Math.round(c.originY*c.frame.height),"icons",c.frame.name),native:getComputedStyle(s.game.canvas).cursor}})()');
  assert.equal(result.visible,true);assert.equal(Number(result.frame),frame);
  assert.equal(result.x,point.x);assert.equal(result.y,point.y+offset);
  assert.equal(result.originX,origins[frame][0]);assert.equal(result.originY,origins[frame][1]);
  assert.ok(result.alpha>32,'cursor hotspot must land on visible artwork: '+JSON.stringify(result));
  assert.equal(result.native,'none','system cursor hidden while action cursor is visible');
 }
}
async function regularCursor() {
 assert.equal(await js('(()=>{const s=window.farmTest.scene();return !s.cursor.visible&&getComputedStyle(s.game.canvas).cursor.includes("game-arrow")})()'),true,'game arrow restored and action cursor hidden');
}
app.whenReady().then(async()=>{
 const size=farmWindowSize({width:1920,height:1080});
 window=new BrowserWindow({show:false,...size,...fixedFarmWindow,frame:false,useContentSize:true,webPreferences:{contextIsolation:false,nodeIntegration:false,offscreen:true}});
 assert.equal(window.isResizable(),false);assert.equal(window.isMaximizable(),false);assert.equal(window.isFullScreenable(),false);
 assert.deepEqual(window.getContentSize(),[1280,720]);
 window.webContents.on('console-message',(_e,_level,message)=>{if(/error|failed/i.test(message))errors.push(message)});
 await window.loadFile(join(__dirname,'index.html'));
 await wait("!!document.querySelector('.game-loading')");
 assert.equal(await js("document.querySelector('.game-loading progress').value"),0,'data has not loaded yet');
 assert.equal(await js("getComputedStyle(document.querySelector('.loading-card')).cursor.includes('game-arrow')"),true);
 await sleep(250);
 await screenshot('farm-actual-loading.png');
 await wait("document.querySelector('.farm-scene canvas') && !document.querySelector('.scene-error')");
 await wait("!document.querySelector('.game-loading')");
 await js('window.farmTest.reads(true, 0)');
 await wait("!!document.querySelector('.game-loading button:not(.loading-exit)')");
 assert.ok(await js("document.querySelector('.game-loading progress').value")<100,'failed reload cannot claim completion');
 await js('window.farmTest.reads(false, 450)');
 await clickNative('.loading-card button');
 assert.ok(await js("document.querySelector('.game-loading progress').value")<100,'retry cannot use stale farm data');
 await wait("!document.querySelector('.game-loading')");
 await js('window.farmTest.reads(false, 0)');
 await sleep(400);
 assert.equal(await js("document.querySelector('.plot-nameplates,.plot-nameplate')===null"),true,'plots have no persistent labels');
 assert.equal(await js("document.querySelector('.topbar,.toolbar,.sidebar,.companion,.decorate-button')===null"),true);
 assert.equal(await js("document.querySelectorAll('.side-actions .round-button').length"),0);
 assert.equal(await js("document.querySelector('.landscape-fill,.coin-plus')===null"),true);
 assert.equal(await js("document.querySelector('.portrait img').src.includes('youmei-avatar')"),true);
 assert.equal(await js("document.querySelector('.store-entry .farm-icon').getAttribute('viewBox')"),'0 0 360 312');
 assert.equal(await js("document.querySelector('.store-entry').textContent.trim()"),'商店','shop entry shows its name instead of the balance');
 assert.equal(await js("getComputedStyle(document.querySelector('.profile')).cursor.includes('game-arrow')"),true);
 await sceneCoverage();await pointerCursor(4,8);await pointerCursor(0,9);await pointerCursor(1,7);
 const fullBackground=await js('(()=>{const r=window.farmTest.scene().world.getAt(0).getBounds();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom}})()');
 assert.ok(Math.abs(fullBackground.x)<0.01&&Math.abs(fullBackground.y)<0.01&&Math.abs(fullBackground.right-1280)<0.01&&Math.abs(fullBackground.bottom-720)<0.01,'the entire 16:9 farm background is visible: '+JSON.stringify(fullBackground));
 assert.equal(await js('(()=>{const s=window.farmTest.scene();s.input.emit("pointermove",{x:400,y:400,event:{type:"touchmove"}});return !s.cursor.visible&&getComputedStyle(s.game.canvas).cursor.includes("game-arrow")})()'),true,'touch input leaves no tool cursor behind');
 await screenshot('farm-actual-pointer.png');
 const resting=await js('window.farmTest.point("plot",6)');
 window.webContents.sendInputEvent({type:'mouseMove',...resting});await sleep(90);await regularCursor();
 window.webContents.sendInputEvent({type:'mouseMove',x:1070,y:710});await sleep(90);await regularCursor();
 const baseline=await bounds('.farm-scene canvas');
 await screenshot('farm-actual-1280.png');
 await pointer('plot',4);
 assert.equal(await js("document.querySelectorAll('.seed-option').length"),6);
 await regularCursor();
 await within('.seed-picker');await screenshot('farm-actual-seeds-1280.png');
 assert.deepEqual(await bounds('.farm-scene canvas'),baseline);
 await clickNative('.seed-option[data-crop="wheat"]');
 await wait("!document.querySelector('.seed-picker')");
 assert.equal((await js("window.farmTest.snapshot()")).farm.plots[4].plant.cropId,'wheat');
 assert.equal((await js("window.farmTest.snapshot()")).farm.tutorialRemaining,5);
 await pointer('plot',4);
 assert.equal((await js("window.farmTest.snapshot()")).farm.plots[4].plant.watered,true);
 const waterCount=(await js('window.farmTest.commands()')).length;
 await pointer('plot',4);assert.equal((await js('window.farmTest.commands()')).length,waterCount);
 await sleep(300);assert.equal(await js("!!document.querySelector('.tooltip')"),true);
 await within('.tooltip');await screenshot('farm-actual-hover-1280.png');
 assert.deepEqual(await bounds('.farm-scene canvas'),baseline);
 await pointer('plot',1);
 assert.equal((await js('window.farmTest.snapshot()')).farm.plots[1].plant,null);
 assert.equal(await js("document.querySelectorAll('.harvest-flight').length"),1);
 await sleep(1600);assert.equal(await js("document.querySelectorAll('.plot-feedback,.harvest-flight').length"),0);
 await clickNative('.orders-entry');await within('.modal');await screenshot('farm-actual-orders-1280.png');
 await regularCursor();
 assert.equal(await js("document.querySelectorAll('.order-card').length"),3);
 const before=(await js('window.farmTest.commands()')).length;
 await pointer('plot',4);assert.equal((await js('window.farmTest.commands()')).length,before,'modal blocks scene');
 await escape();await clickNative('.codex-entry');
 assert.equal(await js("document.querySelectorAll('.modal .item-art').length"),30);
 await screenshot('farm-actual-codex-1280.png');await escape();
 await clickNative('.store-entry');
 assert.equal(await js("document.querySelector('.store-balance').textContent.includes('500')"),true,'shop header shows current balance');
 await screenshot('farm-actual-store-1280.png');await escape();
 for(const phase of [0,1,2,3]) {
  await js('window.farmTest.setPhase('+phase+')');await sleep(200);
  const roots=await js('window.farmTest.roots()'),meta=await js('window.farmTest.frames'),slots=await js('window.farmTest.slots');
  assert.equal(roots.length,54);
  for(const root of roots) {
   const p=await js('window.farmTest.positions('+root.plot+')'),frame=meta[root.crop].stages[phase];
   assert.equal(root.x,p.x+slots[root.slot].x);assert.equal(root.y,p.y+slots[root.slot].y);
   assert.ok(Math.abs(root.frameX+root.originX*root.width-frame.pivot[0])<.0001);
   assert.ok(Math.abs(root.frameY+root.originY*root.height-frame.pivot[1])<.0001);
   assert.equal(root.phase,phase);assert.ok(Math.abs(root.height*root.scale-frame.height)<.0001);
  }
  await screenshot('farm-actual-stage-'+phase+'.png');
 }
 window.setContentSize(800,600);await wait("document.querySelector('.farm-scene canvas').width===800");await sleep(300);
 await sceneCoverage();await pointerCursor(6,8);
 await screenshot('farm-actual-800.png');
 await pointer('plot',6);await within('.seed-picker');await screenshot('farm-actual-seeds-800.png');await escape();
 for(const locale of ['en-US','zh-TW','zh-CN']) {
  await js('window.farmTest.locale('+JSON.stringify(locale)+')');
  await clickNative('.backpack-entry');await within('.modal');
  assert.equal(await js("document.querySelector('.farm').textContent.includes('farm.')"),false);
  assert.equal(await js("document.querySelectorAll('.tabs button').length"),2);
  await screenshot('farm-actual-backpack-'+locale+'-800.png');await escape();
  assert.equal(await js("document.querySelector('.settings-button')===null && !!document.querySelector('.exit-button')"),true);
 }
 window.setContentSize(900,506);await wait("document.querySelector('.farm-scene canvas').width===900");await sleep(200);
 await sceneCoverage();await within('.profile');await within('.store-entry');await within('.exit-button');
 await pointer('plot',6);await within('.seed-picker');await screenshot('farm-actual-small-16x9.png');await escape();
 await clickNative('.orders-entry');await within('.modal');await escape();
 window.setContentSize(1800,900);await wait("document.querySelector('.farm-scene canvas').width===1800");await sleep(200);await screenshot('farm-actual-wide.png');
 await sceneCoverage();await pointerCursor(6,8);
 await js('window.farmTest.unmount()');await wait("document.querySelectorAll('canvas').length===0");
 await js('window.farmTest.mount()');await wait("document.querySelector('.farm-scene canvas') && !document.querySelector('.scene-error')");
 assert.equal(await js("document.querySelectorAll('canvas').length"),1);
 await js('window.farmTest.unmount()');await wait("document.querySelectorAll('canvas').length===0");
 assert.deepEqual(errors.filter(m=>!m.includes('WebGL warning')&&!m.includes('ReadPixels')),[]);
 console.log('Electron + actual Vue/Phaser: fixed 16:9 window, full background, native direct actions, exact crop roots in all 24 frames, responsive layouts, locales and remount cleanup: passed');
 window.destroy();app.exit(0);
}).catch(error=>{console.error(error);if(window)window.destroy();app.exit(1)});
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
