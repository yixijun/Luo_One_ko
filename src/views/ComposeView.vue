<script setup lang="ts">
/**
 * 洛一 (Luo One) 邮箱管理系统 - 写邮件页面
 * Requirements: 3.3
 * 实现邮件编辑和发送功能，支持附件
 */
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAccountStore } from '@/stores/account';
import { useEmailStore } from '@/stores/email';
import type { SendEmailRequest } from '@/types';

const router = useRouter();
const route = useRoute();
const accountStore = useAccountStore();
const emailStore = useEmailStore();

// 页面加载状态
const isPageLoading = ref(true);

// 状态
const isSending = ref(false);
const successMessage = ref('');
const errorMessage = ref('');

// 附件相关
interface AttachmentFile {
  file: File;
  name: string;
  size: number;
  type: string;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
  previewUrl?: string; // 图片预览 URL
}
const attachments = ref<AttachmentFile[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);

// 图片预览弹窗
const previewImage = ref<string | null>(null);
const previewImageName = ref('');

// 邮件表单
const emailForm = reactive<SendEmailRequest>({
  accountId: 0,
  to: [],
  cc: [],
  bcc: [],
  subject: '',
  body: '',
  attachments: [],
});

// 收件人输入
const toInput = ref('');
const ccInput = ref('');
const bccInput = ref('');

// 显示抄送/密送
const showCc = ref(false);
const showBcc = ref(false);

// 计算属性
const accounts = computed(() => accountStore.enabledAccounts);
const hasAccounts = computed(() => accounts.value.length > 0);
const canSend = computed(() => {
  return emailForm.accountId > 0 && 
         emailForm.to.length > 0 && 
         emailForm.subject.trim() !== '' &&
         !attachments.value.some(a => a.uploading);
});

const totalAttachmentSize = computed(() => {
  return attachments.value.reduce((sum, a) => sum + a.size, 0);
});

// 清除消息
function clearMessages() {
  successMessage.value = '';
  errorMessage.value = '';
}

// 返回首页
function goBack() {
  router.push('/');
}

// 解析邮箱地址
function parseEmails(input: string): string[] {
  if (!input.trim()) return [];
  return input
    .split(/[,;，；\s]+/)
    .map(email => email.trim())
    .filter(email => email && isValidEmail(email));
}

// 验证邮箱格式
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 更新收件人列表
function updateTo() {
  emailForm.to = parseEmails(toInput.value);
}

function updateCc() {
  emailForm.cc = parseEmails(ccInput.value);
}

function updateBcc() {
  emailForm.bcc = parseEmails(bccInput.value);
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
  return 'file';
}

// 判断是否为图片文件
function isImageFile(file: File): boolean {
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'];
  if (imageTypes.includes(file.type)) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
}

// 打开图片预览
function openImagePreview(att: AttachmentFile) {
  if (att.previewUrl) {
    previewImage.value = att.previewUrl;
    previewImageName.value = att.name;
  }
}

// 关闭图片预览
function closeImagePreview() {
  previewImage.value = null;
  previewImageName.value = '';
}

// 触发文件选择
function triggerFileSelect() {
  fileInputRef.value?.click();
}

// 处理文件选择
function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files) {
    addFiles(Array.from(input.files));
  }
  input.value = ''; // 重置以允许选择相同文件
}

// 处理拖拽
function handleDragOver(event: DragEvent) {
  event.preventDefault();
  isDragging.value = true;
}

function handleDragLeave() {
  isDragging.value = false;
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  isDragging.value = false;
  if (event.dataTransfer?.files) {
    addFiles(Array.from(event.dataTransfer.files));
  }
}

