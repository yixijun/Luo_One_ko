<script setup lang="ts">
/**
 * 洛一 (Luo One) 邮箱管理系统 - 写邮件页面
 * Requirements: 3.3
 * 实现邮件编辑和发送功能，支持附件
 */
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAccountStore } from '@/stores/account';
import { useEmailStore } from '@/stores/email';
import type { SendEmailRequest } from '@/types';

const router = useRouter();
const route = useRoute();
const accountStore = useAccountStore();
const emailStore = useEmailStore();

const isPageLoading = ref(true);
const isSending = ref(false);
const successMessage = ref('');
const errorMessage = ref('');

interface AttachmentFile {
  file: File;
  name: string;
  size: number;
  type: string;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
  previewUrl?: string;
}
const attachments = ref<AttachmentFile[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const previewImage = ref<string | null>(null);
const previewImageName = ref('');

const emailForm = reactive<SendEmailRequest>({
  accountId: 0,
  to: [],
  cc: [],
  bcc: [],
  subject: '',
  body: '',
  attachments: [],
});

const toInput = ref('');
const ccInput = ref('');
const bccInput = ref('');
const showCc = ref(false);
const showBcc = ref(false);

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

function clearMessages() { successMessage.value = ''; errorMessage.value = ''; }
function goBack() { router.push('/'); }

function parseEmails(input: string): string[] {
  if (!input.trim()) return [];
  return input.split(/[,;，；\s]+/).map(e => e.trim()).filter(e => e && isValidEmail(e));
}
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function updateTo() { emailForm.to = parseEmails(toInput.value); }
function updateCc() { emailForm.cc = parseEmails(ccInput.value); }
function updateBcc() { emailForm.bcc = parseEmails(bccInput.value); }

// 实时解析收件人，让发送按钮及时响应
watch(toInput, () => updateTo());
watch(ccInput, () => updateCc());
watch(bccInput, () => updateBcc());

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext)) return 'image';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc','docx'].includes(ext)) return 'word';
  if (['xls','xlsx'].includes(ext)) return 'excel';
  if (['zip','rar','7z','tar','gz'].includes(ext)) return 'archive';
  return 'file';
}

function isImageFile(file: File): boolean {
  if (['image/jpeg','image/png','image/gif','image/webp','image/svg+xml','image/bmp'].includes(file.type)) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return ['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext);
}

function openImagePreview(att: AttachmentFile) {
  if (att.previewUrl) { previewImage.value = att.previewUrl; previewImageName.value = att.name; }
}
function closeImagePreview() { previewImage.value = null; previewImageName.value = ''; }
function triggerFileSelect() { fileInputRef.value?.click(); }

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files) addFiles(Array.from(input.files));
  input.value = '';
}
function handleDragOver(event: DragEvent) { event.preventDefault(); isDragging.value = true; }
function handleDragLeave() { isDragging.value = false; }
function handleDrop(event: DragEvent) {
  event.preventDefault(); isDragging.value = false;
  if (event.dataTransfer?.files) addFiles(Array.from(event.dataTransfer.files));
}

function addFiles(files: File[]) {
  const maxSize = 25 * 1024 * 1024;
  const maxTotal = 50 * 1024 * 1024;
  const maxPreviewSize = 20 * 1024 * 1024;
  for (const file of files) {
    if (attachments.value.some(a => a.name === file.name && a.size === file.size)) continue;
    if (file.size > maxSize) { errorMessage.value = `文件 "${file.name}" 超过 25MB 限制`; continue; }
    if (totalAttachmentSize.value + file.size > maxTotal) { errorMessage.value = '附件总大小不能超过 50MB'; break; }
    const attachment: AttachmentFile = { file, name: file.name, size: file.size, type: file.type, uploading: false, uploaded: false };
    if (isImageFile(file) && file.size <= maxPreviewSize) attachment.previewUrl = URL.createObjectURL(file);
    attachments.value.push(attachment);
  }
}

function removeAttachment(index: number) {
  const att = attachments.value[index];
  if (att?.previewUrl) URL.revokeObjectURL(att.previewUrl);
  attachments.value.splice(index, 1);
}

