<script setup lang="ts">
/**
 * 洛一 (Luo One) 邮箱管理系统 - 邮件详情组件
 * Requirements: 8.6
 * 点击气泡打开详情，展示完整邮件内容
 */
import { ref, watch } from 'vue';
import type { Email, Attachment } from '@/types';
import { useEmailStore } from '@/stores/email';
import EmailBubble from './EmailBubble.vue';

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

const emailStore = useEmailStore();

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
  const code = props.email.processedResult?.verificationCode;
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
    codeCopied.value = true;
    setTimeout(() => { codeCopied.value = false; }, 2000);
  } catch (err) {
    console.error('复制失败:', err);
  }
}

// 加载附件列表
async function loadAttachments() {
  if (!props.email.hasAttachments) return;
  
  loadingAttachments.value = true;
  try {
    const result = await emailStore.fetchAttachments(props.email.id);
    attachments.value = result;
    
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
async function handleDownload(attachment: Attachment) {
  const rawFilename = attachment.raw_filename || attachment.filename;
  downloadingFile.value = rawFilename;
  try {
    await emailStore.downloadAttachment(props.email.id, rawFilename, attachment.filename);
  } catch (err) {
    console.error('下载附件失败:', err);
    alert('下载附件失败');
  } finally {
    downloadingFile.value = null;
  }
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
  if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) return 'audio';
  if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) return 'video';
  if (['txt', 'md', 'json', 'xml', 'csv'].includes(ext)) return 'text';
  return 'file';
}

// 监听邮件变化，重新加载附件
watch(() => props.email.id, () => {
  attachmentRetryCount.value = 0;
  attachments.value = [];
  loadAttachments();
}, { immediate: true });

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

function handleClose() { emit('close'); }
function handleDelete() { emit('delete'); }
function handleReply() { emit('reply'); }
function handleForward() { emit('forward'); }
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
        <div class="read-status" :class="{ unread: !email.isRead }">
          {{ email.isRead ? '已读' : '未读' }}
        </div>
      </div>

      <!-- 验证码显示区域 -->
      <div class="verification-code-section" v-if="email.processedResult?.verificationCode">
        <div class="code-card" @click="copyVerificationCode" :title="codeCopied ? '已复制' : '点击复制'">
          <div class="code-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div class="code-content">
            <span class="code-label">{{ codeCopied ? '✓ 已复制' : '验证码' }}</span>
            <span class="code-value">{{ email.processedResult.verificationCode }}</span>
          </div>
          <div class="code-copy-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </div>
        </div>
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
          附件 ({{ attachments.length }})
        </h3>
        
        <div v-if="loadingAttachments" class="attachments-loading">
          <div class="spinner"></div>
          <span>加载附件列表...</span>
        </div>
        
        <div v-else-if="attachments.length > 0" class="attachments-list">
          <div 
            v-for="attachment in attachments" 
            :key="attachment.raw_filename || attachment.filename"
            class="attachment-item"
            @click="handleDownload(attachment)"
          >
            <div class="attachment-icon" :class="getFileIcon(attachment.filename)">
              <svg v-if="getFileIcon(attachment.filename) === 'image'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <svg v-else-if="getFileIcon(attachment.filename) === 'pdf'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <path d="M9 15h6"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div class="attachment-info">
              <span class="attachment-name">{{ attachment.filename }}</span>
              <span class="attachment-size">{{ formatFileSize(attachment.size) }}</span>
            </div>
            <div class="attachment-action">
              <div v-if="downloadingFile === (attachment.raw_filename || attachment.filename)" class="spinner small"></div>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </div>
          </div>
        </div>
        
        <div v-else class="attachments-empty">
          <p>{{ attachmentRetryCount >= maxRetries ? '附件需要重新同步邮件获取' : '附件正在解析中...' }}</p>
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
  background-color: var(--content-bg);
  max-width: 100%;
  overflow: hidden;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-color-subtle, var(--border-color));
  background-color: var(--panel-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--radius-md, 12px);
  background: var(--hover-bg);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
}

.back-btn:hover {
  background-color: var(--active-bg);
  color: var(--primary-color);
  transform: translateX(-2px);
}

.back-btn svg { width: 22px; height: 22px; }

.detail-title {
  flex: 1;
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
}

.header-actions { display: flex; gap: 6px; }

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--radius-md, 12px);
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
}

.action-btn:hover {
  background-color: var(--hover-bg);
  color: var(--text-primary);
  transform: translateY(-2px);
}

.action-btn.delete:hover {
  background-color: var(--error-light, rgba(244, 67, 54, 0.12));
  color: var(--error-color);
}

.action-btn svg { width: 20px; height: 20px; }

.detail-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px;
  max-width: 100%;
}

.email-body-section {
  max-width: 100%;
  overflow-x: auto;
}

.email-meta {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 18px 20px;
  background-color: var(--meta-bg);
  border-radius: var(--radius-lg, 16px);
  margin-bottom: 20px;
  border: 1px solid var(--border-color-subtle, var(--border-color));
}

.meta-main { display: flex; gap: 14px; }

