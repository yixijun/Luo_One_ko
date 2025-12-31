<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useAccountStore } from '@/stores/account';
import { apiKeyManager } from '@/api/client';
import type { EmailAccount, UserSettings } from '@/types';

const router = useRouter();
const userStore = useUserStore();
const accountStore = useAccountStore();

const activeTab = ref<'profile' | 'password' | 'accounts' | 'ai' | 'backend'>('profile');
const isSubmitting = ref(false);
const successMessage = ref('');
const errorMessage = ref('');
const showAccountModal = ref(false);
const editingAccountId = ref<number | null>(null);
const testingConnection = ref(false);
const modalTestingConnection = ref(false);
const modalTestResult = ref<{ success: boolean; message: string } | null>(null);

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
  try {
    const result = await accountStore.testConnection(id);
    if (result.success) successMessage.value = '连接测试成功';
    else errorMessage.value = result.message || '连接测试失败';
  } finally { testingConnection.value = false; }
}

async function testModalConnection() {
  modalTestResult.value = null; modalTestingConnection.value = true;
  try {
    const result = await accountStore.testConnectionDirect({
      imapHost: accountForm.imapHost || '', imapPort: accountForm.imapPort || 993,
      smtpHost: accountForm.smtpHost || '', smtpPort: accountForm.smtpPort || 465,
      username: accountForm.username || '', password: accountForm.password || '', useSSL: accountForm.useSSL ?? true,
    });
    modalTestResult.value = result;
  } finally { modalTestingConnection.value = false; }
}

onMounted(async () => {
  if (user.value) { profileForm.nickname = user.value.nickname || ''; profileForm.avatar = user.value.avatar || ''; }
  if (userStore.settings) Object.assign(aiForm, userStore.settings);
  await accountStore.fetchAccounts();
});
</script>

