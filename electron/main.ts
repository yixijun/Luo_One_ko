/**
 * Electron 主进程入口
 * Requirements: 12.1, 12.2, 12.3
 */

import { app, BrowserWindow, Tray, Menu, nativeImage, Notification, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module 中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 主窗口和托盘引用
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// 应用退出标志
let isQuitting = false;

// 是否为开发环境
const isDev = process.env.NODE_ENV === 'development';

// 内置服务器端口
const SERVER_PORT = 3000;

/**
 * 创建主窗口
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: '洛一 (Luo One)',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false, // 等待 ready-to-show 事件再显示
  });

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // 加载应用
  if (isDev) {
    // 开发环境：加载 Vite 开发服务器
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // 生产环境：加载内置服务器
    mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);
  }

  // 窗口关闭时隐藏到托盘而不是退出
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}


/**
 * 创建系统托盘
 * Requirement: 12.6
 */
function createTray(): void {
  // 创建托盘图标
  const iconPath = path.join(__dirname, '../public/icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('洛一 (Luo One)');

  // 托盘菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    {
      label: '检查新邮件',
      click: () => {
        mainWindow?.webContents.send('sync-emails');
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // 点击托盘图标显示窗口
  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });
}

/**
 * 显示桌面通知
 * Requirement: 12.6
 */
function showNotification(title: string, body: string): void {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title,
      body,
      icon: path.join(__dirname, '../public/icon.png'),
    });
    
    notification.on('click', () => {
      mainWindow?.show();
      mainWindow?.focus();
    });
    
    notification.show();
  }
}


/**
 * 启动内置 Express 服务器（生产环境）
 * Requirement: 12.3
 */
async function startEmbeddedServer(): Promise<void> {
  if (isDev) return;

  // 动态导入服务器模块
  // @ts-ignore - 模块在构建后存在
  const { startServer } = await import('../dist-server/electron-server.js');
  startServer(SERVER_PORT);
}

/**
 * 应用初始化
 */
async function initialize(): Promise<void> {
  // 启动内置服务器
  await startEmbeddedServer();
  
  // 创建窗口
  createWindow();
  
  // 创建托盘
  createTray();
}

// 应用准备就绪
app.whenReady().then(initialize);

// macOS: 点击 dock 图标时重新创建窗口
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow?.show();
  }
});

// 所有窗口关闭时的处理
app.on('window-all-closed', () => {
  // macOS 上保持应用运行
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出前清理
app.on('before-quit', () => {
  isQuitting = true;
});

// IPC 通信处理
ipcMain.handle('show-notification', (_event, title: string, body: string) => {
  showNotification(title, body);
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});

/**
 * 设置托盘图标上的未读数量徽章
 */
ipcMain.handle('set-badge-count', (_event, count: number) => {
  if (process.platform === 'darwin') {
    app.dock.setBadge(count > 0 ? String(count) : '');
  }
  // Windows 托盘提示更新
  if (tray) {
    tray.setToolTip(count > 0 ? `洛一 (Luo One) - ${count} 封未读邮件` : '洛一 (Luo One)');
  }
});

/**
 * 显示新邮件通知
 */
ipcMain.handle('notify-new-email', (_event, sender: string, subject: string) => {
  showNotification(`新邮件来自 ${sender}`, subject);
});

/**
 * 窗口控制
 */
ipcMain.handle('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window-close', () => {
  mainWindow?.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow?.isMaximized() ?? false;
});

export { createWindow, createTray, showNotification };
