export type Reward = {
    exp: number;
    gameExp: number;
    singExp: number;
    drawExp: number;
    affectionExp: number;
    energy: number;
    hungry: number;
    health: number;
    emotion: number;
    cash: number;
}

export type Consume = {
    energy: number;
    hungry: number;
    health: number;
    emotion: number;
    cash: number;
    spendingTime: number; // seconds
}

export type ActivityInfo = {
    id: number;
    type: "work" | "study" | "entertainment";
    name: string;
    url: string;
    description: string;
    reward: Reward;
    consume: Consume;
    requirement: Requirement;
    rewardSummary: string; // 奖励概述
}

export type Requirement = {
    level: number,
    sing_level: number,
    draw_level: number,
    game_level: number,
    affection_level: number,
}
