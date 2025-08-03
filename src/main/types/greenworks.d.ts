declare module 'greenworks' {
    interface SteamID {
        steamId: string;
        accountId: string;
        screenName: string;
    }

    const greenworks: {
        init: () => boolean;
        getSteamId: () => SteamID;
        activateAchievement: (achievementId: string, successCallback: () => void, failureCallback: (err) => void) => boolean;
        clearAchievement: (achievementId: string) => boolean;
        isSteamRunning: () => boolean;
        restartAppIfNecessary: (appId: number) => boolean;
        // 可以继续补你用到的函数
    };

    export = greenworks;
}
