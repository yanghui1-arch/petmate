import Store from "electron-store";
import type { PackageItemConsumeRequirement } from "./basic";
import type { Item } from "../../types/item";
import type {
    CommissionCompletionResult,
    CommissionGrantedReward,
    CommissionRewardBundle,
    CommissionRewardTier,
    PlayerAnimationResource,
    PlayerResourceState,
    PlayerSkinResource,
    PlayerTitleResource
} from "../../types/player-resource";
import { itemManager, playerManager } from "../store";
import { handleOwnedTitleAchievements, handleTitleAchievement } from "./achieve";
import {
    SCHOOL_HANDBOOK_DESKMATE_TITLE_ID,
    SCHOOL_HANDBOOK_FULL_ATTENDANCE_TITLE_ID
} from "../../types/school-handbook";

type PlayerResourceStoreData = {
    resources: PlayerResourceState;
}

type ItemRewardSpec = {
    itemId: number;
    count: number;
}

type ItemRewardPoolEntry = {
    itemId: number;
    min: number;
    max: number;
}

type EconomicRewardMode = "loss" | "profit" | "special";

const LABOR_KICK_ANIMATION_ID = "youmei-angry-kick-labor-2026";
export const CLASSIC_SKIN_ID = "youmei-classic-dress";
export const LABOR_SKIRT_SKIN_ID = "youmei-labor-skirt-2026";
export const SCHOOL_UNIFORM_SKIN_ID = "youmei-school-uniform-2026";

const SKIN_DEFINITIONS: Record<string, Omit<PlayerSkinResource, "acquiredAt">> = {
    [CLASSIC_SKIN_ID]: {
        id: CLASSIC_SKIN_ID,
        name: "经典长裙套装",
        thumbnail: "skins/经典长裙套装.png",
        showImage: "skins/show/经典长裙套装-1.png",
        animationSkin: "classic"
    },
    [LABOR_SKIRT_SKIN_ID]: {
        id: LABOR_SKIRT_SKIN_ID,
        name: "五一短裙套装",
        thumbnail: "skins/五一短裙套装-2026.png",
        showImage: "skins/show/五一短裙套装-2026-1.png",
        animationSkin: "labor-skin"
    },
    [SCHOOL_UNIFORM_SKIN_ID]: {
        id: SCHOOL_UNIFORM_SKIN_ID,
        name: "学院制服套装",
        thumbnail: "skins/学院制服套装.png",
        showImage: "skins/show/学院制服套装-1.png",
        animationSkin: "school-uniform"
    }
}

const SCHOOL_HANDBOOK_TITLE_RESOURCES: Omit<PlayerTitleResource, "acquiredAt">[] = [
    {
        id: SCHOOL_HANDBOOK_FULL_ATTENDANCE_TITLE_ID,
        name: "九月全勤生",
        description: "每天都认真完成任务的全勤称谓。",
        source: "尤美的新学期手册"
    },
    {
        id: SCHOOL_HANDBOOK_DESKMATE_TITLE_ID,
        name: "尤美的同桌",
        description: "陪尤美一起迎接新学期的人。",
        source: "尤美的新学期手册"
    }
]

const createDefaultPlayerResources = (): PlayerResourceState => {
    const classicSkin = createSkinResource(CLASSIC_SKIN_ID, "system")
    return {
        animationResources: [],
        skins: [classicSkin],
        equippedSkinId: CLASSIC_SKIN_ID,
        titles: [],
        equippedTitleId: null,
        commissionCompletionCounts: {},
        completedCommissionIds: []
    }
}

export class SkinAlreadyOwnedError extends Error {
    constructor(skinName: string) {
        super(`${skinName}已经拥有，不可以重复购买，可以去衣橱换装。`)
        this.name = "SkinAlreadyOwnedError"
    }
}

