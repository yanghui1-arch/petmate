import type { FarmLifePose } from '../../../shared/farmLife'
import bridge from './bridge.png'
import departure from './departure.webm'
import desktopWorkwear from './desktop-workwear.png'
import door from './door-display.png'
import sweat from './sweat.png'
import timing from './timing.json'

export { departure, desktopWorkwear }
// Approved reference positions use a 1280 x 720 canvas.
export const farmLifeArt = {
    bridge: { url: bridge, width: 144, height: 216, x: 281, y: 603, displayHeight: 108, anchorX: 0.68, anchorY: 0.6, ...timing.bridge },
    door: { url: door, width: 0, height: 0, x: 1069, y: 298, displayHeight: 106, anchorX: 0.7, anchorY: 0.62, frames: 1, times: [0], duration: 0, loop: false },
    sweat: { url: sweat, width: 144, height: 216, x: 853, y: 376, displayHeight: 128, anchorX: 0.57, anchorY: 0.986, ...timing.sweat }
} as const

export function farmLifeFrame(pose: FarmLifePose, elapsed: number) {
    const art = farmLifeArt[pose]
    const age = art.loop ? Math.max(0, elapsed) % art.duration : Math.max(0, elapsed)
    let frame = 0
    while (frame + 1 < art.frames && art.times[frame + 1] <= age) frame++
    return frame
}
