<script setup lang="ts">
/**
 * 洛一 (Luo One) 邮箱管理系统 - 邮件详情组件
 * Requirements: 8.6
 * 点击气泡打开详情，展示完整邮件内容
 */
import { computed, ref, watch } from 'vue';
import type { Email, Attachment } from '@/types';
import { useEmailStore } from '@/stores/email';
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

const emailStore = useEmailStore();

// 附件相关状态
const attachments = ref<Attachment[]>([]);
const loadingAttachments = ref(false);
const downloadingFile = ref<string | null>(null);
const attachmentRetryCount = ref(0);
const maxRetries = 2;

// 图片预览相关
const previewImage = ref<string | null>(null);
const previewImageName = ref('');
const loadingPreview = ref<string | null>(null);
const imagePreviewUrls = ref<Record<string, string>>({});
const previewUpdateKey = ref(0); // 用于强制更新

// 是否有处理结果
const hasProcessedResult = computed(() => !!props.email.processedResult);

// 判断是否为图片文件
function isImageFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
}

// 判断是否可以预览（小于20MB的图片，或者 size 未知时也允许预览）
function canPreview(attachment: Attachment): boolean {
  const maxPreviewSize = 20 * 1024 * 1024; // 20MB
  // 如果 size 为 0 或 undefined，也允许预览（后端可能没返回 size）
  if (!attachment.size || attachment.size === 0) {
    return isImageFile(attachment.filename);
  }
  return isImageFile(attachment.filename) && attachment.size <= maxPreviewSize;
}

// 加载附件列表
async function loadAttachments() {
  if (!props.email.hasAttachments) return;
  
  loadingAttachments.value = true;
  try {
    const result = await emailStore.fetchAttachments(props.email.id);
    attachments.value = result;
    console.log('[Attachments] Loaded:', result);
    
    // 如果附件列表为空且还有重试次数，延迟后重试
    if (result.length === 0 && attachmentRetryCount.value < maxRetries) {
      attachmentRetryCount.value++;
      setTimeout(() => {
        loadAttachments();
      }, 1500); // 1.5秒后重试
    }
    
    // 为可预览的图片加载缩略图
    for (const att of result) {
      const isImg = isImageFile(att.filename);
      const canPrev = canPreview(att);
      console.log('[Attachments] Check preview:', att.filename, 'isImage:', isImg, 'size:', att.size, 'canPreview:', canPrev);
      if (canPrev) {
        loadImagePreview(att);
      }
    }
  } catch (err) {
    console.error('加载附件失败:', err);
  } finally {
    loadingAttachments.value = false;
  }
}

// 加载图片预览
async function loadImagePreview(attachment: Attachment) {
  const rawFilename = attachment.raw_filename || attachment.filename;
  console.log('[Preview] Starting load for:', rawFilename, 'current urls:', imagePreviewUrls.value);
  if (imagePreviewUrls.value[rawFilename]) {
    console.log('[Preview] Already loaded:', rawFilename);
    return;
  }
  
  loadingPreview.value = rawFilename;
  try {
    console.log('[Preview] Fetching blob for email:', props.email.id, 'file:', rawFilename);
    const blob = await emailStore.getAttachmentBlob(props.email.id, rawFilename);
    console.log('[Preview] Got blob:', blob, 'size:', blob?.size, 'type:', blob?.type);
    if (blob && blob.size > 0) {
      const url = URL.createObjectURL(blob);
      console.log('[Preview] Created URL:', url);
      imagePreviewUrls.value[rawFilename] = url;
      previewUpdateKey.value++; // 强制触发更新
      console.log('[Preview] Updated urls:', imagePreviewUrls.value);
    } else {
      console.log('[Preview] Blob is empty or null');
    }
  } catch (err) {
    console.error('[Preview] Error loading:', err);
  } finally {
    loadingPreview.value = null;
  }
}

// 获取图片预览URL
function getPreviewUrl(attachment: Attachment): string | undefined {
  // 使用 previewUpdateKey 来确保响应式更新
  void previewUpdateKey.value;
  const rawFilename = attachment.raw_filename || attachment.filename;
  return imagePreviewUrls.value[rawFilename];
}

// 打开图片预览
function openImagePreview(attachment: Attachment) {
  const url = getPreviewUrl(attachment);
  if (url) {
    previewImage.value = url;
    previewImageName.value = attachment.filename;
  }
}

