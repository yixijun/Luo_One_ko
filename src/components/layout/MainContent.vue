<script setup lang="ts">
/**
 * 洛一 (Luo One) 邮箱管理系统 - 主内容区组件
 * Requirements: 8.2, 8.3, 8.4
 * 实现邮件列表和邮件内容展示
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAccountStore } from '@/stores/account';
import { useEmailStore } from '@/stores/email';
import { exportEmailAsTxt, exportEmailAsEml, exportEmailsAsCsv, exportEmailsAsJson } from '@/utils/exportEmail';
import type { Email, EmailFolder, Attachment } from '@/types';

const emit = defineEmits<{
  (e: 'email-select', email: Email): void;
}>();

const router = useRouter();

const accountStore = useAccountStore();
const emailStore = useEmailStore();

// 排序方式
const sortBy = ref<'date' | 'from'>('date');

// 当前文件夹
const currentFolder = ref<EmailFolder>('inbox');

// 当前选中的邮件
const selectedEmail = ref<Email | null>(null);

// 移动端检测
const isMobileView = ref(false);

// 附件相关状态
const attachments = ref<Attachment[]>([]);
const loadingAttachments = ref(false);
const downloadingFile = ref<string | null>(null);
const attachmentRetryCount = ref(0);
const maxRetries = 2;

// 复制验证码状态
const codeCopied = ref(false);

// 复制验证码
async function copyVerificationCode() {
  const code = selectedEmail.value?.processedResult?.verificationCode;
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
    codeCopied.value = true;
    setTimeout(() => { codeCopied.value = false; }, 2000);
  } catch (err) {
    console.error('复制失败:', err);
  }
}

function checkMobileView() {
  isMobileView.value = window.innerWidth < 768;
}

// 批量选择模式
const isSelectMode = ref(false);
const selectedEmailIds = ref<Set<number>>(new Set());

// 计算属性
const currentAccount = computed(() => accountStore.currentAccount);
const emails = computed(() => emailStore.emails);
const loading = computed(() => emailStore.loading);
const loadingMore = computed(() => emailStore.loadingMore);
const hasEmails = computed(() => emailStore.hasEmails);
const hasMore = computed(() => emailStore.hasMore);

// 文件夹选项
const folderOptions = [
  { value: 'inbox', label: '收件箱' },
  { value: 'sent', label: '已发送' },
  { value: 'trash', label: '已删除' },
  { value: 'all', label: '全部' },
];



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

// 监听账户变化
watch(currentAccount, (newAccount) => {
  selectedEmail.value = null;
  isSelectMode.value = false;
  selectedEmailIds.value.clear();
  emailStore.fetchEmails({
    accountId: newAccount?.id,
    folder: currentFolder.value,
    sort: sortBy.value,
  });
});

// 选择邮件
async function selectEmail(email: Email) {
  selectedEmail.value = email;
  if (!email.isRead) {
    await emailStore.markAsRead(email.id);
  }
  // 移动端通过事件通知父组件显示详情
  if (isMobileView.value) {
    emit('email-select', email);
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

// 从 "Name <email>" 格式中提取纯邮箱地址
function extractEmail(addr: string): string {
  const match = addr.match(/<([^>]+)>/);
  return match ? match[1]! : addr.trim();
}

// 回复邮件
function handleReply() {
  if (!selectedEmail.value) return;
  const email = selectedEmail.value;
  const subject = email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`;
  router.push({
    name: 'Compose',
    query: { replyTo: email.id.toString(), to: extractEmail(email.from), subject },
  });
}

// 回复全部
function handleReplyAll() {
  if (!selectedEmail.value) return;
  const email = selectedEmail.value;
  const allRecipients = [email.from, ...email.to].map(extractEmail).filter((v, i, a) => a.indexOf(v) === i);
  router.push({
    name: 'Compose',
    query: {
      replyTo: email.id.toString(),
      to: allRecipients.join(','),
      subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
    },
  });
}

// 转发邮件
function handleForward() {
  if (!selectedEmail.value) return;
  const email = selectedEmail.value;
  const subject = email.subject.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`;
  router.push({
    name: 'Compose',
    query: { forwardFrom: email.id.toString(), subject },
  });
}

// 切换已读/未读
async function handleToggleRead() {
  if (!selectedEmail.value) return;
  const email = selectedEmail.value;
  if (email.isRead) {
    await emailStore.markAsUnread(email.id);
  } else {
    await emailStore.markAsRead(email.id);
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

// 全部已读状态
const isMarkingAllRead = ref(false);
const isBatchMarkingRead = ref(false);

// 全部已读
async function markAllAsRead() {
  if (isMarkingAllRead.value) return;
  
  isMarkingAllRead.value = true;
  try {
    const count = await emailStore.markAllAsRead(currentAccount.value?.id);
    if (count >= 0) {
      console.log(`已将 ${count} 封邮件标记为已读`);
    }
  } finally {
    isMarkingAllRead.value = false;
  }
}

// 批量标记已读
async function batchMarkAsRead() {
  if (!hasSelectedEmails.value || isBatchMarkingRead.value) return;
  
  isBatchMarkingRead.value = true;
  try {
    const idsToMark = Array.from(selectedEmailIds.value);
    let successCount = 0;
    
    for (const id of idsToMark) {
      const success = await emailStore.markAsRead(id);
      if (success) {
        successCount++;
      }
    }
    
    // 退出选择模式
    if (successCount > 0) {
      isSelectMode.value = false;
      selectedEmailIds.value.clear();
    }
  } finally {
    isBatchMarkingRead.value = false;
  }
}

// 导出相关
const showExportMenu = ref(false);
const showBatchExportMenu = ref(false);

function handleExportTxt() {
  if (selectedEmail.value) exportEmailAsTxt(selectedEmail.value);
  showExportMenu.value = false;
}
function handleExportEml() {
  if (selectedEmail.value) exportEmailAsEml(selectedEmail.value);
  showExportMenu.value = false;
}
function handleBatchExportCsv() {
  const selected = emails.value.filter(e => selectedEmailIds.value.has(e.id));
  if (selected.length) exportEmailsAsCsv(selected);
  showBatchExportMenu.value = false;
}
function handleBatchExportJson() {
  const selected = emails.value.filter(e => selectedEmailIds.value.has(e.id));
  if (selected.length) exportEmailsAsJson(selected);
  showBatchExportMenu.value = false;
}

// 点击外部关闭导出菜单
function closeExportMenus(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.export-dropdown')) {
    showExportMenu.value = false;
    showBatchExportMenu.value = false;
  }
}
onMounted(() => document.addEventListener('click', closeExportMenus));
onUnmounted(() => document.removeEventListener('click', closeExportMenus));

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

// 滚动加载更多
function handleScroll(event: Event) {
  const target = event.target as HTMLElement;
  if (!target) return;
  
  // 距离底部 100px 时触发加载
  const threshold = 100;
  const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < threshold;
  
  if (isNearBottom && hasMore.value && !loadingMore.value && !loading.value) {
    emailStore.loadMoreEmails();
  }
}

// 加载附件列表
async function loadAttachments() {
  if (!selectedEmail.value?.hasAttachments || !selectedEmail.value?.id) return;
  
  loadingAttachments.value = true;
  try {
    const result = await emailStore.fetchAttachments(selectedEmail.value.id);
    attachments.value = result;
    
    // 如果附件列表为空且还有重试次数，延迟后重试
    if (result.length === 0 && attachmentRetryCount.value < maxRetries) {
      attachmentRetryCount.value++;
      setTimeout(() => {
        loadAttachments();
      }, 1500);
    }
  } catch (err) {
    console.error('加载附件失败:', err);
  } finally {
    loadingAttachments.value = false;
  }
}

// 下载附件
async function handleDownloadAttachment(attachment: Attachment) {
  if (!selectedEmail.value?.id) return;
  
  const rawFilename = attachment.raw_filename || attachment.filename;
  downloadingFile.value = rawFilename;
  try {
    await emailStore.downloadAttachment(selectedEmail.value.id, rawFilename, attachment.filename);
  } catch (err) {
    console.error('下载附件失败:', err);
    alert('下载附件失败');
  } finally {
    downloadingFile.value = null;
  }
}

// 获取附件的显示文件名
function getAttachmentDisplayName(attachment: Attachment): string {
  return attachment.filename || attachment.raw_filename || 'attachment';
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// 获取文件图标类型
function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'word';
  if (['xls', 'xlsx'].includes(ext)) return 'excel';
  if (['ppt', 'pptx'].includes(ext)) return 'ppt';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  return 'file';
}

// 监听选中邮件变化，加载附件
watch(selectedEmail, (newEmail) => {
  attachmentRetryCount.value = 0;
  attachments.value = [];
  if (newEmail?.hasAttachments) {
    loadAttachments();
  }
});

// 初始化
onMounted(() => {
  checkMobileView();
  window.addEventListener('resize', checkMobileView);
  
  if (!emailStore.hasEmails) {
    emailStore.fetchEmails({ folder: currentFolder.value, sort: sortBy.value });
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobileView);
});
</script>

<template>
  <main class="main-content" :class="{ 'mobile': isMobileView }">
    <!-- 邮件列表 -->
    <div class="emails-panel">
      <div class="panel-header">
        <div class="header-actions">
          <!-- 批量选择模式 -->
          <template v-if="isSelectMode">
            <label class="checkbox-wrapper">
              <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" class="select-checkbox" />
            </label>
            <span class="selected-info">已选 {{ selectedCount }} 封</span>
            <button v-if="hasSelectedEmails" class="action-btn success" @click="batchMarkAsRead" :disabled="isBatchMarkingRead" title="标记已读">
              <svg v-if="!isBatchMarkingRead" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span v-else class="loading-spinner small"></span>
            </button>
            <button v-if="hasSelectedEmails" class="action-btn danger" @click="batchDeleteEmails" :disabled="isDeleting" title="删除">
              <svg v-if="!isDeleting" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              <span v-else class="loading-spinner small"></span>
            </button>
            <div v-if="hasSelectedEmails" class="export-dropdown" style="position:relative">
              <button class="action-btn" @click.stop="showBatchExportMenu = !showBatchExportMenu" title="导出">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>
              <div v-if="showBatchExportMenu" class="dropdown-menu">
                <button class="dropdown-item" @click="handleBatchExportCsv">导出为 CSV</button>
                <button class="dropdown-item" @click="handleBatchExportJson">导出为 JSON</button>
              </div>
            </div>
            <button class="action-btn cancel" @click="toggleSelectMode">取消</button>
          </template>
          
          <!-- 常规模式 -->
          <template v-else>
            <button v-if="hasEmails && emailStore.unreadCount > 0" class="action-btn" @click="markAllAsRead" :disabled="isMarkingAllRead" title="全部已读">
              <svg v-if="!isMarkingAllRead" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span v-else class="loading-spinner small"></span>
            </button>
            <button v-if="hasEmails" class="action-btn" @click="toggleSelectMode" title="批量选择">选择</button>
            <select v-model="currentFolder" class="header-select">
              <option v-for="folder in folderOptions" :key="folder.value" :value="folder.value">{{ folder.label }}</option>
            </select>
            <select v-model="sortBy" class="header-select">
              <option value="date">按时间</option>
              <option value="from">按发件人</option>
            </select>
          </template>
        </div>
      </div>
      
      <div class="emails-list" @scroll="handleScroll" v-if="!loading">
        <div v-if="!hasEmails" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
          </svg>
          <p>暂无邮件</p>
        </div>
        
        <template v-else>
          <button
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
            <div class="email-tags" v-if="email.processedResult?.verificationCode">
              <span class="tag code-tag">验证码</span>
            </div>
          </button>
          
          <!-- 加载更多提示 -->
          <div v-if="loadingMore" class="load-more-indicator">
            <span class="loading-spinner small"></span>
            <span>加载更多...</span>
          </div>
          <div v-else-if="hasMore" class="load-more-hint">
            <span>下滑加载更多 ({{ emails.length }}/{{ emailStore.total }})</span>
          </div>
          <div v-else-if="emails.length > 0" class="load-more-end">
            <span>已加载全部 {{ emails.length }} 封邮件</span>
          </div>
        </template>
      </div>
      
      <div v-else class="loading-state">
        <span class="loading-spinner"></span>
        <span>加载中...</span>
      </div>
    </div>

    <!-- 右栏：邮件内容（聊天气泡形式）- 移动端隐藏 -->
    <div class="content-panel" v-if="!isMobileView">
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

        <!-- 操作工具栏 -->
        <div class="action-toolbar">
          <button class="toolbar-btn" @click="handleReply" title="回复">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 17 4 12 9 7"/>
              <path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
            </svg>
            <span>回复</span>
          </button>
          <button class="toolbar-btn" @click="handleReplyAll" title="回复全部">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="7 17 2 12 7 7"/>
              <polyline points="12 17 7 12 12 7"/>
              <path d="M22 18v-2a4 4 0 0 0-4-4H7"/>
            </svg>
            <span>全部回复</span>
          </button>
          <button class="toolbar-btn" @click="handleForward" title="转发">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 17 20 12 15 7"/>
              <path d="M4 18v-2a4 4 0 0 1 4-4h12"/>
            </svg>
            <span>转发</span>
          </button>
          <div class="toolbar-divider"></div>
          <button class="toolbar-btn" @click="handleToggleRead" :title="selectedEmail.isRead ? '标记为未读' : '标记为已读'">
            <svg v-if="selectedEmail.isRead" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8"/>
              <polyline points="22,6 12,13 2,6"/>
              <circle cx="19" cy="19" r="3" fill="var(--primary-color)" stroke="none"/>
            </svg>
            <span>{{ selectedEmail.isRead ? '标为未读' : '标为已读' }}</span>
          </button>
          <button class="toolbar-btn danger" @click="deleteEmail" :disabled="isDeleting" title="删除">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            <span>删除</span>
          </button>
          <div class="toolbar-divider"></div>
          <div class="export-dropdown" style="position:relative">
            <button class="toolbar-btn" @click.stop="showExportMenu = !showExportMenu" title="导出">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>导出</span>
            </button>
            <div v-if="showExportMenu" class="dropdown-menu">
              <button class="dropdown-item" @click="handleExportTxt">导出为 TXT</button>
              <button class="dropdown-item" @click="handleExportEml">导出为 EML</button>
            </div>
          </div>
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

          <!-- 验证码显示区域 -->
          <div class="verification-code-section" v-if="selectedEmail.processedResult?.verificationCode">
            <div class="code-card" @click="copyVerificationCode" :title="codeCopied ? '已复制' : '点击复制'">
              <div class="code-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div class="code-content">
                <span class="code-label">{{ codeCopied ? '✓ 已复制' : '验证码' }}</span>
                <span class="code-value">{{ selectedEmail.processedResult.verificationCode }}</span>
              </div>
              <div class="code-copy-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
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
              <div class="attachments-section">
                <div class="attachments-header">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                  <span>附件 ({{ attachments.length }})</span>
                </div>
                
                <!-- 加载中 -->
                <div v-if="loadingAttachments" class="attachments-loading">
                  <div class="loading-spinner small"></div>
                  <span>加载附件...</span>
                </div>
                
                <!-- 附件列表 -->
                <div v-else-if="attachments.length > 0" class="attachments-list">
                  <div 
                    v-for="attachment in attachments" 
                    :key="attachment.raw_filename || attachment.filename"
                    class="attachment-item"
                    @click="handleDownloadAttachment(attachment)"
                  >
                    <div class="attachment-icon" :class="getFileIcon(attachment.filename)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </div>
                    <div class="attachment-info">
                      <span class="attachment-name">{{ getAttachmentDisplayName(attachment) }}</span>
                      <span class="attachment-size">{{ formatFileSize(attachment.size) }}</span>
                    </div>
                    <div class="attachment-action">
                      <div v-if="downloadingFile === (attachment.raw_filename || attachment.filename)" class="loading-spinner small"></div>
                      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </div>
                  </div>
                </div>
                
                <!-- 无附件 -->
                <div v-else class="attachments-empty">
                  <span>{{ attachmentRetryCount >= maxRetries ? '附件需要重新同步邮件获取' : '附件正在解析中...' }}</span>
                </div>
              </div>
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
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
  background: var(--panel-bg);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
}

/* 复选框 */
.checkbox-wrapper {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.select-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--primary-color);
}

