<script setup lang="ts">
/**
 * 洛一 (Luo One) 邮箱管理系统 - 应用头部组件
 * Requirements: 8.1
 */
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useEmailStore } from '@/stores/email';
import { useAccountStore } from '@/stores/account';
import type { EmailAccount } from '@/types';

const router = useRouter();
const userStore = useUserStore();
const emailStore = useEmailStore();
const accountStore = useAccountStore();

// 搜索相关
const searchQuery = ref('');
const isSearching = ref(false);

// 用户菜单
const showUserMenu = ref(false);
const showProfileModal = ref(false);
const showAccountModal = ref(false);

// 状态
const isSubmitting = ref(false);
const successMessage = ref('');
const errorMessage = ref('');

// 用户信息
const user = computed(() => userStore.user);
const userInitial = computed(() => {
  if (user.value?.nickname) {
    return user.value.nickname.charAt(0).toUpperCase();
  }
  if (user.value?.username) {
    return user.value.username.charAt(0).toUpperCase();
  }
  return 'U';
});

// 个人信息表单
const profileForm = reactive({
  nickname: '',
  avatar: '',
});

// 邮箱账户表单
const accountForm = reactive<Partial<EmailAccount>>({
  email: '',
  displayName: '',
  imapHost: '',
  imapPort: 993,
  smtpHost: '',
  smtpPort: 465,
  username: '',
  password: '',
  useSSL: true,
  enabled: true,
});

// 搜索邮件
async function handleSearch() {
  if (!searchQuery.value.trim()) return;
  
  isSearching.value = true;
  try {
    await emailStore.fetchEmails({ search: searchQuery.value.trim() });
  } finally {
    isSearching.value = false;
  }
}

// 清除搜索
function clearSearch() {
  searchQuery.value = '';
  emailStore.fetchEmails();
}

// 跳转到设置页
function goToSettings() {
  showUserMenu.value = false;
  router.push('/settings');
}

// 同步邮件
async function syncEmails() {
  await emailStore.syncEmails();
  await emailStore.fetchEmails();
}

// 切换用户菜单
function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value;
}

// 打开个人信息弹窗
function openProfileModal() {
  showUserMenu.value = false;
  if (user.value) {
    profileForm.nickname = user.value.nickname || '';
    profileForm.avatar = user.value.avatar || '';
  }
  successMessage.value = '';
  errorMessage.value = '';
  showProfileModal.value = true;
}

// 关闭个人信息弹窗
function closeProfileModal() {
  showProfileModal.value = false;
}

// 保存个人信息
async function saveProfile() {
  isSubmitting.value = true;
  errorMessage.value = '';
  successMessage.value = '';
  try {
    const success = await userStore.updateProfile({
      nickname: profileForm.nickname,
      avatar: profileForm.avatar,
    });
    if (success) {
      successMessage.value = '个人信息已更新';
      setTimeout(() => {
        closeProfileModal();
      }, 1000);
    } else {
      errorMessage.value = userStore.error || '更新失败';
    }
  } finally {
    isSubmitting.value = false;
  }
}

// 打开添加邮箱弹窗
function openAccountModal() {
  showUserMenu.value = false;
  resetAccountForm();
  successMessage.value = '';
  errorMessage.value = '';
  showAccountModal.value = true;
}

// 关闭邮箱弹窗
function closeAccountModal() {
  showAccountModal.value = false;
}

// 重置邮箱表单
function resetAccountForm() {
  Object.assign(accountForm, {
    email: '',
    displayName: '',
    imapHost: '',
    imapPort: 993,
    smtpHost: '',
    smtpPort: 465,
    username: '',
    password: '',
    useSSL: true,
    enabled: true,
  });
}

// 保存邮箱账户
async function saveAccount() {
  isSubmitting.value = true;
  errorMessage.value = '';
  successMessage.value = '';
  try {
    const success = await accountStore.addAccount(accountForm as Omit<EmailAccount, 'id' | 'userId' | 'lastSyncAt' | 'createdAt'>);
    if (success) {
      successMessage.value = '邮箱账户已添加';
      setTimeout(() => {
        closeAccountModal();
      }, 1000);
    } else {
      errorMessage.value = accountStore.error || '添加失败';
    }
  } finally {
    isSubmitting.value = false;
  }
}

