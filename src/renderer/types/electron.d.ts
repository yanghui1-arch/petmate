interface PlayerInfo {
    steam_id?: string | null;
    name: string;
    qq?: string | null;
    petmates: number[];
}

interface Window {
    versions: {
        __versions__: string;
    };
    electronStore: {
        savePlayerInfo: (playerInfo: PlayerInfo) => Promise<{ success: boolean; error?: string }>;
        loadPlayerInfo: () => Promise<{ success: boolean; data?: PlayerInfo; error?: string }>;
    };
}