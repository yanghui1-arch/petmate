/**
 * 等级要求
 * 不是必要字段，如果为空，则不进行等级要求
 */
export interface Requirement {
    level?: number,
    singLevel?: number,
    drawLevel?: number,
    gameLevel?: number,
    affectionLevel?: number,
}
