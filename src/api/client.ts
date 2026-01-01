/**
 * 洛一 (Luo One) 邮箱管理系统 - API 客户端
 * Requirements: 5.1, 11.5
 */

import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse, ApiError } from '@/types';

// Token 存储键名
const TOKEN_KEY = 'luo_one_token';
const API_KEY_KEY = 'luo_one_api_key';
const BACKEND_URL_KEY = 'luo_one_backend_url';

// 创建 axios 实例 - 始终使用 /api 代理路径
const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000, // 默认 30 秒
  headers: {
    'Content-Type': 'application/json',
  },
});

// 同步邮件专用的长超时配置
export const syncConfig = {
  timeout: 300000, // 5 分钟
};

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

// 后端地址管理
export const backendUrlManager = {
  getBackendUrl(): string {
    return localStorage.getItem(BACKEND_URL_KEY) || '';
  },

  setBackendUrl(url: string): void {
    localStorage.setItem(BACKEND_URL_KEY, url);
    // 不修改 baseURL，始终使用 /api 代理
    // 后端地址由服务器端代理处理
  },

  removeBackendUrl(): void {
    localStorage.removeItem(BACKEND_URL_KEY);
  },
};

// baseURL 始终使用 /api，通过服务器代理访问后端


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
      if (response.data.success) {
        // 如果有 data 字段，返回 data；否则返回整个响应（用于删除等操作）
        if (response.data.data !== undefined) {
          response.data = response.data.data;
        }
        // 删除成功等操作没有 data 字段，保持原样
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
