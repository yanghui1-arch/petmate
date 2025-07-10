const { contextBridge, ipcRenderer } = require("electron")

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    "api", {
        loadPlayerData: () => ipcRenderer.invoke("load-player-data"),
        consumeItem: (itemId: number, count: number, petmateId: number) => ipcRenderer.invoke("consume-item", itemId, count, petmateId),
        buyItem: (itemId: number, count: number) => ipcRenderer.invoke("buy-item", itemId, count)
    }
)