.sender-avatar {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-lg, 16px);
  background: var(--primary-gradient, linear-gradient(135deg, var(--primary-color), var(--primary-hover)));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.375rem;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  box-shadow: var(--shadow-md);
}

.meta-info { display: flex; flex-direction: column; gap: 5px; }

.sender-row { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }

.sender-name { font-size: 1rem; font-weight: 700; color: var(--text-primary); }

.sender-email { font-size: 0.8125rem; color: var(--text-tertiary); }

.recipient-row, .date-row { display: flex; gap: 8px; font-size: 0.8125rem; }

.meta-label { color: var(--text-muted, var(--text-tertiary)); font-weight: 500; }

.meta-value { color: var(--text-secondary); }

.read-status {
  padding: 5px 14px;
  border-radius: var(--radius-full, 9999px);
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: var(--success-light, rgba(76, 175, 80, 0.12));
  color: var(--success-color);
}

.read-status.unread {
  background: var(--primary-light);
  color: var(--primary-color);
}

/* 验证码显示区域 */
.verification-code-section {
  margin-bottom: 20px;
}

.code-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 22px;
  background: linear-gradient(135deg, var(--success-light, rgba(76, 175, 80, 0.12)), rgba(76, 175, 80, 0.04));
  border: 1px solid rgba(76, 175, 80, 0.25);
  border-radius: var(--radius-xl, 24px);
  cursor: pointer;
  transition: all var(--transition-normal, 0.2s ease);
  position: relative;
  overflow: hidden;
}

.code-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
  opacity: 0;
  transition: opacity var(--transition-fast, 0.15s ease);
}

.code-card:hover {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.18), rgba(76, 175, 80, 0.08));
  border-color: var(--success-color);
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(76, 175, 80, 0.25);
}

.code-card:hover::before {
  opacity: 1;
}

.code-card:active {
  transform: translateY(-1px);
}

.code-icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-lg, 16px);
  background: linear-gradient(135deg, var(--success-color), #059669);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.code-icon svg {
  width: 26px;
  height: 26px;
  color: #fff;
}

.code-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.code-label {
  font-size: 0.6875rem;
  color: var(--text-tertiary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.code-value {
  font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--success-color);
  letter-spacing: 4px;
}

.code-copy-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md, 12px);
  background: rgba(76, 175, 80, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--transition-fast, 0.15s ease);
}

.code-copy-icon svg {
  width: 18px;
  height: 18px;
  color: var(--success-color);
}

.code-card:hover .code-copy-icon {
  background: var(--success-color);
  transform: scale(1.1);
}

.code-card:hover .code-copy-icon svg {
  color: #fff;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 14px 0;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-title svg { width: 18px; height: 18px; }

.email-body-section, .attachments-section { margin-bottom: 20px; }

.attachments-loading, .attachments-empty {
  padding: 28px;
  background-color: var(--card-bg);
  border-radius: var(--radius-lg, 16px);
  text-align: center;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  border: 1px solid var(--border-color-subtle, var(--border-color));
}

.spinner {
  width: 22px;
  height: 22px;
  border: 2.5px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.spinner.small { width: 18px; height: 18px; }

@keyframes spin { to { transform: rotate(360deg); } }

.attachments-list { display: flex; flex-direction: column; gap: 10px; }

.attachment-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background-color: var(--card-bg);
  border-radius: var(--radius-lg, 16px);
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
  border: 1px solid var(--border-color-subtle, var(--border-color));
}

.attachment-item:hover {
  background-color: var(--card-bg-hover, var(--hover-bg));
  border-color: var(--primary-color);
  transform: translateX(4px);
}

.attachment-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md, 12px);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--primary-light);
  color: var(--primary-color);
  flex-shrink: 0;
}

.attachment-icon.image { background-color: var(--success-light, rgba(76, 175, 80, 0.12)); color: var(--success-color); }
.attachment-icon.pdf { background-color: var(--error-light, rgba(244, 67, 54, 0.12)); color: var(--error-color); }

.attachment-icon svg { width: 22px; height: 22px; }

.attachment-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }

.attachment-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attachment-size { font-size: 0.75rem; color: var(--text-muted, var(--text-tertiary)); }

.attachment-action {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  flex-shrink: 0;
  border-radius: var(--radius-sm, 8px);
  transition: all var(--transition-fast, 0.15s ease);
}

.attachment-action svg { width: 20px; height: 20px; }

.attachment-item:hover .attachment-action { 
  color: var(--primary-color);
  background: var(--primary-light);
}

@media (max-width: 768px) {
  .detail-header {
    padding: 14px 18px;
    padding-top: calc(14px + env(safe-area-inset-top, 0px));
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .back-btn { width: 44px; height: 44px; background-color: var(--hover-bg); }
  .back-btn svg { width: 26px; height: 26px; }
  .detail-title { font-size: 0.9375rem; }
  .detail-content { padding: 16px; }
  .email-meta { flex-direction: column; gap: 14px; }
  .read-status { align-self: flex-start; }
  .header-actions { gap: 4px; }
  .action-btn { width: 44px; height: 44px; }
}
</style>
