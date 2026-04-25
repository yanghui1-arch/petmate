import { readonly, ref, type Ref } from 'vue'
import { ModelStatus } from '../types/model'
import youmeiAnger from '@/assets/models/youmei/youmei-anger.png'
import youmeiDance from '@/assets/models/youmei/youmei-dance.png'
import youmeiHello from '@/assets/models/youmei/youmei-hello-1.png'
import youmeiStruggle from '@/assets/models/youmei/youmei-zhengzha.png'

type ActionName = 'idle' | 'dance' | 'hello' | 'anger' | 'angryKick' | 'struggle'

type SpriteFrame = {
    image: HTMLImageElement
    sourceX: number
    sourceY: number
    sourceWidth: number
    sourceHeight: number
}

type BaseActionSpec = {
    fps: number
    renderScale: number
    renderBaseSize?: number
    loopCount: number
    skipBlankFrames: boolean
}

type SpriteActionSpec = BaseActionSpec & {
    type: 'sprite'
    imageSrc: string
    frameWidth: number
    frameHeight: number
    columns: number
    rows: number
}

type FrameSequenceActionSpec = BaseActionSpec & {
    type: 'sequence'
    frameSources: string[]
}

type ActionSpec = SpriteActionSpec | FrameSequenceActionSpec

const CANVAS_WIDTH = 300
const CANVAS_HEIGHT = 300
const SPRITE_RENDER_SIZE = 300
const BASE_RENDER_FRAME_SIZE = 600
const TALL_FRAME_RENDER_BASE_SIZE = 1536
const DRAG_START_DISTANCE = 4
const BLANK_FRAME_ALPHA_THRESHOLD = 8
const BLANK_FRAME_VISIBLE_PIXEL_THRESHOLD = 16
const ANGRY_KICK_REPEAT_COUNT = 2

const idleFrameSources = resolveFrameSources(import.meta.glob<string>(
    '../assets/models/youmei/animations/idle/*.png',
    { eager: true, import: 'default' }
))
const angryKickFrameSources = resolveFrameSources(import.meta.glob<string>(
    '../assets/models/youmei/animations/angry_kick/*.png',
    { eager: true, import: 'default' }
))

const actionSpecs: Record<ActionName, ActionSpec> = {
    idle: {
        type: 'sequence',
        frameSources: idleFrameSources,
        fps: 10,
        renderScale: 1,
        renderBaseSize: TALL_FRAME_RENDER_BASE_SIZE,
        loopCount: 1,
        skipBlankFrames: false
    },
    dance: {
        type: 'sprite',
        imageSrc: youmeiDance,
        frameWidth: 600,
        frameHeight: 600,
        columns: 4,
        rows: 2,
        fps: 5,
        renderScale: 1,
        loopCount: 1,
        skipBlankFrames: true
    },
    hello: {
        type: 'sprite',
        imageSrc: youmeiHello,
        frameWidth: 600,
        frameHeight: 600,
        columns: 2,
        rows: 2,
        fps: 8,
        renderScale: 0.72,
        loopCount: 3,
        skipBlankFrames: true
    },
    anger: {
        type: 'sprite',
        imageSrc: youmeiAnger,
        frameWidth: 500,
        frameHeight: 500,
        columns: 4,
        rows: 4,
        fps: 6,
        renderScale: 1,
        loopCount: 1,
        skipBlankFrames: true
    },
    angryKick: {
        type: 'sequence',
        frameSources: angryKickFrameSources,
        fps: 8,
        renderScale: 1,
        renderBaseSize: TALL_FRAME_RENDER_BASE_SIZE,
        loopCount: 1,
        skipBlankFrames: false
    },
    struggle: {
        type: 'sprite',
        imageSrc: youmeiStruggle,
        frameWidth: 500,
        frameHeight: 500,
        columns: 4,
        rows: 4,
        fps: 8,
        renderScale: 1,
        loopCount: 1,
        skipBlankFrames: true
    }
}

const actionNames = Object.keys(actionSpecs) as ActionName[]