<template>
  <div class="settings-view">
    <header class="settings-header">
      <button class="back-btn" @click="goBack"><span></span> 返回</button>
      <h1>设置</h1>
    </header>
    <div v-if="successMessage" class="message success">{{ successMessage }}</div>
    <div v-if="errorMessage" class="message error">{{ errorMessage }}</div>
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
          <div class="form-group"><label>用户名</label><input type="text" :value="user?.username" disabled /></div>
          <div class="form-group"><label>昵称</label><input v-model="profileForm.nickname" type="text" placeholder="输入昵称" /></div>
          <div class="form-group"><label>头像 URL</label><input v-model="profileForm.avatar" type="text" placeholder="输入头像链接" /></div>
          <button type="submit" class="btn primary" :disabled="isSubmitting">{{ isSubmitting ? '保存中...' : '保存' }}</button>
        </form>
      </div>
      <div v-if="activeTab === 'password'" class="panel">
        <h2>修改密码</h2>
        <form @submit.prevent="changePassword">
          <div class="form-group"><label>当前密码</label><input v-model="passwordForm.oldPassword" type="password" placeholder="输入当前密码" /></div>
          <div class="form-group"><label>新密码</label><input v-model="passwordForm.newPassword" type="password" placeholder="输入新密码（至少6位）" /></div>
          <div class="form-group"><label>确认新密码</label><input v-model="passwordForm.confirmPassword" type="password" placeholder="再次输入新密码" /></div>
          <button type="submit" class="btn primary" :disabled="isSubmitting || !passwordValid">{{ isSubmitting ? '修改中...' : '修改密码' }}</button>
        </form>
      </div>
      <div v-if="activeTab === 'accounts'" class="panel">
        <div class="panel-header"><h2>邮箱账户</h2><button class="btn primary" @click="openAddAccountModal">+ 添加账户</button></div>
        <div v-if="accounts.length === 0" class="empty-state">暂无邮箱账户，点击上方按钮添加</div>
        <div v-else class="account-list">
          <div v-for="account in accounts" :key="account.id" class="account-item">
            <div class="account-info">
              <span class="account-email">{{ account.email }}</span>
              <span v-if="account.displayName" class="account-name">{{ account.displayName }}</span>
              <span :class="['account-status', { enabled: account.enabled }]">{{ account.enabled ? '已启用' : '已禁用' }}</span>
            </div>
            <div class="account-actions">
              <button class="btn small" @click="testConnection(account.id)" :disabled="testingConnection">测试</button>
              <button class="btn small" @click="toggleAccountEnabled(account.id)">{{ account.enabled ? '禁用' : '启用' }}</button>
              <button class="btn small" @click="openEditAccountModal(account)">编辑</button>
              <button class="btn small danger" @click="deleteAccount(account.id)">删除</button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="activeTab === 'ai'" class="panel">
        <h2>AI 配置</h2>
        <form @submit.prevent="saveAISettings">
          <div class="form-group checkbox"><label><input v-model="aiForm.aiEnabled" type="checkbox" /> 启用 AI 处理</label></div>
          <div class="form-group"><label>AI 提供商</label><select v-model="aiForm.aiProvider"><option value="">请选择</option><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="local">本地模型</option></select></div>
          <div class="form-group"><label>API Key</label><input v-model="aiForm.aiApiKey" type="password" placeholder="输入 API Key" /></div>
          <div class="form-group"><label>模型</label><input v-model="aiForm.aiModel" type="text" placeholder="如 gpt-4, claude-3" /></div>
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
          <div class="form-group"><label>API 密钥</label><input v-model="backendForm.apiKey" type="password" placeholder="输入后端 API 密钥" /><p class="hint">用于连接后端服务的认证密钥</p></div>
          <button type="submit" class="btn primary">保存设置</button>
        </form>
      </div>
    </div>
    <div v-if="showAccountModal" class="modal-overlay" @click.self="closeAccountModal">
      <div class="modal">
        <div class="modal-header"><h3>{{ editingAccountId ? '编辑邮箱账户' : '添加邮箱账户' }}</h3><button class="close-btn" @click="closeAccountModal"></button></div>
        <form @submit.prevent="saveAccount">
          <div class="modal-body">
            <div class="form-group"><label>邮箱地址</label><input v-model="accountForm.email" type="email" placeholder="example@mail.com" required /></div>
            <div class="form-group"><label>显示名称</label><input v-model="accountForm.displayName" type="text" placeholder="可选" /></div>
            <div class="form-row"><div class="form-group"><label>IMAP 服务器</label><input v-model="accountForm.imapHost" type="text" placeholder="imap.mail.com" required /></div><div class="form-group small"><label>端口</label><input v-model.number="accountForm.imapPort" type="number" required /></div></div>
            <div class="form-row"><div class="form-group"><label>SMTP 服务器</label><input v-model="accountForm.smtpHost" type="text" placeholder="smtp.mail.com" required /></div><div class="form-group small"><label>端口</label><input v-model.number="accountForm.smtpPort" type="number" required /></div></div>
            <div class="form-group"><label>用户名</label><input v-model="accountForm.username" type="text" placeholder="登录用户名" required /></div>
            <div class="form-group"><label>密码</label><input v-model="accountForm.password" type="password" :placeholder="editingAccountId ? '留空保持不变' : '邮箱密码或授权码'" :required="!editingAccountId" /></div>
            <div class="form-group checkbox"><label><input v-model="accountForm.useSSL" type="checkbox" /> 使用 SSL/TLS</label></div>
            <div class="form-group checkbox"><label><input v-model="accountForm.enabled" type="checkbox" /> 启用此账户</label></div>
            <div v-if="modalTestResult" :class="['test-result', modalTestResult.success ? 'success' : 'error']">{{ modalTestResult.success ? ' 连接成功' : ' ' + modalTestResult.message }}</div>
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
.settings-view { min-height: 100vh; padding: 24px; background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16162a 100%); color: #fff; }
.settings-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; max-width: 800px; margin-left: auto; margin-right: auto; }
.settings-header h1 { margin: 0; font-size: 1.5rem; font-weight: 600; }
.back-btn { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border: 1px solid #2d2d44; border-radius: 8px; background: #1a1a2e; color: #fff; cursor: pointer; transition: all 0.2s; }
.back-btn:hover { background: rgba(255,255,255,0.05); border-color: #646cff; }
.message { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-radius: 8px; margin-bottom: 20px; max-width: 800px; margin-left: auto; margin-right: auto; }
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
.form-group label { display: block; margin-bottom: 8px; font-size: 0.875rem; font-weight: 500; }
.form-group.checkbox label { display: flex; align-items: center; gap: 10px; font-weight: normal; cursor: pointer; }
.form-group.checkbox input[type="checkbox"] { width: 18px; height: 18px; accent-color: #646cff; }
.form-group input, .form-group select { width: 100%; padding: 12px 14px; border: 1px solid #2d2d44; border-radius: 8px; background: #2d2d44; color: #fff; font-size: 0.9375rem; box-sizing: border-box; }
.form-group input:focus, .form-group select:focus { outline: none; border-color: #646cff; box-shadow: 0 0 0 3px rgba(100,108,255,0.15); }
.form-group input:disabled { background: rgba(45,45,68,0.5); color: #666; }
.form-group input::placeholder { color: #666; }
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
.empty-state { text-align: center; padding: 48px 24px; color: #888; }
.account-list { display: flex; flex-direction: column; gap: 12px; }
.account-item { display: flex; justify-content: space-between; align-items: center; padding: 16px; border: 1px solid #2d2d44; border-radius: 8px; background: #2d2d44; flex-wrap: wrap; gap: 12px; }
.account-info { display: flex; flex-direction: column; gap: 4px; }
.account-email { font-weight: 500; }
.account-name { font-size: 0.8125rem; color: #888; }
.account-status { font-size: 0.75rem; color: #666; }
.account-status.enabled { color: #4caf50; }
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
.test-result.success { background: rgba(76,175,80,0.15); border: 1px solid rgba(76,175,80,0.3); color: #4caf50; }
.test-result.error { background: rgba(244,67,54,0.15); border: 1px solid rgba(244,67,54,0.3); color: #f44336; }
@media (max-width: 640px) { .settings-view { padding: 16px; } .tabs { overflow-x: auto; flex-wrap: nowrap; } .tab { white-space: nowrap; padding: 10px 14px; font-size: 0.875rem; } .panel { padding: 16px; } .form-row { flex-direction: column; } .form-row .form-group.small { flex: 1; } .account-item { flex-direction: column; align-items: flex-start; } .account-actions { width: 100%; } }
</style>