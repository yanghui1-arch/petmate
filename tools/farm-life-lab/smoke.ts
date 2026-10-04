import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { app, type BrowserWindow } from 'electron'

import type { LabSession } from './session'
import type { LabState } from './types'

export async function smoke(lab: {
    controller: BrowserWindow
    pet: BrowserWindow
    state(): LabState
    openFarm(): Promise<void>
    getFarm(): BrowserWindow | null
    session: LabSession
    directory: string
}) {
    const checks: string[] = []
    const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms))
    const js = (code: string) => lab.controller.webContents.executeJavaScript(code)
    async function wait(work: () => Promise<boolean> | boolean, label: string) {
        const end = Date.now() + 30000
        while (Date.now() < end) {
            if (await work()) return
            await sleep(100)
        }
        throw Error('超时：' + label)
    }
    async function screenshot(window: BrowserWindow, name: string) {
        const path = process.env.FARM_LAB_EVIDENCE
        if (path) {
            mkdirSync(path, { recursive: true })
            writeFileSync(join(path, name), (await window.webContents.capturePage()).toPNG())
        }
    }
    try {
        assert.equal(lab.controller.isVisible(), true, '验收控制器必须是可见窗口，而不仅能离屏渲染')
        assert.equal(lab.controller.isMinimized(), false, '验收控制器不能处于最小化状态')
        assert.equal(await js('document.visibilityState'), 'visible', '控制器页面必须可见')
        await wait(
            () => js("document.querySelectorAll('[data-event]').length===10"),
            '十种事件按钮'
        )
        await wait(
            () => lab.pet.webContents.executeJavaScript("!!document.querySelector('.actor')"),
            '全身桌宠'
        )
        await sleep(500) // Wait for the compositor, not only Vue's DOM mount.
        await screenshot(lab.controller, 'farm-life-lab-controller.png')
        checks.push('控制器实际可见、未最小化、页面可见，并挂载独立测试桌宠')
        const previewBefore = lab.session.snapshot()
        assert.equal(await js("document.querySelectorAll('[data-animation]').length"),4)
        for (const action of ['departure','bridge','door','sweat']) {
            if (action === 'departure') await lab.pet.webContents.executeJavaScript(`
                window.scanNative = { frame: window.requestAnimationFrame, cancel: window.cancelAnimationFrame, now: performance.now.bind(performance) };
                window.scanClock = performance.now();window.scanSequence=0;window.scanFrames=new Map();
                performance.now=()=>window.scanClock;
                window.requestAnimationFrame=callback=>{const id=++window.scanSequence;window.scanFrames.set(id,callback);return id};
                window.cancelAnimationFrame=id=>window.scanFrames.delete(id);
                window.advanceScan=ms=>{window.scanClock+=ms;const pending=[...window.scanFrames.values()];window.scanFrames.clear();pending.forEach(callback=>callback(window.scanClock))};
                void 0;
            `)
            assert.equal((await js("window.farmLab.command({type:'preview',action:'"+action+"'})")).ok,true)
            assert.equal(lab.state().preview,action)
            if(action==='departure') {
                await wait(()=>lab.pet.webContents.executeJavaScript("document.querySelector('video')?.readyState>=2"),'完整推门视频')
                assert.equal(lab.pet.getBounds().width,470)
                assert.equal(await lab.pet.webContents.executeJavaScript("!!document.querySelector('.actor') && !!document.querySelector('.costume-effect') && document.querySelector('video').paused && document.querySelector('video').currentTime===0"),true,'video holds first frame at scan start')
                await lab.pet.webContents.executeJavaScript('window.advanceScan(330)');await sleep(60)
                await screenshot(lab.pet,'farm-life-lab-costume-upper.png')
                await lab.pet.webContents.executeJavaScript('window.advanceScan(220)');await sleep(60)
                const masks = await lab.pet.webContents.executeJavaScript("(()=>{const old=document.querySelector('.original-costume'),next=document.querySelector('.departure-frame');return{original:getComputedStyle(old).clipPath,workwear:getComputedStyle(next).clipPath,light:document.querySelector('.costume-light').getBoundingClientRect().y,paused:document.querySelector('video').paused,time:document.querySelector('video').currentTime}})()")
                assert.equal(masks.original,'inset(150px 0px 0px)','original lower half remains')
                assert.equal(masks.workwear,'inset(0px calc(100% - 245px) 150px 0px)','workwear upper half replaces original without the door')
                assert.equal(masks.paused,true);assert.equal(masks.time,0)
                assert.ok(Math.abs(masks.light-123)<.1,'beam sits at the shared 150px boundary')
                await screenshot(lab.pet,'farm-life-lab-costume-half.png')
                await lab.pet.webContents.executeJavaScript('window.advanceScan(330)');await sleep(60)
                await screenshot(lab.pet,'farm-life-lab-costume-lower.png')
                await lab.pet.webContents.executeJavaScript('window.advanceScan(220)')
                await lab.pet.webContents.executeJavaScript(`
                    window.requestAnimationFrame=window.scanNative.frame;window.cancelAnimationFrame=window.scanNative.cancel;performance.now=window.scanNative.now;
                    delete window.advanceScan;delete window.scanFrames;delete window.scanNative;
                `)
                await wait(()=>lab.pet.webContents.executeJavaScript("!document.querySelector('.costume-effect') && !document.querySelector('video').paused"),'换装结束后开始进门')
                assert.equal(await lab.pet.webContents.executeJavaScript("document.querySelector('.actor')===null && getComputedStyle(document.querySelector('.departure-frame')).clipPath==='none'"),true,'scan completes before full video including door is revealed')
                await sleep(500)
                assert.ok(await lab.pet.webContents.executeJavaScript("document.querySelector('video').currentTime")>.3)
                assert.equal(await lab.pet.webContents.executeJavaScript("(()=>{const v=document.querySelector('video'),c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const ctx=c.getContext('2d');ctx.drawImage(v,0,0);return ctx.getImageData(0,0,1,1).data[3]})()"),0,'encoded video actually decodes with transparent background')
                await screenshot(lab.pet,'farm-life-lab-departure.png')
                const fixedBounds = lab.pet.getBounds()
                await wait(() => lab.pet.webContents.executeJavaScript("document.querySelector('video')?.ended===true"), '推门全部帧完成')
                assert.deepEqual(lab.pet.getBounds(), fixedBounds, 'full playback must not move the window')
                const quality = await lab.pet.webContents.executeJavaScript("document.querySelector('video').getVideoPlaybackQuality().totalVideoFrames")
                assert.ok(quality >= 75, 'approved 79-frame sequence is presented through the end')
                assert.ok(Math.abs(await lab.pet.webContents.executeJavaScript("document.querySelector('video').duration") - 6.583) < .003, 'departure keeps original speed and duration')
            } else {
                await wait(()=>!!lab.getFarm(),'农场预览')
                await wait(()=>lab.getFarm()!.webContents.executeJavaScript("!!document.querySelector('.farm-scene canvas')&&!document.querySelector('.game-loading')"),'农场人物预览')
                await sleep(action==='sweat'?5400:400)
                await screenshot(lab.getFarm()!,'farm-life-lab-'+action+'.png')
                assert.equal(lab.pet.isVisible(),false,'仅农场内显示人物')
            }
            assert.deepEqual(lab.session.snapshot().farm!.produce,previewBefore.farm?.produce)
            assert.equal(lab.session.snapshot().farm!.life!.events.length,previewBefore.farm?.life?.events.length)
        }
        await js("window.farmLab.command({type:'preview',action:null})")
        assert.equal(lab.pet.getBounds().width,300)
        assert.equal(lab.pet.isVisible(),true)
        checks.push('从头到脚扫描换装、互补裁切且视频等待、四种预览、全帧视频、农场定位与单角色、无奖励或日记副作用')
        await js(
            "document.querySelector('.mode input').click();document.querySelector('[data-event=water]').click()"
        )
        await wait(() => !!lab.getFarm(), '提交后自动打开农场')
        await wait(
            () =>
                lab
                    .getFarm()!
                    .webContents.executeJavaScript(
                        "!!document.querySelector('.farm-scene canvas')&&!document.querySelector('.scene-error')&&!document.querySelector('.game-loading')"
                    ),
            '原 Phaser 农场就绪'
        )
        assert.equal(lab.session.snapshot().farm!.life!.events[0].interrupted, false)
        assert.ok(
            lab.session.snapshot().farm!.plots.some((plot) => plot.plant?.wateredBy === 'helper')
        )
        await screenshot(lab.getFarm()!, 'farm-life-lab-water.png')
        checks.push('快速触发真实浇水事务、原农场与人物日记')
        await js("window.farmLab.command({type:'preset',preset:'99'})")
        const blocked = await js(
            "window.farmLab.command({type:'trigger',kind:'harvest',fast:true})"
        )
        assert.equal(blocked.ok, false)
        assert.match(blocked.message, /99/)
        assert.equal(lab.session.life.getView().visit, null)
        checks.push('成就边界被保护且显示原因')
        await js("window.farmLab.command({type:'scenario',kind:'water',fast:false})")
        assert.equal(lab.session.life.getView().visit!.phase, 'preparing')
        await wait(
            () => lab.pet.webContents.executeJavaScript("!!document.querySelector('.bubble')"),
            '出发对白'
        )
        await screenshot(lab.pet, 'farm-life-lab-desktop.png')
        await js("window.farmLab.command({type:'openFarm'})")
        assert.equal(lab.session.life.getView().visit, null)
        assert.equal(lab.session.snapshot().farm!.life!.events.length, 0)
        checks.push('完整演出对白与提前进入取消')
        await js("window.farmLab.command({type:'scenario',kind:'water',fast:false})")
        await wait(() => lab.session.life.getView().visit?.phase === 'leaving', '出发对白自然结束后开始换装')
        assert.equal(lab.session.life.getView().visit!.phase, 'leaving')
        await wait(() => lab.pet.webContents.executeJavaScript("!document.querySelector('.bubble') && !!document.querySelector('.costume-effect')"), '气泡消失与换装衔接')
        await wait(() => lab.pet.webContents.executeJavaScript("document.querySelector('video')?.readyState>=2"), '真实出发视频')
        assert.equal(lab.pet.getBounds().width, 470)
        await js("window.farmLab.command({type:'openFarm'})")
        assert.equal(lab.session.life.getView().visit, null)
        assert.equal(lab.pet.getBounds().width, 300, 'cancel mid-video restores original bounds')
        assert.equal(lab.pet.isVisible(), true)
        assert.equal(lab.session.snapshot().farm!.life!.events.length, 0)
        checks.push('对白自然结束触发换装，无空等；真实推门阶段提前接管复原窗口且不发奖')
        await js("window.farmLab.command({type:'diary'})")
        await wait(
            () =>
                lab
                    .getFarm()!
                    .webContents.executeJavaScript(
                        "!!document.querySelector('.farm-diary [data-story]')"
                    ),
            '未读日记'
        )
        const unauthorized = await lab
            .getFarm()!
            .webContents.executeJavaScript("window.farmLab.command({type:'reset'})")
        assert.equal(unauthorized.ok, false)
        checks.push('未读日记与控制器权限隔离')
        await js("window.farmLab.command({type:'reset'})")
        assert.equal(lab.session.snapshot().farm!.life!.events.length, 0)
        assert.equal(lab.state().farmOpen, false)
        assert.equal(app.getPath('userData'), join(lab.directory, 'user-data'))
        checks.push('重置与独立 userData')
        writeFileSync(
            join(lab.directory, 'smoke-result.json'),
            JSON.stringify({ ok: true, checks })
        )
        console.log('PASS actual Electron lab smoke')
        app.exit(0)
    } catch (error) {
        if (lab.getFarm() && !lab.getFarm()!.isDestroyed()) {
            console.error(
                'Farm diagnostic:',
                await lab
                    .getFarm()!
                    .webContents.executeJavaScript('document.body.innerText.slice(0,1500)')
            )
            await screenshot(lab.getFarm()!, 'farm-life-lab-failure.png')
        }
        writeFileSync(
            join(lab.directory, 'smoke-result.json'),
            JSON.stringify({ ok: false, message: String(error), checks })
        )
        console.error(error)
        app.exit(1)
    }
}
