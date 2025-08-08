import { Requirement } from "@/types/common";
import { PetMateAttribute } from "@/types/petmate";

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
