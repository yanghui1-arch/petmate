/**
 * Petmate 相关的操作
 */

import { ExceedError, NotEnoughError, NotFoundError } from "../../error";
import { ActiveBuff, Buff } from "../../types/buff";
import { PetMateAttribute, PetMateStatus } from "../../types/petmate";
import { calcNextExp, calcMaxAttribute, calcBuffEffect } from "../utils/calc";
import { v4 as uuidv4 } from 'uuid';
import { Wish } from "../../types/wish";

export abstract class PetMate {
    id: number;
    name: string;
    attrs: PetMateAttribute;
    status: PetMateStatus;
    wishes: Wish[];
    completedWishesNum: number;

    constructor(id:number, name:string, attrs: PetMateAttribute, status: PetMateStatus, wishes: Wish[], completedWishesNum: number) {
        this.id = id;
        this.name = name;
        this.attrs = attrs;
        this.status = status;
        this.wishes = wishes;
        this.completedWishesNum = completedWishesNum;
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
     * 增加一个Buff
     * @param buff 需要增加的Buff
     * @returns 增加的Buff，如果Buff数量超过上限则返回undefined
     */
    addBuff(buff: Buff): ActiveBuff | undefined {
        if (this.attrs.buffs.length < this.attrs.max_buffs) {
            const activeBuff: ActiveBuff = {
                id: uuidv4(),
                buff: buff,
                endTime: new Date(new Date().getTime() + buff.duration * 1000)
            }
            // 为Buff设置一个定时器
            setTimeout(() => {
                this.removeBuff(activeBuff.id);
            }, buff.duration * 1000);
            this.attrs.buffs.push(activeBuff);
            return activeBuff;   
        }
        return undefined;
    }

    /**
     * 增加多个Buff
     * @param buffs 需要增加的Buff列表
     * @returns 现在petmate的活跃Buff列表，如果Buff数量超过上限则返回undefined
     */
    addBuffs(buffs: Buff[]): ActiveBuff[] | undefined {
        if (this.attrs.buffs.length + buffs.length <= this.attrs.max_buffs) {
            const nowDate: Date = new Date();

            const activeBuffs: ActiveBuff[] = buffs.map(buff => {
                const endTime: Date = new Date(nowDate.getTime() + buff.duration * 1000);
                const id = uuidv4();
                // 为每个Buff设置一个定时器
                setTimeout(() => {
                    this.removeBuff(id);
                }, buff.duration * 1000);
                return {
                    id: id,
                    buff: buff,
                    endTime: endTime
                }
            });
            
            this.attrs.buffs.push(...activeBuffs);
            return this.attrs.buffs;
        }
        return undefined;
    }

    /**
     * 添加一个愿望
     * @param wish 需要添加的愿望
     * @returns 添加的愿望
     */
    addWish(wish: Wish): Wish {
        if (this.wishes.length > 10) {
            throw new ExceedError(`愿望数量超过${this.wishes.length}个`);
        }
        this.wishes.push(wish);
        return wish;
    }

    /**
     * 移除愿望
     * @param wishID 需要移除的愿望的id
     * @returns 移除的愿望
     */
    removeWish(wishID: string): Wish {
        const wish: Wish | undefined = this.wishes.find(w => w.id === wishID);
        if (!wish) {
            throw new NotFoundError(`移除愿望时出错，要移除的愿望ID为${wishID}，该愿望不存在`);
        }
        this.wishes = this.wishes.filter(w => w.id !== wishID);
        return wish;
    }

    /**
     * 移除Buff
     * @param activeBuffID 需要移除的还在的活跃Buff的id，不是Buff type的id
     * @returns 移除的Buff
     */
    removeBuff(activeBuffID: string): ActiveBuff {
        const activeBuff: ActiveBuff | undefined = this.attrs.buffs.find(b => b.id === activeBuffID);
        if (!activeBuff) {
            throw new NotFoundError(`移除Buff时出错，要移除的BuffID为${activeBuffID}，该Buff不存在`);
        }
        this.attrs.buffs = this.attrs.buffs.filter(b => b.id !== activeBuffID);
        return activeBuff;
    }

    /**
     * 设置状态
     * @param status 需要设置的状态
     * @returns 设置后的状态
     */
    setStatus(status: PetMateStatus): PetMateStatus {
        this.status = status;
        return this.status;
    }

    /**
     * 获取状态
     * @returns 当前状态
     */
    getStatus(): PetMateStatus {
        return this.status;
    }

    /**
     * 显示Buff
     * @returns 当前可用的Buff列表
     */
    getActiveBuffs(): ActiveBuff[] {
        return this.attrs.buffs;
    }

    /**
     * 获得完成此Petmate的愿望数量
     * @returns 完成此Petmate的愿望数量
     */
    getCompletedWishesNum(): number {
        return this.completedWishesNum;
    }
}