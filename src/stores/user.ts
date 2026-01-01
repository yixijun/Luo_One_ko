/**
 * 洛一 (Luo One) 邮箱管理系统 - 用户状态管理
 * Requirements: 8.1
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient, { tokenManager } from '@/api/client';
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
      const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
      // 响应拦截器已自动解包 { success: true, data: ... } 格式
      tokenManager.setToken(response.data.token);
      await fetchProfile();
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
      const response = await apiClient.get<User>('/user/profile');
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
      const response = await apiClient.put<User>('/user/profile', data);
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
      await apiClient.put('/user/password', data);
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
    try {
      const response = await apiClient.get<UserSettings>('/settings');
      settings.value = response.data;
    } catch (err) {
      error.value = (err as Error).message || '获取设置失败';
    } finally {
      loading.value = false;
    }
  }

  // 更新用户设置
  async function updateSettings(data: Partial<UserSettings>): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put<UserSettings>('/settings', data);
      settings.value = response.data;
      return true;
    } catch (err) {
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
