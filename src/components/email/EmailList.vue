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
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-color-subtle, var(--border-color));
  background-color: var(--panel-bg);
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sort-label {
  font-size: 0.75rem;
  color: var(--text-muted, var(--text-tertiary));
  font-weight: 500;
}

.sort-select {
  padding: 6px 28px 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 12px);
  background-color: var(--input-bg);
  color: var(--text-primary);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  transition: all var(--transition-fast, 0.15s ease);
}

.sort-select:hover {
  border-color: var(--text-tertiary);
}

.sort-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.email-count {
  font-size: 0.75rem;
  color: var(--text-muted, var(--text-tertiary));
  font-weight: 500;
}

.emails-list {
  flex: 1;
  overflow-y: auto;
}

.email-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  padding: 16px 18px;
  border: none;
  border-bottom: 1px solid var(--border-color-subtle, var(--border-color));
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
  position: relative;
}

.email-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--primary-color);
  opacity: 0;
  transition: opacity var(--transition-fast, 0.15s ease);
}

.email-item:hover {
  background-color: var(--hover-bg);
}

.email-item.active {
  background-color: var(--active-bg);
}

.email-item.active::before {
  opacity: 1;
}

.email-item.unread {
  background-color: var(--unread-bg);
}

.email-item.unread::after {
  content: '';
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  background: var(--primary-color);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--primary-glow);
}

.email-item.unread .sender-name,
.email-item.unread .email-subject {
  font-weight: 700;
  color: var(--text-primary);
}

.email-sender {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sender-name {
  font-size: 0.875rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.email-date {
  font-size: 0.6875rem;
  color: var(--text-muted, var(--text-tertiary));
  flex-shrink: 0;
  margin-left: 12px;
  font-weight: 500;
}

.email-subject {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.email-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.email-preview {
  font-size: 0.75rem;
  color: var(--text-muted, var(--text-tertiary));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  line-height: 1.4;
}

.received-time {
  font-size: 0.625rem;
  color: var(--text-muted, var(--text-tertiary));
  white-space: nowrap;
  flex-shrink: 0;
  opacity: 0.8;
}

.email-tags {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.tag {
  padding: 3px 10px;
  border-radius: var(--radius-full, 9999px);
  font-size: 0.625rem;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.code-tag {
  background: linear-gradient(135deg, var(--success-color), #059669);
  box-shadow: 0 2px 8px var(--success-light, rgba(16, 185, 129, 0.3));
}

.ad-tag {
  background: linear-gradient(135deg, var(--warning-color), #d97706);
  box-shadow: 0 2px 8px var(--warning-light, rgba(245, 158, 11, 0.3));
}

.importance-tag {
  background: linear-gradient(135deg, #71717a, #52525b);
}

/* 空状态和加载状态 */
.empty-state,
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 48px 24px;
  color: var(--text-tertiary);
}

.empty-state svg {
  width: 80px;
  height: 80px;
  margin-bottom: 20px;
  opacity: 0.3;
  stroke-width: 1;
}

.empty-state p {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 500;
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
