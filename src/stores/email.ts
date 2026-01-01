/**
 * 洛一 (Luo One) 邮箱管理系统 - 邮件状态管理
 * Requirements: 8.1
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient from '@/api/client';
import type { Email, EmailListParams, SendEmailRequest, SyncRequest, ProcessedResult, SyncProgress, Attachment } from '@/types';

// 邮件列表数量限制 - 从 localStorage 读取，默认 20
const EMAIL_LIST_LIMIT_KEY = 'luo_one_email_list_limit';

export function getEmailListLimit(): number {
  const saved = localStorage.getItem(EMAIL_LIST_LIMIT_KEY);
  const limit = saved ? parseInt(saved, 10) : 20;
  // 即使设置为不限制(-1)，也限制最大为 500，避免加载过多数据
  return limit === -1 ? 500 : limit;
}

export function setEmailListLimit(limit: number): void {
  localStorage.setItem(EMAIL_LIST_LIMIT_KEY, String(limit));
}

export const useEmailStore = defineStore('email', () => {
  // 状态
  const emails = ref<Email[]>([]);
  const currentEmail = ref<Email | null>(null);
  const total = ref(0);
  const page = ref(1);
  const limit = ref(20);
  const loading = ref(false);
  const loadingMore = ref(false);
  const error = ref<string | null>(null);

  // 计算属性
  const hasEmails = computed(() => emails.value.length > 0);
  const unreadCount = computed(() => emails.value.filter(e => !e.isRead).length);
  const totalPages = computed(() => Math.ceil(total.value / limit.value));
  const hasMore = computed(() => emails.value.length < total.value);

  // 转换后端响应为前端 camelCase 格式
  function toEmailCamelCase(data: Record<string, unknown>): Email {
    const processedResult = data.processed_result as Record<string, unknown> | undefined;
    
    // 转换 created_at 时间字符串为时间戳
    let createdAtTimestamp: number | undefined;
    if (data.created_at) {
      const createdAtDate = new Date(data.created_at as string);
      createdAtTimestamp = Math.floor(createdAtDate.getTime() / 1000);
    }
    
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
      folder: (data.folder as Email['folder']) || 'inbox',
      createdAt: createdAtTimestamp,
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

  // 保存当前查询参数，用于加载更多
  const lastQueryParams = ref<EmailListParams>({});

  // 获取邮件列表
  async function fetchEmails(params: EmailListParams = {}): Promise<void> {
    loading.value = true;
    error.value = null;
    // 保存查询参数
    lastQueryParams.value = { ...params };
    try {
      // 转换参数为 snake_case
      const queryParams: Record<string, unknown> = {};
      if (params.accountId) queryParams.account_id = params.accountId;
      if (params.folder) queryParams.folder = params.folder;
      if (params.page) queryParams.page = params.page;
      // 使用传入的 limit 或从设置中读取
      const emailLimit = params.limit ?? getEmailListLimit();
      queryParams.limit = emailLimit;
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

  // 加载更多邮件（无限滚动）
  async function loadMoreEmails(): Promise<boolean> {
    if (loadingMore.value || !hasMore.value) return false;
    
    loadingMore.value = true;
    error.value = null;
    try {
      const nextPage = page.value + 1;
      const queryParams: Record<string, unknown> = {
        page: nextPage,
        limit: limit.value,
      };
      
      // 使用上次的查询参数
      if (lastQueryParams.value.accountId) queryParams.account_id = lastQueryParams.value.accountId;
      if (lastQueryParams.value.folder) queryParams.folder = lastQueryParams.value.folder;
      if (lastQueryParams.value.sort) queryParams.sort = lastQueryParams.value.sort;
      if (lastQueryParams.value.search) queryParams.search = lastQueryParams.value.search;
      
      const response = await apiClient.get<{ total: number; page: number; limit: number; emails: Record<string, unknown>[] }>('/emails', { params: queryParams });
      const newEmails = (response.data.emails || []).map(toEmailCamelCase);
      
      // 追加到现有列表，去重
      const existingIds = new Set(emails.value.map(e => e.id));
      const uniqueNewEmails = newEmails.filter(e => !existingIds.has(e.id));
      emails.value = [...emails.value, ...uniqueNewEmails];
      
      total.value = response.data.total;
      page.value = response.data.page;
      
      return uniqueNewEmails.length > 0;
    } catch (err) {
      error.value = (err as Error).message || '加载更多邮件失败';
      return false;
    } finally {
      loadingMore.value = false;
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

  // 全部已读
  async function markAllAsRead(accountId?: number): Promise<number> {
    loading.value = true;
    error.value = null;
    try {
      const payload: Record<string, unknown> = {};
      if (accountId) {
        payload.account_id = accountId;
      }
      const response = await apiClient.put<{ success: boolean; data: { updated_count: number } }>('/emails/read-all', payload);
      const count = response.data?.data?.updated_count ?? 0;
      // 更新本地状态
      emails.value.forEach(email => {
        if (!accountId || email.accountId === accountId) {
          email.isRead = true;
        }
      });
      return count;
    } catch (err) {
      error.value = (err as Error).message || '标记全部已读失败';
      return -1;
    } finally {
      loading.value = false;
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
  async function syncEmails(data: SyncRequest = {}): Promise<number> {
    loading.value = true;
    error.value = null;
    try {
      // 后端要求 account_id 是必填的
      if (!data.accountId) {
        error.value = '请选择要同步的邮箱账户';
        return -1;
      }
      const payload: Record<string, unknown> = { account_id: data.accountId };
      if (data.fullSync) {
        payload.full_sync = true;
      }
      // 同步可能需要很长时间，使用 10 分钟超时（全量同步需要更长时间）
      const timeout = data.fullSync ? 600000 : 300000;
      const response = await apiClient.post<{ synced_count: number }>('/emails/sync', payload, {
        timeout,
      });
      return response.data?.synced_count ?? 0;
    } catch (err) {
      error.value = (err as Error).message || '同步邮件失败';
      return -1;
    } finally {
      loading.value = false;
    }
  }

  // 获取全量同步进度
  async function getSyncProgress(accountId: number): Promise<SyncProgress | null> {
    try {
      const response = await apiClient.get<Record<string, unknown>>(`/emails/sync/progress?account_id=${accountId}`);
      const data = response.data;
      if (!data) return null;
      // 转换 snake_case 到 camelCase
      return {
        accountId: data.account_id as number,
        status: data.status as SyncProgress['status'],
        totalMessages: data.total_messages as number,
        processed: data.processed as number,
        saved: data.saved as number,
        skipped: data.skipped as number,
        currentBatch: data.current_batch as number,
        totalBatches: data.total_batches as number,
        error: data.error as string | undefined,
      };
    } catch {
      return null;
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

  // 获取邮件附件列表
  async function fetchAttachments(emailId: number): Promise<Attachment[]> {
    try {
      const response = await apiClient.get<Attachment[]>(`/emails/${emailId}/attachments`);
      return response.data || [];
    } catch (err) {
      console.error('获取附件列表失败:', err);
      return [];
    }
  }

  // 下载附件
  async function downloadAttachment(emailId: number, filename: string): Promise<void> {
    try {
      const response = await apiClient.get(`/emails/${emailId}/attachments/${encodeURIComponent(filename)}`, {
        responseType: 'blob',
      });
      
      // 创建下载链接
      const blob = new Blob([response.data as BlobPart]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      error.value = (err as Error).message || '下载附件失败';
      throw err;
    }
  }

  return {
    emails,
    currentEmail,
    total,
    page,
    limit,
    loading,
    loadingMore,
    error,
    hasEmails,
    unreadCount,
    totalPages,
    hasMore,
    fetchEmails,
    loadMoreEmails,
    fetchEmail,
    deleteEmail,
    markAsRead,
    markAllAsRead,
    sendEmail,
    syncEmails,
    getSyncProgress,
    clearCurrentEmail,
    reset,
    fetchAttachments,
    downloadAttachment,
  };
});
