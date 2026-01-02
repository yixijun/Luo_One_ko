/**
 * Electron 主进程入口
 * Requirements: 12.1, 12.2, 12.3
 */

import { app, BrowserWindow, Tray, Menu, nativeImage, Notification, ipcMain, session } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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

// 前端地址（从配置文件读取）
function getFrontendUrl(): string {
  // 尝试多个可能的配置文件路径
  const possiblePaths = [
    path.join(__dirname, 'config.json'),           // electron-dist/config.json (开发)
    path.join(__dirname, '../electron/config.json'), // electron/config.json (打包后)
    path.join(app.getPath('userData'), 'config.json'), // 用户数据目录
  ];
  
  for (const configPath of possiblePaths) {
    try {
      if (fs.existsSync(configPath)) {
        console.log(`[Config] Found config at: ${configPath}`);
        const data = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(data);
        if (config.frontendUrl) {
          return config.frontendUrl;
        }
      }
    } catch (e) {
      console.error(`[Config] Failed to read config from ${configPath}:`, e);
    }
  }
  
  console.log('[Config] No config found, using default');
  // 默认使用本地服务器
  return 'http://localhost:3000';
}

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
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1a1a2e',
      symbolColor: '#ffffff',
      height: 36,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // 临时禁用以调试跨域问题
    },
    show: false,
  });

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // 加载应用
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // 生产环境：加载配置的前端地址
    const frontendUrl = getFrontendUrl();
    console.log(`[Electron] Loading: ${frontendUrl}`);
    
    // 设置 User-Agent 为普通浏览器
    mainWindow.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // 修改请求头，移除 Electron 相关标识
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
      // 移除可能暴露 Electron 的头
      delete details.requestHeaders['Electron'];
      delete details.requestHeaders['electron'];
      
      // 确保 Origin 和 Referer 正确设置
      const url = new URL(frontendUrl);
      if (!details.requestHeaders['Origin']) {
        details.requestHeaders['Origin'] = url.origin;
      }
      if (!details.requestHeaders['Referer']) {
        details.requestHeaders['Referer'] = frontendUrl;
      }
      
      callback({ requestHeaders: details.requestHeaders });
    });
    
    mainWindow.loadURL(frontendUrl);
    
    // 添加 F12 快捷键打开 DevTools（用于调试）
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12') {
        mainWindow?.webContents.toggleDevTools();
        event.preventDefault();
      }
    });
  }

  // 加载失败处理
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Electron] Failed to load: ${validatedURL}, Error: ${errorCode} - ${errorDescription}`);
  });

  // 页面加载完成
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Electron] Page loaded successfully');
    
    // 注入 CSS 为 header 添加右侧 padding，避免与窗口控制按钮重叠
    mainWindow?.webContents.insertCSS(`
      /* Electron 窗口控制按钮区域预留 */
      .app-header {
        padding-right: 150px !important;
      }
      .header-right {
        margin-right: 0 !important;
      }
      /* 让 header 可拖动窗口 */
      .app-header {
        -webkit-app-region: drag;
      }
      .app-header button,
      .app-header input,
      .app-header .user-avatar,
      .app-header .search-bar,
      .app-header .user-menu-container,
      .app-header .theme-menu-container {
        -webkit-app-region: no-drag;
      }
    `);
  });

  // 窗口关闭时隐藏到托盘
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
 */
function createTray(): void {
  const iconPath = path.join(__dirname, '../public/icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('洛一 (Luo One)');

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
 * 应用初始化
 */
async function initialize(): Promise<void> {
  createWindow();
  createTray();
}

// 应用准备就绪
app.whenReady().then(initialize);

// 忽略证书错误（用于自签名证书）
app.on('certificate-error', (event, _webContents, _url, _error, _certificate, callback) => {
  event.preventDefault();
  callback(true);
});

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

ipcMain.handle('set-badge-count', (_event, count: number) => {
  if (process.platform === 'darwin') {
    app.dock.setBadge(count > 0 ? String(count) : '');
  }
  if (tray) {
    tray.setToolTip(count > 0 ? `洛一 (Luo One) - ${count} 封未读邮件` : '洛一 (Luo One)');
  }
});

ipcMain.handle('notify-new-email', (_event, sender: string, subject: string) => {
  showNotification(`新邮件来自 ${sender}`, subject);
});

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