let petMateModelConfig = {
    scale: SPRITE_RENDER_SIZE / BASE_RENDER_FRAME_SIZE
}

let spriteCanvas: HTMLCanvasElement | null = null
let spriteCanvasContext: CanvasRenderingContext2D | null = null
let spriteContainer: HTMLDivElement | null = null
let animationToken = 0
let activeTimer: number | null = null
let activeTimerResolve: ((isActive: boolean) => void) | null = null
let activePointerId: number | null = null
let pointerStartScreenX = 0
let pointerStartScreenY = 0
let isDragging = false
let isAngry = false
let isSystemAudioActive = false
let activeAction: ActionName | null = null

const actionFrames: Record<ActionName, SpriteFrame[]> = {
    idle: [],
    dance: [],
    hello: [],
    anger: [],
    angryKick: [],
    struggle: []
}

const modelState: ModelStatus = {
    walk: false,
    dance: false,
    sitting: false,
    standIdle: false,
    sittedIdle: false,
    spyBesideWindow: false,
    dragging: false
}

const defaultModelState: ModelStatus = {
    walk: false,
    dance: false,
    sitting: false,
    standIdle: false,
    sittedIdle: false,
    spyBesideWindow: false,
    dragging: false
}

/** 是否显示轮盘菜单栏的 flag */
export const isShowContextMenu = ref(false)

export const usePetmateModel = (petmateContainer: Ref<HTMLDivElement>) => {
    const init2D = async (): Promise<void> => {
        await loadAnimationAssets()
        initSpriteContainer(petmateContainer.value)
        initSpriteCanvas()
        await initSystemAudioActivity()
        startAmbientAction()

        window.api.onShowContextMenu(() => {
            isShowContextMenu.value = true
        })
    }

    const playIdle = () => {
        if (isDragging || isAngry) return
        startAmbientAction()
    }

    const playHello = () => {
        if (isDragging || isAngry || isShowContextMenu.value) return
        startOneShotAction('hello', { dance: true })
    }

    const setAngry = (active: boolean) => {
        const wasAngry = isAngry
        isAngry = active
        if (isDragging) return

        if (isAngry) {
            if (wasAngry && (activeAction === 'angryKick' || activeAction === 'anger')) return

            startAngrySequence()
            return
        }

        startAmbientAction()
    }

    const destroy = () => {
        cancelCurrentAnimation()
        window.api.stopPetmateWindowDrag()

        if (spriteContainer) {
            spriteContainer.removeEventListener('pointerdown', onPointerDown)
            spriteContainer.removeEventListener('pointermove', onPointerMove)
            spriteContainer.removeEventListener('pointerup', onPointerUp)
            spriteContainer.removeEventListener('pointercancel', onPointerCancel)
            spriteContainer.removeEventListener('contextmenu', onContextMenu)
        }

        spriteCanvas?.remove()
        spriteCanvas = null
        spriteCanvasContext = null
        spriteContainer = null
        activePointerId = null
        isDragging = false
        isSystemAudioActive = false
        activeAction = null
        window.api.removeAllSystemAudioActiveListeners()
    }

    return {
        init2D,
        modelConfig: readonly(petMateModelConfig),
        modelState: readonly(modelState),
        playIdle,
        playHello,
        setAngry,
        destroy
    }
}

function onPointerDown(event: PointerEvent) {
    if (event.button !== 0 || isShowContextMenu.value) return

    event.preventDefault()
    activePointerId = event.pointerId
    pointerStartScreenX = event.screenX
    pointerStartScreenY = event.screenY

    if (event.currentTarget instanceof HTMLElement) {
        event.currentTarget.setPointerCapture(event.pointerId)
    }
}

function onPointerMove(event: PointerEvent) {
    if (activePointerId !== event.pointerId || isDragging) return

    const distance = Math.hypot(
        event.screenX - pointerStartScreenX,
        event.screenY - pointerStartScreenY
    )
    if (distance < DRAG_START_DISTANCE) return

    event.preventDefault()
    beginDragging()
}

