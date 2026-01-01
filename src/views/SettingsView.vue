<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useAccountStore } from '@/stores/account';
import { useEmailStore } from '@/stores/email';
import { useThemeStore, themes, fonts, type ThemeName, type FontName } from '@/stores/theme';
import { apiKeyManager, backendUrlManager } from '@/api/client';
import apiClient from '@/api/client';
import type { EmailAccount, UserSettings } from '@/types';



const router = useRouter();
const userStore = useUserStore();
const accountStore = useAccountStore();
const emailStore = useEmailStore();
const themeStore = useThemeStore();

const activeTab = ref<'profile' | 'password' | 'accounts' | 'ai' | 'backend' | 'appearance'>('profile');
const isSubmitting = ref(false);
const successMessage = ref('');
const errorMessage = ref('');
const showAccountModal = ref(false);
const editingAccountId = ref<number | null>(null);
const testingConnection = ref(false);
const modalTestingConnection = ref(false);
const modalTestResult = ref<{ success: boolean; message: string } | null>(null);
const syncingAccountId = ref<number | null>(null);
const fullSyncingAccountId = ref<number | null>(null);

const operationLogs = ref<Array<{ time: string; type: 'info' | 'success' | 'error'; message: string }>>([]);

function addLog(type: 'info' | 'success' | 'error', message: string) {
  const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  operationLogs.value.unshift({ time, type, message });
  if (operationLogs.value.length > 50) operationLogs.value.pop();
}

function clearLogs() { operationLogs.value = []; }

const profileForm = reactive({ nickname: '', avatar: '' });
const passwordForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' });
const aiForm = reactive<UserSettings>({
  aiEnabled: false, aiProvider: '', aiApiKey: '', aiModel: '',
  extractCode: true, detectAd: true, summarize: true, judgeImportance: true,
  googleClientId: '', googleClientSecret: '', googleRedirectUrl: '',
});
const backendForm = reactive({ apiKey: apiKeyManager.getApiKey() || '', backendUrl: backendUrlManager.getBackendUrl() || '' });
const testingBackendConnection = ref(false);
const backendTestResult = ref<{ success: boolean; message: string } | null>(null);
const accountForm = reactive<Partial<EmailAccount>>({
  email: '', displayName: '', imapHost: '', imapPort: 993,
  smtpHost: '', smtpPort: 465, username: '', password: '', useSSL: true, enabled: true, syncDays: -1,
});

// 收取天数选项
const syncDaysOptions = [
  { value: -1, label: '全部邮件' },
  { value: 0, label: '仅新邮件（增量）' },
  { value: 7, label: '最近 7 天' },
  { value: 30, label: '最近 30 天' },
  { value: 90, label: '最近 90 天' },
  { value: 365, label: '最近 1 年' },
];

// 邮箱预设配置
const emailPresets = [
  { name: '手动配置', domain: '', imapHost: '', imapPort: 993, smtpHost: '', smtpPort: 465 },
  { name: 'Gmail', domain: 'gmail.com', imapHost: 'imap.gmail.com', imapPort: 993, smtpHost: 'smtp.gmail.com', smtpPort: 587 },
  { name: 'QQ 邮箱', domain: 'qq.com', imapHost: 'imap.qq.com', imapPort: 993, smtpHost: 'smtp.qq.com', smtpPort: 465 },
  { name: '163 邮箱', domain: '163.com', imapHost: 'imap.163.com', imapPort: 993, smtpHost: 'smtp.163.com', smtpPort: 465 },
  { name: '126 邮箱', domain: '126.com', imapHost: 'imap.126.com', imapPort: 993, smtpHost: 'smtp.126.com', smtpPort: 465 },
  { name: 'Outlook', domain: 'outlook.com', imapHost: 'outlook.office365.com', imapPort: 993, smtpHost: 'smtp.office365.com', smtpPort: 587 },
  { name: 'Hotmail', domain: 'hotmail.com', imapHost: 'outlook.office365.com', imapPort: 993, smtpHost: 'smtp.office365.com', smtpPort: 587 },
  { name: '新浪邮箱', domain: 'sina.com', imapHost: 'imap.sina.com', imapPort: 993, smtpHost: 'smtp.sina.com', smtpPort: 465 },
  { name: '188 邮箱', domain: '188.com', imapHost: 'imap.188.com', imapPort: 993, smtpHost: 'smtp.188.com', smtpPort: 465 },
];

const selectedPreset = ref('');

// 应用邮箱预设
function applyPreset() {
  const preset = emailPresets.find(p => p.name === selectedPreset.value);
  if (preset && preset.imapHost) {
    accountForm.imapHost = preset.imapHost;
    accountForm.imapPort = preset.imapPort;
    accountForm.smtpHost = preset.smtpHost;
    accountForm.smtpPort = preset.smtpPort;
  }
}

// 根据邮箱地址自动选择预设
function autoSelectPreset() {
  const email = accountForm.email || '';
  const domain = email.split('@')[1]?.toLowerCase();
  if (domain) {
    const preset = emailPresets.find(p => p.domain === domain);
    if (preset) {
      selectedPreset.value = preset.name;
      applyPreset();
      // 自动填充用户名
      if (!accountForm.username) {
        accountForm.username = email;
      }
    }
  }
}

const user = computed(() => userStore.user);
const accounts = computed(() => accountStore.accounts);
const passwordValid = computed(() => passwordForm.newPassword.length >= 6 && passwordForm.newPassword === passwordForm.confirmPassword);

// 主题相关
function selectTheme(themeName: ThemeName) {
  themeStore.setTheme(themeName);
  successMessage.value = '主题已切换';
}

// 字体相关
function selectFont(fontName: FontName) {
  themeStore.setFont(fontName);
  successMessage.value = '字体已切换';
}

function clearMessages() { successMessage.value = ''; errorMessage.value = ''; }
function goBack() { router.push('/'); }

async function saveProfile() {
  clearMessages(); isSubmitting.value = true;
  try {
    const success = await userStore.updateProfile({ nickname: profileForm.nickname, avatar: profileForm.avatar });
    if (success) successMessage.value = '用户信息已更新';
    else errorMessage.value = userStore.error || '更新失败';
  } finally { isSubmitting.value = false; }
}