const COMMISSION_REWARD_BUNDLES: Record<string, CommissionRewardBundle> = {
    "labor-2026-tool": {
        animationResources: [
            {
                id: LABOR_KICK_ANIMATION_ID,
                name: "劳动节踢人动画",
                action: "angryKick",
                skin: "labor-skin",
                previewFrame: "assets/models/youmei/animations/angry_kick/labor-skin/10.png"
            }
        ],
        titles: [
            {
                id: "labor-2026-holiday-craftsperson",
                name: "假日小工匠",
                description: "把劳动节的心意认真送到的人。",
                source: "工具寻礼"
            }
        ]
    },
    "labor-2026-parasol": {
        animationResources: [
            {
                id: LABOR_KICK_ANIMATION_ID,
                name: "劳动节踢人动画",
                action: "angryKick",
                skin: "labor-skin",
                previewFrame: "assets/models/youmei/animations/angry_kick/labor-skin/10.png"
            }
        ],
        titles: [
            {
                id: "labor-2026-sunny-guardian",
                name: "曙光守护者",
                description: "替尤美撑起晴天小伞的人。",
                source: "洋伞赠礼"
            }
        ]
    },
    "labor-2026-gaming": {
        animationResources: [
            {
                id: LABOR_KICK_ANIMATION_ID,
                name: "劳动节踢人动画",
                action: "angryKick",
                skin: "labor-skin",
                previewFrame: "assets/models/youmei/animations/angry_kick/labor-skin/10.png"
            }
        ],
        titles: [
            {
                id: "labor-2026-winning-duo",
                name: "假期连胜搭子",
                description: "和尤美一起打满假期快乐的人。",
                source: "电竞赠礼"
            }
        ]
    }
}

const LOSS_ITEM_POOL: ItemRewardPoolEntry[] = [
    { itemId: 0, min: 2, max: 6 },
    { itemId: 1, min: 1, max: 4 },
    { itemId: 3, min: 2, max: 6 },
    { itemId: 5, min: 1, max: 3 },
    { itemId: 6, min: 1, max: 2 },
    { itemId: 12, min: 1, max: 2 },
    { itemId: 18, min: 1, max: 2 }
]

const PROFIT_ITEM_POOL: ItemRewardPoolEntry[] = [
    { itemId: 7, min: 1, max: 2 },
    { itemId: 8, min: 1, max: 1 },
    { itemId: 11, min: 1, max: 3 },
    { itemId: 16, min: 1, max: 3 },
    { itemId: 17, min: 1, max: 2 },
    { itemId: 19, min: 1, max: 3 },
    { itemId: 20, min: 1, max: 1 }
]

class PlayerResourceManager {
    private store: Store<PlayerResourceStoreData>
    private resources: PlayerResourceState = createDefaultPlayerResources()
    private isInit = false

    constructor() {
        this.store = new Store<PlayerResourceStoreData>({
            name: "player-resource-store"
        })
    }

    initPlayerResource(): void {
        if (this.isInit) return
        this.isInit = true

        const stored = (this.store as any).get("resources") as PlayerResourceState | undefined
        this.resources = this.normalizeResources(stored)
        handleOwnedTitleAchievements(this.resources.titles.map(title => title.name))
        this.saveResources()
    }

    getResources(): PlayerResourceState {
        this.ensureInit()
        return this.cloneResources(this.resources)
    }

    getCommissionRewardBundle(commissionId: string): CommissionRewardBundle | undefined {
        return COMMISSION_REWARD_BUNDLES[commissionId]
    }

    hasSkin(skinId: string): boolean {
        this.ensureInit()
        return this.resources.skins.some(resource => resource.id === skinId)
    }

    unlockSkin(skinId: string): PlayerResourceState {
        this.ensureInit()

        const skinDefinition = SKIN_DEFINITIONS[skinId]
        if (!skinDefinition) {
            throw new Error(`未知套装: ${skinId}`)
        }

        if (this.hasSkin(skinId)) {
            throw new SkinAlreadyOwnedError(skinDefinition.name)
        }

        this.resources.skins.push(createSkinResource(skinId))
        this.saveResources()
        return this.getResources()
    }