function onPointerUp(event: PointerEvent) {
    if (activePointerId !== event.pointerId) return

    event.preventDefault()
    releasePointerCapture(event)

    if (isDragging) {
        stopDragging()
    }

    activePointerId = null
}

function onPointerCancel(event: PointerEvent) {
    if (activePointerId !== event.pointerId) return

    releasePointerCapture(event)
    if (isDragging) stopDragging()
    activePointerId = null
}

function onContextMenu(event: MouseEvent) {
    event.preventDefault()
    isShowContextMenu.value = true
}

function beginDragging() {
    if (isDragging) return

    isDragging = true
    window.api.startPetmateWindowDrag()
    startLoopAction('struggle', { dragging: true })
}

function stopDragging() {
    window.api.stopPetmateWindowDrag()
    isDragging = false

    if (isAngry) {
        startAngrySequence()
        return
    }

    startAmbientAction()
}

function startIdleLoop() {
    if (isDragging || isAngry) return
    if (activeAction === 'idle') return

    const token = startNewAnimation()
    activeAction = 'idle'
    updateModelState({ standIdle: true })
    void runIdleLoop(token)
}

function startAmbientAction() {
    if (isDragging || isAngry) return

    if (isSystemAudioActive) {
        startLoopAction('dance', { dance: true })
        return
    }

    startIdleLoop()
}

async function runIdleLoop(token: number) {
    while (token === animationToken && !isDragging && !isAngry) {
        updateModelState({ standIdle: true })
        if (!await playActionFrames('idle', token)) return
    }
}

function startOneShotAction(action: ActionName, state: Partial<ModelStatus>) {
    if (activeAction === action) return

    const token = startNewAnimation()
    activeAction = action
    updateModelState(state)

    void (async () => {
        await playActionFrames(action, token)
        if (token === animationToken && !isDragging && !isAngry) {
            activeAction = null
            startAmbientAction()
        }
    })()
}

function startLoopAction(action: ActionName, state: Partial<ModelStatus>) {
    if (activeAction === action) return

    const token = startNewAnimation()
    activeAction = action
    updateModelState(state)
    void runLoopAction(action, token)
}

function startAngrySequence() {
    if (isDragging || !isAngry) return

    const token = startNewAnimation()
    activeAction = 'angryKick'
    updateModelState({ spyBesideWindow: true })
    void runAngrySequence(token)
}

async function runAngrySequence(token: number) {
    for (let index = 0; index < ANGRY_KICK_REPEAT_COUNT; index++) {
        if (token !== animationToken || isDragging || !isAngry) return
        if (!await playActionFrames('angryKick', token)) return
    }

    if (token !== animationToken || isDragging || !isAngry) return

    activeAction = 'anger'
    updateModelState({ spyBesideWindow: true })
    await runLoopAction('anger', token)
}

async function runLoopAction(action: ActionName, token: number) {
    while (token === animationToken) {
        if (!await playActionFrames(action, token)) return
    }
}

function playActionFrames(action: ActionName, token: number): Promise<boolean> {
    const spec = actionSpecs[action]
    return playFrames(
        actionFrames[action],
        getFrameDuration(spec.fps),
        spec.renderScale,
        spec.renderBaseSize ?? BASE_RENDER_FRAME_SIZE,
        spec.loopCount,
        token
    )
}

async function playFrames(
    frames: SpriteFrame[],
    frameDuration: number,
    renderScaleMultiplier: number,
    renderBaseSize: number,
    loopCount: number,
    token: number
): Promise<boolean> {
    if (frames.length === 0) {
        showFirstIdleFrame()
        return sleep(frameDuration, token)
    }

    for (let loopIndex = 0; loopIndex < loopCount; loopIndex++) {
        for (const frame of frames) {
            if (token !== animationToken) return false
            drawSpriteFrame(frame, renderScaleMultiplier, renderBaseSize)
            if (!await sleep(frameDuration, token)) return false
        }
    }

    return token === animationToken
}

function getFrameDuration(fps: number): number {
    return Math.round(1000 / fps)
}

