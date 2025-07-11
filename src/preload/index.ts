const { contextBridge, ipcRenderer } = require("electron")
import { SettingConfig } from "../main/settings"
import { ActivityInfo } from "../main/types/activity"
import { ItemType } from "../main/types/item"

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    "api", {
        loadPlayerData: () => ipcRenderer.invoke("load-player-data"),
        consumeItem: (itemId: number, count: number, petmateId: number) => ipcRenderer.invoke("consume-item", itemId, count, petmateId),
        buyItem: (itemId: number, count: number) => ipcRenderer.invoke("buy-item", itemId, count),
        showActivities: (type: ActivityInfo["type"]) => ipcRenderer.invoke("show-activities", type),
        showItems: (type: ItemType) => ipcRenderer.invoke("show-items", type),
        getPetmateCompletedWishesNum: (petmateId: number) => ipcRenderer.invoke("get-petmate-completed-wishes-num", petmateId),
        getPetmateOneWish: (petmateId: number, wishId: string) => ipcRenderer.invoke("get-petmate-one-wish", petmateId, wishId),
        getModelSize: () => ipcRenderer.invoke("get-model-size"),
        getSettings: () => ipcRenderer.invoke("get-settings"),
        updateSettings: (settings: Partial<SettingConfig>) => ipcRenderer.invoke("update-settings", settings),
    }
)