    /**
     * 发放套装奖励时使用。与购买接口不同，重复发放是幂等的，方便活动奖励补发。
     */
    grantSkin(skinId: string): PlayerResourceState {
        this.ensureInit()

        const skinDefinition = SKIN_DEFINITIONS[skinId]
        if (!skinDefinition) {
            throw new Error(`未知套装: ${skinId}`)
        }

        if (this.hasSkin(skinId)) return this.getResources()

        this.resources.skins.push(createSkinResource(skinId))
        this.saveResources()
        return this.getResources()
    }

    /**
     * 发放称谓奖励时使用。与装备接口分离，并且对重复发放保持幂等。
     */
    grantTitle(titleId: string): PlayerResourceState {
        this.ensureInit()

        const titleDefinition = this.getAllTitleRewards().find(title => title.id === titleId)
        if (!titleDefinition) {
            throw new Error(`未知称谓: ${titleId}`)
        }

        if (this.resources.titles.some(title => title.id === titleId)) {
            return this.getResources()
        }

        const resource: PlayerTitleResource = {
            ...titleDefinition,
            acquiredAt: new Date().toISOString()
        }
        this.resources.titles.push(resource)
        if (!this.resources.equippedTitleId) {
            this.resources.equippedTitleId = resource.id
        }
        handleTitleAchievement(resource.name)
        this.saveResources()
        return this.getResources()
    }

    equipSkin(skinId: string): PlayerResourceState {
        this.ensureInit()

        const hasSkin = this.resources.skins.some(resource => resource.id === skinId)
        if (!hasSkin) {
            throw new Error("未拥有该套装")
        }

        this.resources.equippedSkinId = skinId
        this.saveResources()
        return this.getResources()
    }

    equipTitle(titleId: string): PlayerResourceState {
        this.ensureInit()

        const hasTitle = this.resources.titles.some(resource => resource.id === titleId)
        if (!hasTitle) {
            throw new Error("未拥有该称谓")
        }

        this.resources.equippedTitleId = titleId
        this.saveResources()
        return this.getResources()
    }

    completeCommission(
        commissionId: string,
        requirements: PackageItemConsumeRequirement[],
        completionCount: number = 1
    ): CommissionCompletionResult {
        this.ensureInit()
        const safeCompletionCount = normalizeCompletionCount(completionCount)

        const rewardBundle = this.getCommissionRewardBundle(commissionId)
        if (!rewardBundle) {
            throw new Error(`未知委托奖励: ${commissionId}`)
        }

        const inputValue = this.computeRequirementValue(requirements)
        const rewards: CommissionGrantedReward[] = []
        let lastRewardTier: CommissionRewardTier = "profit"

        for (let index = 0; index < safeCompletionCount; index++) {
            const rewardTier = this.resolveRewardTier(commissionId)
            lastRewardTier = rewardTier

            if (rewardTier === "animation") {
                const animationReward = this.grantAnimationReward(rewardBundle)
                if (animationReward) rewards.push(animationReward)
                rewards.push(...this.grantEconomicRewards("special", inputValue))
            } else if (rewardTier === "title") {
                const titleReward = this.grantTitleReward(commissionId)
                if (titleReward) rewards.push(titleReward)
                rewards.push(...this.grantEconomicRewards("special", inputValue))
            } else {
                rewards.push(...this.grantEconomicRewards(rewardTier, inputValue))
            }
        }

        this.resources.commissionCompletionCounts[commissionId] =
            (this.resources.commissionCompletionCounts[commissionId] ?? 0) + safeCompletionCount
        this.saveResources()

        return {
            resources: this.getResources(),
            rewardTier: lastRewardTier,
            completionCount: safeCompletionCount,
            rewards: aggregateGrantedRewards(rewards)
        }
    }

