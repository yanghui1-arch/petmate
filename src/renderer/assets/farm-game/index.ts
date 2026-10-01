import carrot from './crop-carrot-single.png'
import frames from './crop-frames.json'
import potato from './crop-potato-single.png'
import pumpkin from './crop-pumpkin-single.png'
import strawberry from './crop-strawberry-single.png'
import tomato from './crop-tomato-single.png'
import wheat from './crop-wheat-single.png'
import atlas from './farm-atlas.png'
import icons from './farm-icons.png'
import background from './farm-world-lane.png'

export const cropImages: Record<string, string> = {
    wheat,
    carrot,
    potato,
    tomato,
    strawberry,
    pumpkin
}
export const cropFrames: Record<
    string,
    { file: string; sheet: number[]; stages: { rect: number[]; pivot: number[]; height: number }[] }
> = frames
export { atlas, background, icons }
// Relative frame origins: fingertip, loose seed and watering-can spout.
export const cursorHotspots: Record<number, { x: number; y: number }> = {
    7: { x: 40 / 313, y: 276 / 295 },
    8: { x: 295 / 310, y: 250 / 267 },
    9: { x: 23 / 323, y: 154 / 280 }
}
// Measured UI artwork regions. Generated icons are not spaced in equal rows.
export const iconFrames = [
    [16, 16, 348, 390],
    [380, 40, 330, 352],
    [741, 56, 342, 340],
    [1111, 72, 332, 331],
    [38, 445, 293, 289],
    [374, 419, 360, 312],
    [774, 439, 286, 295],
    [1120, 429, 313, 295],
    [10, 770, 310, 267],
    [410, 743, 323, 280],
    [780, 761, 264, 299],
    [1084, 741, 351, 305]
]