async function changePassword() {
  if (!passwordValid.value) { errorMessage.value = '请检查密码输入'; return; }
  clearMessages(); isSubmitting.value = true;
  try {
    const success = await userStore.changePassword({ oldPassword: passwordForm.oldPassword, newPassword: passwordForm.newPassword });
    if (success) { successMessage.value = '密码已修改'; passwordForm.oldPassword = ''; passwordForm.newPassword = ''; passwordForm.confirmPassword = ''; }
    else errorMessage.value = userStore.error || '修改密码失败';
  } finally { isSubmitting.value = false; }
}

async function saveAISettings() {
  clearMessages(); isSubmitting.value = true;
  try {
    const success = await userStore.updateSettings(aiForm);
    if (success) successMessage.value = 'AI 设置已更新';
    else errorMessage.value = userStore.error || '更新失败';
  } finally { isSubmitting.value = false; }
}

async function saveGoogleOAuthSettings() {
  clearMessages(); isSubmitting.value = true;
  console.log('[Settings] saveGoogleOAuthSettings called');
  console.log('[Settings] aiForm.googleClientId:', aiForm.googleClientId?.substring(0, 10) + '...');
  console.log('[Settings] aiForm.googleClientSecret length:', aiForm.googleClientSecret?.length);
  console.log('[Settings] aiForm.googleRedirectUrl:', aiForm.googleRedirectUrl);
  
  try {
    const payload = {
      google_client_id: aiForm.googleClientId,
      google_client_secret: aiForm.googleClientSecret,
      google_redirect_url: aiForm.googleRedirectUrl,
    };
    console.log('[Settings] Sending payload:', JSON.stringify(payload).substring(0, 100) + '...');
    
    const success = await userStore.updateSettings(payload as any);
    console.log('[Settings] updateSettings result:', success);
    
    if (success) {
      successMessage.value = 'Google OAuth 配置已保存';
      console.log('[Settings] Settings saved successfully');
      // 重新获取设置以验证
      await userStore.fetchSettings();
      console.log('[Settings] Fetched settings after save:', userStore.settings);
    } else {
      errorMessage.value = userStore.error || '保存失败';
      console.error('[Settings] Save failed:', userStore.error);
    }
  } catch (err) {
    console.error('[Settings] Exception:', err);
    errorMessage.value = (err as Error).message || '保存失败';
  } finally { isSubmitting.value = false; }
}

function saveBackendSettings() {
  clearMessages();
  if (backendForm.apiKey.trim()) { apiKeyManager.setApiKey(backendForm.apiKey.trim()); successMessage.value = '后端设置已保存'; }
  else { apiKeyManager.removeApiKey(); successMessage.value = 'API 密钥已清除'; }
}

async function loadBackendUrl() {
  // 从服务器获取当前后端地址配置
  try {
    const response = await fetch('/config/backend');
    if (response.ok) {
      const data = await response.json();
      if (data?.data?.backendUrl) {
        backendForm.backendUrl = data.data.backendUrl;
      }
    }
  } catch (e) {
    // 如果服务器不支持，从 localStorage 读取
    backendForm.backendUrl = backendUrlManager.getBackendUrl();
  }
}

async function saveBackendUrl() {
  clearMessages();
  const url = backendForm.backendUrl.trim();
  
  try {
    // 保存到服务器（用于代理）
    const response = await fetch('/config/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backendUrl: url }),
    });
    
    if (response.ok) {
      // 同时保存到 localStorage（备份）
      if (url) {
        backendUrlManager.setBackendUrl(url);
      } else {
        backendUrlManager.removeBackendUrl();
      }
      successMessage.value = url ? '后端地址已保存' : '后端地址已清除';
      addLog('success', url ? `后端地址已更新为: ${url}` : '后端地址已清除');
    } else {
      errorMessage.value = '保存失败，服务器可能不支持动态配置';
      addLog('error', '保存后端地址失败');
    }
  } catch (e) {
    // 如果服务器不支持，只保存到 localStorage
    if (url) {
      backendUrlManager.setBackendUrl(url);
    } else {
      backendUrlManager.removeBackendUrl();
    }
    successMessage.value = '后端地址已保存（本地）';
    addLog('info', '后端地址已保存到本地存储');
  }
}

async function testBackendConnection() {
  clearMessages();
  testingBackendConnection.value = true;
  backendTestResult.value = null;
  
  const testUrl = backendForm.backendUrl.trim();
  addLog('info', `测试后端连接: ${testUrl || '默认'}`);
  
  try {
    // 先保存后端地址到服务器
    if (testUrl) {
      await fetch('/config/backend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backendUrl: testUrl }),
      });
    }
    
    // 通过代理测试连接（访问 /health）
    const response = await fetch('/health', { 
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data?.status === 'ok') {
        backendTestResult.value = { success: true, message: '连接成功' };
        addLog('success', '后端连接测试成功');
      } else {
        backendTestResult.value = { success: true, message: '连接成功' };
        addLog('success', '后端连接测试成功');
      }
    } else {
      backendTestResult.value = { success: false, message: `HTTP ${response.status}` };
      addLog('error', `后端响应错误: ${response.status}`);
    }
  } catch (e) {
    const errMsg = (e as Error).message || '连接失败';
    backendTestResult.value = { success: false, message: errMsg };
    addLog('error', `后端连接测试失败: ${errMsg}`);
  } finally {
    testingBackendConnection.value = false;
  }
}

function openAddAccountModal() { editingAccountId.value = null; resetAccountForm(); showAccountModal.value = true; }
function openEditAccountModal(account: EmailAccount) {
  editingAccountId.value = account.id;
  Object.assign(accountForm, { email: account.email, displayName: account.displayName, imapHost: account.imapHost, imapPort: account.imapPort, smtpHost: account.smtpHost, smtpPort: account.smtpPort, username: account.username, password: '', useSSL: account.useSSL, enabled: account.enabled, syncDays: account.syncDays ?? -1 });
  showAccountModal.value = true;
}
function resetAccountForm() { Object.assign(accountForm, { email: '', displayName: '', imapHost: '', imapPort: 993, smtpHost: '', smtpPort: 465, username: '', password: '', useSSL: true, enabled: true, syncDays: -1 }); selectedPreset.value = '手动配置'; }
function closeAccountModal() { showAccountModal.value = false; editingAccountId.value = null; modalTestResult.value = null; resetAccountForm(); }