// 关闭图片预览
function closeImagePreview() {
  previewImage.value = null;
  previewImageName.value = '';
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
watch(() => props.email.id, (newId) => {
  console.log('[EmailDetail] Email changed, id:', newId, 'hasAttachments:', props.email.hasAttachments);
  attachmentRetryCount.value = 0; // 重置重试计数
  attachments.value = []; // 清空附件列表
  imagePreviewUrls.value = {}; // 清空预览 URL
  previewUpdateKey.value++; // 触发更新
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
          附件 ({{ attachments.length }})
        </h3>
        
        <!-- 加载中 -->
        <div v-if="loadingAttachments" class="attachments-loading">
          <div class="spinner"></div>
          <span>加载附件列表...</span>
        </div>
        
        <!-- 附件列表 -->
        <div v-else-if="attachments.length > 0" class="attachments-list">
          <div 
            v-for="attachment in attachments" 
            :key="attachment.raw_filename || attachment.filename"
            class="attachment-item"
            :class="{ 'has-preview': canPreview(attachment) && getPreviewUrl(attachment) }"
          >
            <!-- 图片预览缩略图 -->
            <div 
              v-if="canPreview(attachment) && getPreviewUrl(attachment)" 
              class="attachment-preview"
              @click="openImagePreview(attachment)"
            >
              <img :src="getPreviewUrl(attachment)" :alt="attachment.filename" />
              <div class="preview-overlay">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
            </div>
            <!-- 图片加载中 -->
            <div v-else-if="canPreview(attachment) && loadingPreview === (attachment.raw_filename || attachment.filename)" class="attachment-preview loading">
              <div class="spinner"></div>
            </div>
            <!-- 非图片文件图标 -->
            <div v-else class="attachment-icon" :class="getFileIcon(attachment.filename)" @click="handleDownload(attachment)">
              <!-- 图片图标 -->
              <svg v-if="getFileIcon(attachment.filename) === 'image'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <!-- PDF图标 -->
              <svg v-else-if="getFileIcon(attachment.filename) === 'pdf'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <path d="M9 15h6"/>
              </svg>
              <!-- 压缩包图标 -->
              <svg v-else-if="getFileIcon(attachment.filename) === 'archive'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                <line x1="12" y1="11" x2="12" y2="17"/>
                <line x1="9" y1="14" x2="15" y2="14"/>
              </svg>
              <!-- 默认文件图标 -->
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div class="attachment-info" @click="handleDownload(attachment)">
              <span class="attachment-name">{{ attachment.filename }}</span>
              <span class="attachment-size">{{ formatFileSize(attachment.size) }}</span>
            </div>
            <div class="attachment-action" @click="handleDownload(attachment)">
              <div v-if="downloadingFile === (attachment.raw_filename || attachment.filename)" class="spinner small"></div>
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
          <p>{{ attachmentRetryCount >= maxRetries ? '附件需要重新同步邮件获取' : '附件正在解析中...' }}</p>
        </div>
      </div>
    </div>

    <!-- 图片预览弹窗 -->
    <div v-if="previewImage" class="image-preview-modal" @click="closeImagePreview">
      <div class="preview-header">
        <span class="preview-title">{{ previewImageName }}</span>
        <button class="preview-close" @click="closeImagePreview">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="preview-content" @click.stop>
        <img :src="previewImage" :alt="previewImageName" />
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

.attachments-loading,
.attachments-empty {
  padding: 24px;
  background-color: var(--card-bg, rgba(255, 255, 255, 0.03));
  border-radius: 12px;
  text-align: center;
  color: var(--text-secondary, #888);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.attachments-loading .spinner,
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color, #2d2d44);
  border-top-color: var(--primary-color, #646cff);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner.small {
  width: 16px;
  height: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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
  padding: 12px 16px;
  background-color: var(--card-bg, rgba(255, 255, 255, 0.03));
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.attachment-item:hover {
  background-color: var(--hover-bg, rgba(255, 255, 255, 0.08));
}

.attachment-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--primary-bg, rgba(100, 108, 255, 0.1));
  color: var(--primary-color, #646cff);
  flex-shrink: 0;
}

.attachment-icon.image {
  background-color: rgba(76, 175, 80, 0.1);
  color: #4caf50;
}

.attachment-icon.pdf {
  background-color: rgba(244, 67, 54, 0.1);
  color: #f44336;
}

.attachment-icon.archive {
  background-color: rgba(255, 152, 0, 0.1);
  color: #ff9800;
}

.attachment-icon svg {
  width: 20px;
  height: 20px;
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
  color: var(--text-primary, #fff);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attachment-size {
  font-size: 0.75rem;
  color: var(--text-secondary, #888);
}

.attachment-action {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #888);
  flex-shrink: 0;
}

.attachment-action svg {
  width: 18px;
  height: 18px;
}

.attachment-item:hover .attachment-action {
  color: var(--primary-color, #646cff);
}

/* 图片预览缩略图 */
.attachment-preview {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  position: relative;
  cursor: pointer;
}

.attachment-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.attachment-preview .preview-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.attachment-preview:hover .preview-overlay {
  opacity: 1;
}

.attachment-preview .preview-overlay svg {
  width: 24px;
  height: 24px;
  color: #fff;
}

.attachment-preview.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card-bg, rgba(255, 255, 255, 0.03));
}

.attachment-item.has-preview {
  padding: 8px 16px;
}

/* 图片预览弹窗 */
.image-preview-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  flex-direction: column;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.5);
}

.preview-title {
  color: #fff;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-close {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.preview-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.preview-close svg {
  width: 20px;
  height: 20px;
}

.preview-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow: auto;
}

.preview-content img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

/* 响应式布局 */
@media (max-width: 768px) {
  .detail-header {
    padding: 12px 16px;
    padding-top: calc(12px + env(safe-area-inset-top, 0px));
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