async function sendEmail() {
  clearMessages(); updateTo(); updateCc(); updateBcc();
  if (!canSend.value) { errorMessage.value = '请填写完整的邮件信息'; return; }
  isSending.value = true;
  try {
    const attachmentData: { filename: string; content: string; content_type: string }[] = [];
    for (const att of attachments.value) {
      const base64 = await fileToBase64(att.file);
      attachmentData.push({ filename: att.name, content: base64, content_type: att.type || 'application/octet-stream' });
    }
    const success = await emailStore.sendEmail({
      accountId: emailForm.accountId, to: emailForm.to,
      cc: emailForm.cc?.length ? emailForm.cc : undefined,
      bcc: emailForm.bcc?.length ? emailForm.bcc : undefined,
      subject: emailForm.subject, body: emailForm.body,
      attachments: attachmentData.length > 0 ? attachmentData as any : undefined,
    });
    if (success) { successMessage.value = '邮件发送成功'; clearDraft(); setTimeout(() => { router.push('/'); }, 1500); }
    else { errorMessage.value = emailStore.error || '发送失败'; }
  } finally { isSending.value = false; }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { resolve((reader.result as string).split(',')[1] || ''); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function saveDraft() {
  localStorage.setItem('luo_one_draft', JSON.stringify({
    accountId: emailForm.accountId, to: toInput.value, cc: ccInput.value, bcc: bccInput.value,
    subject: emailForm.subject, body: emailForm.body, savedAt: Date.now(),
  }));
  successMessage.value = '草稿已保存';
  setTimeout(() => clearMessages(), 2000);
}

function loadDraft() {
  const draftStr = localStorage.getItem('luo_one_draft');
  if (draftStr) {
    try {
      const d = JSON.parse(draftStr);
      emailForm.accountId = d.accountId || 0; toInput.value = d.to || ''; ccInput.value = d.cc || '';
      bccInput.value = d.bcc || ''; emailForm.subject = d.subject || ''; emailForm.body = d.body || '';
      if (d.cc) showCc.value = true; if (d.bcc) showBcc.value = true;
    } catch { /* ignore */ }
  }
}

function clearDraft() { localStorage.removeItem('luo_one_draft'); }

function resetForm() {
  emailForm.accountId = accounts.value[0]?.id || 0;
  emailForm.to = []; emailForm.cc = []; emailForm.bcc = [];
  emailForm.subject = ''; emailForm.body = ''; emailForm.attachments = [];
  toInput.value = ''; ccInput.value = ''; bccInput.value = '';
  showCc.value = false; showBcc.value = false; attachments.value = [];
  clearDraft();
}

// 构建引用原文
function buildQuotedBody(original: { from: string; date: number; to: string[]; subject: string; body: string; htmlBody?: string }) {
  const dateStr = new Date(original.date * 1000).toLocaleString('zh-CN');
  const body = original.body || '';
  const quoted = body.split('\n').map(line => `> ${line}`).join('\n');
  return `\n\n---------- 原始邮件 ----------\n发件人: ${original.from}\n日期: ${dateStr}\n收件人: ${original.to.join(', ')}\n主题: ${original.subject}\n\n${quoted}`;
}

onMounted(async () => {
  try {
    if (!accountStore.hasAccounts) await accountStore.fetchAccounts();
    if (accounts.value.length > 0) {
      const accountId = route.query.accountId;
      emailForm.accountId = accountId ? Number(accountId) : (accounts.value[0]?.id || 0);
    }
    const toParam = route.query.to as string;
    const replySubject = route.query.subject as string;
    const replyTo = route.query.replyTo as string;
    const forwardFrom = route.query.forwardFrom as string;
    if (replyTo || forwardFrom || toParam) {
      if (toParam) toInput.value = toParam;
      if (replySubject) emailForm.subject = replySubject;
      // 回复或转发时加载原邮件内容
      const emailId = replyTo || forwardFrom;
      if (emailId) {
        const original = await emailStore.fetchEmailDetail(Number(emailId));
        if (original) {
          emailForm.body = buildQuotedBody(original);
        }
      }
    } else { loadDraft(); }
  } catch (err) { console.error('Failed to initialize compose view:', err); }
  finally { isPageLoading.value = false; }
});
</script>


<template>
  <div class="compose-view" @dragover="handleDragOver" @dragleave="handleDragLeave" @drop="handleDrop">
    <!-- 加载状态 -->
    <div v-if="isPageLoading" class="page-loading">
      <div class="loading-spinner"></div>
      <span>加载中...</span>
    </div>

    <template v-else>
      <!-- 工具栏 -->
      <header class="toolbar">
        <div class="toolbar-left">
          <button class="toolbar-btn" @click="goBack" title="返回收件箱">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div class="toolbar-divider"></div>
          <button class="toolbar-btn primary-btn" @click="sendEmail" :disabled="!canSend || isSending" title="发送">
            <svg v-if="!isSending" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            <div v-else class="btn-spinner"></div>
            <span>{{ isSending ? '发送中...' : '发送' }}</span>
          </button>
        </div>
        <div class="toolbar-right">
          <button class="toolbar-btn" @click="triggerFileSelect" title="添加附件">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
            <span class="toolbar-label">附件</span>
          </button>
          <button class="toolbar-btn" @click="saveDraft" :disabled="isSending" title="保存草稿">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
            </svg>
            <span class="toolbar-label">草稿</span>
          </button>
          <button class="toolbar-btn" @click="resetForm" title="清空">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            <span class="toolbar-label">清空</span>
          </button>
        </div>
      </header>

      <!-- 消息提示 -->
      <Transition name="msg">
        <div v-if="successMessage" class="toast success">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          {{ successMessage }}
        </div>
      </Transition>
      <Transition name="msg">
        <div v-if="errorMessage" class="toast error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          {{ errorMessage }}
          <button class="toast-close" @click="clearMessages">×</button>
        </div>
      </Transition>

      <!-- 无账户 -->
      <div v-if="!hasAccounts" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
        </svg>
        <p>您还没有配置邮箱账户</p>
        <button class="action-btn" @click="router.push('/settings')">前往设置</button>
      </div>

      <!-- 邮件编辑区 -->
      <div v-else class="compose-body">
        <input ref="fileInputRef" type="file" multiple @change="handleFileSelect" style="display:none" />

        <!-- 表单字段区 -->
        <div class="fields">
          <div class="field-row">
            <span class="field-label">发件人</span>
            <select v-model="emailForm.accountId" class="field-input field-select">
              <option v-for="account in accounts" :key="account.id" :value="account.id">
                {{ account.displayName || account.email }} &lt;{{ account.email }}&gt;
              </option>
            </select>
          </div>
          <div class="field-row">
            <span class="field-label">收件人</span>
            <div class="field-input-group">
              <input type="text" v-model="toInput" @blur="updateTo" placeholder="多个地址用逗号分隔" class="field-input" />
              <button type="button" class="cc-toggle" @click="showCc = !showCc" :class="{ active: showCc }">抄送</button>
              <button type="button" class="cc-toggle" @click="showBcc = !showBcc" :class="{ active: showBcc }">密送</button>
            </div>
          </div>
          <div v-if="showCc" class="field-row">
            <span class="field-label">抄送</span>
            <input type="text" v-model="ccInput" @blur="updateCc" placeholder="多个地址用逗号分隔" class="field-input" />
          </div>
          <div v-if="showBcc" class="field-row">
            <span class="field-label">密送</span>
            <input type="text" v-model="bccInput" @blur="updateBcc" placeholder="多个地址用逗号分隔" class="field-input" />
          </div>
          <div class="field-row">
            <span class="field-label">主题</span>
            <input type="text" v-model="emailForm.subject" placeholder="请输入邮件主题" class="field-input" />
          </div>
        </div>

        <!-- 附件栏 -->
        <div v-if="attachments.length > 0" class="attachments-bar">
          <div class="att-chips">
            <div v-for="(att, index) in attachments" :key="att.name + att.size" class="att-chip">
              <div v-if="att.previewUrl" class="att-thumb" @click="openImagePreview(att)">
                <img :src="att.previewUrl" :alt="att.name" />
              </div>
              <div v-else class="att-icon" :class="getFileIcon(att.name)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <span class="att-name">{{ att.name }}</span>
              <span class="att-size">{{ formatFileSize(att.size) }}</span>
              <button class="att-remove" @click="removeAttachment(index)" title="移除">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>
          <span class="att-total">{{ formatFileSize(totalAttachmentSize) }} / 50 MB</span>
        </div>

        <!-- 正文编辑区 -->
        <div class="editor-area" :class="{ dragging: isDragging }">
          <textarea v-model="emailForm.body" placeholder="请输入邮件内容..." class="editor"></textarea>
          <!-- 拖拽提示 -->
          <div v-if="isDragging" class="drag-overlay">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span>释放以添加附件</span>
          </div>
        </div>
      </div>
    </template>

    <!-- 图片预览弹窗 -->
    <Transition name="fade">
      <div v-if="previewImage" class="image-preview-modal" @click="closeImagePreview">
        <div class="preview-bar">
          <span>{{ previewImageName }}</span>
          <button @click="closeImagePreview">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="preview-img" @click.stop>
          <img :src="previewImage" :alt="previewImageName" />
        </div>
      </div>
    </Transition>
  </div>
</template>


<style scoped>
.compose-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--content-bg);
  color: var(--text-primary);
  overflow: hidden;
  position: relative;
}

