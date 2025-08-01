import { openWindows, Result } from 'get-windows';
import { EventEmitter } from 'events';
import logger from './log';

/**
 * 窗口的信息
 */
export interface WindowInfo {
  id: number;
  title: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  owner: {
    name: string;
    processId: number;
    path: string;
  };
  platform: string;
}

/**
 * 窗口的事件
 */
export interface WindowEvent {
  type: 'opened' | 'closed' | 'changed';
  window: WindowInfo;
  timestamp: number;
  // 对于changed事件，提供变化前的信息
  previousWindow?: WindowInfo;
}

class WindowMonitor extends EventEmitter {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private currentWindows = new Map<number, WindowInfo>();
  private monitorInterval = 1000; // 1秒检查一次

  constructor() {
    super();
  }

  /**
   * 开始监控窗口变化
   * @param interval 监控间隔，单位：毫秒
   */
  async start(interval: number = 1000): Promise<void> {
    if (this.isRunning) {
      logger.warn('窗口监控已在运行中');
      return;
    }

    this.monitorInterval = interval;
    this.isRunning = true;
    
    // 初始化当前窗口列表
    await this.updateCurrentWindows();
    
    // 启动定时检查
    this.intervalId = setInterval(() => {
      this.checkWindowChanges();
    }, this.monitorInterval);

    logger.info(`窗口监控已启动，检查间隔: ${interval}ms`);
  }

  /**
   * 停止监控窗口变化
   * 会将定时任务移除
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('窗口监控未在运行');
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info('窗口监控已停止');
  }

  /**
   * 获取当前是否正在运行
   */
  isMonitoring(): boolean {
    return this.isRunning;
  }

  /**
   * 获取监控间隔
   */
  getInterval(): number {
    return this.monitorInterval;
  }

  /**
   * 获取当前所有打开的窗口
   */
  getCurrentWindows(): WindowInfo[] {
    return Array.from(this.currentWindows.values());
  }

  /**
   * 设置监控间隔
   * 如果正在运行，会先停止，把窗口检测相关的定时器移除，然后以这个新的间隔重新启动窗口检测
   * @param interval 监控间隔，单位：毫秒
   */
  setInterval(interval: number): void {
    this.monitorInterval = interval;
    
    if (this.isRunning) {
      this.stop();
      this.start(interval);
    }
  }  


  /**
   * 更新当前窗口列表
   */
  private async updateCurrentWindows(): Promise<void> {
    try {
      const windows = await openWindows();
      this.currentWindows.clear();
      
      windows.forEach(window => {
        const windowInfo = this.convertToWindowInfo(window);
        this.currentWindows.set(window.id, windowInfo);
      });
      
      logger.info(`当前打开窗口数量: ${this.currentWindows.size}`);
    } catch (error) {
      logger.error('获取窗口列表失败:', error);
    }
  }

  /**
   * 检查窗口变化
   * 如果已经是打开的窗口，就会去检查窗口的位置和大小是否发生变化，如果是新打开的全新窗口，就把他加到现在的窗口列表中，如果已经关闭了，就从窗口列表中删除
   */
  private async checkWindowChanges(): Promise<void> {
    try {
      const newWindows = await openWindows();
      const newWindowsMap = new Map<number, Result>();
      
      newWindows.forEach(window => {
        newWindowsMap.set(window.id, window);
      });

      // 检查新打开的窗口
      for (const [id, window] of newWindowsMap) {
        // 不存在，则认为是新开的窗口
        if (!this.currentWindows.has(id)) {
          const windowInfo = this.convertToWindowInfo(window);
          this.currentWindows.set(id, windowInfo);
          
          const event: WindowEvent = {
            type: 'opened',
            window: windowInfo,
            timestamp: Date.now()
          };
          
          this.emit('window-opened', event);
        } else {
          // 检查已存在窗口的属性变化
          const currentWindowInfo: WindowInfo = this.currentWindows.get(id)!;
          const newWindowInfo = this.convertToWindowInfo(window);
          
          if (this.hasWindowChanged(currentWindowInfo, newWindowInfo)) {
            const previousWindow = { ...currentWindowInfo };
            this.currentWindows.set(id, newWindowInfo);
            
            const event: WindowEvent = {
              type: 'changed',
              window: newWindowInfo,
              previousWindow: previousWindow,
              timestamp: Date.now()
            };
            
            this.emit('window-changed', event);
          }
        }
      }

      // 检查关闭的窗口
      for (const [id, windowInfo] of this.currentWindows) {
        if (!newWindowsMap.has(id)) {
          this.currentWindows.delete(id);
          
          const event: WindowEvent = {
            type: 'closed',
            window: windowInfo,
            timestamp: Date.now()
          };
          
          this.emit('window-closed', event);
        }
      }
    } catch (error) {
      logger.error('检查窗口变化失败:', error);
    }
  }

  /**
   * 检查窗口信息是否发生变化
   * 主要以软件的名字和窗口的位置和大小来判断
   * @param oldWindow 变化前的窗口信息
   * @param newWindow 变化后的窗口信息
   * @returns 是否发生变化, true 表示发生变化，false 表示没有发生变化
   */
  private hasWindowChanged(oldWindow: WindowInfo, newWindow: WindowInfo): boolean {
    // 检查标题变化
    if (oldWindow.title !== newWindow.title) {
      return true;
    }
    
    // 检查位置和大小变化
    const oldBounds = oldWindow.bounds;
    const newBounds = newWindow.bounds;
    
    if (oldBounds.x !== newBounds.x || 
        oldBounds.y !== newBounds.y ||
        oldBounds.width !== newBounds.width ||
        oldBounds.height !== newBounds.height) {
      return true;
    }
    
    return false;
  }

  /**
   * 转换窗口信息格式
   * @param window 窗口信息
   * @returns 转换后的窗口信息
   */
  private convertToWindowInfo(window: Result): WindowInfo {
    return {
      id: window.id,
      title: window.title,
      bounds: {
        x: window.bounds.x,
        y: window.bounds.y,
        width: window.bounds.width,
        height: window.bounds.height
      },
      owner: {
        name: window.owner.name,
        processId: window.owner.processId,
        path: window.owner.path
      },
      platform: window.platform
    };
  }

}

export const windowMonitor = new WindowMonitor();

export { WindowMonitor };