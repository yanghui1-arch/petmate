import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { build } from 'esbuild'
import { compile } from 'sass'
import { compileScript, compileStyle, parse } from 'vue/compiler-sfc'

const require = createRequire(import.meta.url)
const temporary = await mkdtemp(join(tmpdir(), 'petmate-farm-scene-'))
const styles = []
try {
    await build({
        stdin: {
            contents: `import { createApp, nextTick } from 'vue';
                import './src/renderer/assets/style/cursor.scss';
                import { createI18n } from 'vue-i18n';
                import { createMemoryHistory, createRouter } from 'vue-router';
                import Farm from './src/renderer/views/Farm.vue';
                import FarmDeparture from './src/renderer/components/farm/FarmDeparture.vue';
                import zhCN from './src/renderer/i18n/locales/zh-CN';
                import enUS from './src/renderer/i18n/locales/en-US';
                import zhTW from './src/renderer/i18n/locales/zh-TW';
                import { FarmService } from './src/main/modules/farm/service';
                import { farmEntrances, farmLayout, plantingSlots, plotPosition } from './src/renderer/game/farmSceneModel';
                import { cropFrames } from './src/renderer/assets/farm-game';
                import { ensureFarmLife } from './src/shared/farmLife';
                let now = 1800000000000, sequence = 0;
                let persisted = { farm: null, cash: 500, revision: 0, receipts: [] };
                let commands = [], notify, lifeNotify, lifeVisit = null, failReads = false, readDelay = 900, activityCount = 0, shownStories = [];
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
                  enterFarmLife: async () => ({code:200,data:{visit:lifeVisit,enabled:true}}),
                  leaveFarmLife: async () => ({code:200}), readyFarmLife: async () => ({code:200}),
                  onFarmLifeState: callback => {lifeNotify=callback;return()=>lifeNotify=null},
                  markFarmDiaryShown: async id => { const data=ensureFarmLife(persisted.farm,now); const event=data.events.find(event=>event.id===id); if(event)event.shown=true; shownStories.push(id);notify?.();return{code:200} },
                  getFarm: async () => { await new Promise(resolve => setTimeout(resolve, readDelay)); return failReads ? { code: 400, message: 'isolated read failure' } : { code: 200, data: service.getView() }; },
                  previewFarm: async operation => ({ code: 200, data: service.preview(operation) }),
                  executeFarm: async command => { commands.push(command); return { code: 200, data: service.execute(command) }; },
                  onGameSaveChanged: callback => { notify = callback; return () => { notify = null }; },
                  checkpointFarm: async () => {}, closeWindow: () => {}
                  ,farmManualActivity: async () => { activityCount++ }
                };
                const i18n = createI18n({ legacy: false, locale: 'zh-CN', messages: { 'zh-CN': zhCN, 'en-US': enUS, 'zh-TW': zhTW } });
                const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/farm', component: Farm }] });
                let app;
                async function mount() { await router.push('/farm'); app = createApp(Farm).use(i18n).use(router); app.mount('#app'); }
                window.farmTest = {
                  previewDeparture: () => { app?.unmount();app=createApp(FarmDeparture);app.mount('#app') },
                  setVisit: value => {lifeVisit=value;lifeNotify?.({visit:value,enabled:true})},
                  diary: (count=8,prefix='story-') => {const data=ensureFarmLife(persisted.farm,now);data.flower=true;data.events=Array.from({length:count},(_,id)=>({id:prefix+id,at:now+id*1000,day:data.day,kind:id===count-1?'flower':id===3?'harvest':'water',plots:id===count-1?0:3,items:id===3?{pumpkin:3,carrot:6}:{},line:id%2,shown:false,interrupted:false,orderReady:false}));notify?.()},
                  shownStories: () => shownStories,
                  snapshot: () => structuredClone(persisted), commands: () => structuredClone(commands),
                  activities: () => activityCount, entries: farmEntrances,
                  reads: (fail, delay = 450) => { failReads = fail; readDelay = delay },
                  point: (kind, value) => {
                    const canvas = document.querySelector('.farm-scene canvas');
                    const bounds = canvas.getBoundingClientRect();
                    const layout = farmLayout(bounds.width, bounds.height);

                    const entry=farmEntrances.find(e=>e.id===value);
                    const entryPoints=entry?[.1,.9,.5].flatMap(u=>[.1,.9,.5].map(v=>({x:Math.round(bounds.x+layout.x+(entry.area.x+entry.area.width*u)*layout.scale)-bounds.x,y:Math.round(bounds.y+layout.y+(entry.area.y+entry.area.height*v)*layout.scale)-bounds.y}))):[];
                    const entryPoint=entryPoints.find(p=>document.elementFromPoint(bounds.x+p.x,bounds.y+p.y)===canvas&&window.farmTest.scene().hit(p.x,p.y).kind==='entry')??entryPoints[0];
                    const p=kind==='plot'?layout.plots[value]:kind==='entry'?entryPoint:{x:bounds.width-10,y:bounds.height-10};
                    return {x:Math.round(bounds.x+p.x),y:Math.round(bounds.y+p.y)};
                  },
                  scene:()=>window.farmTest.activeScene,
                  roots:()=>{const s=window.farmTest.scene();return s.plants.map(({image,plot})=>({plot,slot:image.getData('slot'),x:image.getData('rootX'),y:image.getData('rootY'),screenX:image.x,screenY:image.y,phase:image.getData('phase'),originX:image.originX,originY:image.originY,width:image.frame.width,height:image.frame.height,scale:image.scale/.9/s.layout.scale,frameX:image.frame.cutX,frameY:image.frame.cutY,crop:image.texture.key}))},
                  matureWheat:()=>{const crop=service.getView().catalog.crops.find(c=>c.id==='wheat');persisted.farm.plots.forEach(plot=>plot.plant={cropId:crop.id,plantedAt:now,durationMs:crop.minutes*60000,elapsedMs:crop.minutes*60000,watered:false});notify()},
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
        loader: { '.png': 'file', '.webm': 'file', '.svg': 'file' },
        assetNames: 'assets/[name]-[hash]',
        alias: { '@': resolve('src/renderer') },
        plugins: [
            {
                name: 'actual-farm-sfc',
                setup(builder) {
                    builder.onLoad({ filter: /\.scss$/ }, async (args) => ({
                        contents: compile(args.path).css,
                        loader: 'css',
                        resolveDir: dirname(args.path)
                    }))
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
        `<!doctype html><html lang="zh"><meta charset="utf-8"><link rel="stylesheet" href="app.css"><style>html,body,#app{margin:0;width:100%;height:100%;} ${styles.join('\n')}</style><div id="app"></div><script type="module" src="app.js"></script></html>`
    )
    await build({
        entryPoints: ['src/main/modules/farm/window.ts'],
        bundle: true,
        platform: 'node',
        format: 'cjs',
        outfile: join(temporary, 'farm-window.cjs')
    })
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

async function screenshot(name) {const directory=process.env.FARM_SCENE_SCREENSHOT_DIR;if(!directory)return;const page=await window.webContents.capturePage();writeFileSync(join(directory,name),page.toPNG())}
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
async function entranceChecks() {
 await screenshot('farm-actual-entrances-'+(await js('innerWidth'))+'.png');
 const save=await js('window.farmTest.snapshot()'),commands=(await js('window.farmTest.commands()')).length;
 assert.equal(await js('document.querySelectorAll(".entrance-sign").length'),4);
 for(const entry of await js('window.farmTest.entries')) {
  const selector='.entrance-sign[data-entrance="'+entry.id+'"]';
  await within(selector);
  const point=await js('window.farmTest.point("entry",'+JSON.stringify(entry.id)+')');
  const before=await js('window.farmTest.activities()');
  window.webContents.sendInputEvent({type:'mouseMove',...point});await sleep(320);
  assert.equal(await js('window.farmTest.activities()'),before,'hover does not record player activity');
  assert.equal(await js('document.querySelector(".entrance-tip")?.getAttribute("data-entry-tip")'),entry.id);
  const cursor=await js('(()=>{const s=window.farmTest.scene();return {visible:s.cursor.visible,native:getComputedStyle(s.game.canvas).cursor,position:s.pointerPosition,hit:s.hit('+point.x+','+point.y+'),element:document.elementFromPoint('+point.x+','+point.y+').tagName}})()');
  assert.ok(!cursor.visible&&cursor.native.includes('sv_cursor_pointer'),'scene entry uses one game click cursor: '+JSON.stringify({entry:entry.id,point,cursor}));
  await pointer('entry',entry.id);
  assert.equal(await js('window.farmTest.activities()'),before+1,'native entry click records player activity once');
  assert.equal(await js('document.querySelector(".entrance-feedback")?.getAttribute("data-entry-tip")'),entry.id);
  await within('.entrance-feedback');
  assert.equal(await js('getComputedStyle(document.querySelector(".entrance-feedback")).pointerEvents'),'none');
  await escape();
  await clickNative(selector);
  assert.equal(await js('document.querySelectorAll(".entrance-feedback").length'),1,'native sign click '+entry.id);
  assert.equal(await js('document.querySelector(".entrance-feedback").getAttribute("data-entry-tip")'),entry.id);
  await escape();
 }
 assert.deepEqual(await js('window.farmTest.snapshot()'),save,'entrances do not change the save');
 assert.equal((await js('window.farmTest.commands()')).length,commands,'entrances never call farm transactions');
 await clickNative('.entrance-sign[data-entrance="fishing"]');
 await sleep(2100);assert.equal(await js('document.querySelectorAll(".entrance-tip").length'),0,'entry feedback expires');
 await clickNative('.entrance-sign[data-entrance="cabin"]');
 await clickNative('.orders-entry');assert.equal(await js('document.querySelectorAll(".entrance-tip").length'),0);
 await pointer('entry','cabin');assert.equal(await js('document.querySelectorAll(".entrance-tip").length'),0,'modal blocks entrance input');
 await escape();
 window.webContents.focus();
 await js('document.querySelector(".entrance-sign[data-entrance=pasture]").focus()');
 assert.equal(await js('document.activeElement?.dataset.entrance'),'pasture');
 window.webContents.sendInputEvent({type:'keyDown',keyCode:'Return'});window.webContents.sendInputEvent({type:'char',keyCode:String.fromCharCode(13)});window.webContents.sendInputEvent({type:'keyUp',keyCode:'Return'});await sleep(100);
 assert.equal(await js('document.querySelector(".entrance-feedback")?.getAttribute("data-entry-tip")'),'pasture','Enter activates a focused sign');
 await escape();
 window.webContents.sendInputEvent({type:'keyDown',keyCode:'Space'});window.webContents.sendInputEvent({type:'char',keyCode:' '});window.webContents.sendInputEvent({type:'keyUp',keyCode:'Space'});await sleep(100);
 assert.equal(await js('document.querySelector(".entrance-feedback")?.getAttribute("data-entry-tip")'),'pasture','Space activates a focused sign');
 await escape();await js('document.activeElement.blur()');
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
 await screenshot('farm-actual-entrances.png');
 assert.equal(await js("document.querySelector('.plot-nameplates,.plot-nameplate')===null"),true,'plots have no persistent labels');
 assert.equal(await js("document.querySelector('.topbar,.toolbar,.sidebar,.companion,.decorate-button')===null"),true);
 assert.equal(await js("document.querySelectorAll('.side-actions .round-button').length"),0);
 assert.equal(await js("document.querySelector('.landscape-fill,.coin-plus')===null"),true);
 assert.equal(await js("document.querySelector('.portrait img').src.includes('youmei-avatar')"),true);
 assert.equal(await js("document.querySelector('.store-entry .farm-icon').dataset.icon"),'shop');
 assert.deepEqual(await js("[...document.querySelectorAll('.side-actions .farm-icon')].map(node=>node.dataset.icon)"),['orders','backpack','codex']);
 assert.equal(await js("[...document.querySelectorAll('.top-actions img.farm-icon, .side-actions img.farm-icon')].every(node=>node.complete&&node.naturalWidth>0)"),true,'all four new entry images have loaded');
 assert.equal(await js("document.querySelector('.store-entry').textContent.trim()"),'商店','shop entry shows its name instead of the balance');
 assert.equal(await js("getComputedStyle(document.querySelector('.profile')).cursor.includes('sv_cursor_pointer')"),true,'HUD buttons keep the global game pointer');
 await entranceChecks();
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
 const waterDrops=await js('(()=>{const splash=document.querySelector(".water-splash"),drops=[...splash.querySelectorAll(".water-drop")];return {x:parseFloat(splash.style.left),y:parseFloat(splash.style.top),drops:drops.length,animation:getComputedStyle(drops[0]).animationName,input:getComputedStyle(drops[0]).pointerEvents}})()');
 const wateredPoint=await js('window.farmTest.point("plot",4)');
 assert.equal(waterDrops.drops,5);assert.ok(waterDrops.animation.startsWith('water-splash-'));assert.equal(waterDrops.input,'none','water drops do not intercept input');
 assert.ok(Math.abs(waterDrops.x-wateredPoint.x)<=0.5&&Math.abs(waterDrops.y-wateredPoint.y)<=0.5,'water splash is anchored to the watered plot');
 const waterCount=(await js('window.farmTest.commands()')).length;
 await pointer('plot',4);assert.equal((await js('window.farmTest.commands()')).length,waterCount);
 assert.equal(await js('document.querySelectorAll(".water-splash").length'),1,'repeat clicking does not add another splash');
 await screenshot('farm-actual-water.png');
 await sleep(1100);assert.equal(await js('document.querySelectorAll(".water-drop").length'),0,'water splash cleans up after its animation');
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
 await screenshot('farm-actual-codex-1280.png');
 await clickNative('.achievements-tab');
 assert.equal(await js("document.querySelectorAll('[data-achievement]').length"),12);
 assert.equal(await js("document.querySelectorAll('.achievement-art img').length"),12,'every card renders its Steam achievement icon');
 await js("Promise.all([...document.querySelectorAll('.achievement-art img')].map(image=>image.decode()))");
 assert.equal(await js("[...document.querySelectorAll('[data-achievement]')].every(card=>{const image=card.querySelector('.achievement-art img'),state=card.classList.contains('unlocked')?'unlocked':'locked';return image.currentSrc.includes(card.dataset.achievement+'_'+state)&&image.naturalWidth===256&&image.naturalHeight===256})"),true,'Steam icon matches the achievement ID and unlocked state');
 await sleep(300);
 assert.equal(await js("[...document.querySelectorAll('.achievement-art img')].every(image=>image.getBoundingClientRect().width>0&&image.getBoundingClientRect().height>0)"),true,'achievement artwork has visible dimensions');
 await screenshot('farm-actual-achievements-1280.png');await escape();
 await clickNative('.store-entry');
 assert.equal(await js("document.querySelector('.store-balance').textContent.includes('500')"),true,'shop header shows current balance');
 await screenshot('farm-actual-store-1280.png');await escape();
 for(const phase of [0,1,2,3]) {
  await js('window.farmTest.setPhase('+phase+')');await sleep(200);
  const roots=await js('window.farmTest.roots()'),meta=await js('window.farmTest.frames'),slots=await js('window.farmTest.slots'),layout=await js('window.farmTest.scene().layout');
  assert.equal(roots.length,54);
  for(const root of roots) {
   const p=await js('window.farmTest.positions('+root.plot+')'),frame=meta[root.crop].stages[phase];
   assert.equal(root.x,p.x+slots[root.slot].x);assert.equal(root.y,p.y+slots[root.slot].y);
   assert.ok(Math.abs(root.screenX-(layout.x+(130+root.x*.9)*layout.scale))<.0001);
   assert.ok(Math.abs(root.screenY-(layout.y+(37.5+root.y*.9)*layout.scale))<.0001);
   assert.ok(Math.abs(root.frameX+root.originX*root.width-frame.pivot[0])<.0001);
   assert.ok(Math.abs(root.frameY+root.originY*root.height-frame.pivot[1])<.0001);
   assert.equal(root.phase,phase);assert.ok(Math.abs(root.height*root.scale-frame.height)<.0001);
  }
  await screenshot('farm-actual-stage-'+phase+'.png');
 }
 window.setContentSize(800,600);await wait("document.querySelector('.farm-scene canvas').width===800");await sleep(300);
 await sceneCoverage();await pointerCursor(6,8);
 await entranceChecks();
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
 await entranceChecks();
 await pointer('plot',6);await within('.seed-picker');await screenshot('farm-actual-small-16x9.png');await escape();
 await clickNative('.orders-entry');await within('.modal');await escape();
 window.setContentSize(1800,900);await wait("document.querySelector('.farm-scene canvas').width===1800");await sleep(200);await screenshot('farm-actual-wide.png');
 await sceneCoverage();await pointerCursor(6,8);
 window.setContentSize(1280,720);await wait("document.querySelector('.farm-scene canvas').width===1280");
 for (const [pose,kind,x,y,height,anchorX,anchorY] of [
  ['bridge','walk',281,603,108,.68,.6],['door','rest',1069,298,106,.7,.62],['sweat','water',853,376,128,.57,.986]
 ]) {
   await js('window.farmTest.setVisit('+JSON.stringify({id:'visit-'+pose,kind,plotIds:[0],tutorial:false,phase:'visiting',since:Date.now()-10000,returnAt:Date.now()+30000,committed:true,cancelled:false,line:0,skin:'school-uniform'})+')');
   await sleep(150);assert.equal(await js('window.farmTest.scene().actor.visible'),true);
   assert.equal(await js('window.farmTest.scene().actor.texture.key'),'life-'+pose);
   assert.equal(await js('window.farmTest.scene().actor.originX'),anchorX);
   assert.equal(await js('window.farmTest.scene().actor.originY'),anchorY);
   assert.equal(await js('!!window.farmTest.scene().actor.input'),false,'character cannot block plots');
   const placement = await js('(()=>{const s=window.farmTest.scene(),a=s.actor,l=s.layout;return{x:(a.x-l.x)/l.scale/1.25,y:(a.y-l.y)/l.scale/1.25,height:a.displayHeight/l.scale/1.25}})()');
   assert.ok(Math.abs(placement.x-x)<.001&&Math.abs(placement.y-y)<.001&&Math.abs(placement.height-height)<.001,'approved placement '+pose);
   const first=await js('window.farmTest.scene().actor.frame.name');await sleep(300);
   const second=await js('window.farmTest.scene().actor.frame.name');
   if(pose==='door')assert.equal(first,second);else assert.notEqual(first,second,'actual frames advance: '+pose);
   if(pose==='sweat') {
     await sleep(5100);assert.equal(await js('Number(window.farmTest.scene().actor.frame.name)'),48);
     const appeared=await js('window.farmTest.scene().actorAppeared');
     await js('window.farmTest.setPhase(2)');await sleep(150);
     assert.equal(await js('window.farmTest.scene().actorAppeared'),appeared,'inventory refresh must not replay greeting');
     await sleep(400);assert.equal(await js('Number(window.farmTest.scene().actor.frame.name)'),48,'hold smiling final frame');
   }
   await screenshot('farm-life-'+pose+'.png');
   if(pose==='door'&&process.env.FARM_SCENE_SCREENSHOT_DIR)writeFileSync(join(process.env.FARM_SCENE_SCREENSHOT_DIR,'farm-life-door-detail.png'),(await window.webContents.capturePage({x:990,y:210,width:160,height:160})).toPNG());
 }
 await js('window.farmTest.matureWheat()');await wait("window.farmTest.scene().plants.length===108 && window.farmTest.scene().plants.every(p=>p.image.texture.key==='wheat'&&p.image.getData('phase')===3)");
 const overlaps=await js('(()=>{const s=window.farmTest.scene(),a=s.actor;s.standing.depthSort();const list=s.standing.getChildren();const index=list.indexOf(a);if(index<0)throw Error("actor missing from shared display list");for(const {image} of s.plants){if(image.displayList!==s.standing||image.depth!==image.y)throw Error("crop layer or root depth incorrect");if((list.indexOf(image)>index)!==(image.y>a.y))throw Error("ground ordering incorrect")}s.savedUpdate=s.update;s.update=()=>{};const bounds=a.getBounds();const alpha=(image,x,y)=>{const b=image.getBounds();if(!b.contains(x,y))return 0;return s.textures.getPixelAlpha((x-b.x)/b.width*image.frame.width,(y-b.y)/b.height*image.frame.height,image.texture.key,image.frame.name)};const front=[],behind=[];for(let y=Math.ceil(bounds.y);y<bounds.bottom;y+=2)for(let x=Math.ceil(bounds.x);x<bounds.right;x+=2){if(alpha(a,x,y)<250)continue;const crop=[...s.plants].reverse().find(p=>alpha(p.image,x,y)>250)?.image;if(!crop)continue;const points=crop.y>a.y?front:behind;if(points.length<30)points.push({x,y})}return{front,behind}})()');
 assert.ok(overlaps.front.length>=10,'opaque foreground wheat must actually overlap the character');
 assert.equal(await js('window.farmTest.scene().plants.some(p=>p.image.y<window.farmTest.scene().actor.y)'),true,'rear crops are present in the shared layer');
 await sleep(100);const withActor=await window.webContents.capturePage();
 await screenshot('farm-life-wheat-occlusion.png');
 await js('(()=>{window.farmTest.scene().actor.setVisible(false)})()');await sleep(100);const withoutActor=await window.webContents.capturePage();
 const firstPixels=withActor.getBitmap(),secondPixels=withoutActor.getBitmap(),row=withActor.getSize().width;
 const pixel=(buffer,p)=>buffer.subarray((p.y*row+p.x)*4,(p.y*row+p.x)*4+3);
 for(const p of overlaps.front)assert.deepEqual(pixel(firstPixels,p),pixel(secondPixels,p),'foreground crops hide character pixels');
 if(overlaps.behind.length)assert.ok(overlaps.behind.some(p=>!pixel(firstPixels,p).equals(pixel(secondPixels,p))),'character remains visible in front of rear crops');
 await js('(()=>{const s=window.farmTest.scene();s.update=s.savedUpdate;delete s.savedUpdate})()');
 for (const [kind,cancelled,pose] of [['seedlings',false,'bridge'],['check',false,'door'],['water',true,'door']]) {
   await js('window.farmTest.setVisit('+JSON.stringify({id:'rest-'+kind,kind,plotIds:[],tutorial:false,phase:'exiting',since:Date.now(),returnAt:Date.now()+6000,committed:true,cancelled,line:0,skin:'classic'})+')');
   await wait("window.farmTest.scene().actor.visible && window.farmTest.scene().actor.texture.key==='life-"+pose+"'");
   assert.equal(await js('!!window.farmTest.scene().actor.input'),false,'resting characters do not intercept crops');
 }
 await js('window.farmTest.setVisit(null)');await sleep(100);assert.equal(await js('window.farmTest.scene().actor.visible'),false);
 await js('window.farmTest.diary()');await sleep(600);
 assert.equal(await js("getComputedStyle(document.querySelector('.farm-diary')).backgroundColor"),'rgba(0, 0, 0, 0)');
 assert.equal(await js("document.querySelectorAll('.farm-diary .diary-scroll').length"),1,'one diary list');
 assert.equal(await js("document.querySelectorAll('.diary-heading button').length"),1,'only the new-story hint is interactive');
 assert.equal(await js("document.querySelector('.diary-heading strong').textContent"),'尤美的小日记');
 assert.ok(await js("(()=>{const diary=document.querySelector('.farm-diary').getBoundingClientRect(),title=document.querySelector('.diary-heading strong').getBoundingClientRect();return Math.abs(title.x+title.width/2-diary.x-diary.width/2)<1})()"),'title is centered even with the unread hint');
 assert.equal(await js("getComputedStyle(document.querySelector('.diary-heading strong')).color"),'rgb(255, 232, 177)');
 assert.equal(await js("window.innerWidth-document.querySelector('.farm-diary').getBoundingClientRect().right"),6,'diary sits close to the right edge');
 assert.equal(await js("document.querySelector('[data-story=story-3] .farm-icon').dataset.icon"),'harvest');
 assert.deepEqual(await js("[...document.querySelectorAll('[data-story=story-3] .story-item')].map(node=>({crop:node.querySelector('.item-art').dataset.item,count:node.querySelector('b').textContent}))"),[{crop:'pumpkin',count:'×3'},{crop:'carrot',count:'×6'}]);
 assert.equal(await js("document.querySelector('.diary-fresh').textContent.trim()"),'✦ 新鲜事');
 assert.equal(await js("getComputedStyle(document.querySelector('.diary-fresh')).animationIterationCount"),'2','new-story glimmer stops after two cycles');
 assert.equal(await js("getComputedStyle(document.querySelector('.diary-scroll')).maxHeight"),'178px','default reading height');
 assert.equal(await js('window.farmTest.scene().flower.visible'),true);
 await screenshot('farm-life-diary.png');
 await clickNative('.orders-entry');const shownBefore=await js('window.farmTest.shownStories().length');await sleep(3100);
 assert.equal(await js('window.farmTest.shownStories().length'),shownBefore,'modal pauses acknowledgements');
 await escape();await sleep(3100);
 assert.ok((await js('window.farmTest.shownStories()')).includes('story-3'),'oldest of latest five actually displayed');
 assert.equal((await js('window.farmTest.shownStories()')).includes('story-0'),false,'omitted old story is not falsely read');
 assert.equal(await js("document.querySelector('.diary-scroll').scrollTop"),0,'new stories do not move the reading position');
 await js("(()=>{document.querySelector('.diary-scroll').scrollTop=160;document.querySelector('.diary-scroll').dispatchEvent(new Event('scroll'))})()");
 const reading=await js("document.querySelectorAll('[data-story]').length");await sleep(3100);
 assert.equal(await js("document.querySelectorAll('[data-story]').length"),reading,'history reading pauses automatic insertion');
 const beforeLatest=await js('window.farmTest.shownStories().length');
 await clickNative('.diary-fresh');
 assert.equal(await js("document.querySelector('.diary-scroll').scrollTop"),0,'hint returns to the same list top');
 assert.equal(await js('window.farmTest.shownStories().length'),beforeLatest,'clicking the hint does not acknowledge unread stories');
 for(const language of ['en-US','zh-TW','zh-CN']) { await js('window.farmTest.locale('+JSON.stringify(language)+')');assert.equal(await js("document.querySelector('.farm-diary').textContent.includes('farmLife.')"),false) }
 await js("window.farmTest.diary(1,'latest-')");await sleep(400);
 assert.equal(await js("!!document.querySelector('.diary-fresh')"),true);
 await wait("window.farmTest.shownStories().includes('latest-0')");
 assert.equal(await js("document.querySelector('.diary-fresh')===null"),true,'hint disappears after the actual visible story is read');
 assert.ok(await js("(()=>{const diary=document.querySelector('.farm-diary').getBoundingClientRect(),title=document.querySelector('.diary-heading strong').getBoundingClientRect();return Math.abs(title.x+title.width/2-diary.x-diary.width/2)<1})()"),'title remains centered after the hint disappears');
 window.setContentSize(900,506);await wait("document.querySelector('.farm-scene canvas').width===900");
 await js("window.farmTest.diary(1,'compact-')");await sleep(300);
 assert.equal(await js("getComputedStyle(document.querySelector('.farm-diary')).width"),'230px');
 assert.equal(await js("getComputedStyle(document.querySelector('.diary-scroll')).maxHeight"),'115px');
 for(const language of ['en-US','zh-TW','zh-CN']) {
  await js('window.farmTest.locale('+JSON.stringify(language)+')');
  assert.equal(await js("document.querySelector('.diary-heading strong').textContent"),{'en-US':"Yume's little diary",'zh-TW':'尤美的小日記','zh-CN':'尤美的小日记'}[language],'heading must actually change locale');
  assert.ok(await js("(()=>{const diary=document.querySelector('.farm-diary').getBoundingClientRect(),title=document.querySelector('.diary-heading strong').getBoundingClientRect(),hint=document.querySelector('.diary-fresh')?.getBoundingClientRect();return Math.abs(title.x+title.width/2-diary.x-diary.width/2)<1&&title.left>=diary.left&&(!hint||hint.right<=diary.right)})()"),'compact heading fits in '+language);
  await sleep(200);
  await screenshot('farm-life-diary-small-'+language+'.png');
 }
 await js('window.farmTest.unmount()');await wait("document.querySelectorAll('canvas').length===0");
 await js('window.farmTest.mount()');await wait("document.querySelector('.farm-scene canvas') && !document.querySelector('.scene-error')");
 assert.equal(await js("document.querySelectorAll('canvas').length"),1);
 await js('window.farmTest.unmount()');await wait("document.querySelectorAll('canvas').length===0");
 window.setContentSize(470,300);
 await js('window.farmTest.previewDeparture()');
 await wait("document.querySelector('video')?.readyState>=2");
 assert.equal(await js("document.querySelector('video').loop"),false);
 assert.equal(await js("document.querySelector('video').getBoundingClientRect().height"),316);
 await wait("!document.querySelector('.costume-effect') && document.querySelector('video').currentTime>.5");
 await screenshot('farm-life-desktop-departure.png');
 await js('window.farmTest.unmount()');
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
    // Capturing the full screenshot set adds PNG encoding time to the same UI checks.
    const limit = setTimeout(() => child.kill(), environment.FARM_SCENE_SCREENSHOT_DIR ? 150000 : 90000)
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
