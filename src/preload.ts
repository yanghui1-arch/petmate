const { contextBridge, ipcRenderer } = require("electron")

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    "api", {
        // 发送方法
        send: (channel: string, data: any) => {
            // whitelist channels
            let validChannels = ["toMain"];
            if (validChannels.includes(channel)) {
                ipcRenderer.send(channel, data);
            }
        },
        // 接收方法
        receive: (channel: string, func: Function) => {
            // 示例
            
        },
        // 和正常http请求类似，有返回值的
        invoke: (channel: string, data: any) => {
            // 示例
            let validChannels = ["load-data"];
            if (validChannels.includes(channel)) {
                return ipcRenderer.invoke(channel, data);
            }
        },
        // static value
        // 游戏版本
        version: "v0.5.0"
    }
)