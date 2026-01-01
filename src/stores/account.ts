/**
 * 洛一 (Luo One) 邮箱管理系统 - 邮箱账户状态管理
 * Requirements: 8.1
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient from '@/api/client';
import type { EmailAccount, TestConnectionResponse } from '@/types';

export const useAccountStore = defineStore('account', () => {
  // 状态
  const accounts = ref<EmailAccount[]>([]);
  const currentAccount = ref<EmailAccount | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 计算属性
  const hasAccounts = computed(() => accounts.value.length > 0);
  const enabledAccounts = computed(() => accounts.value.filter(a => a.enabled));
  const currentAccountId = computed(() => currentAccount.value?.id);

  // 转换为后端期望的 snake_case 格式
  function toSnakeCase(data: Partial<EmailAccount>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    if (data.email !== undefined) result.email = data.email;
    if (data.displayName !== undefined) result.display_name = data.displayName;
    if (data.imapHost !== undefined) result.imap_host = data.imapHost;
    if (data.imapPort !== undefined) result.imap_port = data.imapPort;
    if (data.smtpHost !== undefined) result.smtp_host = data.smtpHost;
    if (data.smtpPort !== undefined) result.smtp_port = data.smtpPort;
    if (data.username !== undefined) result.username = data.username;
    if (data.password !== undefined) result.password = data.password;
    if (data.useSSL !== undefined) result.use_ssl = data.useSSL;
    if (data.enabled !== undefined) result.enabled = data.enabled;
    if (data.syncDays !== undefined) result.sync_days = data.syncDays;
    return result;
  }

  // 转换后端响应为前端 camelCase 格式
  function toCamelCase(data: Record<string, unknown>): EmailAccount {
    return {
      id: data.id as number,
      userId: data.user_id as number,
      email: data.email as string,
      displayName: (data.display_name as string) || '',
      imapHost: data.imap_host as string,
      imapPort: data.imap_port as number,
      smtpHost: data.smtp_host as string,
      smtpPort: data.smtp_port as number,
      username: data.username as string,
      useSSL: data.use_ssl as boolean,
      enabled: data.enabled as boolean,
      syncDays: (data.sync_days as number) ?? -1,
      lastSyncAt: data.last_sync_at as number,
      createdAt: data.created_at as number,
      emailCount: (data.email_count as number) ?? 0,
    };
  }

  // 获取账户列表
  async function fetchAccounts(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get<Record<string, unknown>[]>('/accounts');
      accounts.value = (response.data || []).map(toCamelCase);
    } catch (err) {
      error.value = (err as Error).message || '获取账户列表失败';
    } finally {
      loading.value = false;
    }
  }

  // 添加账户
  async function addAccount(data: Omit<EmailAccount, 'id' | 'userId' | 'lastSyncAt' | 'createdAt'>): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      const payload = toSnakeCase(data);
      const response = await apiClient.post<Record<string, unknown>>('/accounts', payload);
      accounts.value.push(toCamelCase(response.data));
      return true;
    } catch (err) {
      error.value = (err as Error).message || '添加账户失败';
      return false;
    } finally {
      loading.value = false;
    }
  }


  // 更新账户
  async function updateAccount(id: number, data: Partial<EmailAccount>): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      const payload = toSnakeCase(data);
      const response = await apiClient.put<Record<string, unknown>>(`/accounts/${id}`, payload);
      const updated = toCamelCase(response.data);
      const index = accounts.value.findIndex(a => a.id === id);
      if (index !== -1) {
        accounts.value[index] = updated;
      }
      if (currentAccount.value?.id === id) {
        currentAccount.value = updated;
      }
      return true;
    } catch (err) {
      error.value = (err as Error).message || '更新账户失败';
      return false;
    } finally {
      loading.value = false;
    }
  }

  // 删除账户
  async function deleteAccount(id: number): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      await apiClient.delete(`/accounts/${id}`);
      accounts.value = accounts.value.filter(a => a.id !== id);
      if (currentAccount.value?.id === id) {
        currentAccount.value = null;
      }
      return true;
    } catch (err) {
      error.value = (err as Error).message || '删除账户失败';
      return false;
    } finally {
      loading.value = false;
    }
  }

  // 测试连接
  async function testConnection(id: number): Promise<TestConnectionResponse> {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post<TestConnectionResponse>(`/accounts/${id}/test`);
      return response.data;
    } catch (err) {
      error.value = (err as Error).message || '测试连接失败';
      return { success: false, message: error.value };
    } finally {
      loading.value = false;
    }
  }

  // 直接测试连接（不保存账户）
  async function testConnectionDirect(data: {
    imapHost: string;
    imapPort: number;
    smtpHost: string;
    smtpPort: number;
    username: string;
    password: string;
    useSSL: boolean;
  }): Promise<TestConnectionResponse> {
    loading.value = true;
    error.value = null;
    try {
      const payload = {
        imap_host: data.imapHost,
        imap_port: data.imapPort,
        smtp_host: data.smtpHost,
        smtp_port: data.smtpPort,
        username: data.username,
        password: data.password,
        use_ssl: data.useSSL,
      };
      const response = await apiClient.post<TestConnectionResponse>('/accounts/test', payload);
      return response.data;
    } catch (err) {
      error.value = (err as Error).message || '测试连接失败';
      return { success: false, message: error.value };
    } finally {
      loading.value = false;
    }
  }

  // 切换账户启用状态
  async function toggleEnabled(id: number): Promise<boolean> {
    const account = accounts.value.find(a => a.id === id);
    if (!account) return false;
    return updateAccount(id, { enabled: !account.enabled });
  }

  // 设置当前账户
  function setCurrentAccount(account: EmailAccount | null): void {
    currentAccount.value = account;
  }

  // 根据 ID 设置当前账户
  function setCurrentAccountById(id: number): void {
    currentAccount.value = accounts.value.find(a => a.id === id) || null;
  }

  // 重置状态
  function reset(): void {
    accounts.value = [];
    currentAccount.value = null;
    error.value = null;
  }

  return {
    accounts,
    currentAccount,
    loading,
    error,
    hasAccounts,
    enabledAccounts,
    currentAccountId,
    fetchAccounts,
    addAccount,
    updateAccount,
    deleteAccount,
    testConnection,
    testConnectionDirect,
    toggleEnabled,
    setCurrentAccount,
    setCurrentAccountById,
    reset,
  };
});
