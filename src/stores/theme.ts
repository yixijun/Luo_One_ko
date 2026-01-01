/**
 * 洛一 (Luo One) 邮箱管理系统 - 主题状态管理
 * 主题和字体配置保存到用户设置（后端数据库）
 */

import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import apiClient from '@/api/client';

export type ThemeName = 'dark' | 'luo' | 'light';
export type FontName = 'system' | 'misans' | 'noto';

export interface Theme {
  name: ThemeName;
  label: string;
  primaryColor: string;
  description: string;
}

export interface FontOption {
  name: FontName;
  label: string;
  fontFamily: string;
  description: string;
}

export const themes: Theme[] = [
  { name: 'dark', label: '深色', primaryColor: '#6366f1', description: '经典深色主题' },
  { name: 'luo', label: 'Luo', primaryColor: '#66ccff', description: '清新蓝色主题' },
  { name: 'light', label: '浅色', primaryColor: '#4f46e5', description: '明亮浅色主题' },
];

export const fonts: FontOption[] = [
  { 
    name: 'system', 
    label: '系统默认', 
    fontFamily: "'Inter', 'SF Pro Display', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    description: '使用系统默认字体'
  },
  { 
    name: 'misans', 
    label: 'MiSans', 
    fontFamily: "'MiSans', 'MI Lan Pro', system-ui, sans-serif",
    description: '小米 MiSans 字体'
  },
  { 
    name: 'noto', 
    label: 'Noto Sans', 
    fontFamily: "'Noto Sans SC', 'Noto Sans', system-ui, sans-serif",
    description: 'Google Noto 字体'
  },
];

// localStorage 作为临时缓存（登录前使用）
const THEME_CACHE_KEY = 'luo-one-theme-cache';
const FONT_CACHE_KEY = 'luo-one-font-cache';

export const useThemeStore = defineStore('theme', () => {
  // 默认值从缓存读取，登录后会从后端同步
  const currentTheme = ref<ThemeName>(
    (localStorage.getItem(THEME_CACHE_KEY) as ThemeName) || 'dark'
  );
  
  const currentFont = ref<FontName>(
    (localStorage.getItem(FONT_CACHE_KEY) as FontName) || 'system'
  );

  const loading = ref(false);

  // 设置主题（同时保存到后端和本地缓存）
  async function setTheme(theme: ThemeName) {
    currentTheme.value = theme;
    localStorage.setItem(THEME_CACHE_KEY, theme);
    applyTheme(theme);
    
    // 保存到后端
    try {
      await apiClient.put('/settings', { theme });
    } catch (err) {
      console.error('[Theme] Failed to save theme to backend:', err);
    }
  }

  // 设置字体（同时保存到后端和本地缓存）
  async function setFont(font: FontName) {
    currentFont.value = font;
    localStorage.setItem(FONT_CACHE_KEY, font);
    applyFont(font);
    
    // 保存到后端
    try {
      await apiClient.put('/settings', { font });
    } catch (err) {
      console.error('[Theme] Failed to save font to backend:', err);
    }
  }

  function applyTheme(theme: ThemeName) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  function applyFont(font: FontName) {
    const fontOption = fonts.find(f => f.name === font);
    if (fontOption) {
      document.documentElement.style.setProperty('--font-family', fontOption.fontFamily);
      document.documentElement.setAttribute('data-font', font);
    }
  }

  // 从后端加载主题设置
  async function loadFromBackend() {
    loading.value = true;
    try {
      const response = await apiClient.get<{ theme?: string; font?: string }>('/settings');
      const data = response.data as any;
      
      // 处理 snake_case 到 camelCase 的转换
      const theme = (data?.theme || data?.Theme || 'dark') as ThemeName;
      const font = (data?.font || data?.Font || 'system') as FontName;
      
      // 验证主题值是否有效
      if (themes.some(t => t.name === theme)) {
        currentTheme.value = theme;
        localStorage.setItem(THEME_CACHE_KEY, theme);
        applyTheme(theme);
      }
      
      // 验证字体值是否有效
      if (fonts.some(f => f.name === font)) {
        currentFont.value = font;
        localStorage.setItem(FONT_CACHE_KEY, font);
        applyFont(font);
      }
    } catch (err) {
      console.error('[Theme] Failed to load settings from backend:', err);
      // 使用本地缓存
      applyTheme(currentTheme.value);
      applyFont(currentFont.value);
    } finally {
      loading.value = false;
    }
  }

  // 初始化时应用主题和字体（使用本地缓存）
  function initTheme() {
    applyTheme(currentTheme.value);
    applyFont(currentFont.value);
  }

  // 监听主题变化
  watch(currentTheme, (newTheme) => {
    applyTheme(newTheme);
  });

  // 监听字体变化
  watch(currentFont, (newFont) => {
    applyFont(newFont);
  });

  return {
    currentTheme,
    currentFont,
    loading,
    setTheme,
    setFont,
    initTheme,
    loadFromBackend,
  };
});
