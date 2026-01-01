<script setup lang="ts">
/**
 * 洛一 (Luo One) 邮箱管理系统 - 主页
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 * 整合布局组件和邮件组件，实现完整的邮件管理界面
 * 支持桌面端和移动端响应式布局
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useAccountStore } from '@/stores/account';
import { useEmailStore } from '@/stores/email';
import apiClient from '@/api/client';
import AppHeader from '@/components/layout/AppHeader.vue';
import Sidebar from '@/components/layout/Sidebar.vue';
import MainContent from '@/components/layout/MainContent.vue';
import EmailDetail from '@/components/email/EmailDetail.vue';
import type { Email } from '@/types';

// 移动端视图模式
type MobileViewMode = 'list' | 'detail';

const router = useRouter();
const userStore = useUserStore();
const accountStore = useAccountStore();
const emailStore = useEmailStore();

// 状态
const showEmailDetail = ref(false);
const selectedEmail = ref<Email | null>(null);
const isMobileView = ref(false);
const mobileViewMode = ref<MobileViewMode>('list');
const showMobileSidebar = ref(false);
const lastEmailCount = ref<number>(0);

// 自动刷新定时器
let autoRefreshTimer: ReturnType<typeof setInterval> | null = null;
const AUTO_REFRESH_INTERVAL = 10000; // 10秒检查一次

// 计算属性
const isLoading = computed(() => userStore.loading || accountStore.loading || emailStore.loading);

// 检测移动端视图
function checkMobileView() {
  isMobileView.value = window.innerWidth < 768;
}

// 检查是否有新邮件
async function checkForNewEmails() {
  if (!accountStore.hasAccounts) {
    console.log('[AutoRefresh] 没有账户，跳过检查');
    return;
  }
  
  try {
    const params: Record<string, unknown> = { folder: 'inbox' };
    if (accountStore.currentAccountId) {
      params.account_id = accountStore.currentAccountId;
    }
    
    console.log('[AutoRefresh] 检查邮件数量...', params);
    const response = await apiClient.get<{ data: { total: number } }>('/emails/count', { params });
    const newCount = response.data?.data?.total ?? response.data?.total ?? 0;
    
    console.log('[AutoRefresh] 当前数量:', newCount, '上次数量:', lastEmailCount.value);
    
    // 如果数量变化了，刷新邮件列表
    if (lastEmailCount.value !== 0 && newCount !== lastEmailCount.value) {
      console.log('[AutoRefresh] 检测到变化，刷新列表');
      await emailStore.fetchEmails({ accountId: accountStore.currentAccountId || undefined });
    }
    
    lastEmailCount.value = newCount;
  } catch (e) {
    console.error('[AutoRefresh] 检查失败:', e);
  }
}

// 启动自动刷新
function startAutoRefresh() {
  if (autoRefreshTimer) return;
  console.log('[AutoRefresh] 启动自动检查，间隔:', AUTO_REFRESH_INTERVAL, 'ms');
  // 初始化当前数量
  checkForNewEmails();
  autoRefreshTimer = setInterval(checkForNewEmails, AUTO_REFRESH_INTERVAL);
}

// 停止自动刷新
function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

// 选择邮件查看详情
function handleEmailSelect(email: Email) {
  selectedEmail.value = email;
  showEmailDetail.value = true;
  
  // 移动端切换到详情视图
  if (isMobileView.value) {
    mobileViewMode.value = 'detail';
  }
  
  // 标记为已读
  if (!email.isRead) {
    emailStore.markAsRead(email.id);
  }
}

// 关闭邮件详情
function handleCloseDetail() {
  showEmailDetail.value = false;
  selectedEmail.value = null;
  
  // 移动端返回列表视图
  if (isMobileView.value) {
    mobileViewMode.value = 'list';
  }
}

// 切换移动端侧边栏
function toggleMobileSidebar() {
  showMobileSidebar.value = !showMobileSidebar.value;
}

// 删除邮件
async function handleDeleteEmail() {
  if (!selectedEmail.value) return;
  
  const confirmed = window.confirm('确定要删除这封邮件吗？');
  if (confirmed) {
    const success = await emailStore.deleteEmail(selectedEmail.value.id);
    if (success) {
      handleCloseDetail();
    }
  }
}

// 回复邮件
function handleReplyEmail() {
  if (!selectedEmail.value) return;
  router.push({
    name: 'Compose',
    query: {
      replyTo: selectedEmail.value.id.toString(),
      to: selectedEmail.value.from,
      subject: `Re: ${selectedEmail.value.subject}`,
    },
  });
}

// 转发邮件
function handleForwardEmail() {
  if (!selectedEmail.value) return;
  router.push({
    name: 'Compose',
    query: {
      forwardFrom: selectedEmail.value.id.toString(),
      subject: `Fwd: ${selectedEmail.value.subject}`,
    },
  });
}

// 监听窗口大小变化
onMounted(() => {
  checkMobileView();
  window.addEventListener('resize', checkMobileView);
  
  // 初始化数据
  if (!userStore.user) {
    userStore.fetchProfile();
  }
  if (!accountStore.hasAccounts) {
    accountStore.fetchAccounts();
  }
  if (!emailStore.hasEmails) {
    emailStore.fetchEmails();
  }
  
  // 启动自动刷新
  startAutoRefresh();
});

// 组件卸载时清理
onUnmounted(() => {
  window.removeEventListener('resize', checkMobileView);
  stopAutoRefresh();
});

// 监听账户变化，重新加载邮件
watch(() => accountStore.currentAccountId, (newId) => {
  emailStore.fetchEmails({ accountId: newId || undefined });
  handleCloseDetail();
});
</script>

<template>
  <div class="home-view" :class="{ 'mobile': isMobileView }">
    <!-- 应用头部 -->
    <AppHeader>
      <template #mobile-menu v-if="isMobileView">
        <button class="mobile-menu-btn" @click="toggleMobileSidebar">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </template>
    </AppHeader>
    
    <!-- 主体内容 -->
    <div class="home-body">
      <!-- 侧边栏 - 桌面端始终显示，移动端通过遮罩层显示 -->
      <div 
        v-if="!isMobileView || showMobileSidebar" 
        class="sidebar-wrapper"
        :class="{ 'mobile-sidebar': isMobileView }"
      >
        <div v-if="isMobileView" class="sidebar-overlay" @click="showMobileSidebar = false"></div>
        <Sidebar @account-change="showMobileSidebar = false" />
      </div>
      
      <!-- 主内容区 -->
      <div class="main-wrapper">
        <!-- 邮件列表 - 移动端在详情模式下隐藏 -->
        <MainContent 
          v-show="!isMobileView || mobileViewMode === 'list'"
          @email-select="handleEmailSelect"
        />
        
        <!-- 邮件详情 -->
        <div 
          v-if="showEmailDetail && selectedEmail" 
          class="email-detail-overlay"
          :class="{ 'mobile-overlay': isMobileView }"
        >
          <EmailDetail
            :email="selectedEmail"
            @close="handleCloseDetail"
            @delete="handleDeleteEmail"
            @reply="handleReplyEmail"
            @forward="handleForwardEmail"
          />
        </div>
      </div>
    </div>

    <!-- 全局加载指示器 -->
    <div v-if="isLoading" class="global-loading">
      <div class="loading-spinner"></div>
    </div>
  </div>
</template>


<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--bg-primary, #0f0f1a);
  overflow: hidden;
}

.home-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar-wrapper {
  flex-shrink: 0;
}

.main-wrapper {
  display: flex;
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* 移动端菜单按钮 */
.mobile-menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.mobile-menu-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* 移动端侧边栏 */
.mobile-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;
  display: flex;
}

