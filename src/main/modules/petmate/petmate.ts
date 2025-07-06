/**
 * Petmate 相关的操作
 */

import { NotEnoughError, NotFoundError } from "../../error";
import { ActiveBuff, Buff } from "../../types/buff";
import { PetMateAttribute } from "../../types/petmate";
import { calcNextExp, calcMaxAttribute, calcBuffEffect } from "../utils/calc";

export abstract class PetMate {
    id: number;
    name: string;
    attrs: PetMateAttribute;

    constructor(id:number, name:string, attrs: PetMateAttribute) {
        this.id = id;
        this.name = name;
        this.attrs = attrs;
    }

    /**
     * 加经验
     * 这个函数会自动计算buff效果
     * @param exp 需要增加的经验值
     * @returns 增加完经验后的等级
     */
    addExp(exp: number): number {
        exp = calcBuffEffect(this.attrs.buffs).expGainRate * exp;
        this.attrs.exp += exp;
        // 升级，但可能不只是生一级
        while (this.attrs.exp >= this.attrs.next_exp) {
            this.attrs.level ++;
            this.attrs.exp = this.attrs.exp - this.attrs.next_exp;
            this.attrs.next_exp = calcNextExp(this.attrs.level);
        }
        // 每次都要重新计算一下当前level对应的属性值上限
        const maxAttributeFromLevel = calcMaxAttribute(this.attrs.level);
        this.attrs.max_hungry = maxAttributeFromLevel;
        this.attrs.max_emotion = maxAttributeFromLevel;
        this.attrs.max_energy = maxAttributeFromLevel;
        this.attrs.max_health = maxAttributeFromLevel;
        return this.attrs.level 
    }

    /**
     * 加游戏经验
     * 这个函数会自动计算buff效果
     * @param exp 需要增加的游戏经验值
     * @returns 增加完游戏经验后的等级
     */
    addGameExp(exp: number): number {
        exp = calcBuffEffect(this.attrs.buffs).gameExpGainRate * exp;
        this.attrs.game_exp += exp;
        while (this.attrs.game_exp >= this.attrs.game_next_exp) {
            this.attrs.game_level ++;
            this.attrs.game_exp = this.attrs.game_exp - this.attrs.game_next_exp;
            this.attrs.game_next_exp = calcNextExp(this.attrs.game_level);
        }
        return this.attrs.game_level
    }

    /**
     * 加唱歌经验
     * 这个函数会自动计算buff效果
     * @param exp 需要增加的唱歌经验值
     * @returns 增加完唱歌经验后的等级
     */
    addSingExp(exp: number): number {
        exp = calcBuffEffect(this.attrs.buffs).singExpGainRate * exp;
        this.attrs.sing_exp += exp;
        while (this.attrs.sing_exp >= this.attrs.sing_next_exp) {
            this.attrs.sing_level ++;
            this.attrs.sing_exp = this.attrs.sing_exp - this.attrs.sing_next_exp;
            this.attrs.sing_next_exp = calcNextExp(this.attrs.sing_level);
        }
        return this.attrs.sing_level
    }

    /**
     * 加画画经验
     * 这个函数会自动计算buff效果
     * @param exp 需要增加的画画经验值
     * @returns 增加完画画经验后的等级
     */
    addDrawExp(exp: number): number {
        exp = calcBuffEffect(this.attrs.buffs).drawExpGainRate * exp;
        this.attrs.draw_exp += exp;
        while (this.attrs.draw_exp >= this.attrs.draw_next_exp) {
            this.attrs.draw_level ++;
            this.attrs.draw_exp = this.attrs.draw_exp - this.attrs.draw_next_exp;
            this.attrs.draw_next_exp = calcNextExp(this.attrs.draw_level);
        }
        return this.attrs.draw_level
    }

    /**
     * 加好感度经验
     * 这个函数会自动计算buff效果
     * @param exp 需要增加的好感度经验值
     * @returns 增加完好感度经验后的等级
     */
    addAffectionExp(exp: number): number {
        exp = calcBuffEffect(this.attrs.buffs).affectionExpGainRate * exp;
        this.attrs.affection_exp += exp;
        while (this.attrs.affection_exp >= this.attrs.affection_next_exp) {
            this.attrs.affection_level ++;
            this.attrs.affection_exp = this.attrs.affection_exp - this.attrs.affection_next_exp;
            this.attrs.affection_next_exp = calcNextExp(this.attrs.affection_level);
        }
        return this.attrs.affection_level
    }

