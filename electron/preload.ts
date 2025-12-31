/**
 * Electron 预加载脚本
 * 在渲染进程中暴露安全的 API
 * Requirements: 12.1, 12.2, 12.6
 */

import { contextBridge, ipcRenderer } from 'electron';

/**
 * 暴露给渲染进程的 API
 */
const electronAPI = {
  /**
   * 显示桌面通知
   */
  showNotification: (title: string, body: string): Promise<void> => {
    return ipcRenderer.invoke('show-notification', title, body);
  },

  /**
   * 显示新邮件通知
   */
  notifyNewEmail: (sender: string, subject: string): Promise<void> => {
    return ipcRenderer.invoke('notify-new-email', sender, subject);
  },

  /**
   * 设置未读邮件数量徽章
   */
  setBadgeCount: (count: number): Promise<void> => {
    return ipcRenderer.invoke('set-badge-count', count);
  },

  /**
   * 获取应用版本
   */
  getAppVersion: (): Promise<string> => {
    return ipcRenderer.invoke('get-app-version');
  },

  /**
   * 获取运行平台
   */
  getPlatform: (): Promise<string> => {
    return ipcRenderer.invoke('get-platform');
  },

  /**
   * 监听邮件同步事件
   */
  onSyncEmails: (callback: () => void): void => {
    ipcRenderer.on('sync-emails', callback);
  },

  /**
   * 移除邮件同步事件监听
   */
  offSyncEmails: (callback: () => void): void => {
    ipcRenderer.removeListener('sync-emails', callback);
  },

  /**
   * 窗口控制 - 最小化
   */
  windowMinimize: (): Promise<void> => {
    return ipcRenderer.invoke('window-minimize');
  },

  /**
   * 窗口控制 - 最大化/还原
   */
  windowMaximize: (): Promise<void> => {
    return ipcRenderer.invoke('window-maximize');
  },

  /**
   * 窗口控制 - 关闭
   */
  windowClose: (): Promise<void> => {
    return ipcRenderer.invoke('window-close');
  },

  /**
   * 检查窗口是否最大化
   */
  windowIsMaximized: (): Promise<boolean> => {
    return ipcRenderer.invoke('window-is-maximized');
  },
};

// 暴露 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// TypeScript 类型声明
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}

export type ElectronAPI = typeof electronAPI;