async function saveAccount() {
  clearMessages(); isSubmitting.value = true;
  try {
    if (editingAccountId.value) {
      const success = await accountStore.updateAccount(editingAccountId.value, accountForm);
      if (success) { successMessage.value = '账户已更新'; closeAccountModal(); }
      else errorMessage.value = accountStore.error || '更新账户失败';
    } else {
      const success = await accountStore.addAccount(accountForm as Omit<EmailAccount, 'id' | 'userId' | 'lastSyncAt' | 'createdAt'>);
      if (success) { successMessage.value = '账户已添加'; closeAccountModal(); }
      else errorMessage.value = accountStore.error || '添加账户失败';
    }
  } finally { isSubmitting.value = false; }
}

async function deleteAccount(id: number) {
  if (!confirm('确定要删除此邮箱账户吗？')) return;
  clearMessages(); isSubmitting.value = true;
  try {
    const success = await accountStore.deleteAccount(id);
    if (success) successMessage.value = '账户已删除';
    else errorMessage.value = accountStore.error || '删除账户失败';
  } finally { isSubmitting.value = false; }
}

async function toggleAccountEnabled(id: number) {
  clearMessages();
  const success = await accountStore.toggleEnabled(id);
  if (!success) errorMessage.value = accountStore.error || '操作失败';
}

async function testConnection(id: number) {
  clearMessages(); testingConnection.value = true;
  const account = accounts.value.find(a => a.id === id);
  addLog('info', `开始测试连接: ${account?.email || id}`);
  try {
    const result = await accountStore.testConnection(id);
    if (result.success) {
      successMessage.value = '连接测试成功';
      addLog('success', `连接测试成功: ${account?.email}`);
    } else {
      errorMessage.value = result.message || '连接测试失败';
      addLog('error', `连接测试失败: ${result.message}`);
    }
  } catch (err) {
    const errMsg = (err as Error).message || '未知错误';
    addLog('error', `连接测试异常: ${errMsg}`);
    errorMessage.value = errMsg;
  } finally { testingConnection.value = false; }
}

async function syncAccount(id: number) {
  clearMessages();
  syncingAccountId.value = id;
  const account = accounts.value.find(a => a.id === id);
  addLog('info', `开始同步邮件: ${account?.email || id}`);
  addLog('info', `账户 ID: ${id}, 启用状态: ${account?.enabled ? '已启用' : '已禁用'}`);
  
  try {
    addLog('info', `正在调用同步 API: POST /api/emails/sync { account_id: ${id} }`);
    const syncedCount = await emailStore.syncEmails({ accountId: id });
    
    if (syncedCount >= 0) {
      addLog('success', `同步 API 调用成功`);
      addLog('info', `正在获取邮件列表: GET /api/emails?account_id=${id}`);
      await emailStore.fetchEmails({ accountId: id });
      
      addLog('success', `新增同步 ${syncedCount} 封邮件`);
      addLog('info', `${account?.email || id} 已同步 ${emailStore.total} 封邮件到数据库`);
      successMessage.value = `同步完成，新增 ${syncedCount} 封邮件`;
      
      await accountStore.fetchAccounts();
      addLog('info', '已刷新账户列表');
    } else {
      const errMsg = emailStore.error || '同步失败';
      addLog('error', `同步失败: ${errMsg}`);
      errorMessage.value = errMsg;
    }
  } catch (err) {
    const errMsg = (err as Error).message || '未知错误';
    addLog('error', `同步异常: ${errMsg}`);
    errorMessage.value = errMsg;
  } finally {
    syncingAccountId.value = null;
  }
}

// 全量同步进度
const fullSyncProgress = ref<{ total: number; processed: number; saved: number; batch: number; totalBatches: number } | null>(null);

async function syncAllAccount(id: number) {
  clearMessages();
  fullSyncingAccountId.value = id;
  fullSyncProgress.value = null;
  const account = accounts.value.find(a => a.id === id);
  addLog('info', `开始全量同步邮件: ${account?.email || id}`);
  addLog('info', `全量同步会分批处理所有邮件，可能需要较长时间...`);
  
  // 启动进度轮询
  let progressInterval: ReturnType<typeof setInterval> | null = null;
  const startProgressPolling = () => {
    progressInterval = setInterval(async () => {
      const progress = await emailStore.getSyncProgress(id);
      if (progress && progress.status === 'running') {
        fullSyncProgress.value = {
          total: progress.totalMessages,
          processed: progress.processed,
          saved: progress.saved,
          batch: progress.currentBatch,
          totalBatches: progress.totalBatches,
        };
        const percent = progress.totalMessages > 0 ? Math.round((progress.processed / progress.totalMessages) * 100) : 0;
        addLog('info', `同步进度: ${percent}% (${progress.processed}/${progress.totalMessages}) 批次 ${progress.currentBatch}/${progress.totalBatches} 已保存 ${progress.saved} 封`);
      }
    }, 2000);
  };
  
  try {
    addLog('info', `正在调用全量同步 API: POST /api/emails/sync { account_id: ${id}, full_sync: true }`);
    
    // 延迟启动进度轮询，给后端一点时间初始化
    setTimeout(startProgressPolling, 1000);
    
    const syncedCount = await emailStore.syncEmails({ accountId: id, fullSync: true });
    
    // 停止进度轮询
    if (progressInterval) clearInterval(progressInterval);
    fullSyncProgress.value = null;
    
    if (syncedCount >= 0) {
      addLog('success', `全量同步完成`);
      addLog('info', `正在获取邮件列表: GET /api/emails?account_id=${id}`);
      await emailStore.fetchEmails({ accountId: id });
      
      addLog('success', `全量同步完成，共同步 ${syncedCount} 封新邮件`);
      addLog('info', `${account?.email || id} 数据库中共有 ${emailStore.total} 封邮件`);
      successMessage.value = `全量同步完成，共同步 ${syncedCount} 封新邮件`;
      
      await accountStore.fetchAccounts();
      addLog('info', '已刷新账户列表');
    } else {
      const errMsg = emailStore.error || '全量同步失败';
      addLog('error', `全量同步失败: ${errMsg}`);
      errorMessage.value = errMsg;
    }
  } catch (err) {
    const errMsg = (err as Error).message || '未知错误';
    addLog('error', `全量同步异常: ${errMsg}`);
    errorMessage.value = errMsg;
  } finally {
    if (progressInterval) clearInterval(progressInterval);
    fullSyncingAccountId.value = null;
    fullSyncProgress.value = null;
  }
}