    /**
     * 更新饱食度
     * 这个函数会自动计算buff效果
     * @param hungry 需要增加的饱食度，为正数时是增加，为负数时是减少
     * @returns 当前饱食度，不可能小于0也不会超过上限
     */
    updateHungry(hungry: number): number {
        if (hungry < 0) {
            hungry = calcBuffEffect(this.attrs.buffs).hungryCostRate * hungry;
        } else {
            hungry = calcBuffEffect(this.attrs.buffs).hungryGainRate * hungry;
        }
        if (this.attrs.hungry + hungry < 0) {
            throw new NotEnoughError("饱食度不足");
        }
        this.attrs.hungry = Math.min(this.attrs.hungry + hungry, this.attrs.max_hungry);
        return this.attrs.hungry;
    }

    /**
     * 更新情绪
     * 这个函数会自动计算buff效果
     * @param emotion 需要增加的情绪，为正数时是增加，为负数时是减少
     * @returns 当前情绪，不可能小于0也不会超过上限
     */
    updateEmotion(emotion: number): number {
        if (emotion < 0) {
            emotion = calcBuffEffect(this.attrs.buffs).emotionCostRate * emotion;
        } else {
            emotion = calcBuffEffect(this.attrs.buffs).emotionGainRate * emotion;
        }
        if (this.attrs.emotion + emotion < 0) {
            throw new NotEnoughError("心情不够");
        }
        this.attrs.emotion = Math.min(this.attrs.emotion + emotion, this.attrs.max_emotion);
        return this.attrs.emotion;
    }

    /**
     * 更新能量
     * 这个函数会自动计算buff效果
     * @param energy 需要增加的能量，为正数时是增加，为负数时是减少
     * @throws 如果能量不足则抛出NotEnoughError
     * @returns 当前能量，不可能小于0也不会超过上限
     */
    updateEnergy(energy: number): number {
        if (energy < 0) {
            energy = calcBuffEffect(this.attrs.buffs).energyCostRate * energy;
        } else {
            energy = calcBuffEffect(this.attrs.buffs).energyGainRate * energy;
        }
        if (this.attrs.energy + energy < 0) {
            throw new NotEnoughError("精力不够");
        }
        this.attrs.energy = Math.min(this.attrs.energy + energy, this.attrs.max_energy);
        return this.attrs.energy;
    }

    /**
     * 更新健康
     * 这个函数会自动计算buff效果
     * @param health 需要增加的健康，为正数时是增加，为负数时是减少
     * @returns 当前健康，不可能小于0也不会超过上限
     */
    updateHealth(health: number): number {
        if (health < 0) {
            health = calcBuffEffect(this.attrs.buffs).healthCostRate * health;
        } else {
            health = calcBuffEffect(this.attrs.buffs).healthGainRate * health;
        }
        if (this.attrs.health + health < 0) {
            throw new NotEnoughError("健康度不够");
        }
        this.attrs.health = Math.min(this.attrs.health + health, this.attrs.max_health);
        return this.attrs.health;
    }

    /**
     * 增加Buff
     * @param buff 需要增加的Buff
     * @returns 增加的Buff
     */
    addBuff(buff: Buff): ActiveBuff {
        const activeBuff: ActiveBuff = {
            buff: buff,
            endTime: new Date(new Date().getTime() + buff.duration * 1000)
        }
        this.attrs.buffs.push(activeBuff);
        return activeBuff;
    }

    /**
     * 移除Buff
     * @param buff 需要移除的Buff
     * @returns 移除的Buff
     */
    removeBuff(buffID: number): ActiveBuff {
        const activeBuff: ActiveBuff | undefined = this.attrs.buffs.find(b => b.buff.id === buffID);
        if (!activeBuff) {
            throw new NotFoundError(`移除Buff时出错，要移除的BuffID为${buffID}，该Buff不存在`);
        }
        this.attrs.buffs = this.attrs.buffs.filter(b => b.buff.id !== buffID);
        return activeBuff;
    }

    /**
     * 显示Buff
     * @returns 当前可用的Buff列表
     */
    showBuffs(): ActiveBuff[] {
        return this.attrs.buffs.filter(b => b.endTime > new Date());
    }
}