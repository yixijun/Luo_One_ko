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

  // 获取账户列表
  async function fetchAccounts(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get<EmailAccount[]>('/accounts');
      accounts.value = response.data;
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
      const response = await apiClient.post<EmailAccount>('/accounts', data);
      accounts.value.push(response.data);
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
      const response = await apiClient.put<EmailAccount>(`/accounts/${id}`, data);
      const index = accounts.value.findIndex(a => a.id === id);
      if (index !== -1) {
        accounts.value[index] = response.data;
      }
      if (currentAccount.value?.id === id) {
        currentAccount.value = response.data;
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
    toggleEnabled,
    setCurrentAccount,
    setCurrentAccountById,
    reset,
  };
});
