<script setup lang="ts">
/**
 * 移动端布局组件
 * Requirements: 13.2
 * 
 * 提供移动端专属的布局结构，包含：
 * - 顶部导航栏
 * - 主内容区域
 * - 底部安全区域适配
 */
import { computed } from 'vue';
import { useRouter } from 'vue-router';

interface Props {
  title?: string;
  showBack?: boolean;
  showSettings?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: '洛一',
  showBack: false,
  showSettings: true,
});

const emit = defineEmits<{
  back: [];
}>();

const router = useRouter();

const handleBack = () => {
  emit('back');
  router.back();
};

const goToSettings = () => {
  router.push('/settings');
};

const headerClass = computed(() => ({
  'mobile-header': true,
  'with-back': props.showBack,
}));
</script>

<template>
  <div class="mobile-layout">
    <!-- 顶部导航栏 -->
    <header :class="headerClass">
      <button 
        v-if="showBack" 
        class="back-btn"
        @click="handleBack"
        aria-label="返回"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      
      <h1 class="header-title">{{ title }}</h1>
      
      <button 
        v-if="showSettings" 
        class="settings-btn"
        @click="goToSettings"
        aria-label="设置"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
      <div v-else class="settings-placeholder"></div>
    </header>
    
    <!-- 主内容区域 -->
    <main class="mobile-content">
      <slot></slot>
    </main>
    
    <!-- 底部安全区域 -->
    <div class="safe-area-bottom"></div>
  </div>
</template>

<style scoped>
.mobile-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: #1a1a2e;
  color: #e0e0e0;
  /* 确保内容不被状态栏遮挡 */
  padding-top: env(safe-area-inset-top, 0px);
}

.mobile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #16213e;
  border-bottom: 1px solid #2a2a4a;
  min-height: 56px;
  flex-shrink: 0;
}

.back-btn,
.settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #e0e0e0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.back-btn:hover,
.settings-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.back-btn:active,
.settings-btn:active {
  background: rgba(255, 255, 255, 0.15);
}

.settings-placeholder {
  width: 40px;
  height: 40px;
}

.header-title {
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #ffffff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

.safe-area-bottom {
  height: env(safe-area-inset-bottom, 0px);
  background: #1a1a2e;
  flex-shrink: 0;
}
</style>
