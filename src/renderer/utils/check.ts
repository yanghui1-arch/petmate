import { Requirement } from "@/types/common";
import { PetMateAttribute } from "@/types/petmate";

const REQUIREMENT_MAP = {
    level: "Lv.",
    sing_level: "唱歌Lv.",
    draw_level: "绘画Lv.",
    game_level: "游戏Lv.",
    affection_level: "亲密度Lv.",
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
    const { level, sing_level, draw_level, game_level, affection_level } =
        petmateAttribute.value ?? {
            level: 1,
            sing_level: 1,
            draw_level: 1,
            game_level: 1,
            affection_level: 1,
        };
    return (
        level < (requirement.level ?? 0) ||
        sing_level < (requirement.sing_level ?? 0) ||
        draw_level < (requirement.draw_level ?? 0) ||
        game_level < (requirement.game_level ?? 0) ||
        affection_level < (requirement.affection_level ?? 0)
    );
};

/**
 * 获得不满足的解锁条件
 * @param requirements 活动条件
 * @returns 不满足的条件
 */
export const getMissingRequirements = (requirement: Requirement, petmateAttribute: PetMateAttribute) => {
    const { level, sing_level, draw_level, game_level, affection_level } =
      petmateAttribute ?? {
        level: 1,
        sing_level: 1,
        draw_level: 1,
        game_level: 1,
        affection_level: 1,
      };
    const missing: string[] = [];
    if (level < (requirement.level ?? 0)) {
      missing.push(`等级 Lv.${requirement.level}`);
    }
    if (sing_level < (requirement.sing_level ?? 0)) {
      missing.push(`唱歌 Lv.${requirement.sing_level}`);
    }
    if (draw_level < (requirement.draw_level ?? 0)) {
      missing.push(`绘画 Lv.${requirement.draw_level}`);
    }
    if (game_level < (requirement.game_level ?? 0)) {
      missing.push(`游戏 Lv.${requirement.game_level}`);
    }
    if (affection_level < (requirement.affection_level ?? 0)) {
      missing.push(`亲密度 Lv.${requirement.affection_level}`);
    }
    return missing;
  };
