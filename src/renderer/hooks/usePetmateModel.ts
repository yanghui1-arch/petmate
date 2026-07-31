import { readonly, ref, type Ref } from 'vue'
import type { PlayerResourceState } from '@main/types/player-resource'
import { ModelStatus } from '../types/model'
import youmeiDance from '@/assets/models/youmei/youmei-dance.png'
import youmeiDragClassic from '@/assets/models/youmei/animations/drag/classic.png'
import youmeiDragLabor from '@/assets/models/youmei/animations/drag/labor.png'
import youmeiIdleBlinkClosed from '@/assets/models/youmei/animations/idle/blink/closed.png'
import youmeiIdleBlinkHalf from '@/assets/models/youmei/animations/idle/blink/half.png'
import youmeiIdleBlinkMicro25 from '@/assets/models/youmei/animations/idle/blink/micro-25.png'
import youmeiIdleBlinkMicro50 from '@/assets/models/youmei/animations/idle/blink/micro-50.png'
import youmeiIdleBlinkMicro75 from '@/assets/models/youmei/animations/idle/blink/micro-75.png'
import youmeiIdleBlinkNearOpen from '@/assets/models/youmei/animations/idle/blink/near-open.png'
import youmeiIdleBlinkQuarter from '@/assets/models/youmei/animations/idle/blink/quarter.png'
import youmeiIdleBlinkThreeQuarter from '@/assets/models/youmei/animations/idle/blink/three-quarter.png'
import youmeiIdleOpen from '@/assets/models/youmei/animations/idle/01.png'
import youmeiLaborIdleBlinkClosed from '@/assets/models/youmei/animations/idle/labor-skin/blink/closed.png'
import youmeiLaborIdleBlinkHalf from '@/assets/models/youmei/animations/idle/labor-skin/blink/half.png'
import youmeiLaborIdleBlinkMicro25 from '@/assets/models/youmei/animations/idle/labor-skin/blink/micro-25.png'
import youmeiLaborIdleBlinkMicro50 from '@/assets/models/youmei/animations/idle/labor-skin/blink/micro-50.png'
import youmeiLaborIdleBlinkMicro75 from '@/assets/models/youmei/animations/idle/labor-skin/blink/micro-75.png'
import youmeiLaborIdleBlinkNearOpen from '@/assets/models/youmei/animations/idle/labor-skin/blink/near-open.png'
import youmeiLaborIdleBlinkQuarter from '@/assets/models/youmei/animations/idle/labor-skin/blink/quarter.png'
import youmeiLaborIdleBlinkThreeQuarter from '@/assets/models/youmei/animations/idle/labor-skin/blink/three-quarter.png'
import youmeiLaborIdleOpen from '@/assets/models/youmei/animations/idle/labor-skin/01.png'
import youmeiDrawBasicClassicBase from '@/assets/models/youmei/animations/activity/draw-basic-stable/classic/base.png'
import youmeiDrawBasicLaborBase from '@/assets/models/youmei/animations/activity/draw-basic-stable/labor-skin/base.png'

type ActionName =
    | 'idle'
    | 'dance'
    | 'anger'
    | 'angryKick'
    | 'struggle'
    | 'drawBasicIntro'
    | 'drawBasicLoop'
    | 'drawBasicOutro'

type VisibleBounds = {
    left: number
    top: number
    right: number
    bottom: number
}

type SpriteFrame = {
    image: HTMLImageElement
    sourceX: number
    sourceY: number
    sourceWidth: number
    sourceHeight: number
    bounds: VisibleBounds
}

type AnimationStep = {
    frameIndex: number
    durationMs: number
    durationJitterMs?: number
}