// 添加文件
function addFiles(files: File[]) {
  const maxSize = 25 * 1024 * 1024; // 25MB 单文件限制
  const maxTotal = 50 * 1024 * 1024; // 50MB 总大小限制
  const maxPreviewSize = 20 * 1024 * 1024; // 20MB 以下的图片才预览
  
  for (const file of files) {
    // 检查是否已存在
    if (attachments.value.some(a => a.name === file.name && a.size === file.size)) {
      continue;
    }
    
    // 检查单文件大小
    if (file.size > maxSize) {
      errorMessage.value = `文件 "${file.name}" 超过 25MB 限制`;
      continue;
    }
    
    // 检查总大小
    if (totalAttachmentSize.value + file.size > maxTotal) {
      errorMessage.value = '附件总大小不能超过 50MB';
      break;
    }
    
    const attachment: AttachmentFile = {
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      uploading: false,
      uploaded: false,
    };
    
    // 如果是图片且小于 20MB，生成预览
    if (isImageFile(file) && file.size <= maxPreviewSize) {
      attachment.previewUrl = URL.createObjectURL(file);
    }
    
    attachments.value.push(attachment);
  }
}

// 移除附件
function removeAttachment(index: number) {
  const att = attachments.value[index];
  // 释放预览 URL
  if (att && att.previewUrl) {
    URL.revokeObjectURL(att.previewUrl);
  }
  attachments.value.splice(index, 1);
}

// 发送邮件
async function sendEmail() {
  clearMessages();
  
  // 更新收件人列表
  updateTo();
  updateCc();
  updateBcc();
  
  if (!canSend.value) {
    errorMessage.value = '请填写完整的邮件信息';
    return;
  }
  
  isSending.value = true;
  try {
    // 准备附件数据（Base64）
    const attachmentData: { filename: string; content: string; content_type: string }[] = [];
    
    for (const att of attachments.value) {
      const base64 = await fileToBase64(att.file);
      attachmentData.push({
        filename: att.name,
        content: base64,
        content_type: att.type || 'application/octet-stream',
      });
    }
    
    const success = await emailStore.sendEmail({
      accountId: emailForm.accountId,
      to: emailForm.to,
      cc: emailForm.cc?.length ? emailForm.cc : undefined,
      bcc: emailForm.bcc?.length ? emailForm.bcc : undefined,
      subject: emailForm.subject,
      body: emailForm.body,
      attachments: attachmentData.length > 0 ? attachmentData as any : undefined,
    });
    
    if (success) {
      successMessage.value = '邮件发送成功';
      clearDraft();
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } else {
      errorMessage.value = emailStore.error || '发送失败';
    }
  } finally {
    isSending.value = false;
  }
}

// 文件转 Base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 移除 data:xxx;base64, 前缀
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 保存草稿
function saveDraft() {
  const draft = {
    accountId: emailForm.accountId,
    to: toInput.value,
    cc: ccInput.value,
    bcc: bccInput.value,
    subject: emailForm.subject,
    body: emailForm.body,
    savedAt: Date.now(),
  };
  localStorage.setItem('luo_one_draft', JSON.stringify(draft));
  successMessage.value = '草稿已保存';
  setTimeout(() => clearMessages(), 2000);
}

// 加载草稿
function loadDraft() {
  const draftStr = localStorage.getItem('luo_one_draft');
  if (draftStr) {
    try {
      const draft = JSON.parse(draftStr);
      emailForm.accountId = draft.accountId || 0;
      toInput.value = draft.to || '';
      ccInput.value = draft.cc || '';
      bccInput.value = draft.bcc || '';
      emailForm.subject = draft.subject || '';
      emailForm.body = draft.body || '';
      if (draft.cc) showCc.value = true;
      if (draft.bcc) showBcc.value = true;
    } catch {
      // 忽略解析错误
    }
  }
}

// 清除草稿
function clearDraft() {
  localStorage.removeItem('luo_one_draft');
}

