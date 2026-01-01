/**
 * 洛一 (Luo One) 邮箱管理系统 - 主题状态管理
 */

import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export type ThemeName = 'dark' | 'luo' | 'light';

export interface Theme {
  name: ThemeName;
  label: string;
  primaryColor: string;
  description: string;
}

export const themes: Theme[] = [
  { name: 'dark', label: '深色', primaryColor: '#6366f1', description: '经典深色主题' },
  { name: 'luo', label: 'Luo', primaryColor: '#66ccff', description: '清新蓝色主题' },
  { name: 'light', label: '浅色', primaryColor: '#4f46e5', description: '明亮浅色主题' },
];

const THEME_STORAGE_KEY = 'luo-one-theme';

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref<ThemeName>(
    (localStorage.getItem(THEME_STORAGE_KEY) as ThemeName) || 'dark'
  );

  function setTheme(theme: ThemeName) {
    currentTheme.value = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyTheme(theme);
  }

  function applyTheme(theme: ThemeName) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  // 初始化时应用主题
  function initTheme() {
    applyTheme(currentTheme.value);
  }

  // 监听主题变化
  watch(currentTheme, (newTheme) => {
    applyTheme(newTheme);
  });

  return {
    currentTheme,
    setTheme,
    initTheme,
  };
});
