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
import { useThemeStore, themes, fonts, type ThemeName, type FontName } from '@/stores/theme';
import apiClient from '@/api/client';
import type { EmailAccount } from '@/types';

const router = useRouter();
const userStore = useUserStore();
const emailStore = useEmailStore();
const accountStore = useAccountStore();
const themeStore = useThemeStore();

// 搜索相关
const searchQuery = ref('');
const isSearching = ref(false);

// 用户菜单
const showUserMenu = ref(false);
const showProfileModal = ref(false);
const showAccountModal = ref(false);
const showThemeMenu = ref(false);

// 状态
const isSubmitting = ref(false);
const successMessage = ref('');
const errorMessage = ref('');
const googleOAuthConfigured = ref(false);
const checkingOAuthConfig = ref(false);

// 计算是否显示 OAuth 未配置警告
const showOAuthWarning = computed(() => {
  const show = selectedPreset.value === 'Gmail' && !checkingOAuthConfig.value && !googleOAuthConfigured.value;
  console.log('[OAuth Warning] selectedPreset:', selectedPreset.value, 'checkingOAuthConfig:', checkingOAuthConfig.value, 'googleOAuthConfigured:', googleOAuthConfigured.value, 'showWarning:', show);
  return show;
});

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

// 邮箱预设配置
const emailPresets = [
  { name: '手动配置', domain: '', imapHost: '', imapPort: 993, smtpHost: '', smtpPort: 465 },
  { name: 'Gmail', domain: 'gmail.com', imapHost: 'imap.gmail.com', imapPort: 993, smtpHost: 'smtp.gmail.com', smtpPort: 587 },
  { name: 'QQ 邮箱', domain: 'qq.com', imapHost: 'imap.qq.com', imapPort: 993, smtpHost: 'smtp.qq.com', smtpPort: 465 },
  { name: '163 邮箱', domain: '163.com', imapHost: 'imap.163.com', imapPort: 993, smtpHost: 'smtp.163.com', smtpPort: 465 },
  { name: '126 邮箱', domain: '126.com', imapHost: 'imap.126.com', imapPort: 993, smtpHost: 'smtp.126.com', smtpPort: 465 },
  { name: 'Outlook', domain: 'outlook.com', imapHost: 'outlook.office365.com', imapPort: 993, smtpHost: 'smtp.office365.com', smtpPort: 587 },
];
const selectedPreset = ref('手动配置');

function applyPreset() {
  const preset = emailPresets.find(p => p.name === selectedPreset.value);
  if (preset && preset.imapHost) {
    accountForm.imapHost = preset.imapHost;
    accountForm.imapPort = preset.imapPort;
    accountForm.smtpHost = preset.smtpHost;
    accountForm.smtpPort = preset.smtpPort;
  }
}

function autoSelectPreset() {
  const email = accountForm.email || '';
  const domain = email.split('@')[1]?.toLowerCase();
  if (domain) {
    const preset = emailPresets.find(p => p.domain === domain);
    if (preset) {
      selectedPreset.value = preset.name;
      applyPreset();
      if (!accountForm.username) accountForm.username = email;
    }
  }
}

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

// 刷新状态
const isRefreshing = ref(false);

// 同步邮件（从服务器拉取）
async function syncEmails() {
  if (isRefreshing.value) return;
  isRefreshing.value = true;
  try {
    const currentAccountId = accountStore.currentAccountId;
    if (currentAccountId) {
      // 只同步当前选中的账户
      await emailStore.syncEmails({ accountId: currentAccountId });
      await emailStore.fetchEmails({ accountId: currentAccountId });
    } else {
      // 并行同步所有启用的账户
      const syncPromises = accountStore.enabledAccounts.map(account => 
        emailStore.syncEmails({ accountId: account.id }).catch(err => {
          console.error(`同步账户 ${account.email} 失败:`, err);
          return -1;
        })
      );
      await Promise.all(syncPromises);
      await emailStore.fetchEmails();
    }
  } finally {
    isRefreshing.value = false;
  }
}

