import Phaser from 'phaser'

import { plantStage } from '../../main/modules/farm/rules'
import type { FarmView } from '../../main/types/farm'
import {
    atlas,
    background,
    cropFrames,
    cropImages,
    cursorHotspots,
    iconFrames,
    icons
} from '../assets/farm-game'
import type { FarmHover, FarmLayout, FarmTarget } from './farmSceneModel'
import {
    farmLayout,
    fieldFrame,
    hitFarm,
    plantingSlots,
    plotMode,
    plotPosition
} from './farmSceneModel'
export type FarmSceneState = { view: FarmView; enabled: boolean }
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
    private cursor?: Phaser.GameObjects.Image
    private beds: Phaser.GameObjects.Image[] = []
    private plants: { image: Phaser.GameObjects.Image; plot: number }[] = []
    private layout!: FarmLayout
    private pointerPosition: { x: number; y: number } | null = null
    constructor(state: FarmSceneState, callbacks: FarmSceneEvents) {
        super('farm')
        this.state = state
        this.callbacks = callbacks
    }
    preload() {
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
        this.cursor = this.add
            .image(0, 0, 'icons', 8)
            .setDepth(100)
            .setDisplaySize(42, 42)
            .setOrigin(0.5, 0.5)
            .setVisible(false)
        this.input.mouse?.disableContextMenu()
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            const event = pointer.event as Event & { pointerType?: string }
            if (event?.type.startsWith('touch') || event?.pointerType === 'touch') { this.leave(); return }
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
        this.game.canvas.style.cursor = 'inherit'
    }
    private tint(id: number) {
        return this.state.view.farm?.plots[id].plant?.watered ? 0xdcdcdc : 0xffffff
    }
    private redraw() {
        if (!this.world) return
        this.layout = farmLayout(this.scale.width, this.scale.height)
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
                .image(root.x, root.y, root.crop, root.phase)
                .setOrigin((meta.pivot[0] - x) / w, (meta.pivot[1] - y) / h)
                .setScale(meta.height / h)
            image.setData({
                plot: root.plot,
                slot: root.index,
                phase: root.phase,
                rootX: root.x,
                rootY: root.y
            })
            this.field.add(image)
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
            this.callbacks.hover(null)
            this.game.canvas.style.cursor = 'inherit'
            return
        }
        const mode = plotMode(this.state.view, target.id),
            p = this.layout.plots[target.id]
        this.callbacks.hover({ id: target.id, x: p.x, y: p.y })
        const index = mode === 'sow' ? 8 : mode === 'water' ? 9 : mode === 'harvest' ? 7 : null
        this.cursor.setVisible(index !== null).setPosition(x, y)
        if (index !== null) {
            this.cursor.setFrame(index)
            this.cursor.setOrigin(cursorHotspots[index].x, cursorHotspots[index].y)
            this.cursor.setScale(42 / Math.max(this.cursor.frame.width, this.cursor.frame.height))
        }
        this.game.canvas.style.cursor = index === null ? 'inherit' : 'none'
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
