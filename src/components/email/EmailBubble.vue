<script setup lang="ts">
/**
 * 洛一 (Luo One) 邮箱管理系统 - 邮件气泡组件
 * Requirements: 8.4
 * 以聊天气泡形式展示邮件
 */
import type { Email } from '@/types';

// Props
defineProps<{
  email: Email;
  showFullContent?: boolean;
}>();

// Emits
const emit = defineEmits<{
  (e: 'click'): void;
}>();

// 格式化完整日期时间
function formatFullDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('zh-CN');
}

// 格式化简短日期
function formatShortDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  
  return date.toLocaleDateString('zh-CN', { 
    month: 'short', 
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

// 获取发件人首字母
function getSenderInitial(from: string): string {
  return getSenderName(from).charAt(0).toUpperCase();
}

// 处理点击
function handleClick() {
  emit('click');
}
</script>

<template>
  <div 
    class="email-bubble" 
    :class="{ clickable: !showFullContent }"
    @click="handleClick"
  >
    <!-- 气泡头部 -->
    <div class="bubble-header">
      <div class="sender-avatar">
        {{ getSenderInitial(email.from) }}
      </div>
      <div class="sender-info">
        <span class="sender-name">{{ getSenderName(email.from) }}</span>
        <span class="send-time">{{ showFullContent ? formatFullDate(email.date) : formatShortDate(email.date) }}</span>
      </div>
      <div class="bubble-indicators">
        <span v-if="!email.isRead" class="unread-dot" title="未读"></span>
        <span v-if="email.hasAttachments" class="attachment-icon" title="包含附件">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
        </span>
      </div>
    </div>

    <!-- 邮件主题 -->
    <div class="bubble-subject" v-if="email.subject">
      {{ email.subject }}
    </div>

    <!-- 气泡内容 -->
    <div class="bubble-content">
      <template v-if="showFullContent">
        <div v-if="email.htmlBody" v-html="email.htmlBody" class="html-content"></div>
        <div v-else class="text-content">{{ email.body }}</div>
      </template>
      <template v-else>
        <div class="preview-content">
          {{ email.body?.substring(0, 150) || '(无内容)' }}
          <span v-if="email.body && email.body.length > 150">...</span>
        </div>
      </template>
    </div>

    <!-- 气泡底部 -->
    <div class="bubble-footer" v-if="email.hasAttachments && showFullContent">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
      </svg>
      <span>包含附件</span>
    </div>

    <!-- 点击提示 -->
    <div class="click-hint" v-if="!showFullContent">
      点击查看详情
    </div>
  </div>
</template>

<style scoped>
.email-bubble {
  background-color: var(--bubble-bg, rgba(255, 255, 255, 0.05));
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.email-bubble.clickable {
  cursor: pointer;
}

.email-bubble.clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.email-bubble.clickable:hover .click-hint {
  opacity: 1;
}

.bubble-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #2d2d44);
}

.sender-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--primary-color, #646cff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
}

.sender-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.sender-name {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-primary, #fff);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.send-time {
  font-size: 0.75rem;
  color: var(--text-secondary, #888);
}

.bubble-indicators {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--primary-color, #646cff);
}

.attachment-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #888);
}

.attachment-icon svg {
  width: 16px;
  height: 16px;
}

.bubble-subject {
  padding: 12px 16px 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary, #fff);
}

.bubble-content {
  padding: 12px 16px;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--text-primary, #fff);
}

.html-content {
  word-break: break-word;
}

.html-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

.html-content :deep(a) {
  color: var(--primary-color, #646cff);
}

.html-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
}

.html-content :deep(td),
.html-content :deep(th) {
  border: 1px solid var(--border-color, #2d2d44);
  padding: 8px;
}

.text-content {
  white-space: pre-wrap;
  word-break: break-word;
}

.preview-content {
  color: var(--text-secondary, #888);
  font-size: 0.875rem;
}

.bubble-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-color, #2d2d44);
  font-size: 0.8125rem;
  color: var(--text-secondary, #888);
}

.bubble-footer svg {
  width: 16px;
  height: 16px;
}

.click-hint {
  padding: 8px 16px;
  text-align: center;
  font-size: 0.75rem;
  color: var(--primary-color, #646cff);
  background-color: rgba(100, 108, 255, 0.1);
  opacity: 0;
  transition: opacity 0.2s;
}
</style>
