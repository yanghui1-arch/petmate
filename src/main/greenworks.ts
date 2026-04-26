import greenworks from "greenworks";
import logger from "./log";

const appId = 3657100;

class GreenworksManager {
    private isInitialized = false;
    private steamInfo: any = null;

    /**
     * 初始化greenworks
     * @param appId 游戏appId
     * @returns 是否初始化成功
     */
    init(): boolean {
        if (this.isInitialized) {
            return true;
        }

        try {
            const launchWithoutUsingSteam = greenworks.restartAppIfNecessary(appId);
            if (launchWithoutUsingSteam) {
                logger.error("需要开启Steam启动Petmate")
                return false;
            }

            if (greenworks.init()) {
                this.steamInfo = greenworks.getSteamId();
                this.isInitialized = true;
                return true;
            } else {
                logger.error('初始化greenworks失败');
                return false;
            }
        } catch (error) {
            logger.error('初始化greenworks失败:', error);
            return false;
        }
    }

    /**
     * Steam初始化后，可以获取Steam信息
     */
    getSteamInfo() {
        if (!this.isInitialized) {
            throw new Error('Greenworks not initialized. Call initialize() first.');
        }
        return this.steamInfo;
    }

    /**
     * 检查Steam是否初始化
     */
    isReady(): boolean {
        return this.isInitialized;
    }

    /**
     * 清除成就，仅用于测试
     * @param achievement 成就名称
     * @param successCallback 成功回调
     * @param failureCallback 失败回调
     */
    clearAchievement(achievement: string, successCallback: () => void, failureCallback: (err: string) => void) {
        return greenworks.clearAchievement(achievement, successCallback, failureCallback);
    }

    /**
     * 激活成就
     * @param achievement 成就名称
     * @param successCallback 成功回调
     * @param failureCallback 失败回调
     */
    activateAchievement(achievement: string, successCallback: () => void, failureCallback?: (err: string) => void) {
        if (!this.isInitialized) {
            console.error('Cannot activate achievement: Greenworks not initialized');
            if (failureCallback) failureCallback('Greenworks not initialized');
            return;
        }
        return greenworks.activateAchievement(achievement, successCallback, failureCallback);
    }

    /**
     * 查询成就是否已激活
     * @param achievement 成就名称
     * @param successCallback 成功回调
     * @param failureCallback 失败回调
     */
    getAchievement(achievement: string, successCallback: (isAchieved: boolean) => void, failureCallback?: (err: string) => void) {
        if (!this.isInitialized) {
            console.error('Cannot get achievement: Greenworks not initialized');
            if (failureCallback) failureCallback('Greenworks not initialized');
            return;
        }
        try {
            return greenworks.getAchievement(achievement, successCallback, failureCallback);
        } catch (error) {
            logger.error(`获取成就状态失败: ${achievement}`, error);
            if (failureCallback) failureCallback(error instanceof Error ? error.message : String(error));
        }
    }

    /**
     * 获取当前游戏在Steam中配置的成就API名称
     */
    getAchievementNames(): string[] {
        if (!this.isInitialized) {
            console.error('Cannot get achievement names: Greenworks not initialized');
            return [];
        }
        try {
            return greenworks.getAchievementNames();
        } catch (error) {
            logger.error('获取成就列表失败', error);
            return [];
        }
    }

    /**
     * 在greenworks中，成就数据被当做统计数据来处理
     * 获取统计数据
     * @param name 统计数据名称
     * @returns 统计数据值
     */
    getStatInt(name: string): number {
        if (!this.isInitialized) {
            throw new Error('Greenworks not initialized. Call initialize() first.');
        }
        return greenworks.getStatInt(name);
    }

    /**
     * 获取统计数据
     * @param name 统计数据名称
     * @returns 统计数据值
     */
    getStatFloat(name: string): number {
        if (!this.isInitialized) {
            throw new Error('Greenworks not initialized. Call initialize() first.');
        }
        return greenworks.getStatFloat(name);
    }

    /**
     * 在本地设置统计数据，不会上传到Steam
     * @param name 统计数据名称
     * @param value 统计数据值
     */
    setStat(name: string, value: number) {
        if (!this.isInitialized) {
            throw new Error('Greenworks not initialized. Call initialize() first.');
        }
        return greenworks.setStat(name, value);
    }

    /**
     * 存储统计数据，会将当前游戏的所有设置好的本地统计数据上传到Steam
     * @param successCallback 成功回调
     * @param failureCallback 失败回调
     */
    storeStats(successCallback: () => void, failureCallback?: (err: string) => void) {
        if (!this.isInitialized) {
            console.error('Cannot store stats: Greenworks not initialized');
            if (failureCallback) failureCallback('Greenworks not initialized');
            return;
        }
        return greenworks.storeStats(successCallback, failureCallback);
    }
}

export const greenworksManager: GreenworksManager = new GreenworksManager();
