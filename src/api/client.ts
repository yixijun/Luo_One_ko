/**
 * 洛一 (Luo One) 邮箱管理系统 - API 客户端
 * Requirements: 5.1, 11.5
 */

import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse, ApiError } from '@/types';

// Token 存储键名
const TOKEN_KEY = 'luo_one_token';
const API_KEY_KEY = 'luo_one_api_key';

// 创建 axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token 管理
export const tokenManager = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};

// API 密钥管理
export const apiKeyManager = {
  getApiKey(): string | null {
    return localStorage.getItem(API_KEY_KEY);
  },

  setApiKey(apiKey: string): void {
    localStorage.setItem(API_KEY_KEY, apiKey);
  },

  removeApiKey(): void {
    localStorage.removeItem(API_KEY_KEY);
  },
};


// 请求拦截器 - 添加认证信息
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 添加 API 密钥
    const apiKey = apiKeyManager.getApiKey();
    if (apiKey) {
      config.headers['X-API-Key'] = apiKey;
    }

    // 添加 JWT Token
    const token = tokenManager.getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误和解包数据
apiClient.interceptors.response.use(
  (response) => {
    // 自动解包后端返回的 { success: true, data: ... } 格式
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      if (response.data.success && response.data.data !== undefined) {
        // 将 response.data 替换为实际数据
        response.data = response.data.data;
      }
    }
    return response;
  },
  (error: AxiosError<ApiResponse>) => {
    // 处理认证错误
    if (error.response?.status === 401) {
      tokenManager.removeToken();
      // 触发重定向到登录页（由路由守卫处理）
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    // 构造统一的错误响应
    const apiError: ApiError = error.response?.data?.error || {
      code: 'NETWORK_ERROR',
      message: error.message || '网络请求失败',
    };

    return Promise.reject(apiError);
  }
);

export default apiClient;
