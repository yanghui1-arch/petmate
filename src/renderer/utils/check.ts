import { Requirement } from "@/types/common";
import { PetMateAttribute } from "@/types/petmate";

const REQUIREMENT_MAP = {
    level: "Petmate Lv.",
    singLevel: "唱歌Lv.",
    drawLevel: "绘画Lv.",
    gameLevel: "游戏Lv.",
    affectionLevel: "亲密度Lv.",
}

export const convertRequirementText = (key: string) => {
    return REQUIREMENT_MAP[key as keyof typeof REQUIREMENT_MAP]
}

/**
 * 检查是否会被禁止使用
 * @param requirement 活动条件
 * @returns 是否会被禁止使用，如果会被禁止使用，则返回true，否则返回false
 */
export const checkLocked = (requirement: Requirement, petmateAttribute: ComputedRef<PetMateAttribute> | Ref<PetMateAttribute>): boolean => {
    const { level, singLevel, drawLevel, gameLevel, affectionLevel } =
        petmateAttribute.value ?? {
            level: 1,
            singLevel: 1,
            drawLevel: 1,
            gameLevel: 1,
            affectionLevel: 1,
        };
    return (
        level < (requirement.level ?? 0) ||
        singLevel < (requirement.singLevel ?? 0) ||
        drawLevel < (requirement.drawLevel ?? 0) ||
        gameLevel < (requirement.gameLevel ?? 0) ||
        affectionLevel < (requirement.affectionLevel ?? 0)
    );
};

/**
 * 获得不满足的解锁条件
 * @param requirements 活动条件
 * @returns 不满足的条件
 */
export const getMissingRequirements = (requirement: Requirement, petmateAttribute: PetMateAttribute) => {
    const { level, singLevel, drawLevel, gameLevel, affectionLevel } =
      petmateAttribute ?? {
        level: 1,
        singLevel: 1,
        drawLevel: 1,
        gameLevel: 1,
        affectionLevel: 1,
      };
    const missing: string[] = [];
    if (level < (requirement.level ?? 0)) {
      missing.push(`等级 Lv.${requirement.level}`);
    }
    if (singLevel < (requirement.singLevel ?? 0)) {
      missing.push(`唱歌 Lv.${requirement.singLevel}`);
    }
    if (drawLevel < (requirement.drawLevel ?? 0)) {
      missing.push(`绘画 Lv.${requirement.drawLevel}`);
    }
    if (gameLevel < (requirement.gameLevel ?? 0)) {
      missing.push(`游戏 Lv.${requirement.gameLevel}`);
    }
    if (affectionLevel < (requirement.affectionLevel ?? 0)) {
      missing.push(`亲密度 Lv.${requirement.affectionLevel}`);
    }
    return missing;
  };
