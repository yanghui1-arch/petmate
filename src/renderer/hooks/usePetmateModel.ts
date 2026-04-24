import { readonly, ref, type Ref } from 'vue'
import { ModelStatus } from '../types/model'
import youmeiAnger from '@/assets/models/youmei/youmei-anger.png'
import youmeiHello from '@/assets/models/youmei/youmei-hello-1.png'
import youmeiIdle from '@/assets/models/youmei/youmei-idle.png'
import youmeiStruggle from '@/assets/models/youmei/youmei-zhengzha.png'

type ActionName = 'idle' | 'hello' | 'anger' | 'struggle'

type SpriteFrame = {
    image: HTMLImageElement
    sourceX: number
    sourceY: number
    sourceWidth: number
    sourceHeight: number
}

type SpriteActionSpec = {
    imageSrc: string
    frameWidth: number
    frameHeight: number
    columns: number
    rows: number
    fps: number
    renderScale: number
    loopCount: number
    skipBlankFrames: boolean
}

const CANVAS_WIDTH = 200
const CANVAS_HEIGHT = 200
const SPRITE_RENDER_SIZE = 200
const BASE_RENDER_FRAME_SIZE = 600
const DRAG_START_DISTANCE = 4
const IDLE_HELLO_CYCLE_RANGE = { min: 12, max: 26 }
const BLANK_FRAME_ALPHA_THRESHOLD = 8
const BLANK_FRAME_VISIBLE_PIXEL_THRESHOLD = 16

const actionSpecs: Record<ActionName, SpriteActionSpec> = {
    idle: {
        imageSrc: youmeiIdle,
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
        imageSrc: youmeiAnger,
        frameWidth: 400,
        frameHeight: 400,
        columns: 4,
        rows: 4,
        fps: 6,
        renderScale: 1,
        loopCount: 1,
        skipBlankFrames: true
    },
    struggle: {
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

let petMateModelConfig = {
    scale: SPRITE_RENDER_SIZE / actionSpecs.idle.frameWidth
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

const actionFrames: Record<ActionName, SpriteFrame[]> = {
    idle: [],
    hello: [],
    anger: [],
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
        await loadSpriteAssets()
        initSpriteContainer(petmateContainer.value)
        initSpriteCanvas()
        startIdleLoop()

        window.api.onShowContextMenu(() => {
            isShowContextMenu.value = true
        })
    }

    const playIdle = () => {
        if (isDragging || isAngry) return
        startIdleLoop()
    }

    const playHello = () => {
        if (isDragging || isAngry || isShowContextMenu.value) return
        startOneShotAction('hello', { dance: true })
    }

    const setAngry = (active: boolean) => {
        isAngry = active
        if (isDragging) return

        if (isAngry) {
            startLoopAction('anger', { spyBesideWindow: true })
            return
        }

        startIdleLoop()
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
        startLoopAction('anger', { spyBesideWindow: true })
        return
    }

    startIdleLoop()
}

function startIdleLoop() {
    if (isDragging || isAngry) return

    const token = startNewAnimation()
    updateModelState({ standIdle: true })
    void runIdleLoop(token)
}

async function runIdleLoop(token: number) {
    let cyclesBeforeHello = randomBetween(IDLE_HELLO_CYCLE_RANGE.min, IDLE_HELLO_CYCLE_RANGE.max)

    while (token === animationToken && !isDragging && !isAngry) {
        updateModelState({ standIdle: true })
        if (!await playActionFrames('idle', token)) return

        cyclesBeforeHello--
        if (cyclesBeforeHello > 0 || isShowContextMenu.value) continue

        updateModelState({ dance: true })
        if (!await playActionFrames('hello', token)) return
        cyclesBeforeHello = randomBetween(IDLE_HELLO_CYCLE_RANGE.min, IDLE_HELLO_CYCLE_RANGE.max)
    }
}

function startOneShotAction(action: ActionName, state: Partial<ModelStatus>) {
    const token = startNewAnimation()
    updateModelState(state)

    void (async () => {
        await playActionFrames(action, token)
        if (token === animationToken && !isDragging && !isAngry) {
            startIdleLoop()
        }
    })()
}

function startLoopAction(action: ActionName, state: Partial<ModelStatus>) {
    const token = startNewAnimation()
    updateModelState(state)
    void runLoopAction(action, token)
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
        spec.loopCount,
        token
    )
}

async function playFrames(
    frames: SpriteFrame[],
    frameDuration: number,
    renderScaleMultiplier: number,
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
            drawSpriteFrame(frame, renderScaleMultiplier)
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
    clearActiveTimer()
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

async function loadSpriteAssets(): Promise<void> {
    const [idleImage, helloImage, angerImage, struggleImage] = await Promise.all([
        loadImage(actionSpecs.idle.imageSrc),
        loadImage(actionSpecs.hello.imageSrc),
        loadImage(actionSpecs.anger.imageSrc),
        loadImage(actionSpecs.struggle.imageSrc)
    ])

    actionFrames.idle = extractFixedGridFrames(idleImage, actionSpecs.idle)
    actionFrames.hello = extractFixedGridFrames(helloImage, actionSpecs.hello)
    actionFrames.anger = extractFixedGridFrames(angerImage, actionSpecs.anger)
    actionFrames.struggle = extractFixedGridFrames(struggleImage, actionSpecs.struggle)

    const firstIdleFrame = actionFrames.idle[0]
    if (firstIdleFrame) {
        petMateModelConfig.scale = SPRITE_RENDER_SIZE / Math.max(firstIdleFrame.sourceWidth, firstIdleFrame.sourceHeight)
    }
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error(`加载尤美帧动画失败: ${src}`))
        image.src = src
    })
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

    return [{
        image,
        sourceX: 0,
        sourceY: 0,
        sourceWidth: image.naturalWidth,
        sourceHeight: image.naturalHeight
    }]
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
    if (firstFrame) drawSpriteFrame(firstFrame, actionSpecs.idle.renderScale)
}

function drawSpriteFrame(frame: SpriteFrame, renderScaleMultiplier: number) {
    if (!spriteCanvasContext) return

    const renderScale = SPRITE_RENDER_SIZE / BASE_RENDER_FRAME_SIZE * renderScaleMultiplier
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

function randomBetween(min: number, max: number) {
    return Math.floor(min + Math.random() * (max - min + 1))
}