type BaseActionSpec = {
    frameDurationMs: number
    frameBlendMs: number
    visualScale: number
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

type AnimationClip = {
    action: ActionName
    frames: SpriteFrame[]
    steps: AnimationStep[]
    frameBlendMs: number
    visualScale: number
    loopCount: number
    renderScale: number
    anchorY: number
    hasEmbeddedShadow: boolean
    usesAlignedIdleBlink: boolean
}

type Playback = {
    clip: AnimationClip
    stepIndex: number
    stepElapsedMs: number
    stepDurationMs: number
    completedLoops: number
    totalElapsedMs: number
}

type MotionTransform = {
    x: number
    y: number
    rotation: number
    scaleX: number
    scaleY: number
}

type RenderPose = {
    clip: AnimationClip
    frame: SpriteFrame
    nextFrame: SpriteFrame | null
    frameBlend: number
    motion: MotionTransform
    timeSeconds: number
}

type PoseTransition = {
    pose: RenderPose
    startedAt: number
    durationMs: number
}

const CANVAS_WIDTH = 300
const CANVAS_HEIGHT = 300
const CHARACTER_BASELINE_Y = 288
const CHARACTER_TOP_MARGIN = 10
const CHARACTER_SIDE_MARGIN = 10
const MAX_DEVICE_PIXEL_RATIO = 3
const MAX_FRAME_DELTA_MS = 100
const FRAME_ANALYSIS_MAX_SIDE = 256
const VISIBLE_ALPHA_THRESHOLD = 8
const DRAG_START_DISTANCE = 4
const ACTION_TRANSITION_MS = 110
const IDLE_BLINK_CENTER_X_RATIO = 0.52
const IDLE_BLINK_CENTER_Y_RATIO = 0.175
const IDLE_BLINK_RADIUS_X_RATIO = 0.085
const IDLE_BLINK_RADIUS_Y_RATIO = 0.025
const LABOR_KICK_ANIMATION_RESOURCE_ID = 'youmei-angry-kick-labor-2026'
const CLASSIC_SKIN_ID = 'youmei-classic-dress'
const LABOR_SKIRT_SKIN_ID = 'youmei-labor-skirt-2026'
const DRAW_BASIC_ACTIVITY_ID = 1

const classicDragFrameSources = [youmeiDragClassic]
const laborDragFrameSources = [youmeiDragLabor]
const idleFrameSources = [
    youmeiIdleOpen,
    youmeiIdleBlinkMicro25,
    youmeiIdleBlinkMicro50,
    youmeiIdleBlinkMicro75,
    youmeiIdleBlinkNearOpen,
    youmeiIdleBlinkQuarter,
    youmeiIdleBlinkHalf,
    youmeiIdleBlinkThreeQuarter,
    youmeiIdleBlinkClosed
]
const laborIdleFrameSources = [
    youmeiLaborIdleOpen,
    youmeiLaborIdleBlinkMicro25,
    youmeiLaborIdleBlinkMicro50,
    youmeiLaborIdleBlinkMicro75,
    youmeiLaborIdleBlinkNearOpen,
    youmeiLaborIdleBlinkQuarter,
    youmeiLaborIdleBlinkHalf,
    youmeiLaborIdleBlinkThreeQuarter,
    youmeiLaborIdleBlinkClosed
]
const angryFrameSources = resolveFrameSources(
    import.meta.glob<string>('../assets/models/youmei/animations/angry/*.png', {
        eager: true,
        import: 'default'
    })
)
const laborAngryFrameSources = resolveFrameSources(
    import.meta.glob<string>('../assets/models/youmei/animations/angry/labor-skin/*.png', {
        eager: true,
        import: 'default'
    })
)
const angryKickFrameSources = resolveFrameSources(
    import.meta.glob<string>('../assets/models/youmei/animations/angry_kick/*.png', {
        eager: true,
        import: 'default'
    })
)
const laborAngryKickFrameSources = resolveFrameSources(
    import.meta.glob<string>('../assets/models/youmei/animations/angry_kick/labor-skin/*.png', {
        eager: true,
        import: 'default'
    })
)
const classicDrawBasicFrameSources = [youmeiDrawBasicClassicBase]
const laborDrawBasicFrameSources = [youmeiDrawBasicLaborBase]

const actionSpecs: Record<ActionName, ActionSpec> = {
    idle: {
        type: 'sequence',
        frameSources: idleFrameSources,
        frameDurationMs: 120,
        frameBlendMs: 0,
        visualScale: 1,
        loopCount: Number.POSITIVE_INFINITY,
        skipBlankFrames: false
    },
    dance: {
        type: 'sprite',
        imageSrc: youmeiDance,
        frameWidth: 600,
        frameHeight: 600,
        columns: 4,
        rows: 2,
        frameDurationMs: 145,
        frameBlendMs: 34,
        visualScale: 0.96,
        loopCount: Number.POSITIVE_INFINITY,
        skipBlankFrames: true
    },
    anger: {
        type: 'sequence',
        frameSources: angryFrameSources,
        frameDurationMs: 180,
        frameBlendMs: 38,
        visualScale: 0.98,
        loopCount: Number.POSITIVE_INFINITY,
        skipBlankFrames: false
    },
    angryKick: {
        type: 'sequence',
        frameSources: angryKickFrameSources,
        frameDurationMs: 82,
        frameBlendMs: 20,
        visualScale: 0.98,
        loopCount: 1,
        skipBlankFrames: false
    },
    struggle: {
        type: 'sequence',
        frameSources: classicDragFrameSources,
        frameDurationMs: 1000,
        frameBlendMs: 0,
        visualScale: 1,
        loopCount: Number.POSITIVE_INFINITY,
        skipBlankFrames: false
    },
    drawBasicIntro: {
        type: 'sequence',
        frameSources: classicDrawBasicFrameSources,
        frameDurationMs: 460,
        frameBlendMs: 0,
        visualScale: 0.785,
        loopCount: 1,
        skipBlankFrames: false
    },
    drawBasicLoop: {
        type: 'sequence',
        frameSources: classicDrawBasicFrameSources,
        frameDurationMs: 460,
        frameBlendMs: 0,
        visualScale: 0.785,
        loopCount: Number.POSITIVE_INFINITY,
        skipBlankFrames: false
    },
    drawBasicOutro: {
        type: 'sequence',
        frameSources: classicDrawBasicFrameSources,
        frameDurationMs: 420,
        frameBlendMs: 0,
        visualScale: 0.785,
        loopCount: 1,
        skipBlankFrames: false
    }
}

const actionNames = Object.keys(actionSpecs) as ActionName[]
const animationClips = new Map<ActionName, AnimationClip>()
const imageCache = new Map<string, Promise<HTMLImageElement>>()

let petMateModelConfig = { scale: 1 }
let spriteCanvas: HTMLCanvasElement | null = null
let spriteCanvasContext: CanvasRenderingContext2D | null = null
let spriteContainer: HTMLDivElement | null = null
const activityPartLayerCache = new WeakMap<
    HTMLImageElement,
    Map<string, HTMLCanvasElement>
>()
const activityBlinkLayerCache = new WeakMap<
    HTMLImageElement,
    Map<string, HTMLCanvasElement>
>()
let canvasPixelRatio = 1
let animationFrameId: number | null = null
let lastAnimationTime = 0
let activePlayback: Playback | null = null
let poseTransition: PoseTransition | null = null
let activePointerId: number | null = null
let pointerStartScreenX = 0
let pointerStartScreenY = 0
let lastDragPointerScreenX = 0
let lastDragPointerScreenY = 0
let lastDragPointerTime = 0
let dragResponseX = 0
let dragResponseY = 0
let dragResponseVelocityX = 0
let dragResponseVelocityY = 0
let dragTargetX = 0
let dragTargetY = 0
let hairSwayX = 0
let hairSwayY = 0
let hairSwayVelocityX = 0
let hairSwayVelocityY = 0
let skirtSwayX = 0
let skirtSwayY = 0
let skirtSwayVelocityX = 0
let skirtSwayVelocityY = 0
let isDragging = false
let isAngry = false
let isSystemAudioActive = false
let activeActivityId: number | null = null
let activeAction: ActionName | null = null
let assetLoadGeneration = 0
let unlockedAnimationResourceIds = new Set<string>()
let equippedSkinId = CLASSIC_SKIN_ID

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
        await refreshUnlockedAnimationResources()
        await loadAnimationAssets()
        initSpriteContainer(petmateContainer.value)
        initSpriteCanvas()
        await initSystemAudioActivity()
        initPlayerResourceListener()
        startAmbientAction()
        startRenderLoop()

        window.api.onShowContextMenu(() => {
            isShowContextMenu.value = true
        })
    }

    const playIdle = () => {
        if (isDragging || isAngry) return
        startAmbientAction()
    }

    const setAngry = (active: boolean) => {
        const wasAngry = isAngry
        isAngry = active
        if (isDragging || activeActivityId === DRAW_BASIC_ACTIVITY_ID) return

        if (isAngry) {
            if (wasAngry && (activeAction === 'angryKick' || activeAction === 'anger')) return
            startAction('angryKick', { spyBesideWindow: true })
            return
        }

        startAmbientAction()
    }

    const setActivity = (activityId: number | null) => {
        const nextActivityId = activityId === DRAW_BASIC_ACTIVITY_ID ? activityId : null
        if (nextActivityId === activeActivityId) return

        const previousActivityId = activeActivityId
        activeActivityId = nextActivityId
        if (isDragging) return

        if (activeActivityId === DRAW_BASIC_ACTIVITY_ID) {
            startAction('drawBasicIntro', { sitting: true }, { force: true })
            return
        }

        if (
            previousActivityId === DRAW_BASIC_ACTIVITY_ID &&
            activeAction &&
            isDrawBasicAction(activeAction)
        ) {
            startAction('drawBasicOutro', { sitting: true }, { force: true, transition: false })
            return
        }

        startAmbientAction()
    }

    const destroy = () => {
        assetLoadGeneration++
        stopRenderLoop()
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
        activePlayback = null
        poseTransition = null
        activeAction = null
        activeActivityId = null
        isDragging = false
        isSystemAudioActive = false
        resetDragMotion()
        window.api.removeAllSystemAudioActiveListeners()
        window.api.removeAllPlayerResourcesUpdatedListeners()
    }

    return {
        init2D,
        modelConfig: readonly(petMateModelConfig),
        modelState: readonly(modelState),
        playIdle,
        setAngry,
        setActivity,
        destroy
    }
}

function onPointerDown(event: PointerEvent) {
    if (event.button !== 0 || isShowContextMenu.value) return

    event.preventDefault()
    activePointerId = event.pointerId
    pointerStartScreenX = event.screenX
    pointerStartScreenY = event.screenY
    lastDragPointerScreenX = event.screenX
    lastDragPointerScreenY = event.screenY
    lastDragPointerTime = performance.now()

    if (event.currentTarget instanceof HTMLElement) {
        event.currentTarget.setPointerCapture(event.pointerId)
    }
}

function onPointerMove(event: PointerEvent) {
    if (activePointerId !== event.pointerId) return

    if (isDragging) {
        event.preventDefault()
        updateDragPointerMotion(event)
        return
    }

    const distance = Math.hypot(
        event.screenX - pointerStartScreenX,
        event.screenY - pointerStartScreenY
    )
    if (distance < DRAG_START_DISTANCE) return

    event.preventDefault()
    beginDragging(event)
}