async function testModalConnection() {
  modalTestResult.value = null; modalTestingConnection.value = true;
  addLog('info', `测试连接配置: IMAP=${accountForm.imapHost}:${accountForm.imapPort}, SMTP=${accountForm.smtpHost}:${accountForm.smtpPort}, SSL=${accountForm.useSSL}`);
  try {
    const result = await accountStore.testConnectionDirect({
      imapHost: accountForm.imapHost || '', imapPort: accountForm.imapPort || 993,
      smtpHost: accountForm.smtpHost || '', smtpPort: accountForm.smtpPort || 465,
      username: accountForm.username || '', password: accountForm.password || '', useSSL: accountForm.useSSL ?? true,
    });
    modalTestResult.value = result;
    if (result.success) addLog('success', '连接测试成功');
    else addLog('error', `连接测试失败: ${result.message}`);
  } catch (err) {
    const errMsg = (err as Error).message || '未知错误';
    addLog('error', `连接测试异常: ${errMsg}`);
    modalTestResult.value = { success: false, message: errMsg };
  } finally { modalTestingConnection.value = false; }
}

onMounted(async () => {
  if (user.value) { profileForm.nickname = user.value.nickname || ''; profileForm.avatar = user.value.avatar || ''; }
  // 获取用户设置
  await userStore.fetchSettings();
  if (userStore.settings) {
    // 映射 snake_case 到 camelCase
    const s = userStore.settings as any;
    aiForm.aiEnabled = s.ai_enabled ?? s.aiEnabled ?? false;
    aiForm.aiProvider = s.ai_provider ?? s.aiProvider ?? '';
    aiForm.aiApiKey = s.ai_api_key ?? s.aiApiKey ?? '';
    aiForm.aiModel = s.ai_model ?? s.aiModel ?? '';
    aiForm.extractCode = s.extract_code ?? s.extractCode ?? true;
    aiForm.detectAd = s.detect_ad ?? s.detectAd ?? true;
    aiForm.summarize = s.summarize ?? false;
    aiForm.judgeImportance = s.judge_importance ?? s.judgeImportance ?? true;
    aiForm.googleClientId = s.google_client_id ?? s.googleClientId ?? '';
    aiForm.googleClientSecret = s.google_client_secret ?? s.googleClientSecret ?? '';
    aiForm.googleRedirectUrl = s.google_redirect_url ?? s.googleRedirectUrl ?? '';
  }
  await accountStore.fetchAccounts();
  await loadBackendUrl();
  addLog('info', `已加载 ${accounts.value.length} 个邮箱账户`);
});
</script>

