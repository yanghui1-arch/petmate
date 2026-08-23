import { AnimatedSprite, Application, Assets, type Texture } from 'pixi.js'

export type SleepAnimationPhase = 'intro' | 'loop' | 'response'

export type SleepAnimationSources = {
    intro: string[]
    loop: string[]
    response: string[]
}

type AnimatedFrame = {
    texture: Texture
    time: number
}

const CANVAS_WIDTH = 300
const CANVAS_HEIGHT = 300
const FRAME_DURATIONS: Record<SleepAnimationPhase, number[]> = {
    intro: [720, 420, 480, 520, 260, 500],
    loop: [6500, 500, 900, 500, 3700],
    response: [900, 900, 1200, 1500]
}

/**
 * Owns the sleep animation's render surface and frame timing.
 *
 * The normal model renderer intentionally stays on Canvas2D because it needs
 * custom mesh distortion and layered compositing for other actions. Sleep is
 * a plain transparent frame sequence, so Pixi's AnimatedSprite can keep one
 * texture on the GPU and swap it atomically without Canvas2D cross-fading.
 */
export class SleepAnimationPlayer {
    private application: Application | null = null
    private sprite: AnimatedSprite | null = null
    private readonly textures = new Map<string, Texture>()
    private phaseGeneration = 0
    private ready = false

    async initialize(
        container: HTMLElement,
        sourceSets: SleepAnimationSources[]
    ): Promise<boolean> {
        if (this.ready) return true

        let application: Application | null = null

        try {
            application = new Application()
            await application.init({
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                autoStart: false,
                sharedTicker: false,
                backgroundAlpha: 0,
                antialias: true,
                autoDensity: true,
                resolution: Math.min(window.devicePixelRatio || 1, 3)
            })

            const sources = Array.from(
                new Set(
                    sourceSets
                        .flatMap((sourceSet) => [
                            ...sourceSet.intro,
                            ...sourceSet.loop,
                            ...sourceSet.response
                        ])
                        .filter(Boolean)
                )
            )
            const loadedTextures = await Promise.all(
                sources.map(async (source) => [source, await Assets.load<Texture>(source)] as const)
            )

            for (const [source, texture] of loadedTextures) {
                this.textures.set(source, texture)
            }

            const initialSourceSet = sourceSets.find((sourceSet) => sourceSet.intro.length > 0)
            if (!initialSourceSet) throw new Error('未找到睡眠动画帧')

            const sprite = new AnimatedSprite({
                textures: this.createFrames(initialSourceSet, 'intro'),
                autoPlay: false,
                autoUpdate: false,
                loop: false
            })
            sprite.anchor.set(0.5, 1)
            sprite.position.set(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 12)
            sprite.visible = false
            sprite.eventMode = 'none'
            application.stage.addChild(sprite)

            const ticker = application.ticker
            ticker.add(() => {
                if (this.sprite?.visible && this.sprite.playing) {
                    this.sprite.update(ticker)
                }
            })

            const view = application.canvas
            view.className = 'youmei-sleep-pixi-canvas'
            view.style.position = 'absolute'
            view.style.inset = '0'
            view.style.width = `${CANVAS_WIDTH}px`
            view.style.height = `${CANVAS_HEIGHT}px`
            view.style.display = 'block'
            view.style.pointerEvents = 'none'
            view.style.userSelect = 'none'
            view.style.visibility = 'hidden'
            container.appendChild(view)

            application.stop()
            this.application = application
            this.sprite = sprite
            this.ready = true
            return true
        } catch (error) {
            console.error('初始化睡眠动画播放器失败', error)
            application?.destroy()
            return false
        }
    }

    get isVisible(): boolean {
        return this.ready && this.sprite?.visible === true
    }

    play(
        phase: SleepAnimationPhase,
        sourceSet: SleepAnimationSources,
        onComplete?: () => void
    ): boolean {
        const application = this.application
        const sprite = this.sprite
        if (!this.ready || !application || !sprite) return false

        const frames = this.createFrames(sourceSet, phase)
        if (frames.length === 0) return false

        const generation = ++this.phaseGeneration
        sprite.stop()
        sprite.loop = phase === 'loop'
        sprite.onComplete = undefined

        if (phase === 'intro') {
            sprite.onComplete = () => {
                if (generation !== this.phaseGeneration) return
                this.play('loop', sourceSet, onComplete)
            }
        } else if (phase === 'response' && onComplete) {
            sprite.onComplete = () => {
                if (generation === this.phaseGeneration) onComplete()
            }
        }

        sprite.textures = frames
        sprite.visible = true
        application.canvas.style.visibility = 'visible'
        sprite.gotoAndPlay(0)
        application.start()
        return true
    }

    setPose(
        renderScale: number,
        baselineOffset: number,
        motion: { x: number; y: number; rotation: number; scaleX: number; scaleY: number }
    ): void {
        if (!this.sprite) return

        this.sprite.position.set(
            CANVAS_WIDTH / 2 + motion.x,
            CANVAS_HEIGHT - 12 + baselineOffset * renderScale + motion.y
        )
        this.sprite.rotation = motion.rotation
        this.sprite.scale.set(renderScale * motion.scaleX, renderScale * motion.scaleY)
    }

    hide(): void {
        this.phaseGeneration++
        if (this.sprite) {
            this.sprite.onComplete = undefined
            this.sprite.stop()
            this.sprite.visible = false
        }
        if (this.application) this.application.canvas.style.visibility = 'hidden'
        this.application?.stop()
    }

    destroy(): void {
        this.hide()
        this.sprite?.destroy()
        this.application?.destroy({ removeView: true })
        this.sprite = null
        this.application = null
        this.textures.clear()
        this.ready = false
    }

    private createFrames(
        sourceSet: SleepAnimationSources,
        phase: SleepAnimationPhase
    ): AnimatedFrame[] {
        const durations = FRAME_DURATIONS[phase]
        return sourceSet[phase]
            .map((source, index) => {
                const texture = this.textures.get(source)
                if (!texture) return null
                return {
                    texture,
                    time: durations[index] ?? durations[durations.length - 1]
                }
            })
            .filter((frame): frame is AnimatedFrame => frame !== null)
    }
}