function onPointerUp(event: PointerEvent) {
    if (activePointerId !== event.pointerId) return

    event.preventDefault()
    const wasDragging = isDragging
    releasePointerCapture(event)

    if (wasDragging) stopDragging()

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

function beginDragging(event: PointerEvent) {
    if (isDragging) return

    resetDragMotion()
    isDragging = true
    lastDragPointerScreenX = pointerStartScreenX
    lastDragPointerScreenY = pointerStartScreenY
    updateDragPointerMotion(event)
    window.api.startPetmateWindowDrag()
    startAction('struggle', { dragging: true })
}

function stopDragging() {
    window.api.stopPetmateWindowDrag()
    isDragging = false

    if (isAngry) {
        startAction('angryKick', { spyBesideWindow: true })
        resetDragMotion()
        return
    }

    startAmbientAction()
    resetDragMotion()
}

function updateDragPointerMotion(event: PointerEvent) {
    const now = performance.now()
    const elapsedMs = Math.max(now - lastDragPointerTime, 8)
    const velocityX = (event.screenX - lastDragPointerScreenX) / elapsedMs
    const velocityY = (event.screenY - lastDragPointerScreenY) / elapsedMs

    dragTargetX = clamp(velocityX * 1.6, -1, 1)
    dragTargetY = clamp(velocityY * 1.6, -1, 1)
    lastDragPointerScreenX = event.screenX
    lastDragPointerScreenY = event.screenY
    lastDragPointerTime = now
}

function advanceDragMotion(deltaMs: number) {
    if (!isDragging || deltaMs <= 0) return

    const substepCount = Math.max(1, Math.ceil(deltaMs / 16))
    const substepSeconds = deltaMs / substepCount / 1000

    for (let step = 0; step < substepCount; step++) {
        const springForceX = (dragTargetX - dragResponseX) * 85
        const springForceY = (dragTargetY - dragResponseY) * 85
        const damping = Math.exp(-13 * substepSeconds)
        const targetDecay = Math.exp(-4.6 * substepSeconds)

        dragResponseVelocityX = (dragResponseVelocityX + springForceX * substepSeconds) * damping
        dragResponseVelocityY = (dragResponseVelocityY + springForceY * substepSeconds) * damping
        dragResponseX = clamp(dragResponseX + dragResponseVelocityX * substepSeconds, -1.15, 1.15)
        dragResponseY = clamp(dragResponseY + dragResponseVelocityY * substepSeconds, -1.15, 1.15)
        dragTargetX *= targetDecay
        dragTargetY *= targetDecay

        const hairDamping = Math.exp(-6.2 * substepSeconds)
        const hairTargetX = -dragResponseX * 1.48
        const hairTargetY = -dragResponseY * 1.16
        hairSwayVelocityX =
            (hairSwayVelocityX + (hairTargetX - hairSwayX) * 44 * substepSeconds) * hairDamping
        hairSwayVelocityY =
            (hairSwayVelocityY + (hairTargetY - hairSwayY) * 48 * substepSeconds) * hairDamping
        hairSwayX = clamp(hairSwayX + hairSwayVelocityX * substepSeconds, -1.4, 1.4)
        hairSwayY = clamp(hairSwayY + hairSwayVelocityY * substepSeconds, -1.25, 1.25)

        const skirtDamping = Math.exp(-8.4 * substepSeconds)
        const skirtTargetX = -dragResponseX * 1.04
        const skirtTargetY = -dragResponseY * 0.72
        skirtSwayVelocityX =
            (skirtSwayVelocityX + (skirtTargetX - skirtSwayX) * 68 * substepSeconds) * skirtDamping
        skirtSwayVelocityY =
            (skirtSwayVelocityY + (skirtTargetY - skirtSwayY) * 74 * substepSeconds) * skirtDamping
        skirtSwayX = clamp(skirtSwayX + skirtSwayVelocityX * substepSeconds, -1.15, 1.15)
        skirtSwayY = clamp(skirtSwayY + skirtSwayVelocityY * substepSeconds, -1, 1)
    }
}

function resetDragMotion() {
    dragResponseX = 0
    dragResponseY = 0
    dragResponseVelocityX = 0
    dragResponseVelocityY = 0
    dragTargetX = 0
    dragTargetY = 0
    hairSwayX = 0
    hairSwayY = 0
    hairSwayVelocityX = 0
    hairSwayVelocityY = 0
    skirtSwayX = 0
    skirtSwayY = 0
    skirtSwayVelocityX = 0
    skirtSwayVelocityY = 0
}

function isDrawBasicAction(action: ActionName): boolean {
    return action === 'drawBasicIntro' || action === 'drawBasicLoop' || action === 'drawBasicOutro'
}

function startAmbientAction() {
    if (isDragging) return

    if (activeActivityId === DRAW_BASIC_ACTIVITY_ID) {
        startAction('drawBasicLoop', { sitting: true })
        return
    }

    if (isAngry) {
        if (activeAction !== 'anger' && activeAction !== 'angryKick') {
            startAction('angryKick', { spyBesideWindow: true })
        }
        return
    }

    if (isSystemAudioActive) {
        startAction('dance', { dance: true })
        return
    }

    startAction('idle', { standIdle: true })
}

function startAction(
    action: ActionName,
    state: Partial<ModelStatus>,
    options: { force?: boolean; transition?: boolean } = {}
) {
    if (!options.force && activeAction === action) return

    const clip = animationClips.get(action)
    if (!clip) return

    const now = performance.now()
    const previousPose = activePlayback ? getRenderPose(activePlayback) : null
    const changesDragPose = activeAction === 'struggle' || action === 'struggle'
    const changesDrawBasicPose =
        isDrawBasicAction(action) && activeAction !== null && isDrawBasicAction(activeAction)
    if (
        previousPose &&
        activeAction !== action &&
        options.transition !== false &&
        !changesDragPose &&
        !changesDrawBasicPose
    ) {
        poseTransition = {
            pose: previousPose,
            startedAt: now,
            durationMs: ACTION_TRANSITION_MS
        }
    } else {
        poseTransition = null
    }

    activeAction = action
    activePlayback = createPlayback(clip)
    lastAnimationTime = now
    updateModelState(state)
    renderScene(now)
}

function createPlayback(clip: AnimationClip): Playback {
    return {
        clip,
        stepIndex: 0,
        stepElapsedMs: 0,
        stepDurationMs: resolveStepDuration(clip.steps[0]),
        completedLoops: 0,
        totalElapsedMs: 0
    }
}

function resolveStepDuration(step: AnimationStep): number {
    const jitter = step.durationJitterMs ?? 0
    return step.durationMs + Math.random() * jitter
}

function startRenderLoop() {
    if (animationFrameId !== null) return

    lastAnimationTime = performance.now()
    animationFrameId = window.requestAnimationFrame(renderAnimationFrame)
}

function stopRenderLoop() {
    if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId)
        animationFrameId = null
    }
}

function renderAnimationFrame(now: number) {
    const deltaMs = Math.min(Math.max(now - lastAnimationTime, 0), MAX_FRAME_DELTA_MS)
    lastAnimationTime = now

    advancePlayback(deltaMs)
    advanceDragMotion(deltaMs)
    renderScene(now)
    animationFrameId = window.requestAnimationFrame(renderAnimationFrame)
}

function advancePlayback(deltaMs: number) {
    const playback = activePlayback
    if (!playback) return

    playback.totalElapsedMs += deltaMs
    playback.stepElapsedMs += deltaMs

    while (activePlayback === playback && playback.stepElapsedMs >= playback.stepDurationMs) {
        playback.stepElapsedMs -= playback.stepDurationMs
        playback.stepIndex++

        if (playback.stepIndex >= playback.clip.steps.length) {
            playback.completedLoops++

            if (playback.completedLoops >= playback.clip.loopCount) {
                playback.stepIndex = playback.clip.steps.length - 1
                playback.stepElapsedMs = playback.stepDurationMs
                handleActionCompleted(playback.clip.action)
                return
            }

            playback.stepIndex = 0
        }

        playback.stepDurationMs = resolveStepDuration(playback.clip.steps[playback.stepIndex])
    }
}

function handleActionCompleted(action: ActionName) {
    if (action === 'angryKick' && isAngry && !isDragging) {
        startAction('anger', { spyBesideWindow: true })
        return
    }

    if (action === 'drawBasicIntro') {
        if (activeActivityId === DRAW_BASIC_ACTIVITY_ID && !isDragging) {
            startAction('drawBasicLoop', { sitting: true }, { force: true, transition: false })
        } else if (!isDragging) {
            startAction('drawBasicOutro', { sitting: true }, { force: true, transition: false })
        }
        return
    }

    if (action === 'drawBasicOutro') {
        startAmbientAction()
        return
    }

    startAmbientAction()
}