    private resolveRewardTier(commissionId: string): CommissionRewardTier {
        const hasLaborKick = this.resources.animationResources.some(resource => resource.id === LABOR_KICK_ANIMATION_ID)
        const canGrantTitle = this.getTitleRewardCandidate(commissionId) !== undefined
        const roll = Math.random()

        if (hasLaborKick) {
            if (roll < 0.35) return "loss"
            if (roll < 0.8) return "profit"
            return canGrantTitle ? "title" : "profit"
        }

        if (roll < 0.35) return "loss"
        if (roll < 0.8) return "profit"
        if (roll < 0.9) return "animation"
        return canGrantTitle ? "title" : "profit"
    }

    private grantEconomicRewards(mode: EconomicRewardMode, inputValue: number): CommissionGrantedReward[] {
        const itemRewardSpecs = this.createItemRewardSpecs(mode)
        const itemValue = this.computeItemRewardValue(itemRewardSpecs)
        let cash = 0

        if (mode === "loss") {
            cash = randomInt(Math.round(inputValue * 0.08), Math.round(inputValue * 0.18))
        } else if (mode === "profit") {
            const targetValue = randomInt(Math.round(inputValue * 1.18), Math.round(inputValue * 1.62))
            cash = Math.max(300, targetValue - itemValue)
        } else {
            cash = randomInt(Math.round(inputValue * 0.24), Math.round(inputValue * 0.42))
        }

        return this.grantCashAndItems(cash, itemRewardSpecs)
    }

    private createItemRewardSpecs(mode: EconomicRewardMode): ItemRewardSpec[] {
        const pool = (mode === "loss" ? LOSS_ITEM_POOL : PROFIT_ITEM_POOL)
            .filter(entry => this.isRewardItemAvailable(entry.itemId))
        if (!pool.length) return []

        const pickCount = mode === "loss" ? randomInt(2, 3) : mode === "profit" ? randomInt(3, 5) : randomInt(2, 3)
        const specs = new Map<number, number>()

        for (let index = 0; index < pickCount; index++) {
            const entry = pickOne(pool)
            specs.set(entry.itemId, (specs.get(entry.itemId) ?? 0) + randomInt(entry.min, entry.max))
        }

        return Array.from(specs.entries()).map(([itemId, count]) => ({ itemId, count }))
    }

    private grantCashAndItems(cash: number, itemRewards: ItemRewardSpec[]): CommissionGrantedReward[] {
        const player = playerManager.getPlayer()
        const rewards: CommissionGrantedReward[] = []

        if (cash > 0) {
            player.cash += cash
            rewards.push({
                id: `cash-${Date.now()}`,
                type: "cash",
                name: `${cash} 金币`,
                amount: cash,
                description: "委托礼盒里闪闪发亮的金币。"
            })
        }

        for (const itemReward of itemRewards) {
            const item = this.getRewardItem(itemReward.itemId)
            const packageItem = player.items.find(packageItem => packageItem.id === item.id)

            if (packageItem) {
                packageItem.count += itemReward.count
            } else {
                player.items.push({
                    id: item.id,
                    name: item.name,
                    type: item.type,
                    description: item.description,
                    url: item.url,
                    count: itemReward.count
                })
            }

            rewards.push({
                id: `item-${item.id}`,
                type: "item",
                itemId: item.id,
                name: item.name,
                itemUrl: item.url,
                count: itemReward.count,
                description: `获得 ${itemReward.count} 个${item.name}。`
            })
        }

        playerManager.updatePlayer(player)
        return rewards
    }

    private grantAnimationReward(rewardBundle: CommissionRewardBundle): CommissionGrantedReward | undefined {
        const animation = rewardBundle.animationResources.find(resource => resource.id === LABOR_KICK_ANIMATION_ID)
        if (!animation || this.resources.animationResources.some(resource => resource.id === animation.id)) {
            return undefined
        }

        const resource: PlayerAnimationResource = {
            ...animation,
            acquiredAt: new Date().toISOString()
        }
        this.resources.animationResources.push(resource)

        return {
            id: resource.id,
            type: "animation",
            name: resource.name,
            description: "解锁后，尤美生气时会使用劳动节限定踢人动画。",
            previewFrame: resource.previewFrame
        }
    }