.selected-info {
  font-size: 0.8125rem;
  color: var(--primary-color);
  font-weight: 500;
  white-space: nowrap;
}

/* 操作按钮 */
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.action-btn:hover:not(:disabled) {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn svg {
  width: 16px;
  height: 16px;
}

.action-btn.success:hover:not(:disabled) {
  background: var(--success-color);
  border-color: var(--success-color);
  color: #fff;
}

.action-btn.danger:hover:not(:disabled) {
  background: var(--error-color);
  border-color: var(--error-color);
  color: #fff;
}

.action-btn.cancel {
  color: var(--text-tertiary);
}

/* 下拉选择 */
.header-select {
  height: 30px;
  padding: 0 24px 0 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 0.75rem;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  flex-shrink: 0;
}

.header-select:focus {
  outline: none;
  border-color: var(--primary-color);
}

.panel-header h3 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
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
  width: 38px;
  height: 38px;
  padding: 0;
  border: none;
  border-radius: var(--radius-md, 10px);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
  flex-shrink: 0;
}

.delete-btn:hover:not(:disabled) {
  color: var(--error-color);
  background-color: rgba(239, 68, 68, 0.12);
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

/* 操作工具栏 */
.action-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 18px;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--panel-bg);
  overflow-x: auto;
  scrollbar-width: none;
}
.action-toolbar::-webkit-scrollbar { display: none; }

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: none;
  border-radius: var(--radius-md, 10px);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.toolbar-btn:hover {
  background-color: var(--hover-bg);
  color: var(--text-primary);
}

