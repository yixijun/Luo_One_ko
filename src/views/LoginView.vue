<script setup lang="ts">
/**
 * 洛一 (Luo One) 邮箱管理系统 - 登录页面
 * Requirements: 5.5
 * 实现登录表单和认证逻辑
 */
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { apiKeyManager } from '@/api/client';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

// 表单数据
const username = ref('');
const password = ref('');
const showPassword = ref(false);

// 状态
const isSubmitting = ref(false);
const errorMessage = ref('');

// 表单验证
const isFormValid = computed(() => {
  return username.value.trim() !== '' && 
         password.value.trim() !== '' &&
         apiKeyManager.getApiKey();
});

// 处理登录
async function handleLogin() {
  if (!isFormValid.value || isSubmitting.value) return;
  
  // 检查 API 密钥
  if (!apiKeyManager.getApiKey()) {
    errorMessage.value = '请先在右下角设置中配置 API 密钥';
    return;
  }
  
  isSubmitting.value = true;
  errorMessage.value = '';
  
  try {
    // 调用登录
    const success = await userStore.login({
      username: username.value.trim(),
      password: password.value,
    });
    
    if (success) {
      // 登录成功，跳转到目标页面或首页
      const redirect = route.query.redirect as string;
      router.push(redirect || '/');
    } else {
      errorMessage.value = userStore.error || '登录失败，请检查用户名和密码';
    }
  } catch (err) {
    errorMessage.value = (err as Error).message || '登录失败，请稍后重试';
  } finally {
    isSubmitting.value = false;
  }
}

// 切换密码显示
function togglePasswordVisibility() {
  showPassword.value = !showPassword.value;
}

// 打开设置
function openSettings() {
  showSettingsModal.value = true;
}

// 设置弹窗
const showSettingsModal = ref(false);
const apiKeyInput = ref(apiKeyManager.getApiKey() || '');
const isTestingConnection = ref(false);
const connectionStatus = ref<'idle' | 'success' | 'error'>('idle');
const connectionMessage = ref('');

function saveSettings() {
  if (apiKeyInput.value.trim()) {
    apiKeyManager.setApiKey(apiKeyInput.value.trim());
  } else {
    apiKeyManager.removeApiKey();
  }
  showSettingsModal.value = false;
}

function closeSettings() {
  apiKeyInput.value = apiKeyManager.getApiKey() || '';
  connectionStatus.value = 'idle';
  connectionMessage.value = '';
  showSettingsModal.value = false;
}

// 测试服务器连接
async function testConnection() {
  if (!apiKeyInput.value.trim()) {
    connectionStatus.value = 'error';
    connectionMessage.value = '请先输入 API 密钥';
    return;
  }
  
  isTestingConnection.value = true;
  connectionStatus.value = 'idle';
  connectionMessage.value = '';
  
  try {
    // 通过代理测试连接
    const response = await fetch('/health', {
      method: 'GET',
      headers: {
        'X-API-Key': apiKeyInput.value.trim(),
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'ok') {
        connectionStatus.value = 'success';
        connectionMessage.value = '服务器连接正常';
      } else {
        connectionStatus.value = 'success';
        connectionMessage.value = '服务器连接正常';
      }
    } else {
      connectionStatus.value = 'error';
      connectionMessage.value = `连接失败: HTTP ${response.status}`;
    }
  } catch (err) {
    connectionStatus.value = 'error';
    connectionMessage.value = `连接失败: ${(err as Error).message || '网络错误'}`;
  } finally {
    isTestingConnection.value = false;
  }
}
</script>

<template>
  <div class="login-view">
    <div class="login-container">
      <!-- Logo 和标题 -->
      <div class="login-header">
        <div class="logo">
          <span class="logo-icon">📧</span>
          <span class="logo-text">洛一</span>
        </div>
        <h1 class="login-title">欢迎回来</h1>
        <p class="login-subtitle">登录以管理您的邮箱</p>
      </div>

      <!-- 登录表单 -->
      <form class="login-form" @submit.prevent="handleLogin">
        <!-- 错误提示 -->
        <div v-if="errorMessage" class="error-message">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- 用户名输入 -->
        <div class="form-group">
          <label for="username" class="form-label">用户名</label>
          <div class="input-wrapper">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <input
              id="username"
              v-model="username"
              type="text"
              class="form-input"
              placeholder="请输入用户名"
              autocomplete="username"
            />
          </div>
        </div>

        <!-- 密码输入 -->
        <div class="form-group">
          <label for="password" class="form-label">密码</label>
          <div class="input-wrapper">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="form-input"
              placeholder="请输入密码"
              autocomplete="current-password"
            />
            <button
              type="button"
              class="toggle-password-btn"
              @click="togglePasswordVisibility"
              :title="showPassword ? '隐藏密码' : '显示密码'"
            >
              <svg v-if="showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 登录按钮 -->
        <button
          type="submit"
          class="login-btn"
          :disabled="!isFormValid || isSubmitting"
        >
          <span v-if="isSubmitting" class="loading-spinner"></span>
          <span>{{ isSubmitting ? '登录中...' : '登录' }}</span>
        </button>
      </form>

      <!-- 底部提示 -->
      <div class="login-footer">
        <p class="footer-text">
          需要创建账户？请联系系统管理员使用 CLI 工具创建。
        </p>
      </div>
    </div>

    <!-- 右下角设置按钮 -->
    <button class="settings-fab" @click="openSettings" title="后端设置">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    </button>

    <!-- 设置弹窗 -->
    <div v-if="showSettingsModal" class="modal-overlay" @click.self="closeSettings">
      <div class="modal">
        <div class="modal-header">
          <h3>后端设置</h3>
          <button class="close-btn" @click="closeSettings">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">API 密钥</label>
            <div class="input-wrapper">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>
              </svg>
              <input
                v-model="apiKeyInput"
                type="text"
                class="form-input"
                placeholder="请输入后端 API 密钥"
              />
            </div>
            <p class="hint">API 密钥用于连接后端服务，请从管理员处获取</p>
          </div>
          
          <!-- 测试连接按钮 -->
          <div class="test-connection">
            <button 
              class="test-btn" 
              @click="testConnection"
              :disabled="isTestingConnection || !apiKeyInput.trim()"
            >
              <span v-if="isTestingConnection" class="loading-spinner small"></span>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>{{ isTestingConnection ? '测试中...' : '测试连接' }}</span>
            </button>
            
            <!-- 连接状态 -->
            <div v-if="connectionStatus !== 'idle'" class="connection-status" :class="connectionStatus">
              <svg v-if="connectionStatus === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              <span>{{ connectionMessage }}</span>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn" @click="closeSettings">取消</button>
          <button class="btn primary" @click="saveSettings">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
.login-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background: var(--bg-gradient);
  position: relative;
}