function renderScene(now: number) {
    if (!spriteCanvas || !spriteCanvasContext || !activePlayback) return

    syncCanvasResolution()
    const context = spriteCanvasContext
    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    const currentPose = getRenderPose(activePlayback)
    drawGroundShadow(context, currentPose, 1)

    let currentOpacity = 1
    if (poseTransition) {
        const progress = clamp01((now - poseTransition.startedAt) / poseTransition.durationMs)
        const easedProgress = easeOutCubic(progress)
        drawPose(context, poseTransition.pose, 1 - easedProgress)
        currentOpacity = easedProgress

        if (progress >= 1) {
            poseTransition = null
        }
    }

    drawPose(context, currentPose, currentOpacity)
}

function getRenderPose(playback: Playback): RenderPose {
    const step = playback.clip.steps[playback.stepIndex]
    const nextStep = playback.clip.steps[(playback.stepIndex + 1) % playback.clip.steps.length]
    const isFinalStep =
        Number.isFinite(playback.clip.loopCount) &&
        playback.completedLoops + 1 >= playback.clip.loopCount &&
        playback.stepIndex === playback.clip.steps.length - 1
    const blendStart = Math.max(playback.stepDurationMs - playback.clip.frameBlendMs, 0)
    const frameBlend =
        !isFinalStep && playback.clip.frameBlendMs > 0 && playback.stepElapsedMs > blendStart
            ? smoothStep((playback.stepElapsedMs - blendStart) / playback.clip.frameBlendMs)
            : 0

    return {
        clip: playback.clip,
        frame: playback.clip.frames[step.frameIndex],
        nextFrame: frameBlend > 0 ? playback.clip.frames[nextStep.frameIndex] : null,
        frameBlend,
        motion: getMotionTransform(playback),
        timeSeconds: playback.totalElapsedMs / 1000
    }
}

function getMotionTransform(playback: Playback): MotionTransform {
    const seconds = playback.totalElapsedMs / 1000
    const neutral: MotionTransform = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 }

    switch (playback.clip.action) {
        case 'idle': {
            const breath = Math.sin(seconds * Math.PI * 0.72)
            return {
                x: Math.sin(seconds * 0.82) * 0.22,
                y: -Math.max(breath, 0) * 0.7,
                rotation: Math.sin(seconds * 0.58) * 0.0025,
                scaleX: 1 - breath * 0.0018,
                scaleY: 1 + breath * 0.0038
            }
        }
        case 'dance':
            return {
                x: Math.sin(seconds * 4.4) * 0.7,
                y: -Math.abs(Math.sin(seconds * 4.4)) * 1.8,
                rotation: Math.sin(seconds * 3.2) * 0.011,
                scaleX: 1,
                scaleY: 1
            }
        case 'anger':
            return {
                ...neutral,
                x: Math.sin(seconds * 32) * 0.75,
                rotation: Math.sin(seconds * 19) * 0.0035
            }
        case 'angryKick': {
            const progress = getPlaybackProgress(playback)
            const impact = Math.exp(-Math.pow((progress - 0.47) / 0.09, 2))
            return {
                ...neutral,
                x: Math.sin(seconds * 65) * impact * 1.4,
                y: -Math.sin(progress * Math.PI) * 1.1,
                rotation: Math.sin(seconds * 52) * impact * 0.004
            }
        }
        case 'struggle':
            return { x: 0, y: -2.6, rotation: 0, scaleX: 1, scaleY: 1 }
        case 'drawBasicIntro': {
            const progress = smoothStep(getPlaybackProgress(playback))
            return { ...neutral, x: -32 * (1 - progress) }
        }
        case 'drawBasicOutro': {
            const progress = smoothStep(getPlaybackProgress(playback))
            return { ...neutral, x: -32 * progress }
        }
        case 'drawBasicLoop':
            return neutral
        default:
            return neutral
    }
}

function getPlaybackProgress(playback: Playback): number {
    if (!Number.isFinite(playback.clip.loopCount)) return 0

    const clipDuration = playback.clip.steps.reduce((total, step) => total + step.durationMs, 0)
    if (clipDuration <= 0) return 0
    return clamp01(playback.totalElapsedMs / (clipDuration * playback.clip.loopCount))
}

function drawPose(context: CanvasRenderingContext2D, pose: RenderPose, opacity: number) {
    if (opacity <= 0) return

    if (pose.clip.action === 'idle') {
        drawIdlePose(context, pose, opacity)
        return
    }

    const currentOpacity = opacity * (1 - pose.frameBlend)
    if (currentOpacity > 0) {
        drawFrame(context, pose.clip, pose.frame, pose.motion, currentOpacity, pose.timeSeconds)
    }

    if (pose.nextFrame && pose.frameBlend > 0) {
        drawFrame(
            context,
            pose.clip,
            pose.nextFrame,
            pose.motion,
            opacity * pose.frameBlend,
            pose.timeSeconds
        )
    }
}

function drawIdlePose(context: CanvasRenderingContext2D, pose: RenderPose, opacity: number) {
    if (pose.clip.usesAlignedIdleBlink) {
        drawFrame(context, pose.clip, pose.frame, pose.motion, opacity)
        return
    }

    const baseFrame = pose.clip.frames[0]
    drawFrame(context, pose.clip, baseFrame, pose.motion, opacity)

    let blinkFrame: SpriteFrame | null = null
    let blinkOpacity = 0

    if (pose.frame !== baseFrame) {
        blinkFrame = pose.frame
        blinkOpacity = 1 - pose.frameBlend
    }

    if (pose.nextFrame && pose.nextFrame !== baseFrame) {
        blinkFrame = pose.nextFrame
        blinkOpacity = Math.max(blinkOpacity, pose.frameBlend)
    }

    if (blinkFrame && blinkOpacity > 0) {
        drawIdleBlinkRegion(context, pose.clip, blinkFrame, pose.motion, opacity * blinkOpacity)
    }
}

function drawIdleBlinkRegion(
    context: CanvasRenderingContext2D,
    clip: AnimationClip,
    frame: SpriteFrame,
    motion: MotionTransform,
    opacity: number
) {
    const scale = clip.renderScale
    const centerX = frame.sourceWidth * IDLE_BLINK_CENTER_X_RATIO
    const centerY = frame.sourceHeight * IDLE_BLINK_CENTER_Y_RATIO
    const radiusX = frame.sourceWidth * IDLE_BLINK_RADIUS_X_RATIO
    const radiusY = frame.sourceHeight * IDLE_BLINK_RADIUS_Y_RATIO
    const featherLayers = [
        { radiusScale: 1, opacity: 0.18 },
        { radiusScale: 0.9, opacity: 0.32 },
        { radiusScale: 0.78, opacity: 1 }
    ]

    for (const layer of featherLayers) {
        context.save()
        context.globalAlpha = clamp01(opacity * layer.opacity)
        context.translate(CANVAS_WIDTH / 2 + motion.x, CHARACTER_BASELINE_Y + motion.y)
        context.rotate(motion.rotation)
        context.scale(motion.scaleX, motion.scaleY)
        context.beginPath()
        context.ellipse(
            (centerX - frame.sourceWidth / 2) * scale,
            (centerY - clip.anchorY) * scale,
            radiusX * scale * layer.radiusScale,
            radiusY * scale * layer.radiusScale,
            0,
            0,
            Math.PI * 2
        )
        context.clip()
        context.drawImage(
            frame.image,
            frame.sourceX,
            frame.sourceY,
            frame.sourceWidth,
            frame.sourceHeight,
            (-frame.sourceWidth * scale) / 2,
            -clip.anchorY * scale,
            frame.sourceWidth * scale,
            frame.sourceHeight * scale
        )
        context.restore()
    }
}

