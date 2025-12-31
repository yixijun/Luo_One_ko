/**
 * 平台检测组合式函数
 * Requirements: 13.8
 * 
 * 检测当前运行平台并提供相应的布局切换支持：
 * - Web 浏览器
 * - Electron 桌面端
 * - Capacitor 移动端 (iOS/Android)
 */

import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

/** 平台类型 */
export type Platform = 'web' | 'electron' | 'ios' | 'android' | 'unknown';

/** 设备类型 */
export type DeviceType = 'desktop' | 'tablet' | 'mobile';

/** 屏幕断点 (px) */
const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
} as const;

export function usePlatform() {
  const router = useRouter();
  const route = useRoute();
  
  // 状态
  const platform = ref<Platform>('unknown');
  const deviceType = ref<DeviceType>('desktop');
  const screenWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const screenHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 768);
  const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true);
  
  // 计算属性
  const isWeb = computed(() => platform.value === 'web');
  const isElectron = computed(() => platform.value === 'electron');
  const isIOS = computed(() => platform.value === 'ios');
  const isAndroid = computed(() => platform.value === 'android');
  const isNative = computed(() => isIOS.value || isAndroid.value);
  const isMobile = computed(() => deviceType.value === 'mobile');
  const isTablet = computed(() => deviceType.value === 'tablet');
  const isDesktop = computed(() => deviceType.value === 'desktop');
  
  // 是否应该使用移动端布局
  const shouldUseMobileLayout = computed(() => {
    // 原生移动端始终使用移动布局
    if (isNative.value) return true;
    // 小屏幕设备使用移动布局
    if (isMobile.value) return true;
    // 平板设备可选择使用移动布局
    if (isTablet.value && screenWidth.value < BREAKPOINTS.tablet) return true;
    return false;
  });
  
  // 是否在移动端路由
  const isOnMobileRoute = computed(() => {
    return route.path.startsWith('/mobile');
  });
  
  /**
   * 检测平台类型
   */
  const detectPlatform = (): Platform => {
    if (typeof window === 'undefined') return 'unknown';
    
    // 检测 Electron
    // @ts-expect-error - Electron 注入的属性
    if (window.electron || navigator.userAgent.includes('Electron')) {
      return 'electron';
    }
    
    // 检测 Capacitor
    // @ts-expect-error - Capacitor 注入的属性
    if (window.Capacitor) {
      // @ts-expect-error - Capacitor 注入的属性
      const capacitorPlatform = window.Capacitor.getPlatform?.();
      if (capacitorPlatform === 'ios') return 'ios';
      if (capacitorPlatform === 'android') return 'android';
    }
    
    // 通过 User Agent 检测移动设备
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      // 可能是 Safari 浏览器中的 iOS
      return 'ios';
    }
    if (/android/.test(ua)) {
      return 'android';
    }
    
    return 'web';
  };
  
  /**
   * 检测设备类型
   */
  const detectDeviceType = (): DeviceType => {
    if (typeof window === 'undefined') return 'desktop';
    
    const width = window.innerWidth;
    
    if (width < BREAKPOINTS.mobile) {
      return 'mobile';
    }
    if (width < BREAKPOINTS.tablet) {
      return 'tablet';
    }
    return 'desktop';
  };
  
  /**
   * 更新屏幕尺寸
   */
  const updateScreenSize = () => {
    if (typeof window === 'undefined') return;
    
    screenWidth.value = window.innerWidth;
    screenHeight.value = window.innerHeight;
    deviceType.value = detectDeviceType();
  };
  
  /**
   * 更新在线状态
   */
  const updateOnlineStatus = () => {
    if (typeof navigator === 'undefined') return;
    isOnline.value = navigator.onLine;
  };
  
  /**
   * 根据平台自动导航到合适的路由
   */
  const navigateToAppropriateRoute = () => {
    const currentPath = route.path;
    
    if (shouldUseMobileLayout.value) {
      // 应该使用移动布局
      if (!currentPath.startsWith('/mobile') && currentPath !== '/login') {
        // 映射 Web 路由到移动端路由
        if (currentPath === '/' || currentPath === '/home') {
          router.replace('/mobile');
        } else if (currentPath === '/settings') {
          // 设置页面在移动端也使用相同路由
          // 可以根据需要添加移动端设置页面
        }
      }
    } else {
      // 应该使用桌面布局
      if (currentPath.startsWith('/mobile')) {
        // 映射移动端路由到 Web 路由
        if (currentPath === '/mobile' || currentPath === '/mobile/accounts') {
          router.replace('/');
        } else if (currentPath.startsWith('/mobile/email/')) {
          // 邮件详情在桌面端通过侧边栏显示
          router.replace('/');
        }
      }
    }
  };
  
  /**
   * 获取安全区域内边距
   */
  const getSafeAreaInsets = () => {
    if (typeof window === 'undefined' || typeof getComputedStyle === 'undefined') {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }
    
    const style = getComputedStyle(document.documentElement);
    return {
      top: parseInt(style.getPropertyValue('--sat') || '0') || 0,
      right: parseInt(style.getPropertyValue('--sar') || '0') || 0,
      bottom: parseInt(style.getPropertyValue('--sab') || '0') || 0,
      left: parseInt(style.getPropertyValue('--sal') || '0') || 0,
    };
  };
  
  /**
   * 设置安全区域 CSS 变量
   */
  const setupSafeAreaVariables = () => {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    root.style.setProperty('--sat', 'env(safe-area-inset-top, 0px)');
    root.style.setProperty('--sar', 'env(safe-area-inset-right, 0px)');
    root.style.setProperty('--sab', 'env(safe-area-inset-bottom, 0px)');
    root.style.setProperty('--sal', 'env(safe-area-inset-left, 0px)');
  };
  
  /**
   * 初始化平台检测
   */
  const initialize = () => {
    platform.value = detectPlatform();
    deviceType.value = detectDeviceType();
    updateScreenSize();
    updateOnlineStatus();
    setupSafeAreaVariables();
  };
  
  // 事件监听器
  let resizeHandler: (() => void) | null = null;
  let onlineHandler: (() => void) | null = null;
  let offlineHandler: (() => void) | null = null;
  
  onMounted(() => {
    initialize();
    
    // 监听窗口大小变化
    resizeHandler = () => {
      updateScreenSize();
    };
    window.addEventListener('resize', resizeHandler);
    
    // 监听在线状态变化
    onlineHandler = () => {
      isOnline.value = true;
    };
    offlineHandler = () => {
      isOnline.value = false;
    };
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
  });
  
  onUnmounted(() => {
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
    }
    if (onlineHandler) {
      window.removeEventListener('online', onlineHandler);
    }
    if (offlineHandler) {
      window.removeEventListener('offline', offlineHandler);
    }
  });
  
  return {
    // 状态
    platform,
    deviceType,
    screenWidth,
    screenHeight,
    isOnline,
    
    // 计算属性
    isWeb,
    isElectron,
    isIOS,
    isAndroid,
    isNative,
    isMobile,
    isTablet,
    isDesktop,
    shouldUseMobileLayout,
    isOnMobileRoute,
    
    // 方法
    detectPlatform,
    detectDeviceType,
    navigateToAppropriateRoute,
    getSafeAreaInsets,
    initialize,
  };
}
