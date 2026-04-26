declare module 'greenworks' {
    interface SteamID {
        steamId: string;
        accountId: string;
        screenName: string;
    }

    const greenworks: {
        init: () => boolean;
        getSteamId: () => SteamID;
        restartAppIfNecessary: (appId: number) => boolean;
        activateAchievement: (achievement: string, successCallback: () => void, failureCallback?: (err) => void) => void;
        clearAchievement: (achievement: string, successCallback: () => void, failureCallback: (err) => void) => void;
        getAchievement: (achievement: string, successCallback: (isAchieved: boolean) => void, failureCallback?: (err) => void) => void;
        getAchievementNames: () => string[];
        isSteamRunning: () => boolean;
        getStatInt: (name: string) => number;
        getStatFloat: (name: string) => number;
        setStat(name: string, value: number): () => void;
        storeStats: (successCallback: () => void, failureCallback?: (err) => void) => void;
        // 可以继续补你用到的函数
    };

    export = greenworks;
}