.toolbar-btn.danger:hover {
  background-color: rgba(244, 67, 54, 0.12);
  color: var(--error-color);
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar-btn svg { width: 18px; height: 18px; flex-shrink: 0; }

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: var(--border-color);
  margin: 0 4px;
  flex-shrink: 0;
}

.emails-panel {
  width: 340px;
  display: flex;
  flex-direction: column;
  background-color: var(--panel-bg);
  border-right: 1px solid var(--border-color);
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
  padding: 14px 16px;
  border: none;
  border-bottom: 1px solid var(--border-color);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
}

.email-item:hover {
  background-color: var(--hover-bg);
}

.email-item.active {
  background-color: var(--active-bg);
}

.email-item.unread {
  background-color: var(--unread-bg);
}

.email-item.selected {
  background-color: var(--selected-bg);
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
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.email-date {
  font-size: 0.75rem;
  color: var(--text-secondary);
  flex-shrink: 0;
  margin-left: 8px;
}

.email-subject {
  font-size: 0.8125rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.email-preview {
  font-size: 0.75rem;
  color: var(--text-secondary);
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
  padding: 2px 8px;
  border-radius: var(--radius-sm, 6px);
  font-size: 0.625rem;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.3px;
}

.code-tag {
  background-color: var(--success-color);
}

.ad-tag {
  background-color: var(--warning-color);
}

.importance-tag {
  background-color: #9e9e9e;
}

/* 右栏：邮件内容 */
.content-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--content-bg);
  overflow: hidden;
}

