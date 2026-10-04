import Phaser from 'phaser'

import { plantStage } from '../../main/modules/farm/rules'
import type { FarmView } from '../../main/types/farm'
import type { FarmLifeVisit } from '../../shared/farmLife'
import { farmLifePose } from '../../shared/farmLife'
import gamePointer from '../assets/cursor/sv_cursor_pointer.png'
import {
    atlas,
    background,
    cropFrames,
    cropImages,
    cursorHotspots,
    iconFrames,
    icons
} from '../assets/farm-game'
import { farmLifeArt, farmLifeFrame } from '../assets/farm-life'
import flowerImage from '../assets/farm-life/flower.svg'
import type { FarmHover, FarmLayout, FarmTarget } from './farmSceneModel'
import {
    farmLayout,
    fieldFrame,
    hitFarm,
    plantingSlots,
    plotMode,
    plotPosition
} from './farmSceneModel'
export type FarmSceneState = { view: FarmView; enabled: boolean; visit?: FarmLifeVisit | null }
export type FarmSceneEvents = {
    target: (_target: FarmTarget, _right: boolean) => void
    hover: (_hover: FarmHover) => void
    ready: () => void
    error: (_message: string) => void
    progress?: (_progress: number) => void
}
/** Visuals and input only: this scene never owns inventory or writes a save. */
export class FarmScene extends Phaser.Scene {
    private state: FarmSceneState
    private callbacks: FarmSceneEvents
    private world?: Phaser.GameObjects.Container
    private field?: Phaser.GameObjects.Container
    private standing?: Phaser.GameObjects.Layer
    private cursor?: Phaser.GameObjects.Image
    private beds: Phaser.GameObjects.Image[] = []
    private plants: { image: Phaser.GameObjects.Image; plot: number }[] = []
    private layout!: FarmLayout
    private pointerPosition: { x: number; y: number } | null = null
    private actor?: Phaser.GameObjects.Sprite
    private flower?: Phaser.GameObjects.Image
    private discoveredFlowers = new Set<string>()
    private actorVisit = ''
    private actorAppeared = 0
    constructor(state: FarmSceneState, callbacks: FarmSceneEvents) {
        super('farm')
        this.state = state
        this.callbacks = callbacks
    }
    preload() {
        for (const [pose, art] of Object.entries(farmLifeArt)) {
            if (art.width) this.load.spritesheet('life-' + pose, art.url, { frameWidth: art.width, frameHeight: art.height })
            else this.load.image('life-' + pose, art.url)
        }
        this.load.svg('life-flower', flowerImage)
        this.load.on('progress', (value: number) => this.callbacks.progress?.(value))
        this.load.image('background', background)
        this.load.image('atlas', atlas)
        this.load.image('icons', icons)
        for (const [id, url] of Object.entries(cropImages)) this.load.image(id, url)
        this.load.on('loaderror', (file: Phaser.Loader.File) =>
            this.callbacks.error('Asset: ' + file.key)
        )
    }
    create() {
        const texture = this.textures.get('atlas'),
            source = texture.getSourceImage() as HTMLImageElement
        for (const [key, rect] of Object.entries({
            soil: [0.003, 0.023, 0.243, 0.127],
            grass: [0.252, 0.018, 0.247, 0.129]
        }))
            texture.add(
                key,
                0,
                Math.round(rect[0] * source.width),
                Math.round(rect[1] * source.height),
                Math.round(rect[2] * source.width),
                Math.round(rect[3] * source.height)
            )
        iconFrames.forEach((rect, i) =>
            this.textures.get('icons').add(i, 0, ...(rect as [number, number, number, number]))
        )
        for (const [id, meta] of Object.entries(cropFrames))
            meta.stages.forEach((stage, index) =>
                this.textures
                    .get(id)
                    .add(index, 0, ...(stage.rect as [number, number, number, number]))
            )
        this.world = this.add.container()
        // Crops and the character share a display list, sorted by their ground contact.
        this.standing = this.add.layer().setDepth(1)
        this.actor = this.add.sprite(0, 0, 'life-bridge', 0).setVisible(false)
        this.standing.add(this.actor)
        this.flower = this.add.image(0, 0, 'life-flower').setDepth(4).setOrigin(0.5, 1).setVisible(false)
        this.cursor = this.add
            .image(0, 0, 'icons', 8)
            .setDepth(100)
            .setDisplaySize(42, 42)
            .setOrigin(0.5, 0.5)
            .setVisible(false)
        this.input.mouse?.disableContextMenu()
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            const event = pointer.event as Event & { pointerType?: string }
            if (event?.type.startsWith('touch') || event?.pointerType === 'touch') {
                this.leave()
                return
            }
            this.pointerPosition = { x: pointer.x, y: pointer.y }
            this.drawPointer()
        })
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            const event = pointer.event as Event & { pointerType?: string }
            if (event?.type.startsWith('touch') || event?.pointerType === 'touch') this.leave()
            if (!this.state.enabled || (!pointer.rightButtonDown() && !pointer.leftButtonDown()))
                return
            this.callbacks.target(this.hit(pointer.x, pointer.y), pointer.rightButtonDown())
        })
        this.scale.on('resize', this.redraw, this)
        this.events.once('shutdown', () => this.scale.off('resize', this.redraw, this))
        this.redraw()
        this.game.events.once('postrender', () => this.callbacks.ready())
    }
    update() {
        if (!this.layout || !this.actor || !this.flower) return
        const visit = this.state.visit, layout = this.layout
        this.flower.setPosition(layout.x + 1150 * layout.scale, layout.y + 770 * layout.scale).setDisplaySize(30 * layout.scale, 36 * layout.scale).setVisible(!!this.state.view.farm?.life?.flower)
        const discovery = this.state.view.farm?.life?.events.find(event => event.kind === 'flower' && !event.interrupted && !event.shown)
        if (this.state.enabled && discovery && !this.discoveredFlowers.has(discovery.id)) {
            this.discoveredFlowers.add(discovery.id)
            this.tweens.add({ targets: this.flower, alpha: 0.25, duration: 450, yoyo: true, repeat: 2, onComplete: () => this.flower?.setAlpha(1) })
        }
        if (!visit || !['visiting', 'exiting'].includes(visit.phase)) { this.actor.setVisible(false); this.actorVisit = ''; return }
        if (this.actorVisit !== visit.id) { this.actorVisit = visit.id; this.actorAppeared = performance.now() }
        const pose = farmLifePose(visit.kind, visit.cancelled), art = farmLifeArt[pose]
        const frame = farmLifeFrame(pose, performance.now() - this.actorAppeared)
        this.actor.setTexture('life-' + pose, art.width ? frame : '__BASE')
            .setOrigin(art.anchorX, art.anchorY)
            .setPosition(layout.x + art.x * 1.25 * layout.scale, layout.y + art.y * 1.25 * layout.scale)
        const height = art.displayHeight * 1.25 * layout.scale
        this.actor.setDisplaySize(height * this.actor.frame.width / this.actor.frame.height, height).setVisible(true).setAlpha(1)
        this.actor.setDepth(this.actor.y)
    }
    updateState(state: FarmSceneState) {
        const changed = this.state.view !== state.view
        this.state = state
        if (this.world) {
            if (changed) this.redraw()
            else this.drawPointer()
        }
    }
    leave() {
        this.pointerPosition = null
        this.cursor?.setVisible(false)
        this.beds.forEach((bed, id) => bed.setTint(this.tint(id)).setAlpha(1))
        this.callbacks.hover(null)
        this.game.canvas.style.setProperty('cursor', 'inherit', 'important')
    }
    private tint(id: number) {
        return this.state.view.farm?.plots[id].plant?.watered ? 0xdcdcdc : 0xffffff
    }
    private redraw() {
        if (!this.world || !this.standing) return
        this.layout = farmLayout(this.scale.width, this.scale.height)
        this.plants.forEach(({ image }) => image.destroy())
        this.world.removeAll(true)
        this.beds = []
        this.plants = []
        this.world.setPosition(this.layout.x, this.layout.y).setScale(this.layout.scale)
        this.world.add(this.add.image(0, 0, 'background').setOrigin(0).setDisplaySize(1600, 900))
        this.field = this.add.container(fieldFrame.x, fieldFrame.y).setScale(fieldFrame.scale)
        this.world.add(this.field)
        for (let id = 0; id < 12; id++) {
            const p = plotPosition(id),
                locked = id >= this.state.view.unlockedPlots
            const bed = this.add
                .image(p.x - 155, p.y - 58, 'atlas', locked ? 'grass' : 'soil')
                .setOrigin(0)
                .setDisplaySize(310, 116)
                .setTint(this.tint(id))
            this.field.add(bed)
            this.beds.push(bed)
            if (locked)
                this.field.add(
                    this.add
                        .text(p.x + 14, p.y + 5, '🔒 Lv.' + (id < 9 ? 3 : 5), {
                            fontFamily: 'Microsoft YaHei, sans-serif',
                            fontSize: '16px',
                            color: '#fffbe4',
                            backgroundColor: '#56723488',
                            padding: { x: 8, y: 3 }
                        })
                        .setOrigin(0.5, 0)
                )
        }
        const roots = this.state.view
            .farm!.plots.flatMap((plot) => {
                if (!plot.plant) return []
                const p = plotPosition(plot.id),
                    phase = plantStage(plot.plant),
                    crop = plot.plant.cropId
                return plantingSlots.map((slot, index) => ({
                    x: p.x + slot.x,
                    y: p.y + slot.y,
                    crop,
                    phase,
                    plot: plot.id,
                    index
                }))
            })
            .sort((a, b) => a.y - b.y || a.index - b.index)
        for (const root of roots) {
            const meta = cropFrames[root.crop].stages[root.phase],
                [x, y, w, h] = meta.rect
            const image = this.add
                .image(
                    this.layout.x + (fieldFrame.x + root.x * fieldFrame.scale) * this.layout.scale,
                    this.layout.y + (fieldFrame.y + root.y * fieldFrame.scale) * this.layout.scale,
                    root.crop, root.phase
                )
                .setOrigin((meta.pivot[0] - x) / w, (meta.pivot[1] - y) / h)
                .setScale(meta.height / h * fieldFrame.scale * this.layout.scale)
            image.setDepth(image.y)
            image.setData({
                plot: root.plot,
                slot: root.index,
                phase: root.phase,
                rootX: root.x,
                rootY: root.y
            })
            this.standing.add(image)
            this.plants.push({ image, plot: root.plot })
        }
        this.drawPointer()
    }
    private hit(x: number, y: number): FarmTarget {
        // Hit opaque plant pixels so transparent sprite padding cannot steal adjacent soil.
        for (let i = this.plants.length - 1; i >= 0; i--) {
            const { image, plot } = this.plants[i],
                bounds = image.getBounds()
            if (!bounds.contains(x, y)) continue
            const px = ((x - bounds.x) / bounds.width) * image.frame.width,
                py = ((y - bounds.y) / bounds.height) * image.frame.height
            if (this.textures.getPixelAlpha(px, py, image.texture.key, image.frame.name) > 32)
                return { kind: 'plot', id: plot }
        }
        return hitFarm(this.layout, x, y)
    }
    private drawPointer() {
        if (!this.cursor || !this.pointerPosition || !this.world) return
        const { x, y } = this.pointerPosition,
            target = this.hit(x, y)
        this.beds.forEach((bed, id) =>
            bed
                .setTint(this.tint(id))
                .setAlpha(
                    this.state.enabled && target.kind === 'plot' && target.id === id ? 0.94 : 1
                )
        )
        if (!this.state.enabled || target.kind !== 'plot') {
            this.cursor.setVisible(false)
            if (this.state.enabled && target.kind === 'entry') {
                const p = this.layout.entrances.find((entry) => entry.id === target.id)!
                this.callbacks.hover({ ...target, x: p.x, y: p.y })
                this.game.canvas.style.setProperty(
                    'cursor',
                    `url("${gamePointer}") 17 2, pointer`,
                    'important'
                )
                return
            }
            this.callbacks.hover(null)
            this.game.canvas.style.setProperty('cursor', 'inherit', 'important')
            return
        }
        const mode = plotMode(this.state.view, target.id),
            p = this.layout.plots[target.id]
        this.callbacks.hover({ ...target, x: p.x, y: p.y })
        const index = mode === 'sow' ? 8 : mode === 'water' ? 9 : mode === 'harvest' ? 7 : null
        this.cursor.setVisible(index !== null).setPosition(x, y)
        if (index !== null) {
            this.cursor.setFrame(index)
            this.cursor.setOrigin(cursorHotspots[index].x, cursorHotspots[index].y)
            this.cursor.setScale(42 / Math.max(this.cursor.frame.width, this.cursor.frame.height))
        }
        // Global game cursors use !important; the canvas must override them while a tool is visible.
        this.game.canvas.style.setProperty(
            'cursor',
            index === null ? 'inherit' : 'none',
            'important'
        )
    }
}
export function createFarmGame(
    parent: HTMLElement,
    state: FarmSceneState,
    callbacks: FarmSceneEvents
) {
    const scene = new FarmScene(state, callbacks)
    const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent,
        width: Math.max(1, parent.clientWidth),
        height: Math.max(1, parent.clientHeight),
        transparent: true,
        scene: [scene],
        scale: { mode: Phaser.Scale.NONE, autoRound: true },
        input: { keyboard: false },
        audio: { noAudio: true },
        fps: { target: 30 },
        banner: false
    })
    return { game, scene }
}
