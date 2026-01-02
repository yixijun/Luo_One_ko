<script setup lang="ts">
/**
 * 洛一 (Luo One) 邮箱管理系统 - 邮件列表组件
 * Requirements: 8.3
 * 支持按时间和发件人排序
 */
import { computed, ref, watch } from 'vue';
import type { Email } from '@/types';

// Props
const props = withDefaults(defineProps<{
  emails: Email[];
  selectedId?: number | null;
  loading?: boolean;
  sortBy?: 'date' | 'from';
}>(), {
  selectedId: null,
  loading: false,
  sortBy: 'date',
});

// Emits
const emit = defineEmits<{
  (e: 'select', email: Email): void;
  (e: 'update:sortBy', value: 'date' | 'from'): void;
}>();

// 本地排序状态
const localSortBy = ref<'date' | 'from'>(props.sortBy);

// 监听 props 变化
watch(() => props.sortBy, (newVal) => {
  localSortBy.value = newVal;
});

// 排序变化时触发
watch(localSortBy, (newVal) => {
  emit('update:sortBy', newVal);
});

// 计算排序后的邮件列表
const sortedEmails = computed(() => {
  const emailsCopy = [...props.emails];
  if (localSortBy.value === 'date') {
    return emailsCopy.sort((a, b) => b.date - a.date);
  } else {
    return emailsCopy.sort((a, b) => {
      const nameA = getSenderName(a.from).toLowerCase();
      const nameB = getSenderName(b.from).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }
});

// 是否有邮件
const hasEmails = computed(() => props.emails.length > 0);

// 格式化日期
function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return '昨天';
  }
  
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

// 格式化收取时间
function formatReceivedTime(timestamp?: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('zh-CN', { 
    month: 'numeric', 
    day: 'numeric',
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

// 获取发件人名称
function getSenderName(from: string): string {
  const match = from.match(/^(.+?)\s*<.+>$/);
  return match?.[1] ?? from.split('@')[0] ?? from;
}

// 获取重要度颜色
function getImportanceColor(importance: string): string {
  switch (importance) {
    case 'critical': return '#f44336';
    case 'high': return '#ff9800';
    case 'medium': return '#2196f3';
    default: return '#9e9e9e';
  }
}

// 获取重要度标签
function getImportanceLabel(importance: string): string {
  switch (importance) {
    case 'critical': return '紧急';
    case 'high': return '重要';
    case 'medium': return '一般';
    default: return '普通';
  }
}

// 选择邮件
function handleSelect(email: Email) {
  emit('select', email);
}

// 获取邮件预览文本
function getEmailPreview(email: Email): string {
  // 优先使用纯文本 body
  if (email.body && email.body.trim()) {
    // 清理多余空白字符
    const cleaned = email.body.replace(/\s+/g, ' ').trim();
    return cleaned.substring(0, 60) + (cleaned.length > 60 ? '...' : '');
  }
  // 如果有 HTML body，提取文本
  if (email.htmlBody && email.htmlBody.trim()) {
    // 简单移除 HTML 标签
    const text = email.htmlBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text) {
      return text.substring(0, 60) + (text.length > 60 ? '...' : '');
    }
  }
  return '—';
}
</script>

<template>
  <div class="email-list-container">
    <!-- 排序控制 -->
    <div class="list-header">
      <div class="sort-controls">
        <label class="sort-label">排序:</label>
        <select v-model="localSortBy" class="sort-select">
          <option value="date">按时间</option>
          <option value="from">按发件人</option>
        </select>
      </div>
      <span class="email-count">{{ emails.length }} 封邮件</span>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <span class="loading-spinner"></span>
      <span>加载中...</span>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!hasEmails" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
      </svg>
      <p>暂无邮件</p>
    </div>

    <!-- 邮件列表 -->
    <div v-else class="emails-list">
      <button
        v-for="email in sortedEmails"
        :key="email.id"
        class="email-item"
        :class="{ 
          active: selectedId === email.id, 
          unread: !email.isRead 
        }"
        @click="handleSelect(email)"
      >
        <div class="email-sender">
          <span class="sender-name">{{ getSenderName(email.from) }}</span>
          <span class="email-date">{{ formatDate(email.date) }}</span>
        </div>
        <div class="email-subject">{{ email.subject || '(无主题)' }}</div>
        <div class="email-meta">
          <span class="email-preview">{{ getEmailPreview(email) }}</span>
          <span v-if="email.createdAt" class="received-time" title="收取时间">
            📥 {{ formatReceivedTime(email.createdAt) }}
          </span>
        </div>
        <div class="email-tags" v-if="email.processedResult">
          <span 
            v-if="email.processedResult.verificationCode" 
            class="tag code-tag"
          >
            验证码
          </span>
          <span 
            v-if="email.processedResult.isAd" 
            class="tag ad-tag"
          >
            广告
          </span>
          <span 
            class="tag importance-tag"
            :style="{ backgroundColor: getImportanceColor(email.processedResult.importance) }"
          >
            {{ getImportanceLabel(email.processedResult.importance) }}
          </span>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.email-list-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #2d2d44);
  background-color: var(--panel-bg, #1a1a2e);
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-label {
  font-size: 0.75rem;
  color: var(--text-secondary, #888);
}

.sort-select {
  padding: 4px 8px;
  border: 1px solid var(--border-color, #2d2d44);
  border-radius: 4px;
  background-color: var(--input-bg, #2d2d44);
  color: var(--text-primary, #fff);
  font-size: 0.75rem;
  cursor: pointer;
}

.sort-select:focus {
  outline: none;
  border-color: var(--primary-color, #646cff);
}

.email-count {
  font-size: 0.75rem;
  color: var(--text-secondary, #888);
}

.emails-list {
  flex: 1;
  overflow-y: auto;
}

.email-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  border-bottom: 1px solid var(--border-color, #2d2d44);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s;
}

.email-item:hover {
  background-color: var(--hover-bg, rgba(255, 255, 255, 0.03));
}

.email-item.active {
  background-color: var(--active-bg, rgba(100, 108, 255, 0.1));
}

.email-item.unread {
  background-color: var(--unread-bg, rgba(100, 108, 255, 0.05));
}

.email-item.unread .sender-name,
.email-item.unread .email-subject {
  font-weight: 600;
}

.email-sender {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sender-name {
  font-size: 0.875rem;
  color: var(--text-primary, #fff);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.email-date {
  font-size: 0.75rem;
  color: var(--text-secondary, #888);
  flex-shrink: 0;
  margin-left: 8px;
}

.email-subject {
  font-size: 0.8125rem;
  color: var(--text-primary, #fff);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.email-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.email-preview {
  font-size: 0.75rem;
  color: var(--text-secondary, #888);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.received-time {
  font-size: 0.625rem;
  color: var(--text-secondary, #666);
  white-space: nowrap;
  flex-shrink: 0;
}

.email-tags {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}

.tag {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.625rem;
  font-weight: 500;
  color: #fff;
}

.code-tag {
  background-color: #4caf50;
}

.ad-tag {
  background-color: #ff9800;
}

.importance-tag {
  background-color: #9e9e9e;
}

/* 空状态和加载状态 */
.empty-state,
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 24px;
  color: var(--text-secondary, #888);
}

.empty-state svg {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 0.9375rem;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color, #2d2d44);
  border-top-color: var(--primary-color, #646cff);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