// 登出
function handleLogout() {
  showUserMenu.value = false;
  userStore.logout();
  router.push('/login');
}

// 点击外部关闭菜单
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.user-menu-container')) {
    showUserMenu.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <div class="logo">
        <span class="logo-text">洛一</span>
      </div>
    </div>

    <div class="header-center">
      <div class="search-bar">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="搜索邮件内容或发件人..."
          @keyup.enter="handleSearch"
        />
        <button
          v-if="searchQuery"
          class="clear-btn"
          @click="clearSearch"
          title="清除搜索"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
        <button
          class="search-btn"
          :disabled="isSearching || !searchQuery.trim()"
          @click="handleSearch"
        >
          {{ isSearching ? '搜索中...' : '搜索' }}
        </button>
      </div>
    </div>

    <div class="header-right">
      <button class="icon-btn" @click="syncEmails" title="同步邮件">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
          <path d="M16 16h5v5"/>
        </svg>
      </button>
      
      <button class="icon-btn" @click="openAccountModal" title="添加邮箱">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </button>

      <!-- 用户头像和菜单 -->
      <div class="user-menu-container">
        <div 
          class="user-avatar" 
          :title="user?.nickname || user?.username || '用户'"
          @click.stop="toggleUserMenu"
        >
          <img v-if="user?.avatar" :src="user.avatar" :alt="user.nickname || user.username" />
          <span v-else class="avatar-initial">{{ userInitial }}</span>
        </div>
        
        <!-- 下拉菜单 -->
        <div v-if="showUserMenu" class="user-dropdown">
          <div class="dropdown-header">
            <div class="dropdown-avatar">
              <img v-if="user?.avatar" :src="user.avatar" :alt="user.nickname || user.username" />
              <span v-else class="avatar-initial">{{ userInitial }}</span>
            </div>
            <div class="dropdown-info">
              <div class="dropdown-name">{{ user?.nickname || user?.username }}</div>
              <div class="dropdown-username">@{{ user?.username }}</div>
            </div>
          </div>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item" @click="openProfileModal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            个人信息
          </button>
          <button class="dropdown-item" @click="openAccountModal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            添加邮箱
          </button>
          <button class="dropdown-item" @click="goToSettings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            设置
          </button>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item danger" @click="handleLogout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16,17 21,12 16,7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            退出登录
          </button>
        </div>
      </div>
    </div>

    <!-- 个人信息弹窗 -->
    <div v-if="showProfileModal" class="modal-overlay" @click.self="closeProfileModal">
      <div class="modal">
        <div class="modal-header">
          <h3>个人信息</h3>
          <button class="close-btn" @click="closeProfileModal">×</button>
        </div>
        <form @submit.prevent="saveProfile" class="modal-body">
          <!-- 消息提示 -->
          <div v-if="successMessage" class="message success">{{ successMessage }}</div>
          <div v-if="errorMessage" class="message error">{{ errorMessage }}</div>
          
          <div class="form-group">
            <label>用户名</label>
            <input type="text" :value="user?.username" disabled class="input disabled" />
            <span class="hint">用户名不可修改</span>
          </div>
          <div class="form-group">
            <label>昵称</label>
            <input 
              type="text" 
              v-model="profileForm.nickname" 
              placeholder="请输入昵称"
              class="input"
            />
          </div>
          <div class="form-group">
            <label>头像 URL</label>
            <input 
              type="text" 
              v-model="profileForm.avatar" 
              placeholder="请输入头像图片地址"
              class="input"
            />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn" @click="closeProfileModal">取消</button>
            <button type="submit" class="btn primary" :disabled="isSubmitting">
              {{ isSubmitting ? '保存中...' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 添加邮箱弹窗 -->
    <div v-if="showAccountModal" class="modal-overlay" @click.self="closeAccountModal">
      <div class="modal modal-large">
        <div class="modal-header">
          <h3>添加邮箱账户</h3>
          <button class="close-btn" @click="closeAccountModal">×</button>
        </div>
        <form @submit.prevent="saveAccount" class="modal-body">
          <!-- 消息提示 -->
          <div v-if="successMessage" class="message success">{{ successMessage }}</div>
          <div v-if="errorMessage" class="message error">{{ errorMessage }}</div>
          
          <div class="form-group">
            <label>邮箱地址 *</label>
            <input 
              type="email" 
              v-model="accountForm.email" 
              placeholder="example@mail.com"
              class="input"
              required
            />
          </div>
          <div class="form-group">
            <label>显示名称</label>
            <input 
              type="text" 
              v-model="accountForm.displayName" 
              placeholder="用于显示的名称"
              class="input"
            />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>IMAP 服务器 *</label>
              <input 
                type="text" 
                v-model="accountForm.imapHost" 
                placeholder="imap.example.com"
                class="input"
                required
              />
            </div>
            <div class="form-group small">
              <label>端口 *</label>
              <input 
                type="number" 
                v-model="accountForm.imapPort" 
                class="input"
                required
              />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>SMTP 服务器 *</label>
              <input 
                type="text" 
                v-model="accountForm.smtpHost" 
                placeholder="smtp.example.com"
                class="input"
                required
              />
            </div>
            <div class="form-group small">
              <label>端口 *</label>
              <input 
                type="number" 
                v-model="accountForm.smtpPort" 
                class="input"
                required
              />
            </div>
          </div>
          <div class="form-group">
            <label>用户名 *</label>
            <input 
              type="text" 
              v-model="accountForm.username" 
              placeholder="登录用户名"
              class="input"
              required
            />
          </div>
          <div class="form-group">
            <label>密码 *</label>
            <input 
              type="password" 
              v-model="accountForm.password" 
              placeholder="登录密码"
              class="input"
              required
            />
          </div>
          <div class="form-group checkbox">
            <label>
              <input type="checkbox" v-model="accountForm.useSSL" />
              使用 SSL/TLS
            </label>
          </div>
          <div class="form-group checkbox">
            <label>
              <input type="checkbox" v-model="accountForm.enabled" />
              启用此账户
            </label>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn" @click="closeAccountModal">取消</button>
            <button type="submit" class="btn primary" :disabled="isSubmitting">
              {{ isSubmitting ? '添加中...' : '添加账户' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </header>
</template>


<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 16px;
  background-color: var(--header-bg, #1a1a2e);
  border-bottom: 1px solid var(--border-color, #2d2d44);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-text {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--primary-color, #646cff);
}

.header-center {
  flex: 1;
  max-width: 600px;
  margin: 0 24px;
}

.search-bar {
  display: flex;
  align-items: center;
  background-color: var(--input-bg, #2d2d44);
  border-radius: 8px;
  padding: 0 12px;
  transition: box-shadow 0.2s;
}

.search-bar:focus-within {
  box-shadow: 0 0 0 2px var(--primary-color, #646cff);
}

.search-icon {
  width: 18px;
  height: 18px;
  color: var(--text-secondary, #888);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 10px 12px;
  font-size: 0.875rem;
  color: var(--text-primary, #fff);
  outline: none;
}

.search-input::placeholder {
  color: var(--text-secondary, #888);
}

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-secondary, #888);
  cursor: pointer;
  border-radius: 4px;
  transition: color 0.2s, background-color 0.2s;
}

.clear-btn:hover {
  color: var(--text-primary, #fff);
  background-color: var(--hover-bg, rgba(255, 255, 255, 0.1));
}

.clear-btn svg {
  width: 14px;
  height: 14px;
}

.search-btn {
  padding: 6px 16px;
  margin-left: 8px;
  border: none;
  border-radius: 6px;
  background-color: var(--primary-color, #646cff);
  color: #fff;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.search-btn:hover:not(:disabled) {
  background-color: var(--primary-hover, #535bf2);
}

.search-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, #888);
  cursor: pointer;
  transition: color 0.2s, background-color 0.2s;
}

.icon-btn:hover {
  color: var(--text-primary, #fff);
  background-color: var(--hover-bg, rgba(255, 255, 255, 0.1));
}

.icon-btn svg {
  width: 20px;
  height: 20px;
}

/* 用户菜单容器 */
.user-menu-container {
  position: relative;
  margin-left: 8px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  background-color: var(--primary-color, #646cff);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.user-avatar:hover {
  transform: scale(1.05);
  box-shadow: 0 0 0 2px var(--primary-color, #646cff);
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initial {
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
}

/* 下拉菜单 */
.user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 240px;
  background: var(--panel-bg, #1a1a2e);
  border: 1px solid var(--border-color, #2d2d44);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 200;
  animation: dropdownFadeIn 0.15s ease-out;
}

@keyframes dropdownFadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.dropdown-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background-color: var(--primary-color, #646cff);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dropdown-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dropdown-info {
  flex: 1;
  min-width: 0;
}

.dropdown-name {
  font-weight: 600;
  color: var(--text-primary, #fff);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-username {
  font-size: 0.75rem;
  color: var(--text-secondary, #888);
}

.dropdown-divider {
  height: 1px;
  background: var(--border-color, #2d2d44);
  margin: 4px 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: var(--text-primary, #fff);
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;
  text-align: left;
}

.dropdown-item:hover {
  background: var(--hover-bg, rgba(255, 255, 255, 0.05));
}

.dropdown-item svg {
  width: 18px;
  height: 18px;
  color: var(--text-secondary, #888);
}

.dropdown-item.danger {
  color: var(--error-color, #f44336);
}

.dropdown-item.danger svg {
  color: var(--error-color, #f44336);
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--panel-bg, #1a1a2e);
  border-radius: 16px;
  width: 90%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
  animation: modalFadeIn 0.2s ease-out;
}

.modal.modal-large {
  max-width: 500px;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color, #2d2d44);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.125rem;
  color: var(--text-primary, #fff);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-secondary, #888);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-btn:hover {
  color: var(--text-primary, #fff);
  background: var(--hover-bg, rgba(255, 255, 255, 0.05));
}

.modal-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.875rem;
}

.message.success {
  background: rgba(76, 175, 80, 0.15);
  color: var(--success-color, #4caf50);
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.message.error {
  background: rgba(244, 67, 54, 0.15);
  color: var(--error-color, #f44336);
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary, #fff);
}

.form-group.checkbox {
  flex-direction: row;
  align-items: center;
}

.form-group.checkbox label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.form-group.checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--primary-color, #646cff);
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}

.form-row .form-group.small {
  flex: 0 0 100px;
}

.input {
  padding: 10px 12px;
  border: 1px solid var(--border-color, #2d2d44);
  border-radius: 8px;
  font-size: 0.875rem;
  background: var(--input-bg, #2d2d44);
  color: var(--text-primary, #fff);
  transition: border-color 0.2s;
}

.input:focus {
  outline: none;
  border-color: var(--primary-color, #646cff);
}

.input::placeholder {
  color: var(--text-tertiary, #666);
}

.input.disabled {
  background: var(--bg-primary, #0f0f1a);
  color: var(--text-tertiary, #666);
}

.hint {
  font-size: 0.75rem;
  color: var(--text-tertiary, #666);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

.btn {
  padding: 10px 20px;
  border: 1px solid var(--border-color, #2d2d44);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--text-primary, #fff);
  transition: all 0.2s;
}

.btn:hover {
  background: var(--hover-bg, rgba(255, 255, 255, 0.05));
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.primary {
  background: var(--primary-color, #646cff);
  border-color: var(--primary-color, #646cff);
}

.btn.primary:hover:not(:disabled) {
  background: var(--primary-hover, #535bf2);
}

@media (max-width: 768px) {
  .header-center {
    margin: 0 12px;
  }
  
  .search-btn {
    display: none;
  }
  
  .form-row {
    flex-direction: column;
  }
  
  .form-row .form-group.small {
    flex: 1;
  }
}
</style>
