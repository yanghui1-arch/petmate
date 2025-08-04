import greenworks from "greenworks";

class GreenworksManager {
    private static instance: GreenworksManager;
    private isInitialized = false;
    private appId: number | null = null;
    private steamInfo: any = null;

    private constructor() { }

    static getInstance(): GreenworksManager {
        if (!GreenworksManager.instance) {
            GreenworksManager.instance = new GreenworksManager();
        }
        return GreenworksManager.instance;
    }

    /**
     * 初始化greenworks
     * @param appId 游戏appId
     * @returns 是否初始化成功
     */
    async initialize(appId: number): Promise<boolean> {
        if (this.isInitialized) {
            return true;
        }

        this.appId = appId;

        try {
            // 根据appId判断是否需要重启
            // restartAppIfNecessary 方法将查看游戏可执行文件是否通过 Steam 启动
            const hasLaunchInSteam = greenworks.restartAppIfNecessary(appId);
            // 如果游戏可执行文件已经通过 Steam 启动，则在外部关闭应用
            if (hasLaunchInSteam) {
                console.log("relaunch");
                return false;
            }

            // 如果游戏没有通过 Steam 启动，则初始化 Steam
            if (greenworks.init()) {
                this.steamInfo = greenworks.getSteamId();
                this.isInitialized = true;
                return true;
            } else {
                console.error('Failed to initialize Steam');
                return false;
            }
        } catch (error) {
            console.error('Error initializing greenworks:', error);
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
     * 获取原始的greenworks实例
     */
    getGreenworks() {
        if (!this.isInitialized) {
            throw new Error('Greenworks not initialized. Call initialize() first.');
        }
        return greenworks;
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

// 导出单例实例
export const greenworksManager = GreenworksManager.getInstance();
