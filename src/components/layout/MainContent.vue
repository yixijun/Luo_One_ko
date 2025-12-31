<script setup lang="ts">
/**
 * 洛一 (Luo One) 邮箱管理系统 - 主内容区组件
 * Requirements: 8.2, 8.3, 8.4
 * 实现邮件列表和邮件内容展示
 */
import { ref, computed, watch, onMounted } from 'vue';
import { useAccountStore } from '@/stores/account';
import { useEmailStore } from '@/stores/email';
import type { Email, EmailFolder } from '@/types';

const accountStore = useAccountStore();
const emailStore = useEmailStore();

// 排序方式
const sortBy = ref<'date' | 'from'>('date');

// 当前文件夹
const currentFolder = ref<EmailFolder>('inbox');

// 当前选中的邮件
const selectedEmail = ref<Email | null>(null);

// 批量选择模式
const isSelectMode = ref(false);
const selectedEmailIds = ref<Set<number>>(new Set());

// 计算属性
const currentAccount = computed(() => accountStore.currentAccount);
const emails = computed(() => emailStore.emails);
const loading = computed(() => emailStore.loading);
const hasEmails = computed(() => emailStore.hasEmails);

// 文件夹选项
const folderOptions = [
  { value: 'inbox', label: '收件箱' },
  { value: 'sent', label: '已发送' },
  { value: 'trash', label: '已删除' },
  { value: 'all', label: '全部' },
];

// 获取当前文件夹标签
const currentFolderLabel = computed(() => {
  const folder = folderOptions.find(f => f.value === currentFolder.value);
  return folder?.label || '收件箱';
});

// 删除状态
const isDeleting = ref(false);

// 批量选择计算属性
const hasSelectedEmails = computed(() => selectedEmailIds.value.size > 0);
const isAllSelected = computed(() => 
  emails.value.length > 0 && selectedEmailIds.value.size === emails.value.length
);
const selectedCount = computed(() => selectedEmailIds.value.size);

// 监听排序变化
watch(sortBy, (newSort) => {
  emailStore.fetchEmails({
    accountId: currentAccount.value?.id,
    folder: currentFolder.value,
    sort: newSort,
  });
});

// 监听文件夹变化
watch(currentFolder, (newFolder) => {
  selectedEmail.value = null;
  isSelectMode.value = false;
  selectedEmailIds.value.clear();
  emailStore.fetchEmails({
    accountId: currentAccount.value?.id,
    folder: newFolder,
    sort: sortBy.value,
  });
});

// 选择邮件
async function selectEmail(email: Email) {
  selectedEmail.value = email;
  if (!email.isRead) {
    await emailStore.markAsRead(email.id);
  }
}

// 删除邮件
async function deleteEmail() {
  if (!selectedEmail.value || isDeleting.value) return;
  
  const confirmed = window.confirm('确定要删除这封邮件吗？');
  if (!confirmed) return;
  
  isDeleting.value = true;
  try {
    const success = await emailStore.deleteEmail(selectedEmail.value.id);
    if (success) {
      selectedEmail.value = null;
    }
  } finally {
    isDeleting.value = false;
  }
}

// 切换选择模式
function toggleSelectMode() {
  isSelectMode.value = !isSelectMode.value;
  if (!isSelectMode.value) {
    selectedEmailIds.value.clear();
  }
}

// 切换单个邮件选择
function toggleEmailSelection(emailId: number, event: Event) {
  event.stopPropagation();
  if (selectedEmailIds.value.has(emailId)) {
    selectedEmailIds.value.delete(emailId);
  } else {
    selectedEmailIds.value.add(emailId);
  }
  // 触发响应式更新
  selectedEmailIds.value = new Set(selectedEmailIds.value);
}

// 全选/取消全选
function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedEmailIds.value.clear();
  } else {
    selectedEmailIds.value = new Set(emails.value.map(e => e.id));
  }
}