function startNewAnimation(): number {
    animationToken++
    clearActiveTimer()
    return animationToken
}

function cancelCurrentAnimation() {
    animationToken++
    activeAction = null
    clearActiveTimer()
}

async function initSystemAudioActivity() {
    window.api.onSystemAudioActive((_, active) => {
        setSystemAudioActive(active)
    })

    isSystemAudioActive = await window.api.getSystemAudioActive()
}

function setSystemAudioActive(active: boolean) {
    if (isSystemAudioActive === active) return

    isSystemAudioActive = active
    startAmbientAction()
}

function sleep(ms: number, token: number): Promise<boolean> {
    clearActiveTimer()

    return new Promise((resolve) => {
        if (token !== animationToken) {
            resolve(false)
            return
        }

        activeTimerResolve = resolve
        activeTimer = window.setTimeout(() => {
            activeTimer = null
            activeTimerResolve = null
            resolve(token === animationToken)
        }, ms)
    })
}

function clearActiveTimer() {
    if (activeTimer !== null) {
        window.clearTimeout(activeTimer)
        activeTimer = null
    }

    activeTimerResolve?.(false)
    activeTimerResolve = null
}

function resolveFrameSources(modules: Record<string, string>): string[] {
    return Object.entries(modules)
        .sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath, undefined, { numeric: true }))
        .map(([, source]) => source)
}

async function loadAnimationAssets(): Promise<void> {
    const loadedFrames = await Promise.all(actionNames.map(async (action) => {
        return [action, await loadActionFrames(action, actionSpecs[action])] as const
    }))

    for (const [action, frames] of loadedFrames) {
        actionFrames[action] = frames
    }

    const firstIdleFrame = actionFrames.idle[0]
    if (firstIdleFrame) {
        petMateModelConfig.scale = SPRITE_RENDER_SIZE / Math.max(firstIdleFrame.sourceWidth, firstIdleFrame.sourceHeight)
    }
}

async function loadActionFrames(action: ActionName, spec: ActionSpec): Promise<SpriteFrame[]> {
    if (spec.type === 'sequence') {
        return loadFrameSequenceFrames(action, spec)
    }

    const image = await loadImage(spec.imageSrc)
    return extractFixedGridFrames(image, spec)
}

async function loadFrameSequenceFrames(action: ActionName, spec: FrameSequenceActionSpec): Promise<SpriteFrame[]> {
    if (spec.frameSources.length === 0) {
        throw new Error(`未找到尤美帧动画资源: ${action}`)
    }

    const images = await Promise.all(spec.frameSources.map(loadImage))
    const frames = images
        .map(createWholeImageFrame)
        .filter((frame) => !spec.skipBlankFrames || !isBlankFrame(frame))

    return frames.length > 0 ? frames : [createWholeImageFrame(images[0])]
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error(`加载尤美帧动画失败: ${src}`))
        image.src = src
    })
}

function createWholeImageFrame(image: HTMLImageElement): SpriteFrame {
    return {
        image,
        sourceX: 0,
        sourceY: 0,
        sourceWidth: image.naturalWidth,
        sourceHeight: image.naturalHeight
    }
}

function extractFixedGridFrames(image: HTMLImageElement, spec: SpriteActionSpec): SpriteFrame[] {
    const frames: SpriteFrame[] = []

    for (let row = 0; row < spec.rows; row++) {
        for (let column = 0; column < spec.columns; column++) {
            const sourceX = column * spec.frameWidth
            const sourceY = row * spec.frameHeight
            if (sourceX + spec.frameWidth > image.naturalWidth || sourceY + spec.frameHeight > image.naturalHeight) continue

            const frame: SpriteFrame = {
                image,
                sourceX,
                sourceY,
                sourceWidth: spec.frameWidth,
                sourceHeight: spec.frameHeight
            }

            if (spec.skipBlankFrames && isBlankFrame(frame)) continue
            frames.push(frame)
        }
    }

    if (frames.length > 0) return frames

    return [createWholeImageFrame(image)]
}

