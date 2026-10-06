export type PetSpeechAnchor = { x: number; y: number }
export type PetSpeechLine = { key: string; text: string; visibleText: string }
export type PetSpeechMessage = PetSpeechLine & { id: string; anchor: PetSpeechAnchor }
export type PetSpeechSide = 'above' | 'left' | 'right' | 'below'
export type PetSpeechState = {
    message: PetSpeechMessage | null
    side: PetSpeechSide
    tail: number
}
export const petSpeechLayout = { width: 260, gap: 12, margin: 6 } as const
type Bounds = { x: number; y: number; width: number; height: number }

export function positionPetSpeech(
    owner: Bounds,
    anchor: PetSpeechAnchor,
    area: Bounds,
    height: number
) {
    const { width, gap, margin } = petSpeechLayout
    const head = { x: owner.x + anchor.x, y: owner.y + anchor.y }
    let x = head.x - width / 2
    let y = head.y - height - gap
    let side: PetSpeechSide = 'above'
    if (y < area.y + margin) {
        const left = owner.x - width - gap
        const right = owner.x + owner.width + gap
        if (
            right + width <= area.x + area.width - margin &&
            (left < area.x + margin || area.x + area.width - right >= owner.x - area.x)
        ) {
            side = 'right'
            x = right
            y = head.y - height / 2
        } else if (left >= area.x + margin) {
            side = 'left'
            x = left
            y = head.y - height / 2
        } else {
            side = 'below'
            y = owner.y + owner.height + gap
        }
    }
    x = Math.round(Math.max(area.x + margin, Math.min(x, area.x + area.width - width - margin)))
    y = Math.round(Math.max(area.y + margin, Math.min(y, area.y + area.height - height - margin)))
    const tail = Math.round(
        side === 'above' || side === 'below'
            ? Math.max(24, Math.min(head.x - x, width - 24))
            : Math.max(24, Math.min(head.y - y, height - 24))
    )
    return { bounds: { x, y, width, height }, side, tail }
}

export function selectPetSpeech(lines: Array<PetSpeechLine | null>): PetSpeechLine | null {
    return lines.find((line) => !!line?.text) ?? null
}
