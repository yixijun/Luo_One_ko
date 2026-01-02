/**
 * 洛一 (Luo One) 邮箱管理系统 - Capacitor 配置
 * 套壳模式：加载外部前端 URL
 */

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'one.luo.ko',
  appName: '洛一',
  webDir: 'dist',
  
  // 服务器配置 - 加载外部 URL
  server: {
    // 生产环境加载外部前端地址
    url: 'https://mail.home.luonako.cn/',
    // Android 使用 https scheme
    androidScheme: 'https',
    // 允许导航到外部 URL
    allowNavigation: ['*'],
    // 允许混合内容
    cleartext: true,
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
  
  // Android 配置
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