    private grantTitleReward(commissionId: string): CommissionGrantedReward | undefined {
        const title = this.getTitleRewardCandidate(commissionId)
        if (!title) return undefined

        const resource: PlayerTitleResource = {
            ...title,
            acquiredAt: new Date().toISOString()
        }
        this.resources.titles.push(resource)
        if (!this.resources.equippedTitleId) {
            this.resources.equippedTitleId = resource.id
        }
        handleTitleAchievement(resource.name)

        return {
            id: resource.id,
            type: "title",
            name: resource.name,
            description: resource.description
        }
    }

    private getTitleRewardCandidate(commissionId: string): Omit<PlayerTitleResource, "acquiredAt"> | undefined {
        const ownedTitleIds = new Set(this.resources.titles.map(title => title.id))
        return this.getCommissionRewardBundle(commissionId)?.titles.find(title => !ownedTitleIds.has(title.id))
    }

    private getAllTitleRewards(): Omit<PlayerTitleResource, "acquiredAt">[] {
        const titleMap = new Map<string, Omit<PlayerTitleResource, "acquiredAt">>()
        Object.values(COMMISSION_REWARD_BUNDLES).forEach(bundle => {
            bundle.titles.forEach(title => titleMap.set(title.id, title))
        })
        SCHOOL_HANDBOOK_TITLE_RESOURCES.forEach(title => titleMap.set(title.id, title))
        return [...titleMap.values()]
    }

    private computeRequirementValue(requirements: PackageItemConsumeRequirement[]): number {
        return requirements.reduce((total, requirement) => {
            const item = this.getExistingItem(requirement.itemId)
            return total + item.price * requirement.count
        }, 0)
    }

    private computeItemRewardValue(rewards: ItemRewardSpec[]): number {
        return rewards.reduce((total, reward) => {
            const item = this.getRewardItem(reward.itemId)
            return total + item.price * reward.count
        }, 0)
    }

    private getExistingItem(itemId: number): Item {
        const item = itemManager.getItem(itemId)
        if (!item) {
            throw new Error(`奖励物品不存在: ${itemId}`)
        }
        return item
    }

    private getRewardItem(itemId: number): Item {
        const item = this.getExistingItem(itemId)
        if (item.expired === true) {
            throw new Error(`奖励物品已过期，不能被抽到: ${itemId}`)
        }
        return item
    }

    private isRewardItemAvailable(itemId: number): boolean {
        const item = itemManager.getItem(itemId)
        return item !== undefined && item.expired !== true
    }

    private ensureInit(): void {
        if (!this.isInit) this.initPlayerResource()
    }

    private saveResources(): void {
        (this.store as any).set("resources", this.resources)
    }

    private normalizeResources(resources?: Partial<PlayerResourceState>): PlayerResourceState {
        const skins = this.normalizeSkins(resources?.skins)
        const ownedSkinIds = new Set(skins.map(skin => skin.id))
        const equippedSkinId = resources?.equippedSkinId && ownedSkinIds.has(resources.equippedSkinId)
            ? resources.equippedSkinId
            : CLASSIC_SKIN_ID
        const titles = this.normalizeTitles(resources?.titles)
        const ownedTitleIds = new Set(titles.map(title => title.id))
        const equippedTitleId = resources?.equippedTitleId && ownedTitleIds.has(resources.equippedTitleId)
            ? resources.equippedTitleId
            : titles[0]?.id ?? null

        return {
            animationResources: resources?.animationResources ?? [],
            skins,
            equippedSkinId,
            titles,
            equippedTitleId,
            commissionCompletionCounts: resources?.commissionCompletionCounts ?? {},
            completedCommissionIds: resources?.completedCommissionIds ?? []
        }
    }

    private normalizeSkins(skins?: PlayerSkinResource[]): PlayerSkinResource[] {
        const normalized = new Map<string, PlayerSkinResource>()
        normalized.set(CLASSIC_SKIN_ID, createSkinResource(CLASSIC_SKIN_ID, "system"))

        skins?.forEach(skin => {
            if (!SKIN_DEFINITIONS[skin.id]) return
            normalized.set(skin.id, createSkinResource(skin.id, skin.acquiredAt))
        })

        return [...normalized.values()]
    }

