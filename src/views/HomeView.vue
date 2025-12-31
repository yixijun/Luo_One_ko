<script setup lang="ts">
/**
 * 洛一 (Luo One) 邮箱管理系统 - 主页
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 * 整合布局组件和邮件组件，实现完整的邮件管理界面
 */
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useAccountStore } from '@/stores/account';
import { useEmailStore } from '@/stores/email';
import AppHeader from '@/components/layout/AppHeader.vue';
import Sidebar from '@/components/layout/Sidebar.vue';
import MainContent from '@/components/layout/MainContent.vue';
import EmailDetail from '@/components/email/EmailDetail.vue';
import type { Email } from '@/types';

const router = useRouter();
const userStore = useUserStore();
const accountStore = useAccountStore();
const emailStore = useEmailStore();

// 状态
const showEmailDetail = ref(false);
const selectedEmail = ref<Email | null>(null);
const isMobileView = ref(false);

// 计算属性
const isLoading = computed(() => userStore.loading || accountStore.loading || emailStore.loading);

// 检测移动端视图
function checkMobileView() {
  isMobileView.value = window.innerWidth < 768;
}

// 选择邮件查看详情
function handleEmailSelect(email: Email) {
  selectedEmail.value = email;
  showEmailDetail.value = true;
  
  // 标记为已读
  if (!email.isRead) {
    emailStore.markAsRead(email.id);
  }
}

// 关闭邮件详情
function handleCloseDetail() {
  showEmailDetail.value = false;
  selectedEmail.value = null;
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
});

// 监听账户变化，重新加载邮件
watch(() => accountStore.currentAccountId, (newId) => {
  emailStore.fetchEmails({ accountId: newId || undefined });
  handleCloseDetail();
});
</script>

<template>
  <div class="home-view">
    <!-- 应用头部 -->
    <AppHeader />
    
    <!-- 主体内容 -->
    <div class="home-body">
      <!-- 侧边栏 -->
      <Sidebar />
      
      <!-- 主内容区 -->
      <div class="main-wrapper">
        <!-- 邮件列表和内容区 -->
        <MainContent 
          v-show="!showEmailDetail || !isMobileView"
          @email-select="handleEmailSelect"
        />
        
        <!-- 邮件详情（覆盖模式，用于移动端或点击查看详情） -->
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

.main-wrapper {
  display: flex;
  flex: 1;
  position: relative;
  overflow: hidden;
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
  
  .email-detail-overlay {
    width: 100%;
    left: 0;
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