.login-container {
  width: 100%;
  max-width: 420px;
  padding: 44px;
  background-color: var(--panel-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl, 20px);
  box-shadow: var(--shadow-lg);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
}

.logo-icon {
  font-size: 2rem;
}

.logo-text {
  font-size: 1.875rem;
  font-weight: 800;
  color: var(--primary-color);
  letter-spacing: -0.02em;
}

.login-title {
  margin: 0 0 8px 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.login-subtitle {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--text-secondary);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background-color: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: var(--radius-md, 10px);
  color: var(--error-color);
  font-size: 0.875rem;
}

.error-message svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  width: 18px;
  height: 18px;
  color: var(--text-tertiary);
  pointer-events: none;
}

.form-input {
  width: 100%;
  padding: 13px 14px 13px 44px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 10px);
  background-color: var(--input-bg);
  color: var(--text-primary);
  font-size: 0.9375rem;
  transition: all var(--transition-fast, 0.15s ease);
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.form-input::placeholder {
  color: var(--text-tertiary);
}

.toggle-password-btn {
  position: absolute;
  right: 14px;
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
  transition: color var(--transition-fast, 0.15s ease);
}

.toggle-password-btn:hover {
  color: var(--text-primary);
}

.toggle-password-btn svg {
  width: 18px;
  height: 18px;
}

.login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 24px;
  margin-top: 8px;
  border: none;
  border-radius: var(--radius-md, 10px);
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
  box-shadow: 0 4px 12px var(--shadow-color);
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px var(--shadow-color);
}

.login-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.login-footer {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--border-color);
  text-align: center;
}

.footer-text {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* 右下角设置按钮 */
.settings-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--panel-bg);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-lg);
  transition: all var(--transition-fast, 0.15s ease);
}

.settings-fab:hover {
  background: var(--primary-color);
  color: #fff;
  border-color: var(--primary-color);
  transform: scale(1.05);
}

.settings-fab svg {
  width: 24px;
  height: 24px;
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
}

.modal {
  background: var(--panel-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl, 20px);
  width: 90%;
  max-width: 420px;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
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
  padding: 24px;
}

.hint {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  margin-top: 6px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
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

.btn.primary {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: #fff;
}

.btn.primary:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

/* 测试连接 */
.test-connection {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 18px;
}

.test-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 10px);
  background: transparent;
  color: var(--text-primary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
}

.test-btn:hover:not(:disabled) {
  background: var(--hover-bg);
  border-color: var(--primary-color);
}

.test-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.test-btn svg {
  width: 18px;
  height: 18px;
}

.loading-spinner.small {
  width: 16px;
  height: 16px;
  border-width: 2px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: var(--radius-md, 10px);
  font-size: 0.875rem;
}

.connection-status.success {
  background: rgba(34, 197, 94, 0.12);
  color: var(--success-color);
  border: 1px solid rgba(34, 197, 94, 0.25);
}

.connection-status.error {
  background: rgba(239, 68, 68, 0.12);
  color: var(--error-color);
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.connection-status svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* 响应式布局 */
@media (max-width: 480px) {
  .login-container {
    padding: 24px;
  }
  
  .login-title {
    font-size: 1.25rem;
  }
  
  .login-subtitle {
    font-size: 0.875rem;
  }
  
  .settings-fab {
    bottom: 16px;
    right: 16px;
    width: 48px;
    height: 48px;
  }
  
  .settings-fab svg {
    width: 20px;
    height: 20px;
  }
}
</style>
