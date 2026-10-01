import Phaser from 'phaser'

import { plantStage } from '../../main/modules/farm/rules'
import type { FarmView } from '../../main/types/farm'
import {
    cropSprites,
    decorationSprites,
    sceneSprites,
    statusSprites,
    toolSprites,
    youmeiSprites
} from '../assets/farm'
import grass from '../assets/farm/grass-bed.png'
import meadow from '../assets/farm/meadow-scene.png'
import soil from '../assets/farm/soil-bed.png'
import type { FarmLayout, FarmRect, FarmTarget, FarmTool } from './farmSceneModel'
import {
    cellRect,
    decorationWidth,
    farmLayout,
    hitFarm,
    placementAllowed,
    plotIssue
} from './farmSceneModel'

export type FarmSceneState = {
    view: FarmView
    tool: FarmTool
    selected: number | null
    enabled: boolean
    action: 'idle' | 'plant' | 'water' | 'harvest' | 'walk'
    frame: number
    labels: { empty: string; stages: string[]; crops: Record<string, string> }
}
export type FarmSceneEvents = {
    target: (_target: FarmTarget, _right: boolean) => void
    ready: () => void
    error: (_message: string) => void
}

/** Visuals and input only: this scene never owns inventory or writes a save. */
export class FarmScene extends Phaser.Scene {
    private state: FarmSceneState
    private callbacks: FarmSceneEvents
    private world?: Phaser.GameObjects.Container
    private hover?: Phaser.GameObjects.Graphics
    private cursor?: Phaser.GameObjects.Container
    private companion?: Phaser.GameObjects.Image
    private layout!: FarmLayout
    private pointerPosition: { x: number; y: number } | null = null

