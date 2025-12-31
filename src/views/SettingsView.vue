<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useAccountStore } from '@/stores/account';
import { useEmailStore } from '@/stores/email';
import { apiKeyManager } from '@/api/client';
import type { EmailAccount, UserSettings } from '@/types';

const router = useRouter();
const userStore = useUserStore();
const accountStore = useAccountStore();
const emailStore = useEmailStore();

const activeTab = ref<'profile' | 'password' | 'accounts' | 'ai' | 'backend'>('profile');
const isSubmitting = ref(false);
const successMessage = ref('');
const errorMessage = ref('');
const showAccountModal = ref(false);
const editingAccountId = ref<number | null>(null);
const testingConnection = ref(false);
const modalTestingConnection = ref(false);
const modalTestResult = ref<{ success: boolean; message: string } | null>(null);
const syncingAccountId = ref<number | null>(null);

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
});
const backendForm = reactive({ apiKey: apiKeyManager.getApiKey() || '' });
const accountForm = reactive<Partial<EmailAccount>>({
  email: '', displayName: '', imapHost: '', imapPort: 993,
  smtpHost: '', smtpPort: 465, username: '', password: '', useSSL: true, enabled: true,
});

const user = computed(() => userStore.user);
const accounts = computed(() => accountStore.accounts);
const passwordValid = computed(() => passwordForm.newPassword.length >= 6 && passwordForm.newPassword === passwordForm.confirmPassword);

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

function saveBackendSettings() {
  clearMessages();
  if (backendForm.apiKey.trim()) { apiKeyManager.setApiKey(backendForm.apiKey.trim()); successMessage.value = '后端设置已保存'; }
  else { apiKeyManager.removeApiKey(); successMessage.value = 'API 密钥已清除'; }
}