.email-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.email-meta {
  padding: 14px 18px;
  background-color: var(--meta-bg);
  border-radius: var(--radius-lg, 14px);
  margin-bottom: 18px;
}

.meta-row {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 0.8125rem;
}

.meta-row:last-child {
  margin-bottom: 0;
}

.meta-label {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.meta-value {
  color: var(--text-primary);
  word-break: break-all;
}

/* 验证码显示区域 */
.verification-code-section {
  margin-bottom: 18px;
}

.code-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(76, 175, 80, 0.05));
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: var(--radius-lg, 14px);
  cursor: pointer;
  transition: all 0.2s ease;
}

.code-card:hover {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(76, 175, 80, 0.08));
  border-color: var(--success-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2);
}

.code-card:active {
  transform: translateY(0);
}

.code-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--success-color);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.code-icon svg {
  width: 24px;
  height: 24px;
  color: #fff;
}

.code-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.code-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.code-value {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--success-color);
  letter-spacing: 4px;
}

.code-copy-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(76, 175, 80, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.code-copy-icon svg {
  width: 18px;
  height: 18px;
  color: var(--success-color);
}

.code-card:hover .code-copy-icon {
  background: var(--success-color);
}

.code-card:hover .code-copy-icon svg {
  color: #fff;
}

/* 邮件气泡 */
.email-bubble {
  background-color: var(--bubble-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl, 20px);
  overflow: hidden;
}

.bubble-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-color);
  background: var(--card-bg);
}

