/**
 * Petmate 相关的操作
 */

import { NotEnoughError } from "../error";
import { Buff, BuffEffect, DEFAULT_BUFF_EFFECT } from "../types/buff";

/**
 *  计算下一级所需经验
 *      Args:
 *          currentLevel: 当前等级
 *      Return:
 *          下一级所需经验
 */
function calcNextExp(currentLevel: number): number {
    const baseRatio = 50
    const incrementRatio = 1.7
    const linearRatio = 100
    const nextExp = Math.floor(baseRatio * currentLevel ** incrementRatio + linearRatio * currentLevel)
    return nextExp
}

/**
 * 计算当前等级对应的属性值上限
 * @param level 当前等级
 * @returns 属性值上限
 */
function calcMaxAttribute(level: number): number {
    const MAX = 1_000_000;
    const k = 0.08;           // 控制曲线斜率（0.05~0.1间可调）
    const m = level / 2;   // 中点控制，等级一半时属性接近 MAX/2

    const expPart = Math.exp(-k * (level - m));
    const value = MAX / (1 + expPart);

    return Math.floor(value);
}

/**
 * 计算buff效果
 * @param buffs 当前buff列表
 * @returns 当前buff效果
 */
function calcBuffEffect(buffs: Buff[]): BuffEffect {
    const finalBuffEffect: BuffEffect = DEFAULT_BUFF_EFFECT;
    buffs.forEach(buff => {
        // 经验
        finalBuffEffect.expGainRate *= buff.effect.expGainRate;
        finalBuffEffect.gameExpGainRate *= buff.effect.gameExpGainRate;
        finalBuffEffect.singExpGainRate *= buff.effect.singExpGainRate;
        finalBuffEffect.drawExpGainRate *= buff.effect.drawExpGainRate;
        finalBuffEffect.affectionExpGainRate *= buff.effect.affectionExpGainRate;
        // 属性消耗
        finalBuffEffect.energyCostRate *= buff.effect.energyCostRate;
        finalBuffEffect.hungryCostRate *= buff.effect.hungryCostRate;
        finalBuffEffect.healthCostRate *= buff.effect.healthCostRate;
        finalBuffEffect.emotionCostRate *= buff.effect.emotionCostRate;
        // 属性获取
        finalBuffEffect.energyGainRate *= buff.effect.energyGainRate;
        finalBuffEffect.hungryGainRate *= buff.effect.hungryGainRate;
        finalBuffEffect.healthGainRate *= buff.effect.healthGainRate;
        finalBuffEffect.emotionGainRate *= buff.effect.emotionGainRate;
        // 其他效果
        finalBuffEffect.spendingTimeRate *= buff.effect.spendingTimeRate;
        finalBuffEffect.cashGainRate *= buff.effect.cashGainRate;
    });

    return finalBuffEffect;
}

export class PetMate {
    id: number
    name: String
    // 所有等级
    level: number
    exp: number
    next_exp: number
    game_level: number
    game_exp: number
    game_next_exp: number
    sing_level: number
    sing_exp: number
    sing_next_exp: number
    draw_level: number
    draw_exp: number
    draw_next_exp: number
    affection_level: number
    affection_exp: number
    affection_next_exp: number

    // 所有属性
    hungry: number
    emotion: number
    energy: number
    health: number

    max_hungry: number
    max_emotion: number
    max_energy: number
    max_health: number

    buffs: Buff[]

    constructor(
        id: number,
        name: string,
        level: number,
        exp: number,
        next_exp: number,
        game_level: number,
        game_exp: number,
        game_next_exp: number,
        sing_level: number,
        sing_exp: number,
        sing_next_exp: number,
        draw_level: number,
        draw_exp: number,
        draw_next_exp: number,
        affection_level: number,
        affection_exp: number,
        affection_next_exp: number,
        hungry: number,
        emotion: number,
        energy: number,
        health: number,
        max_hungry: number,
        max_emotion: number,
        max_energy: number,
        max_health: number,
        buffs: Buff[]
    ) {
        this.id = id;
        this.name = name;
        this.level = level;
        this.exp = exp;
        this.next_exp = next_exp;
        this.game_level = game_level;
        this.game_exp = game_exp;
        this.game_next_exp = game_next_exp;
        this.sing_level = sing_level;
        this.sing_exp = sing_exp;
        this.sing_next_exp = sing_next_exp;
        this.draw_level = draw_level;
        this.draw_exp = draw_exp;
        this.draw_next_exp = draw_next_exp;
        this.affection_level = affection_level;
        this.affection_exp = affection_exp;
        this.affection_next_exp = affection_next_exp;
        this.hungry = hungry;
        this.emotion = emotion;
        this.energy = energy;
        this.health = health;
        this.max_hungry = max_hungry;
        this.max_emotion = max_emotion;
        this.max_energy = max_energy;
        this.max_health = max_health;
        this.buffs = buffs;
    }

