/**
 * 洛一 (Luo One) 邮箱管理系统 - Capacitor 配置
 * Requirements: 13.1
 */

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'one.luo.ko',
  appName: '洛一',
  webDir: '../dist',
  
  // 服务器配置
  server: {
    // Android 使用 https scheme
    androidScheme: 'https',
    // iOS 使用 capacitor scheme
    iosScheme: 'capacitor',
    // 允许导航到外部 URL
    allowNavigation: ['*'],
  },
  
  // 插件配置
  plugins: {
    // HTTP 插件配置
    CapacitorHttp: {
      enabled: true,
    },
    // 状态栏配置
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#1a1a2e',
    },
    // 键盘配置
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    // 启动画面配置
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1a1a2e',
      showSpinner: true,
      spinnerColor: '#4a90d9',
    },
  },
  
  // iOS 配置
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'luoone',
  },
  
  // Android 配置
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
