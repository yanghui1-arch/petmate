/**
 * 暴露ipc事件
 */

import { ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { playerManager } from './modules/store';
import { PlayerInfo } from './types/player';
import { Response } from '../types/response';


// 初始化
ipcMain.handle("load-data", (event: IpcMainInvokeEvent, petmateId: number): Response<PlayerInfo> => {
    try {
        const playerInfo:PlayerInfo = playerManager.getPlayer();
        return {
            code: 200,
            data: playerInfo
        } as Response<PlayerInfo>;   
    } catch (error) {
        return {
            code: 400,
            message: "加载数据失败"
        } as Response<PlayerInfo>;
    }
})