    /**
     * 加经验
     * @param exp 需要增加的经验值
     * @returns 增加完经验后的等级
     */
    addExp(exp: number): number {
        exp = calcBuffEffect(this.buffs).expGainRate * exp;
        this.exp += exp;
        // 升级，但可能不只是生一级
        while (this.exp >= this.next_exp) {
            this.level ++;
            this.exp = this.exp - this.next_exp;
            this.next_exp = calcNextExp(this.level);
        }
        // 每次都要重新计算一下当前level对应的属性值上限
        const maxAttributeFromLevel = calcMaxAttribute(this.level);
        this.max_hungry = maxAttributeFromLevel;
        this.max_emotion = maxAttributeFromLevel;
        this.max_energy = maxAttributeFromLevel;
        this.max_health = maxAttributeFromLevel;
        return this.level 
    }

    /**
     * 加游戏经验
     * @param exp 需要增加的游戏经验值
     * @returns 增加完游戏经验后的等级
     */
    addGameExp(exp: number): number {
        exp = calcBuffEffect(this.buffs).gameExpGainRate * exp;
        this.game_exp += exp;
        while (this.game_exp >= this.game_next_exp) {
            this.game_level ++;
            this.game_exp = this.game_exp - this.game_next_exp;
            this.game_next_exp = calcNextExp(this.game_level);
        }
        return this.game_level
    }

    /**
     * 加唱歌经验
     * @param exp 需要增加的唱歌经验值
     * @returns 增加完唱歌经验后的等级
     */
    addSingExp(exp: number): number {
        exp = calcBuffEffect(this.buffs).singExpGainRate * exp;
        this.sing_exp += exp;
        while (this.sing_exp >= this.sing_next_exp) {
            this.sing_level ++;
            this.sing_exp = this.sing_exp - this.sing_next_exp;
            this.sing_next_exp = calcNextExp(this.sing_level);
        }
        return this.sing_level
    }

    /**
     * 加画画经验
     * @param exp 需要增加的画画经验值
     * @returns 增加完画画经验后的等级
     */
    addDrawExp(exp: number): number {
        exp = calcBuffEffect(this.buffs).drawExpGainRate * exp;
        this.draw_exp += exp;
        while (this.draw_exp >= this.draw_next_exp) {
            this.draw_level ++;
            this.draw_exp = this.draw_exp - this.draw_next_exp;
            this.draw_next_exp = calcNextExp(this.draw_level);
        }
        return this.draw_level
    }

    /**
     * 加亲密度经验
     * @param exp 需要增加的亲密度经验值
     * @returns 增加完亲密度经验后的等级
     */
    addAffectionExp(exp: number): number {
        exp = calcBuffEffect(this.buffs).affectionExpGainRate * exp;
        this.affection_exp += exp;
        while (this.affection_exp >= this.affection_next_exp) {
            this.affection_level ++;
            this.affection_exp = this.affection_exp - this.affection_next_exp;
            this.affection_next_exp = calcNextExp(this.affection_level);
        }
        return this.affection_level
    }

    /**
     * 更新饱食度
     * @param hungry 需要增加的饱食度，为正数时是增加，为负数时是减少
     * @returns 当前饱食度，不可能小于0也不会超过上限
     */
    updateHungry(hungry: number): number {
        if (hungry < 0) {
            hungry = calcBuffEffect(this.buffs).hungryCostRate * hungry;
        } else {
            hungry = calcBuffEffect(this.buffs).hungryGainRate * hungry;
        }
        if (this.hungry + hungry < 0) {
            throw new NotEnoughError("饱食度不足");
        }
        this.hungry = Math.min(this.hungry + hungry, this.max_hungry);
        return this.hungry;
    }

    /**
     * 更新情绪
     * @param emotion 需要增加的情绪，为正数时是增加，为负数时是减少
     * @returns 当前情绪，不可能小于0也不会超过上限
     */
    updateEmotion(emotion: number): number {
        if (emotion < 0) {
            emotion = calcBuffEffect(this.buffs).emotionCostRate * emotion;
        } else {
            emotion = calcBuffEffect(this.buffs).emotionGainRate * emotion;
        }
        if (this.emotion + emotion < 0) {
            throw new NotEnoughError("心情不够");
        }
        this.emotion = Math.min(this.emotion + emotion, this.max_emotion);
        return this.emotion;
    }

    /**
     * 更新能量
     * @param energy 需要增加的能量，为正数时是增加，为负数时是减少
     * @returns 当前能量，不可能小于0也不会超过上限
     */
    updateEnergy(energy: number): number {
        if (energy < 0) {
            energy = calcBuffEffect(this.buffs).energyCostRate * energy;
        } else {
            energy = calcBuffEffect(this.buffs).energyGainRate * energy;
        }
        if (this.energy + energy < 0) {
            throw new NotEnoughError("精力不够");
        }
        this.energy = Math.min(this.energy + energy, this.max_energy);
        return this.energy;
    }

    /**
     * 更新健康
     * @param health 需要增加的健康，为正数时是增加，为负数时是减少
     * @returns 当前健康，不可能小于0也不会超过上限
     */
    updateHealth(health: number): number {
        if (health < 0) {
            health = calcBuffEffect(this.buffs).healthCostRate * health;
        } else {
            health = calcBuffEffect(this.buffs).healthGainRate * health;
        }
        if (this.health + health < 0) {
            throw new NotEnoughError("健康度不够");
        }
        this.health = Math.min(this.health + health, this.max_health);
        return this.health;
    }

}