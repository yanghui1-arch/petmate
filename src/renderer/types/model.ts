export interface ModelStatus {
    walk: boolean,
    jump: boolean,
    dance: boolean,
    sitting: boolean,
    standIdle: boolean,
    sittedIdle: boolean,
    spyBesideWindow: boolean,
}

/**
 * 模型在屏幕上的位置
 */
export interface ScreenPosition {
    x: number,
    y: number
}