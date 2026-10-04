import type { FarmView } from '../../src/main/types/farm'
import type {
    FarmLifeEvent,
    FarmLifeKind,
    FarmLifeView,
    FarmLifeVisit
} from '../../src/shared/farmLife'

export const eventNames: Record<FarmLifeKind | 'tutorial', string> = {
    tutorial: '首次教学',
    water: '浇水',
    harvest: '收获',
    order: '订单备货',
    rest: '田边休息',
    butterfly: '看蝴蝶',
    seedlings: '看菜苗',
    walk: '散步',
    check: '巡视',
    flower: '小花'
}
export const presetNames = {
    water: '未浇水的菜苗',
    harvest: '多块成熟作物',
    order: '订单缺少成熟的小麦',
    rest: '空田生活事件',
    seedlings: '正在长大的菜苗',
    flower: '达到小花发现条件',
    first: '玩家还未首次收获',
    '99': '累计收获 99 次',
    '499': '累计收获 499 次',
    '999': '累计收获 999 次',
    quota: '今日出行额度已满',
    energy: '低精力',
    empty: '无工作任务且生活额度已用完',
    manualWater: '11 块亲自浇水 + 1 块未浇水'
} as const
export type Preset = keyof typeof presetNames
export type LabSkin = FarmLifeVisit['skin']
export type LabAction =
    | 'departure'
    | 'bridge'
    | 'door'
    | 'sweat'
export type LabCommand =
    | { type: 'scenario'; kind: FarmLifeKind | 'tutorial'; fast: boolean }
    | { type: 'preset'; preset: Preset }
    | { type: 'trigger'; kind: FarmLifeKind | 'tutorial'; fast: boolean }
    | { type: 'next' | 'recall' | 'openFarm' | 'closeFarm' | 'reset' | 'diary' | 'restart' }
    | { type: 'condition'; key: 'energy' | 'sleep' | 'saveFailure'; value: boolean }
    | { type: 'skin'; skin: LabSkin }
    | { type: 'preview'; action: LabAction | null }
export type LabState = {
    life: FarmLifeView & { direction: 'left' | 'right' }
    view: FarmView
    skin: LabSkin
    preview: LabAction | null
    farmOpen: boolean
    conditions: { energy: boolean; sleep: boolean; saveFailure: boolean }
    candidates: { kind: FarmLifeKind; plots: number[] }[]
    reason: string
    log: { id: number; text: string; at: number }[]
    path: string
    clockSkippedMs: number
}
export type LabSpeech = { stage: 'start' | 'return'; event: FarmLifeEvent }
export interface LabApi {
    state(): Promise<LabState>
    command(_command: LabCommand): Promise<{ ok: boolean; message?: string }>
    subscribe(callback: (_state: LabState) => void): () => void
    speech(callback: (_speech: LabSpeech) => void): () => void
    finishSpeech(_id: string): void
}