// 重置表单
function resetForm() {
  emailForm.accountId = accounts.value[0]?.id || 0;
  emailForm.to = [];
  emailForm.cc = [];
  emailForm.bcc = [];
  emailForm.subject = '';
  emailForm.body = '';
  emailForm.attachments = [];
  toInput.value = '';
  ccInput.value = '';
  bccInput.value = '';
  showCc.value = false;
  showBcc.value = false;
  attachments.value = [];
  clearDraft();
}

// 初始化
onMounted(async () => {
  try {
    if (!accountStore.hasAccounts) {
      await accountStore.fetchAccounts();
    }
    
    if (accounts.value.length > 0) {
      const accountId = route.query.accountId;
      if (accountId) {
        emailForm.accountId = Number(accountId);
      } else {
        const firstAccount = accounts.value[0];
        if (firstAccount) {
          emailForm.accountId = firstAccount.id;
        }
      }
    }
    
    const replyTo = route.query.replyTo as string;
    const toParam = route.query.to as string;
    const replySubject = route.query.subject as string;
    const forwardFrom = route.query.forwardFrom as string;
    if (replyTo || forwardFrom || toParam) {
      // 回复或转发模式
      if (toParam) {
        toInput.value = toParam;
      }
      if (replySubject) {
        emailForm.subject = replySubject;
      }
    } else {
      loadDraft();
    }
  } catch (err) {
    console.error('Failed to initialize compose view:', err);
  } finally {
    isPageLoading.value = false;
  }
});
</script>