function openAddAccountModal() { editingAccountId.value = null; resetAccountForm(); showAccountModal.value = true; }
function openEditAccountModal(account: EmailAccount) {
  editingAccountId.value = account.id;
  Object.assign(accountForm, { email: account.email, displayName: account.displayName, imapHost: account.imapHost, imapPort: account.imapPort, smtpHost: account.smtpHost, smtpPort: account.smtpPort, username: account.username, password: '', useSSL: account.useSSL, enabled: account.enabled });
  showAccountModal.value = true;
}
function resetAccountForm() { Object.assign(accountForm, { email: '', displayName: '', imapHost: '', imapPort: 993, smtpHost: '', smtpPort: 465, username: '', password: '', useSSL: true, enabled: true }); }
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
    const syncResult = await emailStore.syncEmails({ accountId: id });
    
    if (syncResult) {
      addLog('success', `同步 API 调用成功`);
      addLog('info', `正在获取邮件列表: GET /api/emails?account_id=${id}`);
      await emailStore.fetchEmails({ accountId: id });
      
      const emailCount = emailStore.emails.length;
      addLog('success', `获取到 ${emailCount} 封邮件`);
      successMessage.value = `同步完成，共 ${emailCount} 封邮件`;
      
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
  if (userStore.settings) Object.assign(aiForm, userStore.settings);
  await accountStore.fetchAccounts();
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
              <span class="account-sync-time" v-if="account.lastSyncAt">上次同步: {{ new Date(account.lastSyncAt * 1000).toLocaleString('zh-CN') }}</span>
            </div>
            <div class="account-actions">
              <button class="btn small sync-btn" @click="syncAccount(account.id)" :disabled="syncingAccountId === account.id">{{ syncingAccountId === account.id ? '同步中...' : '同步' }}</button>
              <button class="btn small" @click="testConnection(account.id)" :disabled="testingConnection">测试</button>
              <button class="btn small" @click="toggleAccountEnabled(account.id)">{{ account.enabled ? '禁用' : '启用' }}</button>
              <button class="btn small" @click="openEditAccountModal(account)">编辑</button>
              <button class="btn small danger" @click="deleteAccount(account.id)">删除</button>
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
        <form @submit.prevent="saveBackendSettings">
          <div class="form-group"><label class="form-label">API 密钥</label><input v-model="backendForm.apiKey" type="password" class="form-input" placeholder="输入后端 API 密钥" /><p class="hint">用于连接后端服务的认证密钥</p></div>
          <button type="submit" class="btn primary">保存设置</button>
        </form>
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
            <div class="form-group"><label class="form-label">邮箱地址</label><input v-model="accountForm.email" type="email" class="form-input" placeholder="example@mail.com" required /></div>
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
            <div class="form-group"><label class="form-label">密码</label><input v-model="accountForm.password" type="password" class="form-input" :placeholder="editingAccountId ? '留空保持不变' : '邮箱密码或授权码'" :required="!editingAccountId" /></div>
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
.settings-view { min-height: 100vh; padding: 24px; overflow-y: auto; background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16162a 100%); color: #fff; }
.settings-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; max-width: 800px; margin-left: auto; margin-right: auto; }
.settings-header h1 { margin: 0; font-size: 1.5rem; font-weight: 600; }
.back-btn { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border: 1px solid #2d2d44; border-radius: 8px; background: #1a1a2e; color: #fff; cursor: pointer; transition: all 0.2s; }
.back-btn:hover { background: rgba(255,255,255,0.05); border-color: #646cff; }
.back-btn svg { width: 18px; height: 18px; }
.message { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-radius: 8px; margin-bottom: 20px; max-width: 800px; margin-left: auto; margin-right: auto; }
.message svg { width: 20px; height: 20px; flex-shrink: 0; }
.message.success { background: rgba(76,175,80,0.15); border: 1px solid rgba(76,175,80,0.3); color: #4caf50; }
.message.error { background: rgba(244,67,54,0.15); border: 1px solid rgba(244,67,54,0.3); color: #f44336; }
.tabs { display: flex; gap: 4px; border-bottom: 1px solid #2d2d44; margin-bottom: 24px; max-width: 800px; margin-left: auto; margin-right: auto; flex-wrap: wrap; }
.tab { padding: 12px 20px; border: none; background: none; cursor: pointer; border-bottom: 2px solid transparent; color: #888; font-size: 0.9375rem; transition: all 0.2s; }
.tab:hover { color: #fff; }
.tab.active { color: #646cff; border-bottom-color: #646cff; }
.tab-content { max-width: 800px; margin: 0 auto; }
.panel { background: #1a1a2e; border-radius: 12px; padding: 24px; box-shadow: 0 4px 16px rgba(0,0,0,0.2); }
.panel h2 { margin: 0 0 24px; font-size: 1.125rem; font-weight: 600; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.panel-header h2 { margin: 0; }
.form-group { margin-bottom: 20px; }
.form-label { display: block; margin-bottom: 8px; font-size: 0.875rem; font-weight: 500; }
.form-group.checkbox label { display: flex; align-items: center; gap: 10px; font-weight: normal; cursor: pointer; }
.form-group.checkbox input[type="checkbox"] { width: 18px; height: 18px; accent-color: #646cff; }
.form-input { width: 100%; padding: 12px 14px; border: 1px solid #2d2d44; border-radius: 8px; background: #2d2d44; color: #fff; font-size: 0.9375rem; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box; }
.form-input:focus { outline: none; border-color: #646cff; box-shadow: 0 0 0 3px rgba(100,108,255,0.15); }
.form-input:disabled { background: rgba(45,45,68,0.5); color: #666; }
.form-input::placeholder { color: #666; }
.hint { margin: 8px 0 0; font-size: 0.75rem; color: #666; }
.form-row { display: flex; gap: 12px; }
.form-row .form-group { flex: 1; }
.form-row .form-group.small { flex: 0 0 100px; }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; border: 1px solid #2d2d44; border-radius: 8px; background: transparent; color: #fff; font-size: 0.9375rem; cursor: pointer; transition: all 0.2s; }
.btn:hover { background: rgba(255,255,255,0.05); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn.primary { background: #646cff; border-color: #646cff; }
.btn.primary:hover:not(:disabled) { background: #535bf2; }
.btn.danger { color: #f44336; border-color: rgba(244,67,54,0.5); }
.btn.danger:hover { background: rgba(244,67,54,0.15); }
.btn.small { padding: 8px 12px; font-size: 0.8125rem; }
.btn.sync-btn { background: #4caf50; border-color: #4caf50; }
.btn.sync-btn:hover:not(:disabled) { background: #43a047; }
.btn svg { width: 16px; height: 16px; }
.empty-state { text-align: center; padding: 48px 24px; color: #888; }
.empty-state svg { width: 64px; height: 64px; margin-bottom: 16px; opacity: 0.5; }
.empty-state p { margin: 0; }
.account-list { display: flex; flex-direction: column; gap: 12px; }
.account-item { display: flex; justify-content: space-between; align-items: center; padding: 16px; border: 1px solid #2d2d44; border-radius: 8px; background: #2d2d44; flex-wrap: wrap; gap: 12px; }
.account-info { display: flex; flex-direction: column; gap: 4px; }
.account-email { font-weight: 500; }
.account-name { font-size: 0.8125rem; color: #888; }
.account-status { font-size: 0.75rem; color: #666; }
.account-status.enabled { color: #4caf50; }
.account-sync-time { font-size: 0.6875rem; color: #555; }
.account-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #1a1a2e; border-radius: 16px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #2d2d44; }
.modal-header h3 { margin: 0; font-size: 1.125rem; }
.close-btn { width: 32px; height: 32px; border: none; background: transparent; font-size: 24px; cursor: pointer; color: #888; display: flex; align-items: center; justify-content: center; border-radius: 4px; }
.close-btn:hover { color: #fff; background: rgba(255,255,255,0.05); }
.modal-body { padding: 24px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid #2d2d44; }
.test-result { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-radius: 8px; margin-top: 16px; }
.test-result svg { width: 18px; height: 18px; flex-shrink: 0; }
.test-result.success { background: rgba(76,175,80,0.15); border: 1px solid rgba(76,175,80,0.3); color: #4caf50; }
.test-result.error { background: rgba(244,67,54,0.15); border: 1px solid rgba(244,67,54,0.3); color: #f44336; }
.logs-panel { margin-top: 24px; border: 1px solid #2d2d44; border-radius: 8px; background: #16162a; }
.logs-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #2d2d44; }
.logs-header h3 { margin: 0; font-size: 0.875rem; font-weight: 600; }
.logs-content { max-height: 300px; overflow-y: auto; padding: 8px; }
.log-item { display: flex; gap: 12px; padding: 8px 12px; border-radius: 4px; font-size: 0.8125rem; font-family: 'Consolas', 'Monaco', monospace; margin-bottom: 4px; }
.log-item.info { background: rgba(33,150,243,0.1); }
.log-item.success { background: rgba(76,175,80,0.1); }
.log-item.error { background: rgba(244,67,54,0.1); }
.log-time { color: #888; flex-shrink: 0; }
.log-type { flex-shrink: 0; padding: 2px 6px; border-radius: 4px; font-size: 0.6875rem; font-weight: 600; }
.log-item.info .log-type { background: rgba(33,150,243,0.2); color: #2196f3; }
.log-item.success .log-type { background: rgba(76,175,80,0.2); color: #4caf50; }
.log-item.error .log-type { background: rgba(244,67,54,0.2); color: #f44336; }
.log-message { flex: 1; word-break: break-all; color: #ccc; }
@media (max-width: 640px) {
  .settings-view { padding: 16px; }
  .tabs { overflow-x: auto; flex-wrap: nowrap; }
  .tab { white-space: nowrap; padding: 10px 14px; font-size: 0.875rem; }
  .panel { padding: 16px; }
  .form-row { flex-direction: column; }
  .form-row .form-group.small { flex: 1; }
  .account-item { flex-direction: column; align-items: flex-start; }
  .account-actions { width: 100%; }
}
</style>

