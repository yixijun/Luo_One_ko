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
}

// 显示所有邮件
function showAllEmails() {
  accountStore.setCurrentAccount(null);
  emailStore.fetchEmails();
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
          <button
            v-for="account in accounts"
            :key="account.id"
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
  width: 260px;
  height: 100%;
  background-color: var(--sidebar-bg, #16162a);
  border-right: 1px solid var(--border-color, #2d2d44);
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color, #2d2d44);
}

.compose-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  background-color: var(--primary-color, #646cff);
  color: #fff;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.compose-btn:hover {
  background-color: var(--primary-hover, #535bf2);
}

.compose-btn svg {
  width: 18px;
  height: 18px;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.nav-section {
  padding: 0 8px;
}

.nav-section-title {
  padding: 8px 12px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary, #888);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  margin-bottom: 2px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary, #fff);
  font-size: 0.875rem;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s;
}

.nav-item:hover {
  background-color: var(--hover-bg, rgba(255, 255, 255, 0.05));
}

.nav-item.active {
  background-color: var(--active-bg, rgba(100, 108, 255, 0.15));
  color: var(--primary-color, #646cff);
}

.nav-item.disabled {
  opacity: 0.5;
}

.nav-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.nav-label {
  flex: 1;
}

.account-item {
  align-items: flex-start;
}

.account-icon {
  position: relative;
  flex-shrink: 0;
}

.account-icon svg {
  width: 20px;
  height: 20px;
}

.status-dot {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 2px solid var(--sidebar-bg, #16162a);
}

.account-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.account-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.account-email {
  font-size: 0.75rem;
  color: var(--text-secondary, #888);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.account-sync {
  font-size: 0.6875rem;
  color: var(--text-tertiary, #666);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  color: var(--text-secondary, #888);
  font-size: 0.875rem;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-color, #2d2d44);
  border-top-color: var(--primary-color, #646cff);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.add-account-btn {
  margin-top: 12px;
  padding: 8px 16px;
  border: 1px solid var(--border-color, #2d2d44);
  border-radius: 6px;
  background: transparent;
  color: var(--primary-color, #646cff);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;
}

.add-account-btn:hover {
  background-color: var(--hover-bg, rgba(255, 255, 255, 0.05));
  border-color: var(--primary-color, #646cff);
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--border-color, #2d2d44);
}

.footer-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, #888);
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
}

.footer-btn:hover {
  background-color: var(--hover-bg, rgba(255, 255, 255, 0.05));
  color: var(--text-primary, #fff);
}

.footer-btn svg {
  width: 18px;
  height: 18px;
}
</style>