    private normalizeTitles(titles?: PlayerTitleResource[]): PlayerTitleResource[] {
        const titleDefinitions = new Map<string, Omit<PlayerTitleResource, "acquiredAt">>()
        this.getAllTitleRewards().forEach(title => titleDefinitions.set(title.id, title))

        return (titles ?? [])
            .filter(title => titleDefinitions.has(title.id))
            .map(title => ({
                ...titleDefinitions.get(title.id)!,
                acquiredAt: title.acquiredAt
            }))
    }

    private cloneResources(resources: PlayerResourceState): PlayerResourceState {
        return {
            animationResources: resources.animationResources.map(resource => ({ ...resource })),
            skins: resources.skins.map(resource => ({ ...resource })),
            equippedSkinId: resources.equippedSkinId,
            titles: resources.titles.map(resource => ({ ...resource })),
            equippedTitleId: resources.equippedTitleId,
            commissionCompletionCounts: { ...resources.commissionCompletionCounts },
            completedCommissionIds: [...resources.completedCommissionIds]
        }
    }
}

function createSkinResource(skinId: string, acquiredAt: string = new Date().toISOString()): PlayerSkinResource {
    const skinDefinition = SKIN_DEFINITIONS[skinId]
    if (!skinDefinition) {
        throw new Error(`未知套装: ${skinId}`)
    }

    return {
        ...skinDefinition,
        acquiredAt
    }
}

function normalizeCompletionCount(completionCount: number): number {
    if (!Number.isInteger(completionCount) || completionCount <= 0) {
        throw new Error(`委托交付次数不合法: ${completionCount}`)
    }

    return completionCount
}

function aggregateGrantedRewards(rewards: CommissionGrantedReward[]): CommissionGrantedReward[] {
    const aggregatedRewards: CommissionGrantedReward[] = []
    const cashRewardMap = new Map<string, CommissionGrantedReward & { type: "cash" }>()
    const itemRewardMap = new Map<number, CommissionGrantedReward & { type: "item" }>()
    const uniqueRewardIds = new Set<string>()

    rewards.forEach(reward => {
        if (reward.type === "cash") {
            const key = "cash"
            const existingReward = cashRewardMap.get(key)
            if (existingReward) {
                existingReward.amount += reward.amount
                existingReward.name = `${existingReward.amount} 金币`
                existingReward.description = `累计获得 ${existingReward.amount} 金币。`
                return
            }

            const cashReward = {
                ...reward,
                id: "cash-total",
                description: `累计获得 ${reward.amount} 金币。`
            }
            cashRewardMap.set(key, cashReward)
            aggregatedRewards.push(cashReward)
            return
        }

        if (reward.type === "item") {
            const existingReward = itemRewardMap.get(reward.itemId)
            if (existingReward) {
                existingReward.count += reward.count
                existingReward.name = reward.name
                existingReward.description = `累计获得 ${existingReward.count} 个${reward.name}。`
                return
            }

            const itemReward = {
                ...reward,
                id: `item-${reward.itemId}`,
                description: `累计获得 ${reward.count} 个${reward.name}。`
            }
            itemRewardMap.set(reward.itemId, itemReward)
            aggregatedRewards.push(itemReward)
            return
        }

        if (uniqueRewardIds.has(reward.id)) return
        uniqueRewardIds.add(reward.id)
        aggregatedRewards.push(reward)
    })

    return aggregatedRewards
}

function randomInt(min: number, max: number): number {
    const safeMin = Math.ceil(Math.min(min, max))
    const safeMax = Math.floor(Math.max(min, max))
    return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin
}

function pickOne<T>(items: T[]): T {
    return items[randomInt(0, items.length - 1)]
}

export const playerResourceManager = new PlayerResourceManager()