<template>
  <div class="settings-view">
    <header class="settings-header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        <span>返回</span>
      </button>
      <h1>设置</h1>
    </header>

    <div v-if="successMessage" class="message success">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <span>{{ successMessage }}</span>
    </div>
    <div v-if="errorMessage" class="message error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>{{ errorMessage }}</span>
    </div>

    <nav class="tabs">
      <button :class="['tab', { active: activeTab === 'profile' }]" @click="activeTab = 'profile'">用户信息</button>
      <button :class="['tab', { active: activeTab === 'password' }]" @click="activeTab = 'password'">修改密码</button>
      <button :class="['tab', { active: activeTab === 'accounts' }]" @click="activeTab = 'accounts'">邮箱账户</button>
      <button :class="['tab', { active: activeTab === 'appearance' }]" @click="activeTab = 'appearance'">外观</button>
      <button :class="['tab', { active: activeTab === 'ai' }]" @click="activeTab = 'ai'">AI 配置</button>
      <button :class="['tab', { active: activeTab === 'backend' }]" @click="activeTab = 'backend'">后端设置</button>
    </nav>

    <div class="tab-content">
      <div v-if="activeTab === 'profile'" class="panel">
        <h2>用户信息</h2>
        <form @submit.prevent="saveProfile">
          <div class="form-group"><label class="form-label">用户名</label><input type="text" class="form-input" :value="user?.username" disabled /></div>
          <div class="form-group"><label class="form-label">昵称</label><input v-model="profileForm.nickname" type="text" class="form-input" placeholder="输入昵称" /></div>
          <div class="form-group"><label class="form-label">头像 URL</label><input v-model="profileForm.avatar" type="text" class="form-input" placeholder="输入头像链接" /></div>
          <button type="submit" class="btn primary" :disabled="isSubmitting">{{ isSubmitting ? '保存中...' : '保存' }}</button>
        </form>
      </div>

      <div v-if="activeTab === 'appearance'" class="panel">
        <h2>外观设置</h2>
        <div class="theme-section">
          <h3>选择主题</h3>
          <div class="theme-grid">
            <button 
              v-for="theme in themes" 
              :key="theme.name"
              :class="['theme-card', { active: themeStore.currentTheme === theme.name }]"
              @click="selectTheme(theme.name)"
            >
              <div class="theme-preview" :data-theme="theme.name">
                <div class="preview-header"></div>
                <div class="preview-sidebar"></div>
                <div class="preview-content">
                  <div class="preview-item"></div>
                  <div class="preview-item"></div>
                  <div class="preview-item"></div>
                </div>
              </div>
              <div class="theme-info">
                <span class="theme-name">{{ theme.label }}</span>
                <span class="theme-desc">{{ theme.description }}</span>
                <span class="theme-color" :style="{ backgroundColor: theme.primaryColor }"></span>
              </div>
              <div v-if="themeStore.currentTheme === theme.name" class="theme-check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </button>
          </div>
        </div>
        
        <div class="font-section">
          <h3>选择字体</h3>
          <div class="font-grid">
            <button 
              v-for="font in fonts" 
              :key="font.name"
              :class="['font-card', { active: themeStore.currentFont === font.name }]"
              @click="selectFont(font.name)"
            >
              <div class="font-preview" :style="{ fontFamily: font.fontFamily }">
                <span class="font-sample-zh">洛一邮箱</span>
                <span class="font-sample-en">Luo One</span>
              </div>
              <div class="font-info">
                <span class="font-name">{{ font.label }}</span>
                <span class="font-desc">{{ font.description }}</span>
              </div>
              <div v-if="themeStore.currentFont === font.name" class="font-check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </button>
          </div>
          <p class="font-hint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            MiSans 字体需要在系统中安装才能生效
          </p>
        </div>
      </div>

      <div v-if="activeTab === 'password'" class="panel">
        <h2>修改密码</h2>
        <form @submit.prevent="changePassword">
          <div class="form-group"><label class="form-label">当前密码</label><input v-model="passwordForm.oldPassword" type="password" class="form-input" placeholder="输入当前密码" /></div>
          <div class="form-group"><label class="form-label">新密码</label><input v-model="passwordForm.newPassword" type="password" class="form-input" placeholder="输入新密码（至少6位）" /></div>
          <div class="form-group"><label class="form-label">确认新密码</label><input v-model="passwordForm.confirmPassword" type="password" class="form-input" placeholder="再次输入新密码" /></div>
          <button type="submit" class="btn primary" :disabled="isSubmitting || !passwordValid">{{ isSubmitting ? '修改中...' : '修改密码' }}</button>
        </form>
      </div>

      <div v-if="activeTab === 'accounts'" class="panel">
        <div class="panel-header">
          <h2>邮箱账户</h2>
          <button class="btn primary" @click="openAddAccountModal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>添加账户</span>
          </button>
        </div>
        
        <div v-if="accounts.length === 0" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          <p>暂无邮箱账户，点击上方按钮添加</p>
        </div>
        <div v-else class="account-list">
          <div v-for="account in accounts" :key="account.id" class="account-item">
            <div class="account-info">
              <span class="account-email">{{ account.email }}</span>
              <span v-if="account.displayName" class="account-name">{{ account.displayName }}</span>
              <span :class="['account-status', { enabled: account.enabled }]">{{ account.enabled ? '已启用' : '已禁用' }}</span>
              <span class="account-email-count">已收取: {{ account.emailCount ?? 0 }} 封</span>
              <span class="account-sync-time" v-if="account.lastSyncAt">上次同步: {{ new Date(account.lastSyncAt * 1000).toLocaleString('zh-CN') }}</span>
            </div>
            <div class="account-actions">
              <button class="btn small sync-btn" @click="syncAccount(account.id)" :disabled="syncingAccountId === account.id">{{ syncingAccountId === account.id ? '同步中...' : '同步' }}</button>
              <button class="btn small sync-btn" @click="syncAllAccount(account.id)" :disabled="fullSyncingAccountId === account.id" title="同步所有邮件（可能需要较长时间）">{{ fullSyncingAccountId === account.id ? '全量同步中...' : '同步全部' }}</button>
              <button class="btn small" @click="testConnection(account.id)" :disabled="testingConnection">测试</button>
              <button class="btn small" @click="toggleAccountEnabled(account.id)">{{ account.enabled ? '禁用' : '启用' }}</button>
              <button class="btn small" @click="openEditAccountModal(account)">编辑</button>
              <button class="btn small danger" @click="deleteAccount(account.id)">删除</button>
            </div>
            <!-- 全量同步进度条 -->
            <div v-if="fullSyncingAccountId === account.id && fullSyncProgress" class="sync-progress">
              <div class="progress-info">
                <span>同步进度: {{ fullSyncProgress.processed }}/{{ fullSyncProgress.total }} 邮件</span>
                <span>批次: {{ fullSyncProgress.batch }}/{{ fullSyncProgress.totalBatches }}</span>
                <span>已保存: {{ fullSyncProgress.saved }} 封</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: (fullSyncProgress.total > 0 ? (fullSyncProgress.processed / fullSyncProgress.total * 100) : 0) + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="logs-panel" v-if="operationLogs.length > 0">
          <div class="logs-header">
            <h3>操作日志</h3>
            <button class="btn small" @click="clearLogs">清除日志</button>
          </div>
          <div class="logs-content">
            <div v-for="(log, index) in operationLogs" :key="index" :class="['log-item', log.type]">
              <span class="log-time">{{ log.time }}</span>
              <span class="log-type">{{ log.type === 'info' ? '信息' : log.type === 'success' ? '成功' : '错误' }}</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'ai'" class="panel">
        <h2>AI 配置</h2>
        <form @submit.prevent="saveAISettings">
          <div class="form-group checkbox"><label><input v-model="aiForm.aiEnabled" type="checkbox" /> 启用 AI 处理</label></div>
          <div class="form-group"><label class="form-label">AI 提供商</label><select v-model="aiForm.aiProvider" class="form-input"><option value="">请选择</option><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="local">本地模型</option></select></div>
          <div class="form-group"><label class="form-label">API Key</label><input v-model="aiForm.aiApiKey" type="password" class="form-input" placeholder="输入 API Key" /></div>
          <div class="form-group"><label class="form-label">模型</label><input v-model="aiForm.aiModel" type="text" class="form-input" placeholder="如 gpt-4, claude-3" /></div>
          <div class="form-group checkbox"><label><input v-model="aiForm.extractCode" type="checkbox" /> 提取验证码</label></div>
          <div class="form-group checkbox"><label><input v-model="aiForm.detectAd" type="checkbox" /> 检测广告</label></div>
          <div class="form-group checkbox"><label><input v-model="aiForm.summarize" type="checkbox" /> 生成摘要</label></div>
          <div class="form-group checkbox"><label><input v-model="aiForm.judgeImportance" type="checkbox" /> 判断重要性</label></div>
          <button type="submit" class="btn primary" :disabled="isSubmitting">{{ isSubmitting ? '保存中...' : '保存设置' }}</button>
        </form>
      </div>

      <div v-if="activeTab === 'backend'" class="panel">
        <h2>后端设置</h2>
        
        <div class="form-section">
          <h3>后端服务器地址</h3>
          <div class="form-group">
            <label class="form-label">后端 URL</label>
            <input v-model="backendForm.backendUrl" type="text" class="form-input" placeholder="http://your-server:8080" />
            <p class="hint">后端服务器的完整地址，包含协议和端口</p>
          </div>
          <div class="button-group">
            <button type="button" class="btn" @click="testBackendConnection" :disabled="testingBackendConnection">
              {{ testingBackendConnection ? '测试中...' : '测试连接' }}
            </button>
            <button type="button" class="btn primary" @click="saveBackendUrl">保存地址</button>
          </div>
          <div v-if="backendTestResult" :class="['test-result', backendTestResult.success ? 'success' : 'error']">
            <svg v-if="backendTestResult.success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            <span>{{ backendTestResult.success ? '连接成功' : backendTestResult.message }}</span>
          </div>
        </div>
        
        <div class="form-section">
          <h3>API 认证</h3>
          <form @submit.prevent="saveBackendSettings">
            <div class="form-group">
              <label class="form-label">API 密钥</label>
              <input v-model="backendForm.apiKey" type="password" class="form-input" placeholder="输入后端 API 密钥" />
              <p class="hint">用于连接后端服务的认证密钥</p>
            </div>
            <button type="submit" class="btn primary">保存密钥</button>
          </form>
        </div>
        
        <div class="form-section">
          <h3>Google OAuth 配置</h3>
          <p class="section-desc">配置 Google OAuth 以支持 Gmail 账户登录。需要在 <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a> 创建 OAuth 凭据。</p>
          <form @submit.prevent="saveGoogleOAuthSettings">
            <div class="form-group">
              <label class="form-label">Client ID</label>
              <input v-model="aiForm.googleClientId" type="text" class="form-input" placeholder="xxx.apps.googleusercontent.com" />
            </div>
            <div class="form-group">
              <label class="form-label">Client Secret</label>
              <input v-model="aiForm.googleClientSecret" type="password" class="form-input" placeholder="Google Client Secret" />
            </div>
            <div class="form-group">
              <label class="form-label">重定向 URL</label>
              <input v-model="aiForm.googleRedirectUrl" type="text" class="form-input" placeholder="http://localhost:8080/api/oauth/google/callback" />
              <p class="hint">必须与 Google Cloud Console 中配置的授权重定向 URI 一致</p>
            </div>
            <button type="submit" class="btn primary" :disabled="isSubmitting">{{ isSubmitting ? '保存中...' : '保存 OAuth 配置' }}</button>
          </form>
          <div class="oauth-help">
            <h4>配置步骤：</h4>
            <ol>
              <li>访问 <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a></li>
              <li>创建项目 → 启用 Gmail API</li>
              <li>配置 OAuth 同意屏幕（选择 External）</li>
              <li>创建 OAuth 2.0 客户端 ID（Web 应用）</li>
              <li>添加授权重定向 URI（与上方填写的一致）</li>
              <li>复制 Client ID 和 Client Secret 填入上方</li>
            </ol>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showAccountModal" class="modal-overlay" @click.self="closeAccountModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingAccountId ? '编辑邮箱账户' : '添加邮箱账户' }}</h3>
          <button class="close-btn" @click="closeAccountModal"></button>
        </div>
        <form @submit.prevent="saveAccount">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">邮箱服务商</label>
              <select v-model="selectedPreset" class="form-input" @change="applyPreset">
                <option v-for="preset in emailPresets" :key="preset.name" :value="preset.name">{{ preset.name }}</option>
              </select>
              <p class="hint" v-if="selectedPreset === 'Gmail'">Gmail 需要应用专用密码：<a href="https://myaccount.google.com/apppasswords" target="_blank">点击获取</a>（需先开启两步验证）</p>
              <p class="hint" v-else-if="selectedPreset === 'QQ 邮箱'">QQ 邮箱需要使用授权码，请在 QQ 邮箱设置中开启 IMAP 并获取</p>
              <p class="hint" v-else-if="selectedPreset === 'Outlook' || selectedPreset === 'Hotmail'">Outlook/Hotmail 需要使用应用密码</p>
            </div>
            <div class="form-group"><label class="form-label">邮箱地址</label><input v-model="accountForm.email" type="email" class="form-input" placeholder="example@mail.com" required @blur="autoSelectPreset" /></div>
            <div class="form-group"><label class="form-label">显示名称</label><input v-model="accountForm.displayName" type="text" class="form-input" placeholder="可选" /></div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">IMAP 服务器</label><input v-model="accountForm.imapHost" type="text" class="form-input" placeholder="imap.mail.com" required /></div>
              <div class="form-group small"><label class="form-label">端口</label><input v-model.number="accountForm.imapPort" type="number" class="form-input" required /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">SMTP 服务器</label><input v-model="accountForm.smtpHost" type="text" class="form-input" placeholder="smtp.mail.com" required /></div>
              <div class="form-group small"><label class="form-label">端口</label><input v-model.number="accountForm.smtpPort" type="number" class="form-input" required /></div>
            </div>
            <div class="form-group"><label class="form-label">用户名</label><input v-model="accountForm.username" type="text" class="form-input" placeholder="登录用户名" required /></div>
            <div class="form-group"><label class="form-label">密码</label><input v-model="accountForm.password" type="password" class="form-input" :placeholder="editingAccountId ? '留空保持不变' : (selectedPreset === 'Gmail' ? 'Google 应用专用密码' : selectedPreset === 'QQ 邮箱' ? 'QQ 邮箱授权码' : '邮箱密码或授权码')" :required="!editingAccountId" /></div>
            <div class="form-group"><label class="form-label">收取天数</label><select v-model="accountForm.syncDays" class="form-input"><option v-for="opt in syncDaysOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option></select><p class="hint">设置同步邮件的时间范围</p></div>
            <div class="form-group checkbox"><label><input v-model="accountForm.useSSL" type="checkbox" /> 使用 SSL/TLS</label></div>
            <div class="form-group checkbox"><label><input v-model="accountForm.enabled" type="checkbox" /> 启用此账户</label></div>
            <div v-if="modalTestResult" :class="['test-result', modalTestResult.success ? 'success' : 'error']">
              <svg v-if="modalTestResult.success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              <span>{{ modalTestResult.success ? '连接成功' : modalTestResult.message }}</span>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn" @click="testModalConnection" :disabled="modalTestingConnection">{{ modalTestingConnection ? '测试中...' : '测试连接' }}</button>
            <button type="button" class="btn" @click="closeAccountModal">取消</button>
            <button type="submit" class="btn primary" :disabled="isSubmitting">{{ isSubmitting ? '保存中...' : '保存' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>


<style scoped>
.settings-view { position: fixed; top: 0; left: 0; right: 0; bottom: 0; padding: 24px; overflow-y: auto; background: var(--bg-gradient); color: var(--text-primary); }
.settings-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; max-width: 800px; margin-left: auto; margin-right: auto; }
.settings-header h1 { margin: 0; font-size: 1.5rem; font-weight: 700; }
.back-btn { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border: 1px solid var(--border-color); border-radius: var(--radius-md, 10px); background: var(--panel-bg); color: var(--text-primary); cursor: pointer; transition: all var(--transition-fast, 0.15s ease); }
.back-btn:hover { background: var(--hover-bg); border-color: var(--primary-color); }
.back-btn svg { width: 18px; height: 18px; }
.message { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-radius: var(--radius-md, 10px); margin-bottom: 20px; max-width: 800px; margin-left: auto; margin-right: auto; }
.message svg { width: 20px; height: 20px; flex-shrink: 0; }
.message.success { background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.25); color: var(--success-color); }
.message.error { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25); color: var(--error-color); }
.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border-color); margin-bottom: 24px; max-width: 800px; margin-left: auto; margin-right: auto; flex-wrap: wrap; }
.tab { padding: 12px 20px; border: none; background: none; cursor: pointer; border-bottom: 2px solid transparent; color: var(--text-secondary); font-size: 0.9375rem; font-weight: 500; transition: all var(--transition-fast, 0.15s ease); }
.tab:hover { color: var(--text-primary); }
.tab.active { color: var(--primary-color); border-bottom-color: var(--primary-color); }
.tab-content { max-width: 800px; margin: 0 auto; }
.panel { background: var(--panel-bg); border: 1px solid var(--border-color); border-radius: var(--radius-lg, 14px); padding: 28px; box-shadow: var(--shadow-lg); }
.panel h2 { margin: 0 0 24px; font-size: 1.25rem; font-weight: 700; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.panel-header h2 { margin: 0; }

/* 主题选择区域 */
.theme-section { margin-top: 8px; }
.theme-section h3 { margin: 0 0 20px; font-size: 1rem; font-weight: 600; color: var(--text-secondary); }
.theme-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.theme-card { position: relative; display: flex; flex-direction: column; padding: 0; border: 2px solid var(--border-color); border-radius: var(--radius-lg, 14px); background: var(--card-bg); cursor: pointer; transition: all var(--transition-fast, 0.15s ease); overflow: hidden; }
.theme-card:hover { border-color: var(--text-tertiary); transform: translateY(-2px); }
.theme-card.active { border-color: var(--primary-color); box-shadow: 0 0 0 3px var(--primary-light); }
.theme-preview { height: 100px; display: flex; position: relative; overflow: hidden; }
.theme-preview .preview-header { position: absolute; top: 0; left: 0; right: 0; height: 24px; background: var(--header-bg); border-bottom: 1px solid var(--border-color); }
.theme-preview .preview-sidebar { position: absolute; top: 24px; left: 0; bottom: 0; width: 50px; background: var(--sidebar-bg); border-right: 1px solid var(--border-color); }
.theme-preview .preview-content { position: absolute; top: 24px; left: 50px; right: 0; bottom: 0; background: var(--content-bg); padding: 8px; display: flex; flex-direction: column; gap: 4px; }
.theme-preview .preview-item { height: 12px; background: var(--hover-bg); border-radius: 3px; }
.theme-preview .preview-item:first-child { width: 80%; }
.theme-preview .preview-item:nth-child(2) { width: 60%; }
.theme-preview .preview-item:nth-child(3) { width: 70%; }
.theme-info { padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; border-top: 1px solid var(--border-color); }
.theme-info .theme-name { font-size: 0.9375rem; font-weight: 600; color: var(--text-primary); }
.theme-info .theme-desc { font-size: 0.75rem; color: var(--text-secondary); }
.theme-info .theme-color { width: 20px; height: 20px; border-radius: 50%; margin-top: 6px; box-shadow: 0 2px 8px var(--shadow-color); }
.theme-check { position: absolute; top: 10px; right: 10px; width: 28px; height: 28px; background: var(--primary-color); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px var(--shadow-color); }
.theme-check svg { width: 16px; height: 16px; color: #fff; }

/* 字体选择区域 */
.font-section { margin-top: 32px; }
.font-section h3 { margin: 0 0 20px; font-size: 1rem; font-weight: 600; color: var(--text-secondary); }
.font-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.font-card { position: relative; display: flex; flex-direction: column; padding: 0; border: 2px solid var(--border-color); border-radius: var(--radius-lg, 14px); background: var(--card-bg); cursor: pointer; transition: all var(--transition-fast, 0.15s ease); overflow: hidden; text-align: left; }
.font-card:hover { border-color: var(--text-tertiary); transform: translateY(-2px); }
.font-card.active { border-color: var(--primary-color); box-shadow: 0 0 0 3px var(--primary-light); }
.font-preview { padding: 20px 16px; display: flex; flex-direction: column; gap: 4px; background: var(--hover-bg); }
.font-sample-zh { font-size: 1.25rem; font-weight: 500; color: var(--text-primary); }
.font-sample-en { font-size: 0.875rem; color: var(--text-secondary); }
.font-info { padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; border-top: 1px solid var(--border-color); }
.font-info .font-name { font-size: 0.9375rem; font-weight: 600; color: var(--text-primary); }
.font-info .font-desc { font-size: 0.75rem; color: var(--text-secondary); }
.font-check { position: absolute; top: 10px; right: 10px; width: 28px; height: 28px; background: var(--primary-color); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px var(--shadow-color); }
.font-check svg { width: 16px; height: 16px; color: #fff; }
.font-hint { display: flex; align-items: center; gap: 8px; margin-top: 16px; padding: 12px 16px; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: var(--radius-md, 10px); font-size: 0.8125rem; color: var(--text-secondary); }
.font-hint svg { width: 18px; height: 18px; flex-shrink: 0; color: var(--primary-color); }

.form-group { margin-bottom: 20px; }
.form-label { display: block; margin-bottom: 8px; font-size: 0.875rem; font-weight: 500; color: var(--text-primary); }
.form-group.checkbox label { display: flex; align-items: center; gap: 10px; font-weight: normal; cursor: pointer; }
.form-group.checkbox input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--primary-color); }
.form-input { width: 100%; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md, 10px); background: var(--input-bg); color: var(--text-primary); font-size: 0.9375rem; transition: all var(--transition-fast, 0.15s ease); box-sizing: border-box; }
.form-input:focus { outline: none; border-color: var(--primary-color); box-shadow: 0 0 0 3px var(--primary-light); }
.form-input:disabled { background: var(--bg-primary); color: var(--text-tertiary); }
.form-input::placeholder { color: var(--text-tertiary); }
.hint { margin: 8px 0 0; font-size: 0.75rem; color: var(--text-tertiary); }
.form-row { display: flex; gap: 12px; }
.form-row .form-group { flex: 1; }
.form-row .form-group.small { flex: 0 0 100px; }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 22px; border: 1px solid var(--border-color); border-radius: var(--radius-md, 10px); background: transparent; color: var(--text-primary); font-size: 0.9375rem; font-weight: 500; cursor: pointer; transition: all var(--transition-fast, 0.15s ease); }
.btn:hover { background: var(--hover-bg); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn.primary { background: var(--primary-color); border-color: var(--primary-color); color: #fff; }
.btn.primary:hover:not(:disabled) { background: var(--primary-hover); transform: translateY(-1px); }
.btn.danger { color: var(--error-color); border-color: rgba(239,68,68,0.4); }
.btn.danger:hover { background: rgba(239,68,68,0.12); }
.btn.small { padding: 8px 14px; font-size: 0.8125rem; }
.btn.sync-btn { background: var(--success-color); border-color: var(--success-color); color: #fff; }
.btn.sync-btn:hover:not(:disabled) { filter: brightness(1.1); }
.btn svg { width: 16px; height: 16px; }
.empty-state { text-align: center; padding: 48px 24px; color: var(--text-secondary); }
.empty-state svg { width: 72px; height: 72px; margin-bottom: 18px; opacity: 0.4; }
.empty-state p { margin: 0; }
.account-list { display: flex; flex-direction: column; gap: 12px; }
.account-item { display: flex; justify-content: space-between; align-items: center; padding: 18px; border: 1px solid var(--border-color); border-radius: var(--radius-md, 10px); background: var(--card-bg); flex-wrap: wrap; gap: 12px; transition: all var(--transition-fast, 0.15s ease); }
.account-item:hover { border-color: var(--text-tertiary); }
.account-info { display: flex; flex-direction: column; gap: 4px; }
.account-email { font-weight: 600; color: var(--text-primary); }
.account-name { font-size: 0.8125rem; color: var(--text-secondary); }
.account-status { font-size: 0.75rem; color: var(--text-tertiary); }
.account-status.enabled { color: var(--success-color); }
.account-email-count { font-size: 0.75rem; color: var(--primary-color); font-weight: 500; }
.account-sync-time { font-size: 0.6875rem; color: var(--text-tertiary); }
.account-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.sync-progress { width: 100%; margin-top: 12px; padding: 12px; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: var(--radius-sm, 6px); }
.sync-progress .progress-info { display: flex; gap: 16px; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 8px; flex-wrap: wrap; }
.sync-progress .progress-bar { height: 8px; background: var(--border-color); border-radius: 4px; overflow: hidden; }
.sync-progress .progress-fill { height: 100%; background: var(--primary-color); border-radius: 4px; transition: width 0.3s ease; }
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { background: var(--panel-bg); border: 1px solid var(--border-color); border-radius: var(--radius-xl, 20px); width: 90%; max-width: 520px; max-height: calc(100vh - 40px); display: flex; flex-direction: column; box-shadow: var(--shadow-lg); overflow: hidden; }
.modal > form { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border-color); flex-shrink: 0; }
.modal-header h3 { margin: 0; font-size: 1.125rem; font-weight: 600; }
.close-btn { width: 32px; height: 32px; border: none; background: transparent; font-size: 24px; cursor: pointer; color: var(--text-tertiary); display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm, 6px); transition: all var(--transition-fast, 0.15s ease); }
.close-btn:hover { color: var(--text-primary); background: var(--hover-bg); }
.modal-body { padding: 16px 20px; overflow-y: auto; flex: 1; min-height: 0; max-height: calc(100vh - 200px); }
.modal-body .form-group { margin-bottom: 14px; }
.modal-body .hint { margin-top: 4px; font-size: 0.6875rem; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 14px 20px; border-top: 1px solid var(--border-color); flex-shrink: 0; background: var(--panel-bg); }
.test-result { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-radius: var(--radius-md, 10px); margin-top: 16px; }
.test-result svg { width: 18px; height: 18px; flex-shrink: 0; }
.test-result.success { background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.25); color: var(--success-color); }
.test-result.error { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25); color: var(--error-color); }
.form-section { margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid var(--border-color); }
.form-section:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
.form-section h3 { margin: 0 0 16px; font-size: 1rem; font-weight: 600; color: var(--text-secondary); }
.section-desc { margin: 0 0 20px; font-size: 0.875rem; color: var(--text-secondary); line-height: 1.5; }
.section-desc a { color: var(--primary-color); text-decoration: none; }
.section-desc a:hover { text-decoration: underline; }
.oauth-help { margin-top: 24px; padding: 18px; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: var(--radius-md, 10px); }
.oauth-help h4 { margin: 0 0 12px; font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }
.oauth-help ol { margin: 0; padding-left: 20px; font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.8; }
.oauth-help a { color: var(--primary-color); text-decoration: none; }
.oauth-help a:hover { text-decoration: underline; }
.button-group { display: flex; gap: 12px; margin-top: 16px; }
.logs-panel { margin-top: 24px; border: 1px solid var(--border-color); border-radius: var(--radius-md, 10px); background: var(--card-bg); }
.logs-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; border-bottom: 1px solid var(--border-color); }
.logs-header h3 { margin: 0; font-size: 0.875rem; font-weight: 600; }
.logs-content { max-height: 300px; overflow-y: auto; padding: 10px; }
.log-item { display: flex; gap: 12px; padding: 10px 14px; border-radius: var(--radius-sm, 6px); font-size: 0.8125rem; font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace; margin-bottom: 4px; }
.log-item.info { background: rgba(59,130,246,0.1); }
.log-item.success { background: rgba(34,197,94,0.1); }
.log-item.error { background: rgba(239,68,68,0.1); }
.log-time { color: var(--text-tertiary); flex-shrink: 0; }
.log-type { flex-shrink: 0; padding: 2px 8px; border-radius: var(--radius-sm, 6px); font-size: 0.6875rem; font-weight: 700; }
.log-item.info .log-type { background: rgba(59,130,246,0.2); color: #3b82f6; }
.log-item.success .log-type { background: rgba(34,197,94,0.2); color: var(--success-color); }
.log-item.error .log-type { background: rgba(239,68,68,0.2); color: var(--error-color); }
.log-message { flex: 1; word-break: break-all; color: var(--text-secondary); }
@media (max-width: 640px) {
  .settings-view { padding: 16px; }
  .tabs { overflow-x: auto; flex-wrap: nowrap; }
  .tab { white-space: nowrap; padding: 10px 14px; font-size: 0.875rem; }
  .panel { padding: 18px; }
  .form-row { flex-direction: column; }
  .form-row .form-group.small { flex: 1; }
  .account-item { flex-direction: column; align-items: flex-start; }
  .account-actions { width: 100%; }
  .theme-grid { grid-template-columns: 1fr; }
}
</style>