.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 99;
}

.mobile-sidebar :deep(.sidebar) {
  position: relative;
  z-index: 100;
  animation: slideInLeft 0.2s ease-out;
}

@keyframes slideInLeft {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

/* 邮件详情覆盖层 */
.email-detail-overlay {
  position: absolute;
  top: 0;
  right: 0;
  width: 50%;
  height: 100%;
  background-color: var(--content-bg, #0f0f1a);
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.3);
  z-index: 10;
  animation: slideIn 0.2s ease-out;
}

.email-detail-overlay.mobile-overlay {
  width: 100%;
  left: 0;
  position: fixed;
  top: 0;
  bottom: 0;
  z-index: 50;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 全局加载指示器 */
.global-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background-color: rgba(100, 108, 255, 0.2);
  z-index: 1000;
  overflow: hidden;
}

.global-loading::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 30%;
  height: 100%;
  background-color: var(--primary-color, #646cff);
  animation: loading 1.5s ease-in-out infinite;
}

@keyframes loading {
  0% {
    left: -30%;
  }
  100% {
    left: 100%;
  }
}

.loading-spinner {
  display: none;
}

/* 响应式布局 */
@media (max-width: 1024px) {
  .email-detail-overlay {
    width: 60%;
  }
}

@media (max-width: 768px) {
  .home-body {
    flex-direction: column;
  }
  
  /* 移动端隐藏默认侧边栏 */
  .sidebar-wrapper:not(.mobile-sidebar) {
    display: none;
  }
  
  .email-detail-overlay {
    width: 100%;
    left: 0;
  }
  
  .main-wrapper {
    flex-direction: column;
  }
}

/* 深色主题变量 */
:root {
  --bg-primary: #0f0f1a;
  --panel-bg: #1a1a2e;
  --sidebar-bg: #16162a;
  --header-bg: #1a1a2e;
  --content-bg: #0f0f1a;
  --input-bg: #2d2d44;
  --border-color: #2d2d44;
  --hover-bg: rgba(255, 255, 255, 0.05);
  --active-bg: rgba(100, 108, 255, 0.15);
  --primary-color: #646cff;
  --primary-hover: #535bf2;
  --text-primary: #ffffff;
  --text-secondary: #888888;
  --text-tertiary: #666666;
  --success-color: #4caf50;
  --warning-color: #ff9800;
  --error-color: #f44336;
}
</style>
