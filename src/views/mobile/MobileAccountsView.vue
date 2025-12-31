<script setup lang="ts">
/**
 * 移动端账户列表视图
 * Requirements: 13.3, 13.4, 13.5, 13.6
 * 
 * 功能：
 * - 显示邮箱账户列表
 * - 支持左滑返回邮件列表
 * - 点击账户切换当前账户
 */
import { onMounted, computed } from 'vue';
import MobileLayout from '@/components/mobile/MobileLayout.vue';
import SwipeableView from '@/components/mobile/SwipeableView.vue';
import { useAccountStore } from '@/stores/account';
import { useEmailStore } from '@/stores/email';
import { useSwipeNavigation } from '@/composables/useSwipeNavigation';
import type { EmailAccount } from '@/types';

const accountStore = useAccountStore();
const emailStore = useEmailStore();
const { handleSwipeLeft, showEmails, initFromRoute } = useSwipeNavigation();

// 计算属性
const allAccountsOption = computed(() => ({
  id: 0,
  email: '全部邮箱',
  displayName: '全部邮箱',
  enabled: true,
  lastSyncAt: 0,
}));

const accountsList = computed(() => [
  allAccountsOption.value,
  ...accountStore.accounts
]);

const isSelected = (account: EmailAccount | typeof allAccountsOption.value) => {
  if (account.id === 0) {
    return accountStore.currentAccount === null;
  }
  return accountStore.currentAccount?.id === account.id;
};

// 方法
const handleAccountClick = async (account: EmailAccount | typeof allAccountsOption.value) => {
  if (account.id === 0) {
    accountStore.setCurrentAccount(null);
  } else {
    accountStore.setCurrentAccount(account as EmailAccount);
  }
  
  // 加载对应账户的邮件
  await emailStore.fetchEmails({
    accountId: account.id === 0 ? undefined : account.id
  });
  
  // 返回邮件列表
  showEmails();
};

const handleBack = () => {
  showEmails();
};

const formatLastSync = (timestamp: number): string => {
  if (!timestamp) return '从未同步';
  
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return '刚刚同步';
  if (diffMins < 60) return `${diffMins}分钟前同步`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}小时前同步`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}天前同步`;
};

const getAccountInitial = (account: EmailAccount | typeof allAccountsOption.value): string => {
  if (account.id === 0) return '全';
  const name = account.displayName || account.email;
  return name.charAt(0).toUpperCase();
};

const getAccountColor = (account: EmailAccount | typeof allAccountsOption.value): string => {
  if (account.id === 0) return '#4a90d9';
  
  // 根据邮箱地址生成颜色
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'];
  const hash = account.email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length] || '#4a90d9';
};

// 生命周期
onMounted(async () => {
  initFromRoute();
  
  if (!accountStore.hasAccounts) {
    await accountStore.fetchAccounts();
  }
});
</script>

<template>
  <MobileLayout title="邮箱账户" :show-back="true" @back="handleBack">
    <SwipeableView
      :enable-swipe-left="true"
      :enable-swipe-right="false"
      @swipe-left="handleSwipeLeft"
    >
      <div class="mobile-accounts">
        <!-- 账户列表 -->
        <div class="accounts-list">
          <div v-if="accountStore.loading" class="loading-state">
            <div class="spinner"></div>
            <span>加载中...</span>
          </div>
          
          <div
            v-else
            v-for="account in accountsList"
            :key="account.id"
            class="account-item"
            :class="{ selected: isSelected(account), disabled: !account.enabled && account.id !== 0 }"
            @click="handleAccountClick(account)"
          >
            <!-- 账户头像 -->
            <div 
              class="account-avatar"
              :style="{ backgroundColor: getAccountColor(account) }"
            >
              {{ getAccountInitial(account) }}
            </div>
            
            <!-- 账户信息 -->
            <div class="account-info">
              <div class="account-name">
                {{ account.displayName || account.email }}
              </div>
              <div v-if="account.id !== 0" class="account-email">
                {{ account.email }}
              </div>
              <div v-if="account.id !== 0" class="account-sync">
                {{ formatLastSync(account.lastSyncAt) }}
              </div>
              <div v-else class="account-desc">
                查看所有邮箱的邮件
              </div>
            </div>
            
            <!-- 状态指示器 -->
            <div class="account-status">
              <div 
                v-if="account.id !== 0"
                class="status-dot"
                :class="{ enabled: account.enabled }"
              ></div>
              <svg 
                v-if="isSelected(account)"
                class="check-icon"
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                stroke-width="2"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
        </div>
        
        <!-- 滑动提示 -->
        <div class="swipe-hint">
          <span>← 左滑返回邮件列表</span>
        </div>
      </div>
    </SwipeableView>
  </MobileLayout>
</template>

<style scoped>
.mobile-accounts {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.accounts-list {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: #888;
  gap: 16px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #2a2a4a;
  border-top-color: #4a90d9;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.account-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #2a2a4a;
  cursor: pointer;
  transition: background-color 0.2s;
}

.account-item:active {
  background: rgba(255, 255, 255, 0.05);
}

.account-item.selected {
  background: rgba(74, 144, 217, 0.1);
}

.account-item.disabled {
  opacity: 0.5;
}

.account-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 600;
  color: white;
  flex-shrink: 0;
  margin-right: 14px;
}

.account-info {
  flex: 1;
  min-width: 0;
}

.account-name {
  font-size: 16px;
  font-weight: 500;
  color: #e0e0e0;
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-email {
  font-size: 13px;
  color: #888;
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-sync,
.account-desc {
  font-size: 12px;
  color: #666;
}

.account-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 12px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
}

.status-dot.enabled {
  background: #22c55e;
}

.check-icon {
  color: #4a90d9;
}

.swipe-hint {
  position: fixed;
  bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: #888;
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 16px;
  opacity: 0;
  animation: fadeInOut 4s ease-in-out;
  pointer-events: none;
}

@keyframes fadeInOut {
  0%, 100% { opacity: 0; }
  10%, 80% { opacity: 1; }
}
</style>
