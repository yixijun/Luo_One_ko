/**
 * 洛一 (Luo One) 邮箱管理系统 - 邮件状态管理
 * Requirements: 8.1
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient from '@/api/client';
import type { Email, EmailListParams, SendEmailRequest, SyncRequest, ProcessedResult } from '@/types';

export const useEmailStore = defineStore('email', () => {
  // 状态
  const emails = ref<Email[]>([]);
  const currentEmail = ref<Email | null>(null);
  const total = ref(0);
  const page = ref(1);
  const limit = ref(20);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 计算属性
  const hasEmails = computed(() => emails.value.length > 0);
  const unreadCount = computed(() => emails.value.filter(e => !e.isRead).length);
  const totalPages = computed(() => Math.ceil(total.value / limit.value));

  // 转换后端响应为前端 camelCase 格式
  function toEmailCamelCase(data: Record<string, unknown>): Email {
    const processedResult = data.processed_result as Record<string, unknown> | undefined;
    return {
      id: data.id as number,
      accountId: data.account_id as number,
      messageId: data.message_id as string,
      subject: data.subject as string,
      from: data.from as string,
      to: data.to as string[],
      date: data.date as number,
      body: data.body as string,
      htmlBody: (data.html_body as string) || '',
      hasAttachments: data.has_attachments as boolean,
      isRead: data.is_read as boolean,
      processedResult: processedResult ? {
        id: processedResult.id as number || 0,
        emailId: processedResult.email_id as number || 0,
        verificationCode: processedResult.verification_code as string | undefined,
        isAd: processedResult.is_ad as boolean,
        summary: processedResult.summary as string | undefined,
        importance: processedResult.importance as ProcessedResult['importance'],
        processedAt: processedResult.processed_at as number,
        processedBy: processedResult.processed_by as ProcessedResult['processedBy'],
      } : undefined,
    };
  }

  // 获取邮件列表
  async function fetchEmails(params: EmailListParams = {}): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      // 转换参数为 snake_case
      const queryParams: Record<string, unknown> = {};
      if (params.accountId) queryParams.account_id = params.accountId;
      if (params.page) queryParams.page = params.page;
      if (params.limit) queryParams.limit = params.limit;
      if (params.sort) queryParams.sort = params.sort;
      if (params.search) queryParams.search = params.search;
      
      const response = await apiClient.get<{ total: number; page: number; limit: number; emails: Record<string, unknown>[] }>('/emails', { params: queryParams });
      emails.value = (response.data.emails || []).map(toEmailCamelCase);
      total.value = response.data.total;
      page.value = response.data.page;
      limit.value = response.data.limit;
    } catch (err) {
      error.value = (err as Error).message || '获取邮件列表失败';
    } finally {
      loading.value = false;
    }
  }


  // 获取邮件详情
  async function fetchEmail(id: number): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get<Record<string, unknown>>(`/emails/${id}`);
      const email = toEmailCamelCase(response.data);
      currentEmail.value = email;
      // 更新列表中的邮件
      const index = emails.value.findIndex(e => e.id === id);
      if (index !== -1) {
        emails.value[index] = email;
      }
    } catch (err) {
      error.value = (err as Error).message || '获取邮件详情失败';
    } finally {
      loading.value = false;
    }
  }

  // 删除邮件
  async function deleteEmail(id: number): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      await apiClient.delete(`/emails/${id}`);
      emails.value = emails.value.filter(e => e.id !== id);
      if (currentEmail.value?.id === id) {
        currentEmail.value = null;
      }
      total.value--;
      return true;
    } catch (err) {
      error.value = (err as Error).message || '删除邮件失败';
      return false;
    } finally {
      loading.value = false;
    }
  }

  // 标记已读
  async function markAsRead(id: number): Promise<boolean> {
    try {
      await apiClient.put(`/emails/${id}/read`);
      const email = emails.value.find(e => e.id === id);
      if (email) {
        email.isRead = true;
      }
      if (currentEmail.value?.id === id) {
        currentEmail.value.isRead = true;
      }
      return true;
    } catch (err) {
      error.value = (err as Error).message || '标记已读失败';
      return false;
    }
  }

  // 发送邮件
  async function sendEmail(data: SendEmailRequest): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      // 转换为后端期望的 snake_case 格式
      const payload: Record<string, unknown> = {
        account_id: data.accountId,
        to: data.to,
        subject: data.subject,
        body: data.body,
      };
      if (data.cc && data.cc.length > 0) {
        payload.cc = data.cc;
      }
      if (data.bcc && data.bcc.length > 0) {
        payload.bcc = data.bcc;
      }
      if (data.attachments && data.attachments.length > 0) {
        payload.attachments = data.attachments;
      }
      await apiClient.post('/emails/send', payload);
      return true;
    } catch (err) {
      error.value = (err as Error).message || '发送邮件失败';
      return false;
    } finally {
      loading.value = false;
    }
  }

  // 同步邮件
  async function syncEmails(data: SyncRequest = {}): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      // 后端要求 account_id 是必填的
      if (!data.accountId) {
        error.value = '请选择要同步的邮箱账户';
        return false;
      }
      const payload = { account_id: data.accountId };
      await apiClient.post('/emails/sync', payload);
      return true;
    } catch (err) {
      error.value = (err as Error).message || '同步邮件失败';
      return false;
    } finally {
      loading.value = false;
    }
  }

  // 清除当前邮件
  function clearCurrentEmail(): void {
    currentEmail.value = null;
  }

  // 重置状态
  function reset(): void {
    emails.value = [];
    currentEmail.value = null;
    total.value = 0;
    page.value = 1;
    error.value = null;
  }

  return {
    emails,
    currentEmail,
    total,
    page,
    limit,
    loading,
    error,
    hasEmails,
    unreadCount,
    totalPages,
    fetchEmails,
    fetchEmail,
    deleteEmail,
    markAsRead,
    sendEmail,
    syncEmails,
    clearCurrentEmail,
    reset,
  };
});