function drawFrame(
    context: CanvasRenderingContext2D,
    clip: AnimationClip,
    frame: SpriteFrame,
    motion: MotionTransform,
    opacity: number,
    timeSeconds = 0
) {
    const scale = clip.renderScale
    const anchorY = isDrawBasicAction(clip.action) ? frame.bounds.bottom : clip.anchorY

    context.save()
    context.globalAlpha = clamp01(opacity)
    context.translate(CANVAS_WIDTH / 2 + motion.x, CHARACTER_BASELINE_Y + motion.y)
    context.rotate(motion.rotation)
    context.scale(motion.scaleX, motion.scaleY)
    if (clip.action === 'struggle') {
        drawDragFrameMesh(context, clip, frame)
    } else if (isDrawBasicAction(clip.action)) {
        drawStableActivityFrame(context, clip, frame, timeSeconds)
    } else {
        context.drawImage(
            frame.image,
            frame.sourceX,
            frame.sourceY,
            frame.sourceWidth,
            frame.sourceHeight,
            (-frame.sourceWidth * scale) / 2,
            -anchorY * scale,
            frame.sourceWidth * scale,
            frame.sourceHeight * scale
        )
    }
    context.restore()
}

type ActivityPartRig = {
    key: string
    x: number
    y: number
    radiusX: number
    radiusY: number
    maskRotation?: number
    pivotX: number
    pivotY: number
    motionScale: number
}

type ActivityEyeRig = {
    x: number
    y: number
    width: number
    height: number
}

type DrawingRig = {
    hairParts: ActivityPartRig[]
    eyes: ActivityEyeRig[]
}

type ActivityPartMotion = {
    rotation: number
}

function drawStableActivityFrame(
    context: CanvasRenderingContext2D,
    clip: AnimationClip,
    frame: SpriteFrame,
    timeSeconds: number
) {
    const scale = clip.renderScale
    const destinationLeft = (-frame.sourceWidth * scale) / 2
    const destinationTop = -frame.bounds.bottom * scale
    const rig = getDrawingRig()
    const isAnimating = clip.action === 'drawBasicLoop'
    context.drawImage(
        frame.image,
        frame.sourceX,
        frame.sourceY,
        frame.sourceWidth,
        frame.sourceHeight,
        destinationLeft,
        destinationTop,
        frame.sourceWidth * scale,
        frame.sourceHeight * scale
    )

    if (isAnimating) {
        const hairMotion = getActivityHairMotion(timeSeconds)
        for (const hairPart of rig.hairParts) {
            drawActivityPart(
                context,
                frame,
                hairPart,
                destinationLeft,
                destinationTop,
                scale,
                hairMotion
            )
        }
        drawActivityBlink(
            context,
            frame,
            rig,
            destinationLeft,
            destinationTop,
            scale,
            timeSeconds
        )
    }
}

function getDrawingRig(): DrawingRig {
    if (equippedSkinId === LABOR_SKIRT_SKIN_ID) {
        return {
            hairParts: [
                {
                    key: 'lower-hair',
                    x: 142,
                    y: 198,
                    radiusX: 18,
                    radiusY: 34,
                    maskRotation: 0.08,
                    pivotX: 169,
                    pivotY: 150,
                    motionScale: 1
                }
            ],
            eyes: [
                {
                    x: 205,
                    y: 134,
                    width: 19,
                    height: 14
                },
                {
                    x: 232,
                    y: 134,
                    width: 18,
                    height: 14
                }
            ]
        }
    }

    return {
        hairParts: [
            {
                key: 'lower-hair',
                x: 171,
                y: 199,
                radiusX: 15,
                radiusY: 33,
                maskRotation: 0.04,
                pivotX: 193,
                pivotY: 148,
                motionScale: 1
            }
        ],
        eyes: [
            {
                x: 223,
                y: 141,
                width: 12,
                height: 7
            },
            {
                x: 248,
                y: 138,
                width: 11,
                height: 7
            }
        ]
    }
}

function getActivityHairMotion(timeSeconds: number): ActivityPartMotion {
    const breathingPhase = (timeSeconds * Math.PI * 2) / 4.4
    const strokePhase = (timeSeconds * Math.PI * 2) / 2.1
    return {
        rotation:
            Math.sin(breathingPhase) * 0.038 +
            Math.sin(breathingPhase * 2) * 0.005 +
            Math.sin(strokePhase - 0.55) * 0.004
    }
}

function rotateActivityContext(
    context: CanvasRenderingContext2D,
    pivotX: number,
    pivotY: number,
    rotation: number
) {
    context.translate(pivotX, pivotY)
    context.rotate(rotation)
    context.translate(-pivotX, -pivotY)
}

function drawActivityPart(
    context: CanvasRenderingContext2D,
    frame: SpriteFrame,
    part: ActivityPartRig,
    destinationLeft: number,
    destinationTop: number,
    scale: number,
    motion: ActivityPartMotion
) {
    const layer = getActivityPartLayer(frame, part)
    const pivotX = destinationLeft + part.pivotX * scale
    const pivotY = destinationTop + part.pivotY * scale

    context.save()
    rotateActivityContext(
        context,
        pivotX,
        pivotY,
        motion.rotation * part.motionScale
    )
    drawActivityPartLayer(context, frame, part, destinationLeft, destinationTop, scale, layer)
    context.restore()
}

function drawActivityPartLayer(
    context: CanvasRenderingContext2D,
    frame: SpriteFrame,
    part: ActivityPartRig,
    destinationLeft: number,
    destinationTop: number,
    scale: number,
    layer = getActivityPartLayer(frame, part)
) {
    context.drawImage(
        layer,
        destinationLeft,
        destinationTop,
        frame.sourceWidth * scale,
        frame.sourceHeight * scale
    )
}