/* 加载 */
.page-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-secondary);
}
.loading-spinner, .btn-spinner {
  width: 22px; height: 22px;
  border: 2.5px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
.btn-spinner {
  width: 15px; height: 15px;
  border-width: 2px;
  border-color: rgba(255,255,255,0.3);
  border-top-color: #fff;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== 工具栏 ===== */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--panel-bg);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  gap: 8px;
}
.toolbar-left, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
}
.toolbar-divider {
  width: 1px;
  height: 24px;
  background: var(--border-color);
  margin: 0 6px;
}
.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.8125rem;
  transition: all 0.15s;
  white-space: nowrap;
}
.toolbar-btn svg { width: 17px; height: 17px; flex-shrink: 0; }
.toolbar-btn:hover:not(:disabled) {
  background: var(--hover-bg);
  color: var(--text-primary);
}
.toolbar-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.toolbar-btn.primary-btn {
  background: var(--primary-color);
  color: #fff;
  padding: 7px 18px;
  font-weight: 500;
}
.toolbar-btn.primary-btn:hover:not(:disabled) {
  background: var(--primary-hover);
  color: #fff;
}
.toolbar-label { font-size: 0.8125rem; }

/* ===== Toast 消息 ===== */
.toast {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 900;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 0.8125rem;
  box-shadow: 0 4px 20px rgba(0,0,0,0.25);
  backdrop-filter: blur(12px);
}
.toast svg { width: 16px; height: 16px; flex-shrink: 0; }
.toast.success {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #22c55e;
}
.toast.error {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
}
.toast-close {
  margin-left: 8px;
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 1.1rem;
  opacity: 0.6;
  padding: 0 4px;
}
.toast-close:hover { opacity: 1; }
.msg-enter-active, .msg-leave-active { transition: all 0.3s ease; }
.msg-enter-from, .msg-leave-to { opacity: 0; transform: translateX(-50%) translateY(-20px); }

