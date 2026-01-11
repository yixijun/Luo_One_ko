<script setup lang="ts">
/**
 * 洛一 (Luo One) 邮箱管理系统 - 侧边栏组件
 * Requirements: 8.2
 */
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAccountStore } from '@/stores/account';
import { useEmailStore } from '@/stores/email';
import type { EmailAccount } from '@/types';

const emit = defineEmits<{
  (e: 'account-change'): void;
}>();

const router = useRouter();
const accountStore = useAccountStore();
const emailStore = useEmailStore();

// 邮箱账户列表
const accounts = computed(() => accountStore.accounts);
const currentAccountId = computed(() => accountStore.currentAccountId);
const loading = computed(() => accountStore.loading);

// 选择邮箱账户
function selectAccount(account: EmailAccount) {
  accountStore.setCurrentAccount(account);
  emailStore.fetchEmails({ accountId: account.id });
  emit('account-change');
}

// 显示所有邮件
function showAllEmails() {
  accountStore.setCurrentAccount(null);
  emailStore.fetchEmails();
  emit('account-change');
}

// 跳转到写邮件页面
function goToCompose() {
  router.push('/compose');
}



// 获取账户状态图标颜色
function getStatusColor(account: EmailAccount): string {
  if (!account.enabled) return 'var(--text-disabled, #666)';
  return 'var(--success-color, #4caf50)';
}

// 格式化最后同步时间
function formatLastSync(timestamp: number): string {
  if (!timestamp) return '从未同步';
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  return date.toLocaleDateString();
}

// 初始化加载账户列表
onMounted(() => {
  if (!accountStore.hasAccounts) {
    accountStore.fetchAccounts();
  }
});
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <button class="compose-btn" @click="goToCompose">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        <span>写邮件</span>
      </button>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-section">
        <div class="nav-section-title">邮箱账户</div>
        
        <button
          class="nav-item"
          :class="{ active: !currentAccountId }"
          @click="showAllEmails"
        >
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
          <span class="nav-label">全部邮件</span>
        </button>

        <div v-if="loading" class="loading-state">
          <span class="loading-spinner"></span>
          <span>加载中...</span>
        </div>

        <div v-else-if="accounts.length === 0" class="empty-state">
          <p>暂无邮箱账户</p>
          <button class="add-account-btn" @click="router.push('/settings')">
            添加账户
          </button>
        </div>

        <template v-else>
          <div
            v-for="account in accounts"
            :key="account.id"
            class="account-wrapper"
          >
            <button
              class="nav-item account-item"
              :class="{ active: currentAccountId === account.id, disabled: !account.enabled }"
              @click="selectAccount(account)"
            >
              <div class="account-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                <span class="status-dot" :style="{ backgroundColor: getStatusColor(account) }"></span>
              </div>
              <div class="account-info">
                <span class="account-name">{{ account.displayName || account.email }}</span>
                <span class="account-email" v-if="account.displayName">{{ account.email }}</span>
                <span class="account-sync">{{ formatLastSync(account.lastSyncAt) }}</span>
              </div>
            </button>
          </div>
        </template>
      </div>
    </nav>

    <div class="sidebar-footer">
      <button class="footer-btn" @click="router.push('/settings')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
        <span>设置</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: 280px;
  height: 100%;
  background-color: var(--sidebar-bg);
  border-right: 1px solid var(--border-color-subtle, var(--border-color));
  position: relative;
}

.sidebar::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(180deg, transparent 0%, var(--primary-color) 50%, transparent 100%);
  opacity: 0.15;
}

.sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid var(--border-color-subtle, var(--border-color));
}

.compose-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 14px 20px;
  border: none;
  border-radius: var(--radius-lg, 16px);
  background: var(--primary-gradient, linear-gradient(135deg, var(--primary-color), var(--primary-hover)));
  color: #fff;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-normal, 0.2s ease);
  box-shadow: var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.3)), 0 0 0 0 var(--primary-glow);
  position: relative;
  overflow: hidden;
}

.compose-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%);
  opacity: 0;
  transition: opacity var(--transition-fast, 0.15s ease);
}

.compose-btn:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.4)), 0 0 24px var(--primary-glow);
}

.compose-btn:hover::before {
  opacity: 1;
}

.compose-btn:active {
  transform: translateY(-1px);
}

.compose-btn svg {
  width: 18px;
  height: 18px;
  transition: transform var(--transition-fast, 0.15s ease);
}

.compose-btn:hover svg {
  transform: rotate(90deg);
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;
}

.nav-section {
  padding: 0 12px;
}

.nav-section-title {
  padding: 12px 12px 10px;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--text-muted, var(--text-tertiary));
  text-transform: uppercase;
  letter-spacing: 1px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  margin-bottom: 4px;
  border: none;
  border-radius: var(--radius-md, 12px);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.875rem;
  text-align: left;
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
  position: relative;
}

.nav-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 0;
  background: var(--primary-color);
  border-radius: 0 var(--radius-xs, 4px) var(--radius-xs, 4px) 0;
  transition: height var(--transition-fast, 0.15s ease);
}

.nav-item:hover {
  background-color: var(--hover-bg);
  color: var(--text-primary);
}

.nav-item.active {
  background-color: var(--active-bg);
  color: var(--primary-color);
}

.nav-item.active::before {
  height: 60%;
}

.nav-item.disabled {
  opacity: 0.4;
  pointer-events: none;
}

.nav-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  transition: transform var(--transition-fast, 0.15s ease);
}

.nav-item:hover .nav-icon {
  transform: scale(1.1);
}

.nav-label {
  flex: 1;
  font-weight: 500;
}

.account-item {
  align-items: flex-start;
  padding: 14px;
}

.account-icon {
  position: relative;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.account-icon svg {
  width: 20px;
  height: 20px;
}

.status-dot {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--sidebar-bg);
  box-shadow: 0 0 0 1px var(--border-color);
}

.account-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.account-name {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary);
}

.account-email {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.account-sync {
  font-size: 0.6875rem;
  color: var(--text-muted, var(--text-tertiary));
  display: flex;
  align-items: center;
  gap: 4px;
}

.account-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}

.account-wrapper .nav-item {
  flex: 1;
  margin-bottom: 0;
}

.delete-account-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm, 8px);
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  opacity: 0;
  transition: all var(--transition-fast, 0.15s ease);
  flex-shrink: 0;
}

.account-wrapper:hover .delete-account-btn {
  opacity: 1;
}

.delete-account-btn:hover:not(:disabled) {
  color: var(--error-color);
  background-color: var(--error-light, rgba(239, 68, 68, 0.12));
}

.delete-account-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.delete-account-btn svg {
  width: 16px;
  height: 16px;
}

.delete-account-btn .loading-spinner.small {
  width: 14px;
  height: 14px;
  border-width: 2px;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  color: var(--text-tertiary);
  font-size: 0.875rem;
  text-align: center;
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 2.5px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.add-account-btn {
  margin-top: 16px;
  padding: 10px 20px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 12px);
  background: transparent;
  color: var(--primary-color);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
}

.add-account-btn:hover {
  background-color: var(--primary-light);
  border-color: var(--primary-color);
  transform: translateY(-2px);
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--border-color-subtle, var(--border-color));
}

.footer-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-radius: var(--radius-md, 12px);
  background: transparent;
  color: var(--text-tertiary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
}

.footer-btn:hover {
  background-color: var(--hover-bg);
  color: var(--text-primary);
}

.footer-btn:hover svg {
  transform: rotate(45deg);
}

.footer-btn svg {
  width: 18px;
  height: 18px;
  transition: transform var(--transition-normal, 0.2s ease);
}
</style>
