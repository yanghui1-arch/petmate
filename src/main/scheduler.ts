import { playerManager } from "./modules/store";
import { wishHandler } from "./modules/wish";
import logger from "./log";
import { NotFoundError } from "./error";
import { WISH_GENERATE_INTERVAL } from "./constant";
import { PetMate } from "./modules/petmate/petmate";
import { Wish } from "./types/wish";


// 生成愿望的定时器
let wishGenerationInterval: NodeJS.Timeout | null = null;

/**
 * 为选中的petmate生成愿望
 * @returns 是否生成成功
 * @throws 未找到petmate时抛出NotFoundError
 */
export function generateWishForSelectedPetmate(selectedPetmateId: number): boolean {
    try {
        const player = playerManager.getPlayer();
        const selectedPetmate:PetMate | undefined = player.petmates.find(petmate => petmate.id === selectedPetmateId);
        
        if (!selectedPetmate) {
            throw new NotFoundError(`未找到ID为 ${selectedPetmateId} 的petmate`);
        }

        // 检查是否已经达到最大愿望数量
        const currentWishCount = selectedPetmate.wishes.filter(wish => wish.status === "doing").length;
        if (currentWishCount >= 10) {
            logger.warn(`[scheduler] Petmate ${selectedPetmate.name} 的愿望数量已达到最大值`);
            return false;
        }

        // 生成新愿望
        if (Math.random() >= 0.5) {
            logger.info(`[scheduler] 该次${selectedPetmate.name}没有愿望`);
            return false;
        }
        const newWish:Wish = wishHandler.generateWish();
        selectedPetmate.addWish(newWish);
        
        // 更新到存储
        playerManager.updatePetmate(selectedPetmate);
        logger.info(`[scheduler] 为 ${selectedPetmate.name} 生成了新愿望: ${newWish.name}`);
        return true;
    } catch (error) {
        logger.error(`[scheduler] 生成愿望失败: ${error}`);
        return false;
    }
}

/**
 * 启动愿望生成定时任务
 */
export function startWishGeneration(selectedPetmateId: number): void {
    logger.info(`[scheduler] 启动愿望生成定时任务，间隔: ${WISH_GENERATE_INTERVAL / 1000 / 60 / 60} 小时`);

    wishGenerationInterval = setInterval(() => {
        generateWishForSelectedPetmate(selectedPetmateId);
    }, WISH_GENERATE_INTERVAL);
}

/**
 * 停止愿望生成定时任务
 */
export function stopWishGeneration(): void {
    if (wishGenerationInterval) {
        clearInterval(wishGenerationInterval);
        wishGenerationInterval = null;
        logger.info(`[scheduler] 愿望生成定时任务已停止`);
    }
}

/**
 * 手动触发愿望生成（用于测试）
 */
export function triggerWishGeneration(selectedPetmateId: number): boolean {
    logger.info(`[scheduler] 手动触发愿望生成`);
    return generateWishForSelectedPetmate(selectedPetmateId);
}


/**
 * 销毁调度器
 */
export function destroyScheduler(): void {
    stopWishGeneration();
    logger.info(`[scheduler] 任务调度器已销毁`);
}