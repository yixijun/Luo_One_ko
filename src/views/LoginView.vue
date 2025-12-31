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
const apiKey = ref(apiKeyManager.getApiKey() || '');
const rememberApiKey = ref(!!apiKeyManager.getApiKey());
const showPassword = ref(false);

// 状态
const isSubmitting = ref(false);
const errorMessage = ref('');

// 表单验证
const isFormValid = computed(() => {
  return username.value.trim() !== '' && 
         password.value.trim() !== '' && 
         apiKey.value.trim() !== '';
});

// 处理登录
async function handleLogin() {
  if (!isFormValid.value || isSubmitting.value) return;
  
  isSubmitting.value = true;
  errorMessage.value = '';
  
  try {
    // 保存 API 密钥
    if (rememberApiKey.value) {
      apiKeyManager.setApiKey(apiKey.value.trim());
    } else {
      apiKeyManager.removeApiKey();
      // 临时设置用于本次请求
      apiKeyManager.setApiKey(apiKey.value.trim());
    }
    
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
      // 如果登录失败且不记住密钥，清除临时设置的密钥
      if (!rememberApiKey.value) {
        apiKeyManager.removeApiKey();
      }
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

        <!-- API 密钥输入 -->
        <div class="form-group">
          <label for="apiKey" class="form-label">API 密钥</label>
          <div class="input-wrapper">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>
            </svg>
            <input
              id="apiKey"
              v-model="apiKey"
              type="text"
              class="form-input"
              placeholder="请输入 API 密钥"
              autocomplete="off"
            />
          </div>
          <div class="checkbox-wrapper">
            <input
              id="rememberApiKey"
              v-model="rememberApiKey"
              type="checkbox"
              class="checkbox-input"
            />
            <label for="rememberApiKey" class="checkbox-label">记住 API 密钥</label>
          </div>
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
  </div>
</template>


<style scoped>
.login-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16162a 100%);
}

.login-container {
  width: 100%;
  max-width: 400px;
  padding: 40px;
  background-color: var(--panel-bg, #1a1a2e);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
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
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--primary-color, #646cff);
}

.login-title {
  margin: 0 0 8px 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary, #fff);
}

.login-subtitle {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--text-secondary, #888);
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
  background-color: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 8px;
  color: #f44336;
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
  color: var(--text-primary, #fff);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 12px;
  width: 18px;
  height: 18px;
  color: var(--text-secondary, #888);
  pointer-events: none;
}

.form-input {
  width: 100%;
  padding: 12px 12px 12px 42px;
  border: 1px solid var(--border-color, #2d2d44);
  border-radius: 8px;
  background-color: var(--input-bg, #2d2d44);
  color: var(--text-primary, #fff);
  font-size: 0.9375rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color, #646cff);
  box-shadow: 0 0 0 3px rgba(100, 108, 255, 0.15);
}

.form-input::placeholder {
  color: var(--text-tertiary, #666);
}

.toggle-password-btn {
  position: absolute;
  right: 12px;
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
  transition: color 0.2s;
}

.toggle-password-btn:hover {
  color: var(--text-primary, #fff);
}

.toggle-password-btn svg {
  width: 18px;
  height: 18px;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.checkbox-input {
  width: 16px;
  height: 16px;
  accent-color: var(--primary-color, #646cff);
  cursor: pointer;
}

.checkbox-label {
  font-size: 0.8125rem;
  color: var(--text-secondary, #888);
  cursor: pointer;
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
  border-radius: 8px;
  background-color: var(--primary-color, #646cff);
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
}

.login-btn:hover:not(:disabled) {
  background-color: var(--primary-hover, #535bf2);
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
  border-top: 1px solid var(--border-color, #2d2d44);
  text-align: center;
}

.footer-text {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-secondary, #888);
  line-height: 1.5;
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
}
</style>
