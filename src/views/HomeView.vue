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
    const response = await apiClient.get<{ total: number }>('/emails/count', { params });
    const newCount = (response.data as { total?: number; data?: { total: number } })?.total ?? (response.data as { data?: { total: number } })?.data?.total ?? 0;
    
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
onMounted(async () => {
  checkMobileView();
  window.addEventListener('resize', checkMobileView);
  
  // 处理 OAuth 回调
  const urlParams = new URLSearchParams(window.location.search);
  const oauthSuccess = urlParams.get('oauth_success');
  const oauthError = urlParams.get('oauth_error');
  const oauthEmail = urlParams.get('email');
  
  if (oauthSuccess) {
    // 清除 URL 参数
    window.history.replaceState({}, '', window.location.pathname);
    // 刷新账户列表
    await accountStore.fetchAccounts();
    alert(`Gmail 账户 ${oauthEmail || ''} 已成功添加！`);
  } else if (oauthError) {
    window.history.replaceState({}, '', window.location.pathname);
    const errorMessages: Record<string, string> = {
      'access_denied': '您取消了授权',
      'invalid_state': '授权状态无效，请重试',
      'state_expired': '授权已过期，请重试',
      'token_exchange_failed': '获取令牌失败',
      'get_email_failed': '获取邮箱信息失败',
      'save_account_failed': '保存账户失败',
    };
    alert(`Google 登录失败: ${errorMessages[oauthError] || oauthError}`);
  }
  
  // 串行初始化数据，避免同时发起太多请求
  try {
    if (!userStore.user) {
      await userStore.fetchProfile();
    }
    if (!accountStore.hasAccounts) {
      await accountStore.fetchAccounts();
    }
    if (!emailStore.hasEmails) {
      // 初始加载只获取 20 封邮件，加快首屏速度
      await emailStore.fetchEmails({ limit: 20 });
    }
  } catch (e) {
    console.error('[HomeView] 初始化失败:', e);
  }
  
  // 延迟启动自动刷新，避免影响首屏加载
  setTimeout(startAutoRefresh, 5000);
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
    <!-- 应用头部 - 移动端详情模式下隐藏 -->
    <AppHeader v-if="!isMobileView || mobileViewMode === 'list'">
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
        <Transition name="slide-detail">
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
        </Transition>
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
  background: var(--bg-gradient, var(--bg-primary));
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
  width: 44px;
  height: 44px;
  background: var(--hover-bg);
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  border-radius: var(--radius-md, 12px);
  transition: all var(--transition-fast, 0.15s ease);
}

.mobile-menu-btn:hover {
  background: var(--active-bg);
  color: var(--primary-color);
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
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 99;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.mobile-sidebar :deep(.sidebar) {
  position: relative;
  z-index: 100;
  animation: slideInLeft 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideInLeft {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 邮件详情覆盖层 */
.email-detail-overlay {
  position: absolute;
  top: 0;
  right: 0;
  width: 55%;
  height: 100%;
  background-color: var(--content-bg);
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.3);
  z-index: 10;
  border-left: 1px solid var(--border-color-subtle, var(--border-color));
}

.email-detail-overlay.mobile-overlay {
  width: 100%;
  left: 0;
  position: fixed;
  top: 0;
  bottom: 0;
  z-index: 50;
  border-left: none;
}

/* 邮件详情滑动动画 */
.slide-detail-enter-active,
.slide-detail-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-detail-enter-from {
  transform: translateX(100%);
}

.slide-detail-enter-to {
  transform: translateX(0);
}

.slide-detail-leave-from {
  transform: translateX(0);
}

.slide-detail-leave-to {
  transform: translateX(100%);
}

/* 全局加载指示器 */
.global-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background-color: var(--primary-light);
  z-index: 1000;
  overflow: hidden;
}

.global-loading::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 40%;
  height: 100%;
  background: var(--primary-gradient, linear-gradient(90deg, var(--primary-color), var(--primary-hover)));
  animation: loading 1.2s ease-in-out infinite;
  border-radius: var(--radius-full, 9999px);
}

@keyframes loading {
  0% {
    left: -40%;
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
</style>