.sender-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  font-weight: 700;
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
  font-weight: 600;
}

.send-time {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.bubble-content {
  padding: 18px;
  font-size: 0.9375rem;
  line-height: 1.7;
  color: var(--text-primary);
}

.html-content {
  word-break: break-word;
  background-color: #ffffff;
  padding: 20px;
  border-radius: var(--radius-md, 10px);
  color: #1a1a2e;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', 'WenQuanYi Micro Hei', sans-serif;
  font-size: 14px;
  line-height: 1.6;
}

.html-content :deep(*) {
  max-width: 100%;
  box-sizing: border-box;
}

.html-content :deep(body),
.html-content :deep(div),
.html-content :deep(span),
.html-content :deep(p),
.html-content :deep(td),
.html-content :deep(th),
.html-content :deep(li) {
  color: #1a1a2e !important;
}

.html-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-md, 10px);
  display: block;
  margin: 8px 0;
}

.html-content :deep(a) {
  color: #4f46e5 !important;
  text-decoration: underline;
}

.text-content {
  white-space: pre-wrap;
  word-break: break-word;
}

.bubble-footer {
  display: flex;
  flex-direction: column;
  padding: 12px 18px;
  border-top: 1px solid var(--border-color);
  font-size: 0.8125rem;
  color: var(--text-secondary);
  background: var(--card-bg);
}