// 批量删除邮件
async function batchDeleteEmails() {
  if (!hasSelectedEmails.value || isDeleting.value) return;
  
  const count = selectedEmailIds.value.size;
  const confirmed = window.confirm(`确定要删除选中的 ${count} 封邮件吗？`);
  if (!confirmed) return;
  
  isDeleting.value = true;
  try {
    const idsToDelete = Array.from(selectedEmailIds.value);
    let successCount = 0;
    
    for (const id of idsToDelete) {
      const success = await emailStore.deleteEmail(id);
      if (success) {
        successCount++;
        selectedEmailIds.value.delete(id);
      }
    }
    
    // 如果当前选中的邮件被删除，清除选中状态
    if (selectedEmail.value && !emails.value.find(e => e.id === selectedEmail.value?.id)) {
      selectedEmail.value = null;
    }
    
    // 退出选择模式
    if (successCount > 0) {
      isSelectMode.value = false;
      selectedEmailIds.value.clear();
    }
  } finally {
    isDeleting.value = false;
  }
}

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

// 格式化完整日期时间
function formatFullDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('zh-CN');
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

// 初始化
onMounted(() => {
  if (!emailStore.hasEmails) {
    emailStore.fetchEmails({ folder: currentFolder.value, sort: sortBy.value });
  }
});
</script>