// 切换用户菜单
function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value;
  showThemeMenu.value = false;
}

// 切换主题菜单
function toggleThemeMenu() {
  showThemeMenu.value = !showThemeMenu.value;
  showUserMenu.value = false;
}

// 选择主题
function selectTheme(themeName: ThemeName) {
  themeStore.setTheme(themeName);
  showThemeMenu.value = false;
}

// 选择字体
function selectFont(fontName: FontName) {
  themeStore.setFont(fontName);
}

// 获取当前主题信息
const currentThemeInfo = computed(() => {
  return themes.find(t => t.name === themeStore.currentTheme) || themes[0];
});

// 获取当前字体信息
const currentFontInfo = computed(() => {
  return fonts.find(f => f.name === themeStore.currentFont) || fonts[0];
});

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
async function openAccountModal() {
  showUserMenu.value = false;
  resetAccountForm();
  successMessage.value = '';
  errorMessage.value = '';
  showAccountModal.value = true;
  checkingOAuthConfig.value = true;
  
  // 检查 Google OAuth 配置状态（使用原生 fetch 避免 401 跳转）
  try {
    const token = localStorage.getItem('luo_one_token');
    const apiKey = localStorage.getItem('luo_one_api_key');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (apiKey) headers['X-API-Key'] = apiKey;
    
    console.log('[OAuth Config] Fetching /api/oauth/config with headers:', { hasToken: !!token, hasApiKey: !!apiKey });
    const response = await fetch('/api/oauth/config', { headers });
    console.log('[OAuth Config] Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('[OAuth Config] Response data:', JSON.stringify(data));
      // 兼容两种响应格式
      const googleEnabled = data?.data?.google_enabled ?? data?.google_enabled ?? false;
      googleOAuthConfigured.value = googleEnabled;
      console.log('[OAuth Config] googleOAuthConfigured set to:', googleOAuthConfigured.value);
    } else {
      const errorText = await response.text();
      console.error('[OAuth Config] Error response:', response.status, errorText);
      googleOAuthConfigured.value = false;
    }
  } catch (err) {
    console.error('[OAuth Config] Fetch error:', err);
    googleOAuthConfigured.value = false;
  } finally {
    checkingOAuthConfig.value = false;
  }
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
  selectedPreset.value = '手动配置';
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

// 使用 Google 账号登录
async function loginWithGoogle() {
  try {
    const response = await apiClient.get<{ success: boolean; data: { auth_url: string }; error?: { message: string } }>('/oauth/google/auth');
    if (response.data.success && response.data.data.auth_url) {
      // 打开 Google 授权页面
      window.open(response.data.data.auth_url, '_blank', 'width=600,height=700');
      closeAccountModal();
      successMessage.value = '请在弹出窗口中完成 Google 授权';
    } else {
      errorMessage.value = response.data.error?.message || 'Google OAuth 未配置';
    }
  } catch (err) {
    errorMessage.value = 'Google 登录失败，请检查后端配置';
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
  if (!target.closest('.theme-menu-container')) {
    showThemeMenu.value = false;
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
      <!-- 移动端菜单按钮插槽 -->
      <slot name="mobile-menu"></slot>
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
      <button 
        class="icon-btn" 
        :class="{ 'is-syncing': isRefreshing }"
        @click="syncEmails" 
        :disabled="isRefreshing"
        :title="isRefreshing ? '同步中...' : '同步邮件'"
      >
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

      <!-- 主题切换按钮 -->
      <div class="theme-menu-container">
        <button 
          class="icon-btn theme-btn" 
          @click.stop="toggleThemeMenu" 
          :title="`当前主题: ${currentThemeInfo.label}`"
        >
          <span class="theme-indicator" :style="{ backgroundColor: currentThemeInfo.primaryColor }"></span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="4"/>
            <path d="M12 2v2"/>
            <path d="M12 20v2"/>
            <path d="m4.93 4.93 1.41 1.41"/>
            <path d="m17.66 17.66 1.41 1.41"/>
            <path d="M2 12h2"/>
            <path d="M20 12h2"/>
            <path d="m6.34 17.66-1.41 1.41"/>
            <path d="m19.07 4.93-1.41 1.41"/>
          </svg>
        </button>
        
        <!-- 主题下拉菜单 -->
        <div v-if="showThemeMenu" class="theme-dropdown">
          <div class="dropdown-title">选择主题</div>
          <button
            v-for="theme in themes"
            :key="theme.name"
            class="theme-option"
            :class="{ active: themeStore.currentTheme === theme.name }"
            @click="selectTheme(theme.name)"
          >
            <span class="theme-color" :style="{ backgroundColor: theme.primaryColor }"></span>
            <span class="theme-name">{{ theme.label }}</span>
            <svg v-if="themeStore.currentTheme === theme.name" class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>
          <div class="dropdown-divider"></div>
          <div class="dropdown-title">选择字体</div>
          <button
            v-for="font in fonts"
            :key="font.name"
            class="theme-option font-option"
            :class="{ active: themeStore.currentFont === font.name }"
            @click="selectFont(font.name)"
          >
            <span class="font-preview-text" :style="{ fontFamily: font.fontFamily }">Aa</span>
            <span class="theme-name">{{ font.label }}</span>
            <svg v-if="themeStore.currentFont === font.name" class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>
        </div>
      </div>

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

  </header>

  <!-- 添加邮箱弹窗 - 使用 Teleport 移到 body -->
  <Teleport to="body">
    <div v-if="showAccountModal" class="account-modal-overlay" @click.self="closeAccountModal">
      <div class="account-modal">
        <div class="account-modal-header">
          <h3>添加邮箱账户</h3>
          <button class="account-modal-close" @click="closeAccountModal">×</button>
        </div>
        <div class="account-modal-body">
          <div v-if="successMessage" class="account-modal-message success">{{ successMessage }}</div>
          <div v-if="errorMessage" class="account-modal-message error">{{ errorMessage }}</div>
          <div v-if="showOAuthWarning" class="account-modal-message warning">
            Google OAuth 未配置，请先在「设置 → AI 配置」中配置 Google OAuth
          </div>
          
          <div class="account-modal-field">
            <label>邮箱服务商</label>
            <select v-model="selectedPreset" @change="applyPreset">
              <option v-for="preset in emailPresets" :key="preset.name" :value="preset.name">{{ preset.name }}</option>
            </select>
            <span class="account-modal-hint" v-if="selectedPreset === 'Gmail'">
              <button type="button" class="google-login-btn" @click="loginWithGoogle" :disabled="!googleOAuthConfigured">
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                使用 Google 账号登录
              </button>
              <span class="hint-text">或使用应用专用密码：<a href="https://myaccount.google.com/apppasswords" target="_blank">点击获取</a></span>
            </span>
            <span class="account-modal-hint" v-else-if="selectedPreset === 'QQ 邮箱'">QQ 邮箱需要使用授权码</span>
          </div>
          <div class="account-modal-field">
            <label>邮箱地址 *</label>
            <input type="email" v-model="accountForm.email" placeholder="example@mail.com" @blur="autoSelectPreset" />
          </div>
          <div class="account-modal-field">
            <label>显示名称</label>
            <input type="text" v-model="accountForm.displayName" placeholder="用于显示的名称" />
          </div>
          <div class="account-modal-row">
            <div class="account-modal-field"><label>IMAP 服务器 *</label><input type="text" v-model="accountForm.imapHost" placeholder="imap.example.com" /></div>
            <div class="account-modal-field small"><label>端口</label><input type="number" v-model="accountForm.imapPort" /></div>
          </div>
          <div class="account-modal-row">
            <div class="account-modal-field"><label>SMTP 服务器 *</label><input type="text" v-model="accountForm.smtpHost" placeholder="smtp.example.com" /></div>
            <div class="account-modal-field small"><label>端口</label><input type="number" v-model="accountForm.smtpPort" /></div>
          </div>
          <div class="account-modal-field">
            <label>用户名 *</label>
            <input type="text" v-model="accountForm.username" placeholder="登录用户名" />
          </div>
          <div class="account-modal-field">
            <label>密码 *</label>
            <input type="password" v-model="accountForm.password" placeholder="登录密码" />
          </div>
          <div class="account-modal-checkbox"><label><input type="checkbox" v-model="accountForm.useSSL" /> 使用 SSL/TLS</label></div>
          <div class="account-modal-checkbox"><label><input type="checkbox" v-model="accountForm.enabled" /> 启用此账户</label></div>
        </div>
        <div class="account-modal-footer">
          <button type="button" class="account-modal-btn" @click="closeAccountModal">取消</button>
          <button type="button" class="account-modal-btn primary" :disabled="isSubmitting" @click="saveAccount">{{ isSubmitting ? '添加中...' : '添加账户' }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>


<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  padding: 0 20px;
  background-color: var(--header-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-color);
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
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--primary-color);
  letter-spacing: -0.02em;
}

.header-center {
  flex: 1;
  max-width: 600px;
  margin: 0 24px;
}

.search-bar {
  display: flex;
  align-items: center;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg, 14px);
  padding: 0 14px;
  transition: all var(--transition-fast, 0.15s ease);
}

.search-bar:focus-within {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.search-icon {
  width: 18px;
  height: 18px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 11px 12px;
  font-size: 0.875rem;
  color: var(--text-primary);
  outline: none;
}

.search-input::placeholder {
  color: var(--text-tertiary);
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
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: var(--radius-sm, 6px);
  transition: all var(--transition-fast, 0.15s ease);
}

.clear-btn:hover {
  color: var(--text-primary);
  background-color: var(--hover-bg);
}

.clear-btn svg {
  width: 14px;
  height: 14px;
}

.search-btn {
  padding: 7px 16px;
  margin-left: 8px;
  border: none;
  border-radius: var(--radius-md, 10px);
  background-color: var(--primary-color);
  color: #fff;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
}

.search-btn:hover:not(:disabled) {
  background-color: var(--primary-hover);
  transform: translateY(-1px);
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
  width: 38px;
  height: 38px;
  padding: 0;
  border: none;
  border-radius: var(--radius-md, 10px);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
}

.icon-btn:hover:not(:disabled) {
  color: var(--text-primary);
  background-color: var(--hover-bg);
}

.icon-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.icon-btn svg {
  width: 20px;
  height: 20px;
}

/* 同步按钮旋转动画 */
.icon-btn.is-syncing svg {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 主题切换按钮 */
.theme-menu-container {
  position: relative;
}

.theme-btn {
  position: relative;
}

.theme-indicator {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 2px solid var(--header-bg);
}

.theme-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 180px;
  background: var(--panel-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg, 14px);
  box-shadow: var(--shadow-lg, 0 20px 40px rgba(0, 0, 0, 0.4));
  z-index: 1000;
  animation: slideDown 0.15s ease-out;
  overflow: hidden;
}

.dropdown-title {
  padding: 12px 16px 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.theme-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color var(--transition-fast, 0.15s ease);
  text-align: left;
}

.theme-option:hover {
  background: var(--hover-bg);
}

.theme-option.active {
  background: var(--active-bg);
}

.theme-option .theme-color {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px var(--border-color);
}

.theme-option .theme-name {
  flex: 1;
}

.theme-option .check-icon {
  width: 16px;
  height: 16px;
  color: var(--primary-color);
}

/* 字体选项样式 */
.font-option .font-preview-text {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--hover-bg);
  border-radius: var(--radius-sm, 6px);
  flex-shrink: 0;
}

.font-option.active .font-preview-text {
  color: var(--primary-color);
  background: var(--primary-light);
}

/* 用户菜单容器 */
.user-menu-container {
  position: relative;
  margin-left: 4px;
}

.user-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
  box-shadow: 0 2px 8px var(--shadow-color);
}

.user-avatar:hover {
  transform: scale(1.05);
  box-shadow: 0 0 0 3px var(--primary-light);
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
  width: 260px;
  background: var(--panel-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg, 14px);
  box-shadow: var(--shadow-lg, 0 20px 40px rgba(0, 0, 0, 0.4));
  z-index: 1000;
  animation: slideDown 0.15s ease-out;
  overflow: hidden;
}

@keyframes slideDown {
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
  background: var(--card-bg);
}

.dropdown-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
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
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-username {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.dropdown-divider {
  height: 1px;
  background: var(--border-color);
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
  color: var(--text-primary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color var(--transition-fast, 0.15s ease);
  text-align: left;
}

.dropdown-item:hover {
  background: var(--hover-bg);
}

.dropdown-item svg {
  width: 18px;
  height: 18px;
  color: var(--text-secondary);
}

.dropdown-item.danger {
  color: var(--error-color);
}

.dropdown-item.danger svg {
  color: var(--error-color);
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: var(--panel-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl, 20px);
  width: 90%;
  max-width: 420px;
  max-height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  animation: scaleIn 0.2s ease-out;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.modal.modal-large {
  max-width: 520px;
}

@keyframes scaleIn {
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
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm, 6px);
  transition: all var(--transition-fast, 0.15s ease);
}

.close-btn:hover {
  color: var(--text-primary);
  background: var(--hover-bg);
}

.modal-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.message {
  padding: 12px 16px;
  border-radius: var(--radius-md, 10px);
  font-size: 0.875rem;
}

.message.success {
  background: rgba(34, 197, 94, 0.12);
  color: var(--success-color);
  border: 1px solid rgba(34, 197, 94, 0.25);
}

.message.error {
  background: rgba(239, 68, 68, 0.12);
  color: var(--error-color);
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}

.form-group.checkbox {
  flex-direction: row;
  align-items: center;
}

.form-group.checkbox label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.form-group.checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--primary-color);
  cursor: pointer;
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
  padding: 11px 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 10px);
  font-size: 0.875rem;
  background: var(--input-bg);
  color: var(--text-primary);
  transition: all var(--transition-fast, 0.15s ease);
}

