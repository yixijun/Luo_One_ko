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

// 处理相关状态
const processing = ref(false);

// 复制验证码状态
const codeCopied = ref(false);

// 重要度选择器状态
const showImportanceSelector = ref(false);
const importanceOptions = [
  { value: 'critical', label: '紧急', color: '#f44336' },
  { value: 'high', label: '重要', color: '#ff9800' },
  { value: 'medium', label: '一般', color: '#2196f3' },
  { value: 'low', label: '普通', color: '#9e9e9e' },
];

// 是否有处理结果
const hasProcessedResult = computed(() => !!props.email.processedResult);

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

// 更新重要度
async function updateImportance(importance: string) {
  try {
    await emailStore.updateEmailImportance(props.email.id, importance);
    if (props.email.processedResult) {
      props.email.processedResult.importance = importance as any;
    }
    showImportanceSelector.value = false;
  } catch (err) {
    console.error('更新重要度失败:', err);
    alert('更新重要度失败');
  }
}

// 处理单封邮件
async function handleProcess() {
  processing.value = true;
  try {
    await emailStore.processSingleEmail(props.email.id);
    // 刷新邮件详情
    await emailStore.fetchEmailDetail(props.email.id);
  } catch (err) {
    console.error('处理邮件失败:', err);
    alert('处理邮件失败');
  } finally {
    processing.value = false;
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

// 格式化处理时间
function formatProcessedTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('zh-CN');
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

// 获取处理方式标签
function getProcessedByLabel(processedBy: string): string {
  switch (processedBy) {
    case 'ai': return 'AI处理';
    case 'local': return '本地处理';
    default: return processedBy;
  }
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

      <!-- 处理结果信息 -->
      <div class="processed-section">
        <div class="processed-box">
          <div class="processed-content">
            <div class="processed-info" v-if="hasProcessedResult">
              <!-- 验证码卡片 -->
              <div class="info-card clickable" v-if="email.processedResult?.verificationCode" @click="copyVerificationCode" :title="codeCopied ? '已复制' : '点击复制验证码'">
                <div class="info-icon code">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <div class="info-content">
                  <span class="info-label">验证码 {{ codeCopied ? '✓ 已复制' : '(点击复制)' }}</span>
                  <span class="info-value code-value">{{ email.processedResult.verificationCode }}</span>
                </div>
              </div>
              
              <!-- 广告卡片 -->
              <div class="info-card" v-if="email.processedResult?.isAd">
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

              <!-- 摘要卡片 -->
              <div class="info-card" v-if="email.processedResult?.summary">
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
                  <span class="info-value">{{ email.processedResult.summary }}</span>
                </div>
              </div>

              <!-- 重要度卡片 -->
              <div class="info-card importance clickable" @click="showImportanceSelector = !showImportanceSelector" title="点击修改重要度">
                <div 
                  class="info-icon" 
                  :style="{ backgroundColor: getImportanceColor(email.processedResult?.importance || 'low') }"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <div class="info-content">
                  <span class="info-label">重要度 (点击修改)</span>
                  <span class="info-value">{{ getImportanceLabel(email.processedResult?.importance || 'low') }}</span>
                </div>
              </div>
            </div>
            
            <!-- 重要度选择器弹窗 -->
            <Teleport to="body">
              <div class="importance-overlay" v-if="showImportanceSelector" @click="showImportanceSelector = false">
                <div class="importance-selector" @click.stop>
                  <div class="selector-title">选择重要度</div>
                  <button 
                    v-for="opt in importanceOptions" 
                    :key="opt.value"
                    class="importance-option"
                    :class="{ active: email.processedResult?.importance === opt.value }"
                    :style="{ '--opt-color': opt.color }"
                    @click="updateImportance(opt.value)"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>
            </Teleport>
            <div v-else class="no-processed">
              <span>暂无处理结果</span>
            </div>
          </div>
          
          <!-- 处理按钮 -->
          <div class="process-action">
            <button class="process-btn" @click="handleProcess" :disabled="processing">
              <svg v-if="!processing" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              <span v-else class="spinner small"></span>
              {{ processing ? '处理中' : '处理' }}
            </button>
          </div>
        </div>
        
        <!-- 处理时间和方式 -->
        <div class="processed-meta" v-if="hasProcessedResult && email.processedResult">
          <span class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            {{ formatProcessedTime(email.processedResult.processedAt) }}
          </span>
          <span class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
            {{ getProcessedByLabel(email.processedResult.processedBy) }}
          </span>
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

.back-btn svg { width: 20px; height: 20px; }

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

.header-actions { display: flex; gap: 4px; }

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

.action-btn svg { width: 18px; height: 18px; }

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

.meta-main { display: flex; gap: 12px; }

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

.meta-info { display: flex; flex-direction: column; gap: 4px; }

.sender-row { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }

.sender-name { font-size: 1rem; font-weight: 600; color: var(--text-primary, #fff); }

.sender-email { font-size: 0.8125rem; color: var(--text-secondary, #888); }

.recipient-row, .date-row { display: flex; gap: 6px; font-size: 0.8125rem; }

.meta-label { color: var(--text-secondary, #888); }

.meta-value { color: var(--text-primary, #fff); }

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

/* 处理结果区域 - 大框样式 */
.processed-section {
  margin-bottom: 16px;
}

.processed-box {
  display: flex;
  align-items: stretch;
  gap: 12px;
  padding: 12px;
  background-color: var(--card-bg, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--border-color, #2d2d44);
  border-radius: 12px;
}

.processed-content {
  flex: 1;
  min-width: 0;
}

.processed-info {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background-color: var(--meta-bg, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--border-color, #2d2d44);
  border-radius: 10px;
  min-width: 140px;
}

.info-card.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}

.info-card.clickable:hover {
  background-color: var(--hover-bg, rgba(255, 255, 255, 0.08));
  border-color: var(--primary-color, #646cff);
}

.info-card.clickable:active {
  transform: scale(0.98);
}

.info-card.importance {
  position: relative;
}

.info-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.info-icon svg {
  width: 18px;
  height: 18px;
  color: #fff;
}

.info-icon.code {
  background-color: #4caf50;
}

.info-icon.ad {
  background-color: #ff9800;
}

.info-icon.summary {
  background-color: #3b82f6;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.info-label {
  font-size: 0.6875rem;
  color: var(--text-secondary, #888);
}

.info-value {
  font-size: 0.8125rem;
  color: var(--text-primary, #fff);
}

.code-value {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 1.125rem;
  font-weight: 700;
  color: #4caf50;
  letter-spacing: 2px;
}

.no-processed {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  color: var(--text-secondary, #888);
  font-size: 0.8125rem;
}

.process-action {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.process-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px 16px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--primary-color, #646cff), #5558dd);
  color: #fff;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 60px;
}

.process-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(100, 108, 255, 0.4);
}

.process-btn:active:not(:disabled) {
  transform: translateY(0);
}

.process-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.process-btn svg {
  width: 20px;
  height: 20px;
}

/* 重要度选择器 */
.importance-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.importance-selector {
  padding: 20px;
  background: var(--card-bg, #1a1a2e);
  border: 1px solid var(--border-color, #2d2d44);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 200px;
}

.selector-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #fff);
  text-align: center;
  margin-bottom: 8px;
}

.importance-option {
  padding: 14px 20px;
  border: none;
  border-radius: 10px;
  background: var(--hover-bg, rgba(255, 255, 255, 0.05));
  color: var(--text-primary, #fff);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s;
}

.importance-option:hover {
  background: var(--hover-bg, rgba(255, 255, 255, 0.15));
}

.importance-option.active {
  background: var(--opt-color);
  color: #fff;
}

/* 处理时间和方式 */
.processed-meta {
  display: flex;
  gap: 16px;
  margin-top: 10px;
  padding: 0 4px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: var(--text-secondary, #888);
}

.meta-item svg {
  width: 14px;
  height: 14px;
}

.meta-item svg {
  width: 14px;
  height: 14px;
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

.section-title svg { width: 16px; height: 16px; }

.email-body-section, .attachments-section { margin-bottom: 16px; }

.attachments-loading, .attachments-empty {
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

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color, #2d2d44);
  border-top-color: var(--primary-color, #646cff);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner.small { width: 16px; height: 16px; }

@keyframes spin { to { transform: rotate(360deg); } }

.attachments-list { display: flex; flex-direction: column; gap: 8px; }

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

.attachment-icon.image { background-color: rgba(76, 175, 80, 0.1); color: #4caf50; }
.attachment-icon.pdf { background-color: rgba(244, 67, 54, 0.1); color: #f44336; }

.attachment-icon svg { width: 20px; height: 20px; }

.attachment-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }

.attachment-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary, #fff);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attachment-size { font-size: 0.75rem; color: var(--text-secondary, #888); }

.attachment-action {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #888);
  flex-shrink: 0;
}

.attachment-action svg { width: 18px; height: 18px; }

.attachment-item:hover .attachment-action { color: var(--primary-color, #646cff); }

@media (max-width: 768px) {
  .detail-header {
    padding: 12px 16px;
    padding-top: calc(12px + env(safe-area-inset-top, 0px));
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .back-btn { width: 40px; height: 40px; background-color: var(--hover-bg, rgba(255, 255, 255, 0.1)); }
  .back-btn svg { width: 24px; height: 24px; }
  .detail-title { font-size: 0.9375rem; }
  .detail-content { padding: 12px; }
  .email-meta { flex-direction: column; gap: 12px; }
  .read-status { align-self: flex-start; }
  .header-actions { gap: 2px; }
  .action-btn { width: 40px; height: 40px; }
}
</style>
