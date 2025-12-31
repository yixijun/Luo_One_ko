<script setup lang="ts">
/**
 * 洛一 (Luo One) 邮箱管理系统 - 写邮件页面
 * Requirements: 3.3
 * 实现邮件编辑和发送功能
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

// 状态
const isSending = ref(false);
const successMessage = ref('');
const errorMessage = ref('');

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

// 收件人输入（用于逗号分隔的输入）
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
         emailForm.subject.trim() !== '';
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

// 解析邮箱地址（支持逗号、分号、空格分隔）
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
    const success = await emailStore.sendEmail({
      accountId: emailForm.accountId,
      to: emailForm.to,
      cc: emailForm.cc?.length ? emailForm.cc : undefined,
      bcc: emailForm.bcc?.length ? emailForm.bcc : undefined,
      subject: emailForm.subject,
      body: emailForm.body,
      attachments: emailForm.attachments?.length ? emailForm.attachments : undefined,
    });
    
    if (success) {
      successMessage.value = '邮件发送成功';
      // 延迟返回首页
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


// 保存草稿（本地存储）
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
  clearDraft();
}

// 初始化
onMounted(async () => {
  // 获取邮箱账户
  if (!accountStore.hasAccounts) {
    await accountStore.fetchAccounts();
  }
  
  // 设置默认发件账户
  if (accounts.value.length > 0) {
    // 检查路由参数是否指定了账户
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
  
  // 检查是否有回复参数
  const replyTo = route.query.replyTo as string;
  const replySubject = route.query.subject as string;
  if (replyTo) {
    toInput.value = replyTo;
    if (replySubject) {
      emailForm.subject = replySubject.startsWith('Re:') ? replySubject : `Re: ${replySubject}`;
    }
  } else {
    // 尝试加载草稿
    loadDraft();
  }
});
</script>


<template>
  <div class="compose-view">
    <!-- 头部 -->
    <header class="compose-header">
      <button class="back-btn" @click="goBack">
        <span class="icon">←</span>
        返回
      </button>
      <h1>写邮件</h1>
      <div class="header-actions">
        <button class="btn" @click="saveDraft" :disabled="isSending">
          保存草稿
        </button>
        <button class="btn primary" @click="sendEmail" :disabled="!canSend || isSending">
          {{ isSending ? '发送中...' : '发送' }}
        </button>
      </div>
    </header>

    <!-- 消息提示 -->
    <div v-if="successMessage" class="message success">{{ successMessage }}</div>
    <div v-if="errorMessage" class="message error">{{ errorMessage }}</div>

    <!-- 无账户提示 -->
    <div v-if="!hasAccounts" class="no-accounts">
      <p>您还没有配置邮箱账户</p>
      <button class="btn primary" @click="router.push('/settings')">
        前往设置
      </button>
    </div>

    <!-- 邮件编辑表单 -->
    <form v-else class="compose-form" @submit.prevent="sendEmail">
      <!-- 发件账户 -->
      <div class="form-row">
        <label>发件人</label>
        <select v-model="emailForm.accountId" class="input">
          <option v-for="account in accounts" :key="account.id" :value="account.id">
            {{ account.displayName || account.email }} &lt;{{ account.email }}&gt;
          </option>
        </select>
      </div>

      <!-- 收件人 -->
      <div class="form-row">
        <label>收件人</label>
        <div class="input-with-actions">
          <input 
            type="text" 
            v-model="toInput"
            @blur="updateTo"
            placeholder="多个收件人用逗号分隔"
            class="input"
          />
          <div class="input-actions">
            <button 
              type="button" 
              class="link-btn" 
              @click="showCc = !showCc"
              v-if="!showCc"
            >
              抄送
            </button>
            <button 
              type="button" 
              class="link-btn" 
              @click="showBcc = !showBcc"
              v-if="!showBcc"
            >
              密送
            </button>
          </div>
        </div>
      </div>

      <!-- 抄送 -->
      <div v-if="showCc" class="form-row">
        <label>抄送</label>
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
        <label>密送</label>
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
        <label>主题</label>
        <input 
          type="text" 
          v-model="emailForm.subject"
          placeholder="请输入邮件主题"
          class="input"
        />
      </div>

      <!-- 正文 -->
      <div class="form-row body-row">
        <label>正文</label>
        <textarea 
          v-model="emailForm.body"
          placeholder="请输入邮件内容..."
          class="input textarea"
        ></textarea>
      </div>

      <!-- 底部操作 -->
      <div class="form-actions">
        <button type="button" class="btn" @click="resetForm">
          清空
        </button>
        <button type="submit" class="btn primary" :disabled="!canSend || isSending">
          {{ isSending ? '发送中...' : '发送邮件' }}
        </button>
      </div>
    </form>
  </div>
</template>


<style scoped>
.compose-view {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.compose-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  color: #666;
}

.back-btn:hover {
  color: #333;
}

.compose-header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  flex: 1;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.message {
  padding: 12px 24px;
  margin: 16px 24px 0;
  border-radius: 4px;
}

.message.success {
  background: #e8f5e9;
  color: #2e7d32;
}

.message.error {
  background: #ffebee;
  color: #c62828;
}

.no-accounts {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #666;
}

.compose-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
  width: 100%;
  box-sizing: border-box;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #e0e0e0;
  background: #fff;
  margin: 0 -24px;
  padding-left: 24px;
  padding-right: 24px;
}

.form-row:first-child {
  border-radius: 8px 8px 0 0;
}

.form-row label {
  width: 60px;
  flex-shrink: 0;
  font-size: 14px;
  color: #666;
}

.input {
  flex: 1;
  padding: 10px 12px;
  border: none;
  font-size: 14px;
  background: transparent;
}

.input:focus {
  outline: none;
}

select.input {
  cursor: pointer;
}

.input-with-actions {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.input-with-actions .input {
  flex: 1;
}

.input-actions {
  display: flex;
  gap: 8px;
}

.link-btn {
  padding: 4px 8px;
  border: none;
  background: transparent;
  color: #1976d2;
  cursor: pointer;
  font-size: 13px;
}

.link-btn:hover {
  text-decoration: underline;
}


.body-row {
  flex: 1;
  align-items: flex-start;
  border-radius: 0 0 8px 8px;
  min-height: 300px;
}

.body-row label {
  padding-top: 10px;
}

.textarea {
  resize: none;
  min-height: 280px;
  line-height: 1.6;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.btn {
  padding: 10px 20px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn:hover {
  background: #f5f5f5;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.primary {
  background: #1976d2;
  border-color: #1976d2;
  color: #fff;
}

.btn.primary:hover:not(:disabled) {
  background: #1565c0;
}

/* Responsive */
@media (max-width: 768px) {
  .compose-header {
    flex-wrap: wrap;
  }
  
  .compose-header h1 {
    order: -1;
    width: 100%;
    margin-bottom: 12px;
  }
  
  .header-actions {
    margin-left: auto;
  }
  
  .compose-form {
    padding: 16px;
  }
  
  .form-row {
    margin: 0 -16px;
    padding-left: 16px;
    padding-right: 16px;
  }
  
  .form-row label {
    width: 50px;
  }
  
  .input-with-actions {
    flex-wrap: wrap;
  }
  
  .input-actions {
    width: 100%;
    justify-content: flex-end;
    margin-top: 8px;
  }
}
</style>