    constructor(state: FarmSceneState, callbacks: FarmSceneEvents) {
        super('farm')
        this.state = state
        this.callbacks = callbacks
    }
    preload() {
        const textures = {
            meadow,
            soil,
            grass,
            hut: sceneSprites.hut,
            tree: sceneSprites.tree,
            ready: statusSprites.ready,
            seeds: toolSprites.seeds,
            water: toolSprites.water,
            ...Object.fromEntries(
                Object.entries(cropSprites).map(([id, url]) => [`crop-${id}`, url])
            ),
            ...Object.fromEntries(
                Object.entries(decorationSprites).map(([id, url]) => [`decor-${id}`, url])
            ),
            'youmei-idle': youmeiSprites.idleAndWater,
            'youmei-water': youmeiSprites.idleAndWater,
            'youmei-plant': youmeiSprites.plant,
            'youmei-harvest': youmeiSprites.harvest,
            'youmei-walk': youmeiSprites.walk
        }
        for (const [key, url] of Object.entries(textures)) this.load.image(key, url)
        this.load.on('loaderror', (file: Phaser.Loader.File) =>
            this.callbacks.error(`Asset: ${file.key}`)
        )
    }
    create() {
        for (const id of Object.keys(cropSprites)) this.addFrames(`crop-${id}`, 4)
        for (const action of ['idle', 'water', 'plant', 'harvest', 'walk'])
            this.addFrames(`youmei-${action}`, 2)
        this.world = this.add.container()
        this.hover = this.add.graphics().setDepth(20)
        this.cursor = this.add.container().setDepth(30)
        this.input.mouse?.disableContextMenu()
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            this.pointerPosition = { x: pointer.x, y: pointer.y }
            this.drawPointer()
        })
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (!this.state.enabled) return
            const right = pointer.rightButtonDown()
            if (!right && !pointer.leftButtonDown()) return
            const arranging = !right && ['place', 'move'].includes(this.state.tool.kind)
            this.callbacks.target(
                hitFarm(this.layout, this.state.view, pointer.x, pointer.y, arranging),
                right
            )
        })
        this.scale.on('resize', this.resize, this)
        this.events.once('shutdown', () => this.scale.off('resize', this.resize, this))
        this.redraw()
        this.callbacks.ready()
    }
    private addFrames(key: string, count: number) {
        if (!this.textures.exists(key)) return
        const texture = this.textures.get(key)
        const image = texture.getSourceImage() as HTMLImageElement
        const width = image.width / count
        for (let index = 0; index < count; index++)
            texture.add(index, 0, index * width, 0, width, image.height)
    }
    updateState(state: FarmSceneState) {
        const previous = this.state
        this.state = state
        if (!this.world) return
        if (
            previous.view !== state.view ||
            previous.selected !== state.selected ||
            previous.labels !== state.labels
        )
            this.redraw()
        else {
            this.updateCompanion()
            this.drawPointer()
        }
    }
    leave() {
        this.pointerPosition = null
        this.hover?.clear()
        this.cursor?.setVisible(false)
        this.game.canvas.style.cursor = 'default'
    }
    private resize() {
        this.redraw()
    }
    private image(key: string, rect: FarmRect, contain = false, frame?: number) {
        const image = this.add.image(rect.x, rect.y, key, frame).setOrigin(0)
        if (contain) {
            const scale = Math.min(rect.width / image.width, rect.height / image.height)
            image
                .setScale(scale)
                .setPosition(
                    rect.x + (rect.width - image.displayWidth) / 2,
                    rect.y + (rect.height - image.displayHeight) / 2
                )
        } else image.setDisplaySize(rect.width, rect.height)
        this.world!.add(image)
        return image
    }
    private redraw() {
        if (!this.world) return
        this.layout = farmLayout(this.scale.width, this.scale.height)
        this.world.removeAll(true)
        const { width, height, plots } = this.layout
        const view = this.state.view
        this.image('meadow', { x: 0, y: 0, width, height })
        this.image(
            'hut',
            {
                x: width * 0.03,
                y: height * 0.21,
                width: Math.max(115, width * 0.19),
                height: height * 0.23
            },
            true
        )
        this.image(
            'tree',
            { x: width * 0.86, y: height * 0.185, width: width * 0.12, height: height * 0.19 },
            true
        )
        for (const plot of view.farm?.plots ?? []) {
            const rect = plots[plot.id]
            const locked = plot.id >= view.unlockedPlots
            const bed = this.image(locked ? 'grass' : 'soil', {
                x: rect.x - rect.width * 0.03,
                y: rect.y - rect.height * 0.08,
                width: rect.width * 1.06,
                height: rect.height * 1.16
            })
            const shape = this.add
                .graphics()
                .fillStyle(0xffffff)
                .fillRoundedRect(rect.x, rect.y, rect.width, rect.height, 12)
                .setVisible(false)
            this.world.add(shape)
            const mask = shape.createGeometryMask()
            bed.setMask(mask)
            bed.once('destroy', () => mask.destroy())
            if (plot.plant && !locked) {
                this.image(
                    `crop-${plot.plant.cropId}`,
                    {
                        x: rect.x + rect.width * 0.2,
                        y: rect.y + rect.height * 0.06,
                        width: rect.width * 0.6,
                        height: rect.height * 0.68
                    },
                    true,
                    plantStage(plot.plant)
                )
                if (plantStage(plot.plant) === 3)
                    this.image(
                        'ready',
                        { x: rect.x + rect.width - 22, y: rect.y + 2, width: 20, height: 20 },
                        true
                    )
            } else {
                const mark = this.add
                    .text(rect.x + rect.width / 2, rect.y + rect.height * 0.4, locked ? '▣' : '+', {
                        fontSize: locked ? '22px' : '27px',
                        color: '#fff4c7',
                        fontFamily: 'Microsoft YaHei, sans-serif',
                        stroke: '#6f482b',
                        strokeThickness: 2
                    })
                    .setOrigin(0.5)
                this.world.add(mark)
            }
            const label = locked
                ? `Lv.${plot.id < 9 ? 3 : 5}`
                : plot.plant
                  ? `${this.state.labels.crops[plot.plant.cropId]} · ${this.state.labels.stages[plantStage(plot.plant)]}`
                  : this.state.labels.empty
            const text = this.add
                .text(rect.x + rect.width / 2, rect.y + rect.height * 0.86, label, {
                    fontFamily: 'Microsoft YaHei, sans-serif',
                    fontSize: width < 760 ? '9px' : '11px',
                    color: '#fff4d4',
                    backgroundColor: locked ? '#315b34' : '#442717',
                    padding: { x: 3, y: 2 }
                })
                .setOrigin(0.5)
            if (text.width > rect.width * 0.94) text.setScale((rect.width * 0.94) / text.width)
            this.world.add(text)
            if (this.state.selected === plot.id) {
                const border = this.add.graphics().lineStyle(2, 0xf6db70, 1)
                border.strokeRoundedRect(
                    rect.x + 1,
                    rect.y + 1,
                    rect.width - 2,
                    rect.height - 2,
                    12
                )
                this.world.add(border)
            }
        }
        for (const item of view.farm?.placed ?? [])
            this.image(
                `decor-${item.decorationId}`,
                cellRect(this.layout, item, decorationWidth(view, item.decorationId)),
                true
            )
        const companionScale = height < 480 ? 0.7 : width < 760 ? 0.78 : 1
        this.companion = this.image(
            `youmei-${this.state.action}`,
            {
                x: width * 0.045,
                y: height * 0.94 - 143 * companionScale,
                width: 96 * companionScale,
                height: 143 * companionScale
            },
            false,
            0
        )
        this.updateCompanion()
        this.drawPointer()
    }
    private updateCompanion() {
        this.companion?.setTexture(
            `youmei-${this.state.action}`,
            this.state.action === 'water' ? 1 : this.state.action === 'idle' ? 0 : this.state.frame
        )
    }
    private drawPointer() {
        if (!this.hover || !this.cursor) return
        this.hover.clear()
        this.cursor.removeAll(true).setVisible(false)
        const tool = this.state.tool
        const arranging = tool.kind === 'place' || tool.kind === 'move'
        if (arranging && this.state.enabled) {
            for (const region of ['left', 'right', 'bottom'] as const) {
                for (let y = 0; y < (region === 'bottom' ? 1 : 4); y++) {
                    for (let x = 0; x < (region === 'bottom' ? 8 : 2); x++) {
                        const rect = cellRect(this.layout, { region, x, y })
                        this.hover.lineStyle(1, 0xffedaf, 0.7).fillStyle(0x54713e, 0.22)
                        this.hover.fillRoundedRect(
                            rect.x + 2,
                            rect.y + 2,
                            rect.width - 4,
                            rect.height - 4,
                            4
                        )
                        this.hover.strokeRoundedRect(
                            rect.x + 2,
                            rect.y + 2,
                            rect.width - 4,
                            rect.height - 4,
                            4
                        )
                    }
                }
            }
        }
        const point = this.pointerPosition
        const canvas = this.game.canvas
        if (!point || !this.state.enabled || tool.kind === 'inspect') {
            canvas.style.cursor = 'default'
            return
        }
        canvas.style.cursor = 'none'
        const target = hitFarm(this.layout, this.state.view, point.x, point.y, arranging)
        let rect: FarmRect | null = null
        let valid = false
        if (arranging && target.kind === 'cell') {
            rect = cellRect(
                this.layout,
                target.cell,
                decorationWidth(this.state.view, tool.decorationId)
            )
            valid = placementAllowed(this.state.view, tool, target.cell)
        } else if (!arranging && target.kind === 'plot') {
            rect = this.layout.plots[target.id]
            valid = !plotIssue(this.state.view, tool, target.id)
        }
        if (rect) {
            this.hover.lineStyle(3, valid ? 0xf8e58d : 0xd16b50, 1)
            this.hover.strokeRoundedRect(
                rect.x + 2,
                rect.y + 2,
                rect.width - 4,
                rect.height - 4,
                10
            )
        }
        const key =
            tool.kind === 'sow'
                ? 'seeds'
                : tool.kind === 'water'
                  ? 'water'
                  : `decor-${tool.decorationId}`
        const icon = this.add.image(15, 8, key).setOrigin(0)
        icon.setScale(
            Math.min((arranging ? 64 : 34) / icon.width, (arranging ? 64 : 34) / icon.height)
        ).setAlpha(0.9)
        this.cursor.add(icon)
        if (tool.kind === 'sow') {
            const crop = this.add
                .image(38, 20, `crop-${tool.cropId}`, 3)
                .setOrigin(0)
                .setDisplaySize(22, 28)
            this.cursor.add(crop)
        }
        const hint = this.add.text(
            14,
            arranging ? 68 : 42,
            `${valid ? '✓' : '×'}${tool.kind === 'sow' ? ` · ${this.state.view.farm?.seeds[tool.cropId] ?? 0}` : ''}`,
            {
                fontSize: '14px',
                color: '#fff8df',
                backgroundColor: '#443628',
                padding: { x: 3, y: 1 }
            }
        )
        this.cursor
            .add(hint)
            .setPosition(
                Math.min(point.x, this.layout.width - 85),
                Math.min(point.y, this.layout.height - 92)
            )
            .setVisible(true)
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
        backgroundColor: '#9cb974',
        pixelArt: true,
        scene: [scene],
        // ResizeObserver owns the host size. NONE avoids RESIZE reapplying cached
        // parent bounds when the tool status changes the field height.
        scale: { mode: Phaser.Scale.NONE, autoRound: true },
        input: { keyboard: false },
        audio: { noAudio: true },
        fps: { target: 30, forceSetTimeOut: false },
        banner: false
    })
    return { game, scene }
}