/* ===== 空状态 ===== */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-secondary);
}
.empty-state svg { width: 56px; height: 56px; opacity: 0.3; }
.action-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  background: var(--primary-color);
  color: #fff;
  cursor: pointer;
  font-size: 0.8125rem;
}

/* ===== 邮件编辑主体 ===== */
.compose-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ===== 字段区 ===== */
.fields {
  flex-shrink: 0;
  background: var(--panel-bg);
}
.field-row {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  min-height: 42px;
}
.field-label {
  width: 72px;
  padding: 0 16px;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  flex-shrink: 0;
  text-align: right;
  user-select: none;
}
.field-input {
  flex: 1;
  padding: 10px 12px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.875rem;
  outline: none;
  font-family: inherit;
}
.field-input::placeholder { color: var(--text-tertiary); }
.field-input:focus { background: rgba(100, 108, 255, 0.03); }
.field-select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}
.field-select option { background: var(--panel-bg); color: var(--text-primary); }
.field-input-group {
  flex: 1;
  display: flex;
  align-items: center;
}
.field-input-group .field-input { flex: 1; }
.cc-toggle {
  padding: 3px 10px;
  margin-right: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.15s;
  flex-shrink: 0;
}
.cc-toggle:hover, .cc-toggle.active {
  color: var(--primary-color);
  border-color: var(--primary-color);
  background: rgba(100, 108, 255, 0.06);
}

