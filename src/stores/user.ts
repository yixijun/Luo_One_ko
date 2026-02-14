/**
 * 洛一 (Luo One) 邮箱管理系统 - 用户状态管理
 * Requirements: 8.1
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient, { tokenManager } from '@/api/client';
import { useThemeStore } from '@/stores/theme';
import type { User, UserSettings, LoginRequest, LoginResponse, ChangePasswordRequest } from '@/types';

export const useUserStore = defineStore('user', () => {
  // 状态
  const user = ref<User | null>(null);
  const settings = ref<UserSettings | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 计算属性
  const isLoggedIn = computed(() => !!user.value && tokenManager.isAuthenticated());
  const username = computed(() => user.value?.username || '');
  const nickname = computed(() => user.value?.nickname || user.value?.username || '');

  // 登录
  async function login(credentials: LoginRequest): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post<LoginResponse>('/api/auth/login', credentials);
      // 响应拦截器已自动解包 { success: true, data: ... } 格式
      tokenManager.setToken(response.data.token);
      await fetchProfile();
      // 登录成功后加载用户设置（包括主题）
      await fetchSettings();
      return true;
    } catch (err) {
      error.value = (err as Error).message || '登录失败';
      return false;
    } finally {
      loading.value = false;
    }
  }

  // 登出
  function logout(): void {
    user.value = null;
    settings.value = null;
    tokenManager.removeToken();
  }


  // 获取用户信息
  async function fetchProfile(): Promise<void> {
    loading.value = true;
    try {
      const response = await apiClient.get<User>('/api/user/profile');
      user.value = response.data;
    } catch (err) {
      error.value = (err as Error).message || '获取用户信息失败';
    } finally {
      loading.value = false;
    }
  }

  // 更新用户信息
  async function updateProfile(data: Partial<User>): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put<User>('/api/user/profile', data);
      user.value = response.data;
      return true;
    } catch (err) {
      error.value = (err as Error).message || '更新用户信息失败';
      return false;
    } finally {
      loading.value = false;
    }
  }

  // 修改密码
  async function changePassword(data: ChangePasswordRequest): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      await apiClient.put('/api/user/password', data);
      return true;
    } catch (err) {
      error.value = (err as Error).message || '修改密码失败';
      return false;
    } finally {
      loading.value = false;
    }
  }

  // 获取用户设置
  async function fetchSettings(): Promise<void> {
    loading.value = true;
    console.log('[UserStore] fetchSettings called');
    try {
      const response = await apiClient.get<UserSettings>('/api/settings');
      console.log('[UserStore] fetchSettings response:', JSON.stringify(response.data).substring(0, 300));
      settings.value = response.data;
      
      // 同步主题设置
      const themeStore = useThemeStore();
      await themeStore.loadFromBackend();
    } catch (err) {
      console.error('[UserStore] fetchSettings error:', err);
      error.value = (err as Error).message || '获取设置失败';
    } finally {
      loading.value = false;
    }
  }

  // 更新用户设置
  async function updateSettings(data: Partial<UserSettings>): Promise<boolean> {
    loading.value = true;
    error.value = null;
    
    // 转换 camelCase 到 snake_case
    const snakeCaseData: Record<string, any> = {};
    const keyMap: Record<string, string> = {
      aiEnabled: 'ai_enabled',
      aiProvider: 'ai_provider',
      aiApiKey: 'ai_api_key',
      aiBaseUrl: 'ai_base_url',
      aiModel: 'ai_model',
      extractCode: 'extract_code',
      detectAd: 'detect_ad',
      summarize: 'summarize',
      judgeImportance: 'judge_importance',
      extractCodeMode: 'extract_code_mode',
      detectAdMode: 'detect_ad_mode',
      summarizeMode: 'summarize_mode',
      judgeImportanceMode: 'judge_importance_mode',
      promptExtractCode: 'prompt_extract_code',
      promptDetectAd: 'prompt_detect_ad',
      promptSummarize: 'prompt_summarize',
      promptJudgeImportance: 'prompt_judge_importance',
      googleClientId: 'google_client_id',
      googleClientSecret: 'google_client_secret',
      googleRedirectUrl: 'google_redirect_url',
      theme: 'theme',
      font: 'font',
      syncInterval: 'sync_interval',
    };
    
    for (const [key, value] of Object.entries(data)) {
      const snakeKey = keyMap[key] || key;
      snakeCaseData[snakeKey] = value;
    }
    
    console.log('[UserStore] updateSettings called with:', JSON.stringify(snakeCaseData).substring(0, 200));
    try {
      const response = await apiClient.put<UserSettings>('/api/settings', snakeCaseData);
      console.log('[UserStore] updateSettings response:', JSON.stringify(response.data).substring(0, 200));
      settings.value = response.data;
      return true;
    } catch (err) {
      console.error('[UserStore] updateSettings error:', err);
      error.value = (err as Error).message || '更新设置失败';
      return false;
    } finally {
      loading.value = false;
    }
  }

  return {
    user,
    settings,
    loading,
    error,
    isLoggedIn,
    username,
    nickname,
    login,
    logout,
    fetchProfile,
    updateProfile,
    changePassword,
    fetchSettings,
    updateSettings,
  };
});
