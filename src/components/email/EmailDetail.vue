<script setup lang="ts">
/**
 * 洛一 (Luo One) 邮箱管理系统 - 邮件详情组件
 * Requirements: 8.6
 * 点击气泡打开详情，展示完整邮件内容
 */
import { computed } from 'vue';
import type { Email } from '@/types';
import EmailBubble from './EmailBubble.vue';
import ProcessedInfo from './ProcessedInfo.vue';

// Props
const props = defineProps<{
  email: Email;
}>();

// Emits
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'delete'): void;
  (e: 'reply'): void;
  (e: 'forward'): void;
}>();

// 是否有处理结果
const hasProcessedResult = computed(() => !!props.email.processedResult);

// 格式化完整日期时间
function formatFullDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 获取发件人名称
function getSenderName(from: string): string {
  const match = from.match(/^(.+?)\s*<.+>$/);
  return match?.[1] ?? from.split('@')[0] ?? from;
}

// 获取发件人邮箱
function getSenderEmail(from: string): string {
  const match = from.match(/<(.+)>$/);
  return match?.[1] ?? from;
}

// 处理关闭
function handleClose() {
  emit('close');
}

// 处理删除
function handleDelete() {
  emit('delete');
}

// 处理回复
function handleReply() {
  emit('reply');
}

// 处理转发
function handleForward() {
  emit('forward');
}
</script>

<template>
  <div class="email-detail">
    <!-- 详情头部 -->
    <div class="detail-header">
      <button class="back-btn" @click="handleClose" title="返回">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </button>
      <h2 class="detail-title">{{ email.subject || '(无主题)' }}</h2>
      <div class="header-actions">
        <button class="action-btn" @click="handleReply" title="回复">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 17 4 12 9 7"/>
            <path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
          </svg>
        </button>
        <button class="action-btn" @click="handleForward" title="转发">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 17 20 12 15 7"/>
            <path d="M4 18v-2a4 4 0 0 1 4-4h12"/>
          </svg>
        </button>
        <button class="action-btn delete" @click="handleDelete" title="删除">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 详情内容 -->
    <div class="detail-content">
      <!-- 邮件元信息 -->
      <div class="email-meta">
        <div class="meta-main">
          <div class="sender-avatar">
            {{ getSenderName(email.from).charAt(0).toUpperCase() }}
          </div>
          <div class="meta-info">
            <div class="sender-row">
              <span class="sender-name">{{ getSenderName(email.from) }}</span>
              <span class="sender-email">&lt;{{ getSenderEmail(email.from) }}&gt;</span>
            </div>
            <div class="recipient-row">
              <span class="meta-label">收件人:</span>
              <span class="meta-value">{{ email.to.join(', ') }}</span>
            </div>
            <div class="date-row">
              <span class="meta-value">{{ formatFullDate(email.date) }}</span>
            </div>
          </div>
        </div>
        
        <!-- 已读/未读状态 -->
        <div class="read-status" :class="{ unread: !email.isRead }">
          {{ email.isRead ? '已读' : '未读' }}
        </div>
      </div>

      <!-- 处理结果信息 -->
      <div class="processed-section" v-if="hasProcessedResult">
        <h3 class="section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
            <path d="M12 2a10 10 0 0 1 10 10"/>
          </svg>
          处理结果
        </h3>
        <ProcessedInfo :result="email.processedResult!" />
      </div>

      <!-- 邮件正文 -->
      <div class="email-body-section">
        <h3 class="section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
          </svg>
          邮件内容
        </h3>
        <EmailBubble :email="email" :show-full-content="true" />
      </div>

      <!-- 附件区域 -->
      <div class="attachments-section" v-if="email.hasAttachments">
        <h3 class="section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
          附件
        </h3>
        <div class="attachments-placeholder">
          <p>附件功能开发中...</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.email-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--content-bg, #0f0f1a);
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #2d2d44);
  background-color: var(--panel-bg, #1a1a2e);
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, #888);
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
}

.back-btn:hover {
  background-color: var(--hover-bg, rgba(255, 255, 255, 0.1));
  color: var(--text-primary, #fff);
}

.back-btn svg {
  width: 20px;
  height: 20px;
}

.detail-title {
  flex: 1;
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #fff);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, #888);
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
}

.action-btn:hover {
  background-color: var(--hover-bg, rgba(255, 255, 255, 0.1));
  color: var(--text-primary, #fff);
}

.action-btn.delete:hover {
  background-color: rgba(244, 67, 54, 0.1);
  color: #f44336;
}

.action-btn svg {
  width: 18px;
  height: 18px;
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.email-meta {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  background-color: var(--meta-bg, rgba(255, 255, 255, 0.03));
  border-radius: 12px;
  margin-bottom: 16px;
}

.meta-main {
  display: flex;
  gap: 12px;
}

.sender-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: var(--primary-color, #646cff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
}

.meta-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sender-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.sender-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #fff);
}

.sender-email {
  font-size: 0.8125rem;
  color: var(--text-secondary, #888);
}

.recipient-row,
.date-row {
  display: flex;
  gap: 6px;
  font-size: 0.8125rem;
}

.meta-label {
  color: var(--text-secondary, #888);
}

.meta-value {
  color: var(--text-primary, #fff);
}

.read-status {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  background-color: var(--success-bg, rgba(76, 175, 80, 0.1));
  color: #4caf50;
}

.read-status.unread {
  background-color: var(--primary-bg, rgba(100, 108, 255, 0.1));
  color: var(--primary-color, #646cff);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary, #888);
}

.section-title svg {
  width: 16px;
  height: 16px;
}

.processed-section {
  margin-bottom: 16px;
}

.email-body-section {
  margin-bottom: 16px;
}

.attachments-section {
  margin-bottom: 16px;
}

.attachments-placeholder {
  padding: 24px;
  background-color: var(--card-bg, rgba(255, 255, 255, 0.03));
  border-radius: 12px;
  text-align: center;
  color: var(--text-secondary, #888);
}

.attachments-placeholder p {
  margin: 0;
  font-size: 0.875rem;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .detail-header {
    padding: 12px 16px;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  
  .back-btn {
    width: 40px;
    height: 40px;
    background-color: var(--hover-bg, rgba(255, 255, 255, 0.1));
  }
  
  .back-btn svg {
    width: 24px;
    height: 24px;
  }
  
  .detail-title {
    font-size: 0.9375rem;
  }
  
  .detail-content {
    padding: 12px;
  }
  
  .email-meta {
    flex-direction: column;
    gap: 12px;
  }
  
  .read-status {
    align-self: flex-start;
  }
  
  .header-actions {
    gap: 2px;
  }
  
  .action-btn {
    width: 40px;
    height: 40px;
  }
}
</style>
