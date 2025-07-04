const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("versions", {
    // 项目版本
    __versions__: "v0.5.0"
})