/* ===== 附件栏 ===== */
.attachments-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--panel-bg);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  overflow-x: auto;
}
.att-chips {
  display: flex;
  gap: 6px;
  flex: 1;
  overflow-x: auto;
  min-width: 0;
}
.att-chips::-webkit-scrollbar { height: 0; }
.att-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  background: var(--hover-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  flex-shrink: 0;
  max-width: 240px;
  transition: border-color 0.15s;
}
.att-chip:hover { border-color: var(--primary-color); }
.att-thumb {
  width: 28px; height: 28px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
  cursor: pointer;
}
.att-thumb img { width: 100%; height: 100%; object-fit: cover; }
.att-icon {
  width: 24px; height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--text-tertiary);
}
.att-icon svg { width: 16px; height: 16px; }
.att-icon.image { color: #4caf50; }
.att-icon.pdf { color: #f44336; }
.att-name {
  font-size: 0.75rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}
.att-size {
  font-size: 0.6875rem;
  color: var(--text-tertiary);
  flex-shrink: 0;
}
.att-remove {
  width: 20px; height: 20px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}
.att-remove:hover { background: rgba(239,68,68,0.1); color: #ef4444; }
.att-remove svg { width: 12px; height: 12px; }
.att-total {
  font-size: 0.6875rem;
  color: var(--text-tertiary);
  flex-shrink: 0;
  padding-left: 8px;
  border-left: 1px solid var(--border-color);
}

/* ===== 编辑区 ===== */
.editor-area {
  flex: 1;
  position: relative;
  min-height: 0;
  display: flex;
}
.editor {
  flex: 1;
  width: 100%;
  border: none;
  padding: 20px 24px;
  font-size: 0.9375rem;
  line-height: 1.8;
  font-family: inherit;
  color: var(--text-primary);
  background: var(--content-bg);
  resize: none;
  outline: none;
}
.editor::placeholder { color: var(--text-tertiary); }
.drag-overlay {
  position: absolute;
  inset: 0;
  background: rgba(100, 108, 255, 0.06);
  border: 2px dashed var(--primary-color);
  border-radius: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--primary-color);
  font-size: 0.875rem;
  pointer-events: none;
  z-index: 10;
}
.drag-overlay svg { width: 32px; height: 32px; opacity: 0.7; }

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .toolbar { padding: 6px 10px; }
  .toolbar-label { display: none; }
  .toolbar-btn { padding: 7px 10px; }
  .toolbar-btn.primary-btn { padding: 7px 14px; }
  .field-label { width: 56px; padding: 0 10px; font-size: 0.75rem; }
  .field-input { padding: 9px 10px; font-size: 0.8125rem; }
  .editor { padding: 16px; font-size: 0.875rem; }
  .attachments-bar { padding: 6px 10px; }
  .att-chip { max-width: 180px; }
}

@media (min-width: 1200px) {
  .field-label { width: 80px; }
  .editor { padding: 24px 32px; }
}

/* ===== 图片预览 ===== */
.image-preview-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  flex-direction: column;
}
.preview-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  color: #fff;
  font-size: 0.8125rem;
}
.preview-bar button {
  width: 34px; height: 34px;
  border: none;
  border-radius: 8px;
  background: rgba(255,255,255,0.1);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview-bar button:hover { background: rgba(255,255,255,0.2); }
.preview-bar button svg { width: 18px; height: 18px; }
.preview-img {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow: auto;
}
.preview-img img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
}

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
