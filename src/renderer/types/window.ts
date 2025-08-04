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