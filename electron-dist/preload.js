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
    showNotification: (title, body) => {
        return ipcRenderer.invoke('show-notification', title, body);
    },
    /**
     * 显示新邮件通知
     */
    notifyNewEmail: (sender, subject) => {
        return ipcRenderer.invoke('notify-new-email', sender, subject);
    },
    /**
     * 设置未读邮件数量徽章
     */
    setBadgeCount: (count) => {
        return ipcRenderer.invoke('set-badge-count', count);
    },
    /**
     * 获取应用版本
     */
    getAppVersion: () => {
        return ipcRenderer.invoke('get-app-version');
    },
    /**
     * 获取运行平台
     */
    getPlatform: () => {
        return ipcRenderer.invoke('get-platform');
    },
    /**
     * 监听邮件同步事件
     */
    onSyncEmails: (callback) => {
        ipcRenderer.on('sync-emails', callback);
    },
    /**
     * 移除邮件同步事件监听
     */
    offSyncEmails: (callback) => {
        ipcRenderer.removeListener('sync-emails', callback);
    },
    /**
     * 窗口控制 - 最小化
     */
    windowMinimize: () => {
        return ipcRenderer.invoke('window-minimize');
    },
    /**
     * 窗口控制 - 最大化/还原
     */
    windowMaximize: () => {
        return ipcRenderer.invoke('window-maximize');
    },
    /**
     * 窗口控制 - 关闭
     */
    windowClose: () => {
        return ipcRenderer.invoke('window-close');
    },
    /**
     * 检查窗口是否最大化
     */
    windowIsMaximized: () => {
        return ipcRenderer.invoke('window-is-maximized');
    },
};
// 暴露 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
//# sourceMappingURL=preload.js.map