.bubble-footer svg {
  width: 16px;
  height: 16px;
}

/* 附件区域样式 */
.attachments-section {
  width: 100%;
}

.attachments-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.attachments-loading,
.attachments-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--hover-bg);
  border-radius: 8px;
  color: var(--text-secondary);
}

.attachments-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--hover-bg);
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.attachment-item:hover {
  background: var(--active-bg);
}

.attachment-icon {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-color);
  color: white;
  flex-shrink: 0;
}

.attachment-icon.image {
  background: #4caf50;
}

.attachment-icon.pdf {
  background: #f44336;
}

.attachment-icon.archive {
  background: #ff9800;
}

.attachment-icon svg {
  width: 18px;
  height: 18px;
}

.attachment-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.attachment-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attachment-size {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.attachment-action {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.attachment-action svg {
  width: 16px;
  height: 16px;
}

.attachment-item:hover .attachment-action {
  color: var(--primary-color);
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
  color: var(--text-secondary);
}

.empty-state svg,
.loading-state svg {
  width: 72px;
  height: 72px;
  margin-bottom: 18px;
  opacity: 0.4;
}

.empty-state p {
  margin: 0;
  font-size: 0.9375rem;
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 14px;
}

.loading-spinner.small {
  width: 16px;
  height: 16px;
  border-width: 2px;
}

/* 加载更多提示 */
.load-more-indicator,
.load-more-hint,
.load-more-end {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.load-more-indicator {
  color: var(--primary-color);
}

.load-more-indicator .loading-spinner.small {
  margin-bottom: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 响应式布局 */
@media (max-width: 1024px) {
  .emails-panel {
    width: 300px;
  }
}

@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }
  
  /* 移动端邮件列表占满全屏 */
  .main-content.mobile .emails-panel {
    width: 100%;
    height: 100%;
    border-right: none;
    border-bottom: none;
  }
  
  .emails-panel {
    width: 100%;
    height: 100%;
    border-right: none;
  }
  
  .content-panel {
    display: none;
  }
}

/* 导出下拉菜单 */
.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 100;
  min-width: 140px;
  margin-top: 4px;
  padding: 4px 0;
  background: var(--panel-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 8px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
}
.dropdown-item {
  display: block;
  width: 100%;
  padding: 8px 16px;
  border: none;
  background: none;
  color: var(--text-primary);
  font-size: 0.8125rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}
.dropdown-item:hover {
  background: var(--hover-bg);
}
</style>
