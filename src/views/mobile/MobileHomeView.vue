<script setup lang="ts">
/**
 * 移动端主页 - 邮件列表视图
 * Requirements: 13.3, 13.4, 13.5, 13.6
 * 
 * 功能：
 * - 显示邮件列表
 * - 支持右滑显示邮箱账户列表
 * - 点击邮件进入详情
 * - 下拉刷新
 */
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import MobileLayout from '@/components/mobile/MobileLayout.vue';
import SwipeableView from '@/components/mobile/SwipeableView.vue';
import { useEmailStore } from '@/stores/email';
import { useAccountStore } from '@/stores/account';
import { useSwipeNavigation } from '@/composables/useSwipeNavigation';
import type { Email } from '@/types';

const router = useRouter();
const emailStore = useEmailStore();
const accountStore = useAccountStore();
const { handleSwipeRight, openEmailDetail, initFromRoute } = useSwipeNavigation();

// 状态
const isRefreshing = ref(false);
const searchQuery = ref('');

// 计算属性
const filteredEmails = computed(() => {
  if (!searchQuery.value.trim()) {
    return emailStore.emails;
  }
  const query = searchQuery.value.toLowerCase();
  return emailStore.emails.filter(email => 
    email.subject.toLowerCase().includes(query) ||
    email.from.toLowerCase().includes(query)
  );
});

const currentAccountName = computed(() => {
  if (accountStore.currentAccount) {
    return accountStore.currentAccount.displayName || accountStore.currentAccount.email;
  }
  return '全部邮箱';
});

// 方法
const handleEmailClick = (email: Email) => {
  openEmailDetail(email.id);
};

const handleRefresh = async () => {
  if (isRefreshing.value) return;
  
  isRefreshing.value = true;
  try {
    await emailStore.syncEmails({
      accountId: accountStore.currentAccount?.id
    });
    await emailStore.fetchEmails({
      accountId: accountStore.currentAccount?.id
    });
  } finally {
    isRefreshing.value = false;
  }
};

const handleCompose = () => {
  router.push('/compose');
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return '昨天';
  }
  
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

const getImportanceColor = (importance?: string): string => {
  switch (importance) {
    case 'critical': return '#ef4444';
    case 'high': return '#f97316';
    case 'medium': return '#eab308';
    default: return 'transparent';
  }
};

// 生命周期
onMounted(async () => {
  initFromRoute();
  
  // 加载账户列表
  if (!accountStore.hasAccounts) {
    await accountStore.fetchAccounts();
  }
  
  // 加载邮件列表
  await emailStore.fetchEmails({
    accountId: accountStore.currentAccount?.id
  });
});
</script>

<template>
  <MobileLayout :title="currentAccountName" :show-back="false">
    <SwipeableView
      :enable-swipe-left="false"
      :enable-swipe-right="true"
      @swipe-right="handleSwipeRight"
    >
      <div class="mobile-home">
        <!-- 搜索栏 -->
        <div class="search-bar">
          <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索邮件..."
            class="search-input"
          />
        </div>
        
        <!-- 下拉刷新提示 -->
        <div v-if="isRefreshing" class="refresh-indicator">
          <div class="spinner"></div>
          <span>正在刷新...</span>
        </div>
        
        <!-- 邮件列表 -->
        <div class="email-list">
          <div v-if="emailStore.loading && !isRefreshing" class="loading-state">
            <div class="spinner"></div>
            <span>加载中...</span>
          </div>
          
          <div v-else-if="filteredEmails.length === 0" class="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <p>暂无邮件</p>
            <button class="refresh-btn" @click="handleRefresh">
              刷新
            </button>
          </div>
          
          <div
            v-else
            v-for="email in filteredEmails"
            :key="email.id"
            class="email-item"
            :class="{ unread: !email.isRead }"
            @click="handleEmailClick(email)"
          >
            <!-- 重要度指示器 -->
            <div 
              class="importance-indicator"
              :style="{ backgroundColor: getImportanceColor(email.processedResult?.importance) }"
            ></div>
            
            <!-- 邮件内容 -->
            <div class="email-content">
              <div class="email-header">
                <span class="email-from">{{ email.from }}</span>
                <span class="email-date">{{ formatDate(email.date) }}</span>
              </div>
              <div class="email-subject">{{ email.subject }}</div>
              <div class="email-preview">
                {{ email.body.substring(0, 80) }}{{ email.body.length > 80 ? '...' : '' }}
              </div>
              
              <!-- 处理信息标签 -->
              <div class="email-tags" v-if="email.processedResult?.verificationCode">
                <span class="tag tag-code">
                  验证码: {{ email.processedResult.verificationCode }}
                </span>
              </div>
            </div>
            
            <!-- 附件指示器 -->
            <div v-if="email.hasAttachments" class="attachment-indicator">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </div>
          </div>
        </div>
        
        <!-- 写邮件按钮 -->
        <button class="compose-fab" @click="handleCompose" aria-label="写邮件">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        
        <!-- 滑动提示 -->
        <div class="swipe-hint">
          <span>← 右滑查看邮箱列表</span>
        </div>
      </div>
    </SwipeableView>
  </MobileLayout>
</template>

<style scoped>
.mobile-home {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.search-bar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #16213e;
  border-bottom: 1px solid #2a2a4a;
}

.search-icon {
  color: #888;
  margin-right: 12px;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  padding: 10px 14px;
  color: #e0e0e0;
  font-size: 14px;
}

.search-input::placeholder {
  color: #666;
}

.search-input:focus {
  outline: none;
  border-color: #4a90d9;
}

.refresh-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: #16213e;
  color: #888;
  font-size: 14px;
}

.email-list {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: #888;
  gap: 16px;
}

.empty-state svg {
  opacity: 0.5;
}

.refresh-btn {
  padding: 10px 24px;
  background: #4a90d9;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
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

.email-item {
  display: flex;
  align-items: flex-start;
  padding: 14px 16px;
  border-bottom: 1px solid #2a2a4a;
  cursor: pointer;
  transition: background-color 0.2s;
}

.email-item:active {
  background: rgba(255, 255, 255, 0.05);
}

.email-item.unread {
  background: rgba(74, 144, 217, 0.08);
}

.email-item.unread .email-subject {
  font-weight: 600;
  color: #ffffff;
}

.importance-indicator {
  width: 4px;
  height: 100%;
  min-height: 60px;
  border-radius: 2px;
  margin-right: 12px;
  flex-shrink: 0;
}

.email-content {
  flex: 1;
  min-width: 0;
}

.email-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.email-from {
  font-size: 14px;
  font-weight: 500;
  color: #e0e0e0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.email-date {
  font-size: 12px;
  color: #888;
  flex-shrink: 0;
  margin-left: 8px;
}

.email-subject {
  font-size: 15px;
  color: #c0c0c0;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.email-preview {
  font-size: 13px;
  color: #888;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.email-tags {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
}

.tag-code {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.tag-ad {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.attachment-indicator {
  color: #888;
  margin-left: 8px;
  flex-shrink: 0;
}

.compose-fab {
  position: fixed;
  bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #4a90d9;
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(74, 144, 217, 0.4);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.compose-fab:active {
  transform: scale(0.95);
  box-shadow: 0 2px 8px rgba(74, 144, 217, 0.3);
}

.swipe-hint {
  position: fixed;
  bottom: calc(100px + env(safe-area-inset-bottom, 0px));
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