<template>
  <div class="compose-view">
    <!-- 加载状态 -->
    <div v-if="isPageLoading" class="page-loading">
      <div class="loading-spinner"></div>
      <span>加载中...</span>
    </div>

    <template v-else>
      <!-- 头部 -->
      <header class="compose-header">
        <button class="back-btn" @click="goBack" title="返回">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <h1>写邮件</h1>
        <div class="header-actions">
          <button class="btn icon-btn" @click="saveDraft" :disabled="isSending" title="保存草稿">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            <span class="btn-text">草稿</span>
          </button>
          <button class="btn primary send-btn" @click="sendEmail" :disabled="!canSend || isSending">
            <svg v-if="!isSending" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            <div v-else class="btn-spinner"></div>
            <span>{{ isSending ? '发送中...' : '发送' }}</span>
          </button>
        </div>
      </header>

      <!-- 消息提示 -->
      <div v-if="successMessage" class="message success">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        {{ successMessage }}
      </div>
      <div v-if="errorMessage" class="message error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        {{ errorMessage }}
      </div>

      <!-- 无账户提示 -->
      <div v-if="!hasAccounts" class="no-accounts">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
        </svg>
        <p>您还没有配置邮箱账户</p>
        <button class="btn primary" @click="router.push('/settings')">
          前往设置
        </button>
      </div>

      <!-- 邮件编辑表单 -->
      <div v-else class="compose-content">
        <form class="compose-form" @submit.prevent="sendEmail">
          <!-- 发件账户 -->
          <div class="form-row">
            <label>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              发件人
            </label>
            <select v-model="emailForm.accountId" class="input select-input">
              <option v-for="account in accounts" :key="account.id" :value="account.id">
                {{ account.displayName || account.email }} &lt;{{ account.email }}&gt;
              </option>
            </select>
          </div>

          <!-- 收件人 -->
          <div class="form-row">
            <label>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              收件人
            </label>
            <div class="input-group">
              <input 
                type="text" 
                v-model="toInput"
                @blur="updateTo"
                placeholder="多个收件人用逗号分隔"
                class="input"
              />
              <div class="input-actions">
                <button type="button" class="link-btn" @click="showCc = !showCc" :class="{ active: showCc }">
                  抄送
                </button>
                <button type="button" class="link-btn" @click="showBcc = !showBcc" :class="{ active: showBcc }">
                  密送
                </button>
              </div>
            </div>
          </div>

          <!-- 抄送 -->
          <div v-if="showCc" class="form-row">
            <label>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              抄送
            </label>
            <input 
              type="text" 
              v-model="ccInput"
              @blur="updateCc"
              placeholder="多个收件人用逗号分隔"
              class="input"
            />
          </div>

          <!-- 密送 -->
          <div v-if="showBcc" class="form-row">
            <label>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="17" y1="11" x2="23" y2="11"/>
              </svg>
              密送
            </label>
            <input 
              type="text" 
              v-model="bccInput"
              @blur="updateBcc"
              placeholder="多个收件人用逗号分隔"
              class="input"
            />
          </div>

          <!-- 主题 -->
          <div class="form-row">
            <label>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="4" y1="9" x2="20" y2="9"/>
                <line x1="4" y1="15" x2="20" y2="15"/>
                <line x1="10" y1="3" x2="8" y2="21"/>
                <line x1="16" y1="3" x2="14" y2="21"/>
              </svg>
              主题
            </label>
            <input 
              type="text" 
              v-model="emailForm.subject"
              placeholder="请输入邮件主题"
              class="input"
            />
          </div>

          <!-- 正文 -->
          <div class="form-row body-row">
            <textarea 
              v-model="emailForm.body"
              placeholder="请输入邮件内容..."
              class="input textarea"
            ></textarea>
          </div>

          <!-- 附件区域 -->
          <div class="attachments-section">
            <div class="attachments-header">
              <span class="attachments-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
                附件 {{ attachments.length > 0 ? `(${attachments.length})` : '' }}
              </span>
              <span v-if="attachments.length > 0" class="attachments-size">
                {{ formatFileSize(totalAttachmentSize) }} / 50 MB
              </span>
            </div>
            
            <!-- 附件列表 -->
            <div v-if="attachments.length > 0" class="attachments-list">
              <div 
                v-for="(att, index) in attachments" 
                :key="att.name + att.size"
                class="attachment-item"
                :class="{ 'has-preview': att.previewUrl }"
              >
                <!-- 图片预览缩略图 -->
                <div 
                  v-if="att.previewUrl" 
                  class="attachment-preview"
                  @click="openImagePreview(att)"
                >
                  <img :src="att.previewUrl" :alt="att.name" />
                  <div class="preview-overlay">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </div>
                </div>
                <!-- 非图片文件图标 -->
                <div v-else class="attachment-icon" :class="getFileIcon(att.name)">
                  <svg v-if="getFileIcon(att.name) === 'image'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <svg v-else-if="getFileIcon(att.name) === 'pdf'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
                  <span class="attachment-name">{{ att.name }}</span>
                  <span class="attachment-size">{{ formatFileSize(att.size) }}</span>
                </div>
                <button type="button" class="attachment-remove" @click="removeAttachment(index)" title="移除">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
            
            <!-- 添加附件区域 -->
            <div 
              class="attachment-dropzone"
              :class="{ dragging: isDragging }"
              @click="triggerFileSelect"
              @dragover="handleDragOver"
              @dragleave="handleDragLeave"
              @drop="handleDrop"
            >
              <input 
                ref="fileInputRef"
                type="file" 
                multiple 
                @change="handleFileSelect"
                style="display: none"
              />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span>点击或拖拽文件到此处添加附件</span>
              <span class="dropzone-hint">单个文件最大 25MB，总大小最大 50MB</span>
            </div>
          </div>
        </form>

        <!-- 底部操作栏 -->
        <div class="compose-footer">
          <button type="button" class="btn" @click="resetForm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
            </svg>
            清空
          </button>
          <button type="button" class="btn primary send-btn" @click="sendEmail" :disabled="!canSend || isSending">
            <svg v-if="!isSending" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            <div v-else class="btn-spinner"></div>
            <span>{{ isSending ? '发送中...' : '发送邮件' }}</span>
          </button>
        </div>
      </div>
    </template>

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
.compose-view {
  min-height: 100vh;
  background: var(--bg-gradient, linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%));
  display: flex;
  flex-direction: column;
  color: var(--text-primary, #fff);
}