function getActivityPartLayer(
    frame: SpriteFrame,
    part: ActivityPartRig
): HTMLCanvasElement {
    let imageLayers = activityPartLayerCache.get(frame.image)
    if (!imageLayers) {
        imageLayers = new Map()
        activityPartLayerCache.set(frame.image, imageLayers)
    }
    const cachedLayer = imageLayers.get(part.key)
    if (cachedLayer) return cachedLayer

    const layer = document.createElement('canvas')
    layer.width = frame.sourceWidth
    layer.height = frame.sourceHeight
    const layerContext = layer.getContext('2d')
    if (!layerContext) return layer

    layerContext.drawImage(
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
    layerContext.globalCompositeOperation = 'destination-in'
    layerContext.save()
    layerContext.translate(part.x, part.y)
    layerContext.rotate(part.maskRotation ?? 0)
    layerContext.scale(part.radiusX, part.radiusY)
    const feather = layerContext.createRadialGradient(0, 0, 0.52, 0, 0, 1)
    feather.addColorStop(0, 'rgba(0, 0, 0, 1)')
    feather.addColorStop(0.84, 'rgba(0, 0, 0, 1)')
    feather.addColorStop(1, 'rgba(0, 0, 0, 0)')
    layerContext.fillStyle = feather
    layerContext.fillRect(-1.05, -1.05, 2.1, 2.1)
    layerContext.restore()
    imageLayers.set(part.key, layer)
    return layer
}

function getActivityBlinkAmount(timeSeconds: number): number {
    const blinkTime = timeSeconds % 5.2
    const blinkStart = 3.2
    const blinkDuration = 0.38
    if (blinkTime < blinkStart || blinkTime > blinkStart + blinkDuration) return 0

    const progress = (blinkTime - blinkStart) / blinkDuration
    if (progress < 0.34) return smoothStep(progress / 0.34)
    if (progress < 0.5) return 1
    return 1 - smoothStep((progress - 0.5) / 0.5)
}

function drawActivityBlink(
    context: CanvasRenderingContext2D,
    frame: SpriteFrame,
    rig: DrawingRig,
    destinationLeft: number,
    destinationTop: number,
    scale: number,
    timeSeconds: number
) {
    const amount = getActivityBlinkAmount(timeSeconds)
    if (amount <= 0) return

    const padding = 2
    rig.eyes.forEach((eye, eyeIndex) => {
        const layer = getActivityBlinkLayer(frame, eye, amount, eyeIndex)
        context.drawImage(
            layer,
            destinationLeft + (eye.x - padding) * scale,
            destinationTop + (eye.y - padding) * scale,
            layer.width * scale,
            layer.height * scale
        )
    })
}

function getActivityBlinkLayer(
    frame: SpriteFrame,
    eye: ActivityEyeRig,
    amount: number,
    eyeIndex: number
): HTMLCanvasElement {
    let imageLayers = activityBlinkLayerCache.get(frame.image)
    if (!imageLayers) {
        imageLayers = new Map()
        activityBlinkLayerCache.set(frame.image, imageLayers)
    }

    const stage = Math.max(1, Math.min(8, Math.round(amount * 8)))
    const cacheKey = `${eyeIndex}:${stage}`
    const cachedLayer = imageLayers.get(cacheKey)
    if (cachedLayer) return cachedLayer

    const padding = 2
    const layer = document.createElement('canvas')
    layer.width = Math.ceil(eye.width + padding * 2)
    layer.height = Math.ceil(eye.height + padding * 2)
    const layerContext = layer.getContext('2d')
    if (!layerContext) return layer

    const stageAmount = stage / 8
    const sourceX = frame.sourceX + eye.x
    const sourceY = frame.sourceY + eye.y
    const topSampleHeight = Math.max(4, Math.round(eye.height * 0.24))
    const bottomSampleHeight = Math.max(4, Math.round(eye.height * 0.24))
    const upperHeight = eye.height * 0.56
    const lowerHeight = eye.height - upperHeight

    layerContext.drawImage(
        frame.image,
        sourceX,
        Math.max(frame.sourceY, sourceY - 3),
        eye.width,
        topSampleHeight,
        padding,
        padding,
        eye.width,
        upperHeight
    )
    layerContext.drawImage(
        frame.image,
        sourceX,
        sourceY + eye.height + 1,
        eye.width,
        bottomSampleHeight,
        padding,
        padding + upperHeight,
        eye.width,
        lowerHeight
    )

    const compressedHeight = Math.max(2.2, eye.height * (1 - stageAmount * 0.86))
    layerContext.globalAlpha = 1 - smoothStep(clamp01((stageAmount - 0.5) / 0.42))
    layerContext.drawImage(
        frame.image,
        sourceX,
        sourceY,
        eye.width,
        eye.height,
        padding,
        padding + (eye.height - compressedHeight) / 2,
        eye.width,
        compressedHeight
    )
    layerContext.globalAlpha = 1

    if (stageAmount > 0.58) {
        layerContext.globalAlpha = clamp01((stageAmount - 0.58) / 0.34)
        layerContext.strokeStyle = '#5b322f'
        layerContext.lineWidth = 1.1
        layerContext.lineCap = 'round'
        layerContext.beginPath()
        layerContext.moveTo(padding + eye.width * 0.18, padding + eye.height * 0.52)
        layerContext.quadraticCurveTo(
            padding + eye.width * 0.5,
            padding + eye.height * 0.43,
            padding + eye.width * 0.82,
            padding + eye.height * 0.5
        )
        layerContext.stroke()
        layerContext.globalAlpha = 1
    }

    layerContext.globalCompositeOperation = 'destination-in'
    layerContext.save()
    layerContext.translate(layer.width / 2, layer.height / 2)
    layerContext.scale(eye.width * 0.64, eye.height * 0.76)
    const feather = layerContext.createRadialGradient(0, 0, 0.68, 0, 0, 1)
    feather.addColorStop(0, 'rgba(0, 0, 0, 1)')
    feather.addColorStop(0.88, 'rgba(0, 0, 0, 1)')
    feather.addColorStop(1, 'rgba(0, 0, 0, 0)')
    layerContext.fillStyle = feather
    layerContext.fillRect(-1.05, -1.05, 2.1, 2.1)
    layerContext.restore()

    imageLayers.set(cacheKey, layer)
    return layer
}

function drawDragFrameMesh(
    context: CanvasRenderingContext2D,
    clip: AnimationClip,
    frame: SpriteFrame
) {
    const columns = 16
    const rows = 32
    const sourceOverlap = 2
    const destinationOverlap = 0.72
    const scale = clip.renderScale
    const destinationLeft = (-frame.sourceWidth * scale) / 2
    const destinationTop = -clip.anchorY * scale

    for (let row = 0; row < rows; row++) {
        const sourceTop = Math.floor((row * frame.sourceHeight) / rows)
        const sourceBottom = Math.floor(((row + 1) * frame.sourceHeight) / rows)

        for (let column = 0; column < columns; column++) {
            const sourceLeft = Math.floor((column * frame.sourceWidth) / columns)
            const sourceRight = Math.floor(((column + 1) * frame.sourceWidth) / columns)
            const normalizedX = (sourceLeft + sourceRight) / 2 / frame.sourceWidth
            const normalizedY = (sourceTop + sourceBottom) / 2 / frame.sourceHeight
            const sideDistance = Math.abs(normalizedX - 0.5)

            const hairSideWeight = smoothStep((sideDistance - 0.12) / 0.23)
            const hairTopWeight = smoothStep((normalizedY - 0.025) / 0.11)
            const hairBottomWeight = 1 - smoothStep((normalizedY - 0.46) / 0.09)
            const hairLengthWeight = 0.22 + clamp01((normalizedY - 0.08) / 0.42) * 0.78
            const hairWeight = hairSideWeight * hairTopWeight * hairBottomWeight * hairLengthWeight

            const skirtCenterWeight = 1 - smoothStep((sideDistance - 0.28) / 0.15)
            const skirtTopWeight = smoothStep((normalizedY - 0.31) / 0.12)
            const skirtBottomWeight = 1 - smoothStep((normalizedY - 0.535) / 0.04)
            const skirtLengthWeight = 0.18 + clamp01((normalizedY - 0.36) / 0.28) * 0.82
            const skirtWeight =
                skirtCenterWeight * skirtTopWeight * skirtBottomWeight * skirtLengthWeight

            const offsetX = hairSwayX * hairWeight * 8.2 + skirtSwayX * skirtWeight * 5.9
            const offsetY = hairSwayY * hairWeight * 3.5 + skirtSwayY * skirtWeight * 2.45
            const leftOverlap = column === 0 ? 0 : sourceOverlap
            const rightOverlap = column === columns - 1 ? 0 : sourceOverlap
            const topOverlap = row === 0 ? 0 : sourceOverlap
            const bottomOverlap = row === rows - 1 ? 0 : sourceOverlap
            const cellSourceLeft = sourceLeft - leftOverlap
            const cellSourceTop = sourceTop - topOverlap
            const cellSourceWidth = sourceRight - sourceLeft + leftOverlap + rightOverlap
            const cellSourceHeight = sourceBottom - sourceTop + topOverlap + bottomOverlap

            context.drawImage(
                frame.image,
                frame.sourceX + cellSourceLeft,
                frame.sourceY + cellSourceTop,
                cellSourceWidth,
                cellSourceHeight,
                destinationLeft + cellSourceLeft * scale + offsetX - destinationOverlap,
                destinationTop + cellSourceTop * scale + offsetY - destinationOverlap,
                cellSourceWidth * scale + destinationOverlap * 2,
                cellSourceHeight * scale + destinationOverlap * 2
            )
        }
    }
}

function drawGroundShadow(context: CanvasRenderingContext2D, pose: RenderPose, opacity: number) {
    if (pose.clip.hasEmbeddedShadow) return

    const visibleWidth = pose.frame.bounds.right - pose.frame.bounds.left
    const shadowWidth = Math.min(Math.max(visibleWidth * pose.clip.renderScale * 0.52, 36), 92)
    const gradient = context.createRadialGradient(
        CANVAS_WIDTH / 2,
        CHARACTER_BASELINE_Y + 1,
        2,
        CANVAS_WIDTH / 2,
        CHARACTER_BASELINE_Y + 1,
        shadowWidth / 2
    )
    gradient.addColorStop(0, `rgba(72, 49, 64, ${0.2 * opacity})`)
    gradient.addColorStop(0.62, `rgba(72, 49, 64, ${0.08 * opacity})`)
    gradient.addColorStop(1, 'rgba(72, 49, 64, 0)')

    context.save()
    context.fillStyle = gradient
    context.translate(0, CHARACTER_BASELINE_Y + 1)
    context.scale(1, 0.2)
    context.beginPath()
    context.arc(CANVAS_WIDTH / 2, 0, shadowWidth / 2, 0, Math.PI * 2)
    context.fill()
    context.restore()
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
    if (
        isDragging ||
        isAngry ||
        activeActivityId === DRAW_BASIC_ACTIVITY_ID ||
        activeAction === 'angryKick'
    ) {
        return
    }

    startAmbientAction()
}

function resolveFrameSources(modules: Record<string, string>): string[] {
    return Object.entries(modules)
        .sort(([leftPath], [rightPath]) =>
            leftPath.localeCompare(rightPath, undefined, { numeric: true })
        )
        .map(([, source]) => source)
}

async function loadAnimationAssets(): Promise<void> {
    const generation = ++assetLoadGeneration
    applyUnlockedAnimationSources()

    const loadedClips = await Promise.all(
        actionNames.map(async (action) => {
            const clip = await loadAnimationClip(action, actionSpecs[action])
            return [action, clip] as const
        })
    )

    if (generation !== assetLoadGeneration) return

    for (const [action, clip] of loadedClips) {
        animationClips.set(action, clip)
    }

    petMateModelConfig.scale = animationClips.get('idle')?.renderScale ?? 1
}

function initPlayerResourceListener() {
    window.api.onPlayerResourcesUpdated((_, resources) => {
        setUnlockedAnimationResources(resources)
        void reloadSkinDependentAnimations()
    })
}

async function refreshUnlockedAnimationResources(): Promise<void> {
    const response = await window.api.getPlayerResources()
    if (response.code === 200 && response.data) {
        setUnlockedAnimationResources(response.data)
    }
}

function setUnlockedAnimationResources(resources: PlayerResourceState): void {
    unlockedAnimationResourceIds = new Set(
        resources.animationResources.map((resource) => resource.id)
    )
    equippedSkinId = resources.equippedSkinId || CLASSIC_SKIN_ID
}

function applyUnlockedAnimationSources(): void {
    const idleSpec = actionSpecs.idle
    if (idleSpec.type === 'sequence') {
        idleSpec.frameSources =
            equippedSkinId === LABOR_SKIRT_SKIN_ID && laborIdleFrameSources.length > 0
                ? laborIdleFrameSources
                : idleFrameSources
    }

    const struggleSpec = actionSpecs.struggle
    if (struggleSpec.type === 'sequence') {
        struggleSpec.frameSources =
            equippedSkinId === LABOR_SKIRT_SKIN_ID ? laborDragFrameSources : classicDragFrameSources
    }

    const angrySpec = actionSpecs.anger
    if (angrySpec.type === 'sequence') {
        angrySpec.frameSources = getCurrentSkinAngryFrameSources()
    }

    const angryKickSpec = actionSpecs.angryKick
    if (angryKickSpec.type === 'sequence') {
        const shouldUseLaborKick =
            equippedSkinId === LABOR_SKIRT_SKIN_ID ||
            unlockedAnimationResourceIds.has(LABOR_KICK_ANIMATION_RESOURCE_ID)
        angryKickSpec.frameSources =
            shouldUseLaborKick && laborAngryKickFrameSources.length > 0
                ? laborAngryKickFrameSources
                : angryKickFrameSources
    }

    const drawBasicFrameSources =
        equippedSkinId === LABOR_SKIRT_SKIN_ID && laborDrawBasicFrameSources.length > 0
            ? laborDrawBasicFrameSources
            : classicDrawBasicFrameSources
    for (const action of [
        'drawBasicIntro',
        'drawBasicLoop',
        'drawBasicOutro'
    ] satisfies ActionName[]) {
        const spec = actionSpecs[action]
        if (spec.type === 'sequence') {
            spec.frameSources = drawBasicFrameSources
        }
    }
}

function getCurrentSkinAngryFrameSources(): string[] {
    if (equippedSkinId !== LABOR_SKIRT_SKIN_ID) return angryFrameSources
    if (laborAngryFrameSources.length > 0) return laborAngryFrameSources
    if (laborIdleFrameSources.length > 0) return laborIdleFrameSources
    return angryFrameSources
}

async function reloadSkinDependentAnimations(): Promise<void> {
    const generation = ++assetLoadGeneration
    applyUnlockedAnimationSources()

    const actions: ActionName[] = [
        'idle',
        'anger',
        'angryKick',
        'struggle',
        'drawBasicIntro',
        'drawBasicLoop',
        'drawBasicOutro'
    ]
    const loadedClips = await Promise.all(
        actions.map(async (action) => {
            const clip = await loadAnimationClip(action, actionSpecs[action])
            return [action, clip] as const
        })
    )

    if (generation !== assetLoadGeneration) return

    for (const [action, clip] of loadedClips) {
        animationClips.set(action, clip)
    }

    petMateModelConfig.scale = animationClips.get('idle')?.renderScale ?? 1

    if (activeAction && actions.includes(activeAction)) {
        const state =
            activeAction === 'idle'
                ? { standIdle: true }
                : activeAction === 'struggle'
                  ? { dragging: true }
                  : isDrawBasicAction(activeAction)
                    ? { sitting: true }
                    : { spyBesideWindow: true }
        startAction(activeAction, state, { force: true, transition: false })
    }
}

async function loadAnimationClip(action: ActionName, spec: ActionSpec): Promise<AnimationClip> {
    const frames =
        spec.type === 'sequence'
            ? await loadFrameSequenceFrames(action, spec)
            : await loadSpriteSheetFrames(spec)
    const usesAlignedIdleBlink =
        action === 'idle' &&
        spec.type === 'sequence' &&
        (spec.frameSources === idleFrameSources || spec.frameSources === laborIdleFrameSources)

    const maxVisibleWidth = Math.max(
        ...frames.map((frame) => frame.bounds.right - frame.bounds.left)
    )
    const maxVisibleHeight = Math.max(
        ...frames.map((frame) => frame.bounds.bottom - frame.bounds.top)
    )
    const availableWidth = CANVAS_WIDTH - CHARACTER_SIDE_MARGIN * 2
    const availableHeight = CHARACTER_BASELINE_Y - CHARACTER_TOP_MARGIN
    const renderScale =
        Math.min(availableWidth / maxVisibleWidth, availableHeight / maxVisibleHeight) *
        spec.visualScale

    return {
        action,
        frames,
        steps: buildAnimationSteps(action, frames, spec.frameDurationMs, usesAlignedIdleBlink),
        frameBlendMs: spec.frameBlendMs,
        visualScale: spec.visualScale,
        loopCount: spec.loopCount,
        renderScale,
        anchorY: Math.max(...frames.map((frame) => frame.bounds.bottom)),
        hasEmbeddedShadow: spec.type === 'sequence' && !isDrawBasicAction(action),
        usesAlignedIdleBlink
    }
}

function buildAnimationSteps(
    action: ActionName,
    frames: SpriteFrame[],
    frameDurationMs: number,
    usesAlignedIdleBlink: boolean
): AnimationStep[] {
    if (action !== 'idle') {
        return frames.map((_, frameIndex) => ({ frameIndex, durationMs: frameDurationMs }))
    }

    if (frames.length < 2) {
        return [{ frameIndex: 0, durationMs: 2200, durationJitterMs: 1800 }]
    }

    if (usesAlignedIdleBlink && frames.length >= 9) {
        return [
            { frameIndex: 0, durationMs: 1900, durationJitterMs: 2100 },
            { frameIndex: 1, durationMs: 20 },
            { frameIndex: 2, durationMs: 20 },
            { frameIndex: 3, durationMs: 20 },
            { frameIndex: 4, durationMs: 24 },
            { frameIndex: 5, durationMs: 28 },
            { frameIndex: 6, durationMs: 28 },
            { frameIndex: 7, durationMs: 28 },
            { frameIndex: 8, durationMs: 40 },
            { frameIndex: 7, durationMs: 28 },
            { frameIndex: 6, durationMs: 28 },
            { frameIndex: 5, durationMs: 28 },
            { frameIndex: 4, durationMs: 24 },
            { frameIndex: 3, durationMs: 20 },
            { frameIndex: 2, durationMs: 20 },
            { frameIndex: 1, durationMs: 20 },
            { frameIndex: 0, durationMs: 720, durationJitterMs: 460 }
        ]
    }

    const blinkFrameIndex =
        frames.length >= 10
            ? Math.min(Math.floor(frames.length * 0.5), frames.length - 1)
            : Math.floor(frames.length / 2)

    return [
        { frameIndex: 0, durationMs: 1900, durationJitterMs: 2100 },
        { frameIndex: blinkFrameIndex, durationMs: 105 },
        { frameIndex: 0, durationMs: 720, durationJitterMs: 460 }
    ]
}

async function loadFrameSequenceFrames(
    action: ActionName,
    spec: FrameSequenceActionSpec
): Promise<SpriteFrame[]> {
    if (spec.frameSources.length === 0) {
        throw new Error(`未找到尤美帧动画资源: ${action}`)
    }

    const images = await Promise.all(spec.frameSources.map(loadImage))
    const frames = images
        .map((image) => createMeasuredFrame(image, 0, 0, image.naturalWidth, image.naturalHeight))
        .filter((frame): frame is SpriteFrame => frame !== null)

    if (frames.length > 0) return frames
    throw new Error(`尤美动画不包含可见帧: ${action}`)
}

async function loadSpriteSheetFrames(spec: SpriteActionSpec): Promise<SpriteFrame[]> {
    const image = await loadImage(spec.imageSrc)
    const frames: SpriteFrame[] = []

    for (let row = 0; row < spec.rows; row++) {
        for (let column = 0; column < spec.columns; column++) {
            const sourceX = column * spec.frameWidth
            const sourceY = row * spec.frameHeight
            if (
                sourceX + spec.frameWidth > image.naturalWidth ||
                sourceY + spec.frameHeight > image.naturalHeight
            ) {
                continue
            }

            const frame = createMeasuredFrame(
                image,
                sourceX,
                sourceY,
                spec.frameWidth,
                spec.frameHeight
            )
            if (frame || !spec.skipBlankFrames) {
                if (frame) frames.push(frame)
            }
        }
    }

    if (frames.length > 0) return frames
    throw new Error('尤美精灵表不包含可见帧')
}

function loadImage(src: string): Promise<HTMLImageElement> {
    const cached = imageCache.get(src)
    if (cached) return cached

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image()
        image.decoding = 'async'
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error(`加载尤美动画失败: ${src}`))
        image.src = src
    })
    imageCache.set(src, promise)
    return promise
}