.input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.input::placeholder {
  color: var(--text-tertiary);
}

.input.disabled {
  background: var(--bg-primary);
  color: var(--text-tertiary);
  cursor: not-allowed;
}

.hint {
  font-size: 0.6875rem;
  color: var(--text-tertiary);
  margin-top: 4px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 14px 20px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.btn {
  padding: 11px 22px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 10px);
  background: transparent;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  transition: all var(--transition-fast, 0.15s ease);
}

.btn:hover {
  background: var(--hover-bg);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.primary {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: #fff;
}

.btn.primary:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .app-header {
    padding: 0 12px;
    padding-top: env(safe-area-inset-top, 0px);
    height: calc(56px + env(safe-area-inset-top, 0px));
    flex-wrap: nowrap;
  }
  
  .header-left {
    flex-shrink: 0;
  }
  
  .header-center {
    margin: 0 8px;
    min-width: 0;
    flex: 1;
    overflow: hidden;
  }
  
  .search-bar {
    padding: 0 10px;
  }
  
  .search-input {
    padding: 8px;
    font-size: 0.8125rem;
  }
  
  .search-btn {
    display: none;
  }
  
  .header-right {
    flex-shrink: 0;
    gap: 4px;
  }
  
  .icon-btn {
    width: 34px;
    height: 34px;
  }
  
  .icon-btn svg {
    width: 18px;
    height: 18px;
  }
  
  .user-avatar {
    width: 34px;
    height: 34px;
  }
  
  .theme-indicator {
    width: 6px;
    height: 6px;
    top: 5px;
    right: 5px;
  }
  
  .form-row {
    flex-direction: column;
  }
  
  .form-row .form-group.small {
    flex: 1;
  }
  
  .theme-dropdown,
  .user-dropdown {
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    border-radius: var(--radius-xl, 20px) var(--radius-xl, 20px) 0 0;
    max-height: 70vh;
    animation: slideUp 0.2s ease-out;
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(100%);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
</style>