.page-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-secondary, #888);
}

.loading-spinner, .btn-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--border-color, #2d2d44);
  border-top-color: var(--primary-color, #646cff);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border-width: 2px;
  border-color: rgba(255,255,255,0.3);
  border-top-color: #fff;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.compose-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  background: var(--header-bg, rgba(26, 26, 46, 0.95));
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-color, #2d2d44);
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--radius-md, 10px);
  background: var(--hover-bg, rgba(255, 255, 255, 0.05));
  cursor: pointer;
  color: var(--text-secondary, #888);
  transition: all 0.2s;
}

.back-btn:hover {
  color: var(--text-primary, #fff);
  background: var(--active-bg, rgba(255, 255, 255, 0.1));
}

.back-btn svg {
  width: 20px;
  height: 20px;
}

.compose-header h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  flex: 1;
  color: var(--text-primary, #fff);
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 18px;
  border: 1px solid var(--border-color, #2d2d44);
  border-radius: var(--radius-md, 10px);
  background: var(--panel-bg, #1a1a2e);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
  color: var(--text-primary, #fff);
}

.btn svg {
  width: 18px;
  height: 18px;
}

.btn:hover:not(:disabled) {
  background: var(--hover-bg, rgba(255, 255, 255, 0.08));
  border-color: var(--primary-color, #646cff);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.primary {
  background: var(--primary-color, #646cff);
  border-color: var(--primary-color, #646cff);
  color: #fff;
}

.btn.primary:hover:not(:disabled) {
  background: var(--primary-hover, #535bf2);
  transform: translateY(-1px);
}

.btn.icon-btn {
  padding: 10px 14px;
}

.btn.icon-btn .btn-text {
  display: none;
}

.send-btn {
  min-width: 100px;
}

.message {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  margin: 16px 24px 0;
  border-radius: var(--radius-md, 10px);
  font-size: 0.875rem;
}

.message svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.message.success {
  background: rgba(34, 197, 94, 0.12);
  color: var(--success-color, #22c55e);
  border: 1px solid rgba(34, 197, 94, 0.25);
}

.message.error {
  background: rgba(239, 68, 68, 0.12);
  color: var(--error-color, #ef4444);
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.no-accounts {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-secondary, #888);
  padding: 48px;
}

.no-accounts svg {
  width: 64px;
  height: 64px;
  opacity: 0.5;
}

.compose-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.compose-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 24px;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-color, #2d2d44);
  background: var(--panel-bg, rgba(26, 26, 46, 0.6));
}

.form-row:first-child {
  margin-top: 24px;
  border-radius: var(--radius-lg, 14px) var(--radius-lg, 14px) 0 0;
}

.form-row label {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 80px;
  flex-shrink: 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary, #888);
}

.form-row label svg {
  width: 16px;
  height: 16px;
}

.input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid transparent;
  border-radius: var(--radius-md, 10px);
  font-size: 0.9375rem;
  background: var(--input-bg, rgba(255, 255, 255, 0.05));
  color: var(--text-primary, #fff);
  transition: all 0.2s;
}

.input:focus {
  outline: none;
  border-color: var(--primary-color, #646cff);
  background: var(--input-bg, rgba(255, 255, 255, 0.08));
}

.input::placeholder {
  color: var(--text-tertiary, #666);
}

.select-input {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

.select-input option {
  background: var(--panel-bg, #1a1a2e);
  color: var(--text-primary, #fff);
}

.input-group {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.input-group .input {
  flex: 1;
}

.input-actions {
  display: flex;
  gap: 8px;
}

.link-btn {
  padding: 6px 12px;
  border: 1px solid var(--border-color, #2d2d44);
  border-radius: var(--radius-sm, 6px);
  background: transparent;
  color: var(--text-secondary, #888);
  cursor: pointer;
  font-size: 0.8125rem;
  transition: all 0.2s;
}

.link-btn:hover, .link-btn.active {
  color: var(--primary-color, #646cff);
  border-color: var(--primary-color, #646cff);
  background: rgba(100, 108, 255, 0.1);
}

.body-row {
  flex: 1;
  align-items: flex-start;
  border-radius: 0 0 var(--radius-lg, 14px) var(--radius-lg, 14px);
  min-height: 250px;
  padding: 0;
}

.body-row label {
  display: none;
}

.textarea {
  width: 100%;
  height: 100%;
  min-height: 250px;
  resize: none;
  border: none;
  border-radius: 0 0 var(--radius-lg, 14px) var(--radius-lg, 14px);
  padding: 20px;
  line-height: 1.7;
  font-family: inherit;
}

.textarea:focus {
  border: none;
}

/* 附件区域 */
.attachments-section {
  margin: 24px 0;
  padding: 0 24px;
}

.attachments-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.attachments-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary, #888);
}

.attachments-title svg {
  width: 16px;
  height: 16px;
}

.attachments-size {
  font-size: 0.75rem;
  color: var(--text-tertiary, #666);
}

.attachments-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--panel-bg, rgba(26, 26, 46, 0.6));
  border: 1px solid var(--border-color, #2d2d44);
  border-radius: var(--radius-md, 10px);
  transition: all 0.2s;
}

.attachment-item:hover {
  border-color: var(--primary-color, #646cff);
}

.attachment-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm, 6px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(100, 108, 255, 0.1);
  color: var(--primary-color, #646cff);
  flex-shrink: 0;
}

.attachment-icon.image {
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
}

.attachment-icon.pdf {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
}

.attachment-icon svg {
  width: 20px;
  height: 20px;
}

/* 图片预览缩略图 */
.attachment-preview {
  width: 60px;
  height: 60px;
  border-radius: var(--radius-sm, 6px);
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

.attachment-item.has-preview {
  padding: 8px 16px;
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

.attachment-remove {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-sm, 6px);
  background: transparent;
  color: var(--text-tertiary, #666);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.attachment-remove:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--error-color, #ef4444);
}

.attachment-remove svg {
  width: 16px;
  height: 16px;
}

.attachment-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 24px;
  border: 2px dashed var(--border-color, #2d2d44);
  border-radius: var(--radius-lg, 14px);
  background: var(--panel-bg, rgba(26, 26, 46, 0.3));
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-secondary, #888);
}

.attachment-dropzone:hover, .attachment-dropzone.dragging {
  border-color: var(--primary-color, #646cff);
  background: rgba(100, 108, 255, 0.05);
  color: var(--primary-color, #646cff);
}

.attachment-dropzone svg {
  width: 32px;
  height: 32px;
  opacity: 0.6;
}

.attachment-dropzone span {
  font-size: 0.875rem;
}

.dropzone-hint {
  font-size: 0.75rem !important;
  color: var(--text-tertiary, #666) !important;
}

/* 底部操作栏 */
.compose-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid var(--border-color, #2d2d44);
  background: var(--panel-bg, rgba(26, 26, 46, 0.6));
}

/* 响应式 */
@media (max-width: 768px) {
  .compose-header {
    padding: 12px 16px;
  }
  
  .compose-header h1 {
    font-size: 1.125rem;
  }
  
  .btn.icon-btn .btn-text {
    display: none;
  }
  
  .compose-form {
    padding: 0 16px;
  }
  
  .form-row {
    flex-wrap: wrap;
    padding: 12px 16px;
    gap: 8px;
  }
  
  .form-row label {
    width: 100%;
  }
  
  .input-group {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .input-actions {
    width: 100%;
    justify-content: flex-start;
    margin-top: 4px;
  }
  
  .attachments-section {
    padding: 0 16px;
  }
  
  .compose-footer {
    padding: 16px;
  }
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
  border-radius: var(--radius-md, 10px);
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
  border-radius: var(--radius-md, 10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
</style>
