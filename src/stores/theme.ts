/**
 * 洛一 (Luo One) 邮箱管理系统 - 主题状态管理
 */

import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

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

const THEME_STORAGE_KEY = 'luo-one-theme';
const FONT_STORAGE_KEY = 'luo-one-font';

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref<ThemeName>(
    (localStorage.getItem(THEME_STORAGE_KEY) as ThemeName) || 'dark'
  );
  
  const currentFont = ref<FontName>(
    (localStorage.getItem(FONT_STORAGE_KEY) as FontName) || 'system'
  );

  function setTheme(theme: ThemeName) {
    currentTheme.value = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyTheme(theme);
  }

  function setFont(font: FontName) {
    currentFont.value = font;
    localStorage.setItem(FONT_STORAGE_KEY, font);
    applyFont(font);
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

  // 初始化时应用主题和字体
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
    setTheme,
    setFont,
    initTheme,
  };
});