function createMeasuredFrame(
    image: HTMLImageElement,
    sourceX: number,
    sourceY: number,
    sourceWidth: number,
    sourceHeight: number
): SpriteFrame | null {
    const bounds = measureVisibleBounds(image, sourceX, sourceY, sourceWidth, sourceHeight)
    if (!bounds) return null

    return {
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        bounds
    }
}

function measureVisibleBounds(
    image: HTMLImageElement,
    sourceX: number,
    sourceY: number,
    sourceWidth: number,
    sourceHeight: number
): VisibleBounds | null {
    const analysisScale = Math.min(1, FRAME_ANALYSIS_MAX_SIDE / Math.max(sourceWidth, sourceHeight))
    const analysisWidth = Math.max(1, Math.ceil(sourceWidth * analysisScale))
    const analysisHeight = Math.max(1, Math.ceil(sourceHeight * analysisScale))
    const canvas = document.createElement('canvas')
    canvas.width = analysisWidth
    canvas.height = analysisHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return null

    context.clearRect(0, 0, analysisWidth, analysisHeight)
    context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        analysisWidth,
        analysisHeight
    )

    const pixels = context.getImageData(0, 0, analysisWidth, analysisHeight).data
    let left = analysisWidth
    let top = analysisHeight
    let right = -1
    let bottom = -1

    for (let y = 0; y < analysisHeight; y++) {
        for (let x = 0; x < analysisWidth; x++) {
            const alpha = pixels[(y * analysisWidth + x) * 4 + 3]
            if (alpha <= VISIBLE_ALPHA_THRESHOLD) continue

            left = Math.min(left, x)
            top = Math.min(top, y)
            right = Math.max(right, x)
            bottom = Math.max(bottom, y)
        }
    }

    if (right < left || bottom < top) return null

    return {
        left: left / analysisScale,
        top: top / analysisScale,
        right: Math.min((right + 1) / analysisScale, sourceWidth),
        bottom: Math.min((bottom + 1) / analysisScale, sourceHeight)
    }
}

