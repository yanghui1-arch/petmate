export type PlayerAnimationResource = {
    id: string;
    name: string;
    action: "angryKick";
    skin: string;
    previewFrame: string;
    acquiredAt: string;
}

export type PlayerTitleResource = {
    id: string;
    name: string;
    description: string;
    source: string;
    acquiredAt: string;
}

export type PlayerSkinAnimationKey = "classic" | "labor-skin" | "school-uniform";

export type PlayerSkinResource = {
    id: string;
    name: string;
    thumbnail: string;
    showImage: string;
    animationSkin: PlayerSkinAnimationKey;
    acquiredAt: string;
}

export type PlayerResourceState = {
    animationResources: PlayerAnimationResource[];
    skins: PlayerSkinResource[];
    equippedSkinId: string;
    titles: PlayerTitleResource[];
    equippedTitleId: string | null;
    commissionCompletionCounts: Record<string, number>;
    /**
     * 旧版本曾用这个字段限制委托只能完成一次。
     * 现在委托可重复交付，保留字段仅用于兼容已存在的存档。
     */
    completedCommissionIds: string[];
}

export type CommissionRewardBundle = {
    animationResources: Omit<PlayerAnimationResource, "acquiredAt">[];
    titles: Omit<PlayerTitleResource, "acquiredAt">[];
}

export type CommissionRewardTier = "loss" | "profit" | "animation" | "title";

export type CommissionGrantedReward = {
    id: string;
    type: "cash";
    name: string;
    amount: number;
    description: string;
} | {
    id: string;
    type: "item";
    itemId: number;
    name: string;
    itemUrl: string;
    count: number;
    description: string;
} | {
    id: string;
    type: "animation";
    name: string;
    description: string;
    previewFrame: string;
} | {
    id: string;
    type: "title";
    name: string;
    description: string;
}

export type CommissionCompletionResult = {
    resources: PlayerResourceState;
    rewardTier: CommissionRewardTier;
    completionCount: number;
    rewards: CommissionGrantedReward[];
}