<template>
  <main class="main-content">
    <!-- 邮件列表 -->
    <div class="emails-panel">
      <div class="panel-header">
        <div class="header-left">
          <input 
            v-if="isSelectMode && hasEmails"
            type="checkbox" 
            :checked="isAllSelected"
            @change="toggleSelectAll"
            class="select-checkbox"
          />
          <h3>{{ currentFolderLabel }}</h3>
        </div>
        <div class="header-actions">
          <button 
            v-if="isSelectMode && hasSelectedEmails" 
            class="batch-delete-btn"
            @click="batchDeleteEmails"
            :disabled="isDeleting"
          >
            <svg v-if="!isDeleting" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            <span v-else class="loading-spinner small"></span>
            <span>删除 ({{ selectedCount }})</span>
          </button>
          <button 
            class="select-mode-btn"
            :class="{ active: isSelectMode }"
            @click="toggleSelectMode"
            v-if="hasEmails"
          >
            {{ isSelectMode ? '取消' : '选择' }}
          </button>
          <select v-model="currentFolder" class="folder-select" v-if="!isSelectMode">
            <option v-for="folder in folderOptions" :key="folder.value" :value="folder.value">
              {{ folder.label }}
            </option>
          </select>
          <select v-model="sortBy" class="sort-select" v-if="!isSelectMode">
            <option value="date">按时间</option>
            <option value="from">按发件人</option>
          </select>
        </div>
      </div>
      
      <div class="emails-list" v-if="!loading">
        <div v-if="!hasEmails" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
          </svg>
          <p>暂无邮件</p>
        </div>
        
        <button
          v-else
          v-for="email in emails"
          :key="email.id"
          class="email-item"
          :class="{ 
            active: selectedEmail?.id === email.id, 
            unread: !email.isRead,
            selected: selectedEmailIds.has(email.id)
          }"
          @click="isSelectMode ? toggleEmailSelection(email.id, $event) : selectEmail(email)"
        >
          <div class="email-sender">
            <input 
              v-if="isSelectMode"
              type="checkbox" 
              :checked="selectedEmailIds.has(email.id)"
              @click="toggleEmailSelection(email.id, $event)"
              class="select-checkbox"
            />
            <span class="sender-name">{{ getSenderName(email.from) }}</span>
            <span class="email-date">{{ formatDate(email.date) }}</span>
          </div>
          <div class="email-subject">{{ email.subject || '(无主题)' }}</div>
          <div class="email-preview">{{ email.body?.substring(0, 80) || '' }}...</div>
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
      
      <div v-else class="loading-state">
        <span class="loading-spinner"></span>
        <span>加载中...</span>
      </div>
    </div>

    <!-- 右栏：邮件内容（聊天气泡形式） -->
    <div class="content-panel">
      <template v-if="selectedEmail">
        <div class="panel-header content-header">
          <h3>{{ selectedEmail.subject || '(无主题)' }}</h3>
          <button 
            class="delete-btn" 
            @click="deleteEmail"
            :disabled="isDeleting"
            title="删除邮件"
          >
            <svg v-if="!isDeleting" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
            <span v-else class="loading-spinner small"></span>
          </button>
        </div>
        
        <div class="email-content">
          <!-- 邮件元信息 -->
          <div class="email-meta">
            <div class="meta-row">
              <span class="meta-label">发件人:</span>
              <span class="meta-value">{{ selectedEmail.from }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">收件人:</span>
              <span class="meta-value">{{ selectedEmail.to.join(', ') }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">时间:</span>
              <span class="meta-value">{{ formatFullDate(selectedEmail.date) }}</span>
            </div>
          </div>

          <!-- 处理结果信息 -->
          <div class="processed-info" v-if="selectedEmail.processedResult">
            <div class="info-card" v-if="selectedEmail.processedResult.verificationCode">
              <div class="info-icon code">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div class="info-content">
                <span class="info-label">验证码</span>
                <span class="info-value code-value">{{ selectedEmail.processedResult.verificationCode }}</span>
              </div>
            </div>
            
            <div class="info-card" v-if="selectedEmail.processedResult.isAd">
              <div class="info-icon ad">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div class="info-content">
                <span class="info-label">广告邮件</span>
                <span class="info-value">此邮件被识别为广告</span>
              </div>
            </div>

            <div class="info-card" v-if="selectedEmail.processedResult.summary">
              <div class="info-icon summary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <div class="info-content">
                <span class="info-label">内容摘要</span>
                <span class="info-value">{{ selectedEmail.processedResult.summary }}</span>
              </div>
            </div>

            <div class="info-card importance">
              <div 
                class="info-icon" 
                :style="{ backgroundColor: getImportanceColor(selectedEmail.processedResult.importance) }"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div class="info-content">
                <span class="info-label">重要度</span>
                <span class="info-value">{{ getImportanceLabel(selectedEmail.processedResult.importance) }}</span>
              </div>
            </div>
          </div>

          <!-- 邮件正文（聊天气泡形式） -->
          <div class="email-bubble">
            <div class="bubble-header">
              <div class="sender-avatar">
                {{ getSenderName(selectedEmail.from).charAt(0).toUpperCase() }}
              </div>
              <div class="sender-info">
                <span class="sender-name">{{ getSenderName(selectedEmail.from) }}</span>
                <span class="send-time">{{ formatFullDate(selectedEmail.date) }}</span>
              </div>
            </div>
            <div class="bubble-content">
              <div v-if="selectedEmail.htmlBody" v-html="selectedEmail.htmlBody" class="html-content"></div>
              <div v-else class="text-content">{{ selectedEmail.body }}</div>
            </div>
            <div class="bubble-footer" v-if="selectedEmail.hasAttachments">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
              <span>包含附件</span>
            </div>
          </div>
        </div>
      </template>
      
      <div v-else class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
        </svg>
        <p>选择一封邮件查看详情</p>
      </div>
    </div>
  </main>
</template>


<style scoped>
.main-content {
  display: flex;
  flex: 1;
  height: calc(100vh - 56px);
  overflow: hidden;
}

/* 邮件列表 */
.panel-header {
  padding: 12px;
  border-bottom: 1px solid var(--border-color, #2d2d44);
}

.panel-header h3 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary, #fff);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.select-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--primary-color, #646cff);
  flex-shrink: 0;
}

.select-mode-btn {
  padding: 4px 10px;
  border: 1px solid var(--border-color, #2d2d44);
  border-radius: 4px;
  background-color: transparent;
  color: var(--text-secondary, #888);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.select-mode-btn:hover {
  background-color: var(--hover-bg, rgba(255, 255, 255, 0.05));
  color: var(--text-primary, #fff);
}

.select-mode-btn.active {
  background-color: var(--primary-color, #646cff);
  border-color: var(--primary-color, #646cff);
  color: #fff;
}

.batch-delete-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  background-color: var(--error-color, #f44336);
  color: #fff;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.batch-delete-btn:hover:not(:disabled) {
  background-color: #d32f2f;
}

.batch-delete-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.batch-delete-btn svg {
  width: 14px;
  height: 14px;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.content-header h3 {
  flex: 1;
  margin-right: 12px;
}

.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, #888);
  cursor: pointer;
  transition: color 0.2s, background-color 0.2s;
  flex-shrink: 0;
}

.delete-btn:hover:not(:disabled) {
  color: var(--error-color, #f44336);
  background-color: rgba(244, 67, 54, 0.1);
}

.delete-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.delete-btn svg {
  width: 20px;
  height: 20px;
}

.delete-btn .loading-spinner.small {
  width: 18px;
  height: 18px;
  border-width: 2px;
}

.emails-panel {
  width: 320px;
  display: flex;
  flex-direction: column;
  background-color: var(--panel-bg, #1a1a2e);
  border-right: 1px solid var(--border-color, #2d2d44);
}

.sort-controls {
  display: flex;
  align-items: center;
}

.folder-select,
.sort-select {
  padding: 4px 8px;
  border: 1px solid var(--border-color, #2d2d44);
  border-radius: 4px;
  background-color: var(--input-bg, #2d2d44);
  color: var(--text-primary, #fff);
  font-size: 0.75rem;
  cursor: pointer;
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

.email-item.selected {
  background-color: var(--selected-bg, rgba(100, 108, 255, 0.15));
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

.email-preview {
  font-size: 0.75rem;
  color: var(--text-secondary, #888);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

/* 右栏：邮件内容 */
.content-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--content-bg, #0f0f1a);
  overflow: hidden;
}

.email-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.email-meta {
  padding: 12px 16px;
  background-color: var(--meta-bg, rgba(255, 255, 255, 0.03));
  border-radius: 8px;
  margin-bottom: 16px;
}

.meta-row {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 0.8125rem;
}

.meta-row:last-child {
  margin-bottom: 0;
}

.meta-label {
  color: var(--text-secondary, #888);
  flex-shrink: 0;
}

.meta-value {
  color: var(--text-primary, #fff);
  word-break: break-all;
}

.processed-info {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background-color: var(--card-bg, rgba(255, 255, 255, 0.03));
  border-radius: 8px;
  min-width: 200px;
}

.info-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.info-icon svg {
  width: 20px;
  height: 20px;
  color: #fff;
}

.info-icon.code {
  background-color: #4caf50;
}

.info-icon.ad {
  background-color: #ff9800;
}

.info-icon.summary {
  background-color: #2196f3;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: 0.75rem;
  color: var(--text-secondary, #888);
}

.info-value {
  font-size: 0.875rem;
  color: var(--text-primary, #fff);
}

.code-value {
  font-family: monospace;
  font-size: 1.25rem;
  font-weight: 600;
  color: #4caf50;
  letter-spacing: 2px;
}

/* 邮件气泡 */
.email-bubble {
  background-color: var(--bubble-bg, rgba(255, 255, 255, 0.05));
  border-radius: 12px;
  overflow: hidden;
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
}

.sender-info .sender-name {
  font-size: 0.9375rem;
  font-weight: 500;
}

.send-time {
  font-size: 0.75rem;
  color: var(--text-secondary, #888);
}

.bubble-content {
  padding: 16px;
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
}

.html-content :deep(a) {
  color: var(--primary-color, #646cff);
}

.text-content {
  white-space: pre-wrap;
  word-break: break-word;
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

/* 空状态和加载状态 */
.empty-state,
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
  color: var(--text-secondary, #888);
}

.empty-state svg,
.loading-state svg {
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

/* 响应式布局 */
@media (max-width: 1024px) {
  .emails-panel {
    width: 280px;
  }
}

@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }
  
  .emails-panel {
    width: 100%;
    height: 40%;
    border-right: none;
    border-bottom: 1px solid var(--border-color, #2d2d44);
  }
  
  .content-panel {
    height: 60%;
  }
}
</style>