function isBlankFrame(frame: SpriteFrame): boolean {
    const canvas = document.createElement('canvas')
    canvas.width = frame.sourceWidth
    canvas.height = frame.sourceHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return false

    context.clearRect(0, 0, frame.sourceWidth, frame.sourceHeight)
    context.drawImage(
        frame.image,
        frame.sourceX,
        frame.sourceY,
        frame.sourceWidth,
        frame.sourceHeight,
        0,
        0,
        frame.sourceWidth,
        frame.sourceHeight
    )

    const imageData = context.getImageData(0, 0, frame.sourceWidth, frame.sourceHeight)
    let visiblePixels = 0
    for (let index = 3; index < imageData.data.length; index += 4) {
        if (imageData.data[index] > BLANK_FRAME_ALPHA_THRESHOLD) {
            visiblePixels++
            if (visiblePixels > BLANK_FRAME_VISIBLE_PIXEL_THRESHOLD) return false
        }
    }

    return true
}

function initSpriteContainer(container: HTMLDivElement) {
    spriteContainer = container
    spriteContainer.style.position = 'fixed'
    spriteContainer.style.inset = '0'
    spriteContainer.style.width = `${CANVAS_WIDTH}px`
    spriteContainer.style.height = `${CANVAS_HEIGHT}px`
    spriteContainer.style.overflow = 'hidden'
    spriteContainer.style.touchAction = 'none'
    spriteContainer.addEventListener('pointerdown', onPointerDown)
    spriteContainer.addEventListener('pointermove', onPointerMove)
    spriteContainer.addEventListener('pointerup', onPointerUp)
    spriteContainer.addEventListener('pointercancel', onPointerCancel)
    spriteContainer.addEventListener('contextmenu', onContextMenu)
}

function initSpriteCanvas() {
    if (!spriteContainer) return

    spriteCanvas?.remove()
    spriteCanvas = document.createElement('canvas')
    spriteCanvas.className = 'youmei-sprite-canvas'
    spriteCanvas.width = CANVAS_WIDTH
    spriteCanvas.height = CANVAS_HEIGHT
    spriteCanvas.style.position = 'absolute'
    spriteCanvas.style.left = '0'
    spriteCanvas.style.top = '0'
    spriteCanvas.style.width = `${CANVAS_WIDTH}px`
    spriteCanvas.style.height = `${CANVAS_HEIGHT}px`
    spriteCanvas.style.pointerEvents = 'none'
    spriteCanvas.style.userSelect = 'none'
    spriteContainer.appendChild(spriteCanvas)
    spriteCanvasContext = spriteCanvas.getContext('2d')
    spriteCanvasContext?.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    showFirstIdleFrame()
}

function showFirstIdleFrame() {
    const firstFrame = actionFrames.idle[0]
    if (firstFrame) {
        drawSpriteFrame(
            firstFrame,
            actionSpecs.idle.renderScale,
            actionSpecs.idle.renderBaseSize ?? BASE_RENDER_FRAME_SIZE
        )
    }
}

function drawSpriteFrame(frame: SpriteFrame, renderScaleMultiplier: number, renderBaseSize: number) {
    if (!spriteCanvasContext) return

    const renderScale = SPRITE_RENDER_SIZE / renderBaseSize * renderScaleMultiplier
    const targetWidth = frame.sourceWidth * renderScale
    const targetHeight = frame.sourceHeight * renderScale
    const targetX = (CANVAS_WIDTH - targetWidth) / 2
    const targetY = (CANVAS_HEIGHT - targetHeight) / 2

    spriteCanvasContext.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    spriteCanvasContext.drawImage(
        frame.image,
        frame.sourceX,
        frame.sourceY,
        frame.sourceWidth,
        frame.sourceHeight,
        targetX,
        targetY,
        targetWidth,
        targetHeight
    )
}

function releasePointerCapture(event: PointerEvent) {
    if (event.currentTarget instanceof HTMLElement && event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
    }
}

function updateModelState(state: Partial<ModelStatus>): ModelStatus {
    Object.assign(modelState, defaultModelState, state)
    return modelState
}
