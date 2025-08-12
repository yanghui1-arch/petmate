export interface ModelStatus {
    walk: boolean,
    dance: boolean,
    sitting: boolean,
    standIdle: boolean,
    sittedIdle: boolean,
    spyBesideWindow: boolean,
    dragging: boolean
}

/**
 * 模型在屏幕上的位置
 */
export interface ScreenPosition {
    x: number,
    y: number
}