function initSpriteContainer(container: HTMLDivElement) {
    spriteContainer = container
    spriteContainer.style.position = 'fixed'
    spriteContainer.style.inset = '0'
    spriteContainer.style.width = `${CANVAS_WIDTH}px`
    spriteContainer.style.height = `${CANVAS_HEIGHT}px`
    spriteContainer.style.overflow = 'hidden'
    spriteContainer.style.touchAction = 'none'
    spriteContainer.style.contain = 'strict'
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
    spriteCanvas.style.position = 'absolute'
    spriteCanvas.style.inset = '0'
    spriteCanvas.style.width = `${CANVAS_WIDTH}px`
    spriteCanvas.style.height = `${CANVAS_HEIGHT}px`
    spriteCanvas.style.pointerEvents = 'none'
    spriteCanvas.style.userSelect = 'none'
    spriteCanvas.style.imageRendering = 'auto'
    spriteContainer.appendChild(spriteCanvas)
    spriteCanvasContext = spriteCanvas.getContext('2d', { alpha: true })
    syncCanvasResolution(true)
}

function syncCanvasResolution(force = false) {
    if (!spriteCanvas || !spriteCanvasContext) return

    const nextPixelRatio = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO)
    if (!force && nextPixelRatio === canvasPixelRatio) return

    canvasPixelRatio = nextPixelRatio
    spriteCanvas.width = Math.round(CANVAS_WIDTH * canvasPixelRatio)
    spriteCanvas.height = Math.round(CANVAS_HEIGHT * canvasPixelRatio)
    spriteCanvasContext.setTransform(canvasPixelRatio, 0, 0, canvasPixelRatio, 0, 0)
    spriteCanvasContext.imageSmoothingEnabled = true
    spriteCanvasContext.imageSmoothingQuality = 'high'
}

function releasePointerCapture(event: PointerEvent) {
    if (
        event.currentTarget instanceof HTMLElement &&
        event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
        event.currentTarget.releasePointerCapture(event.pointerId)
    }
}

function updateModelState(state: Partial<ModelStatus>): ModelStatus {
    Object.assign(modelState, defaultModelState, state)
    return modelState
}

function clamp01(value: number): number {
    return Math.min(Math.max(value, 0), 1)
}

function clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(Math.max(value, minimum), maximum)
}

function smoothStep(value: number): number {
    const clamped = clamp01(value)
    return clamped * clamped * (3 - 2 * clamped)
}

function easeOutCubic(value: number): number {
    return 1 - Math.pow(1 - clamp01(value), 3)
}
