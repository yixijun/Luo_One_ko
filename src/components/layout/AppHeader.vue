<script setup lang="ts">
/**
 * 洛一 (Luo One) 邮箱管理系统 - 应用头部组件
 * Requirements: 8.1
 */
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useEmailStore } from '@/stores/email';

const router = useRouter();
const userStore = useUserStore();
const emailStore = useEmailStore();

// 搜索相关
const searchQuery = ref('');
const isSearching = ref(false);

// 用户信息
const user = computed(() => userStore.user);
const userInitial = computed(() => {
  if (user.value?.nickname) {
    return user.value.nickname.charAt(0).toUpperCase();
  }
  if (user.value?.username) {
    return user.value.username.charAt(0).toUpperCase();
  }
  return 'U';
});

// 搜索邮件
async function handleSearch() {
  if (!searchQuery.value.trim()) return;
  
  isSearching.value = true;
  try {
    await emailStore.fetchEmails({ search: searchQuery.value.trim() });
  } finally {
    isSearching.value = false;
  }
}

// 清除搜索
function clearSearch() {
  searchQuery.value = '';
  emailStore.fetchEmails();
}

// 跳转到设置页
function goToSettings() {
  router.push('/settings');
}

// 同步邮件
async function syncEmails() {
  await emailStore.syncEmails();
  await emailStore.fetchEmails();
}
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <div class="logo">
        <span class="logo-text">洛一</span>
      </div>
    </div>

    <div class="header-center">
      <div class="search-bar">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="搜索邮件内容或发件人..."
          @keyup.enter="handleSearch"
        />
        <button
          v-if="searchQuery"
          class="clear-btn"
          @click="clearSearch"
          title="清除搜索"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
        <button
          class="search-btn"
          :disabled="isSearching || !searchQuery.trim()"
          @click="handleSearch"
        >
          {{ isSearching ? '搜索中...' : '搜索' }}
        </button>
      </div>
    </div>

    <div class="header-right">
      <button class="icon-btn" @click="syncEmails" title="同步邮件">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
          <path d="M16 16h5v5"/>
        </svg>
      </button>
      
      <button class="icon-btn" @click="goToSettings" title="设置">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      </button>

      <div class="user-avatar" :title="user?.nickname || user?.username || '用户'">
        <img v-if="user?.avatar" :src="user.avatar" :alt="user.nickname || user.username" />
        <span v-else class="avatar-initial">{{ userInitial }}</span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 16px;
  background-color: var(--header-bg, #1a1a2e);
  border-bottom: 1px solid var(--border-color, #2d2d44);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-text {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--primary-color, #646cff);
}

.header-center {
  flex: 1;
  max-width: 600px;
  margin: 0 24px;
}

.search-bar {
  display: flex;
  align-items: center;
  background-color: var(--input-bg, #2d2d44);
  border-radius: 8px;
  padding: 0 12px;
  transition: box-shadow 0.2s;
}

.search-bar:focus-within {
  box-shadow: 0 0 0 2px var(--primary-color, #646cff);
}

.search-icon {
  width: 18px;
  height: 18px;
  color: var(--text-secondary, #888);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 10px 12px;
  font-size: 0.875rem;
  color: var(--text-primary, #fff);
  outline: none;
}

.search-input::placeholder {
  color: var(--text-secondary, #888);
}

.clear-btn {
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
  border-radius: 4px;
  transition: color 0.2s, background-color 0.2s;
}

.clear-btn:hover {
  color: var(--text-primary, #fff);
  background-color: var(--hover-bg, rgba(255, 255, 255, 0.1));
}

.clear-btn svg {
  width: 14px;
  height: 14px;
}

.search-btn {
  padding: 6px 16px;
  margin-left: 8px;
  border: none;
  border-radius: 6px;
  background-color: var(--primary-color, #646cff);
  color: #fff;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.search-btn:hover:not(:disabled) {
  background-color: var(--primary-hover, #535bf2);
}

.search-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, #888);
  cursor: pointer;
  transition: color 0.2s, background-color 0.2s;
}

.icon-btn:hover {
  color: var(--text-primary, #fff);
  background-color: var(--hover-bg, rgba(255, 255, 255, 0.1));
}

.icon-btn svg {
  width: 20px;
  height: 20px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  background-color: var(--primary-color, #646cff);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-left: 8px;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initial {
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
}

@media (max-width: 768px) {
  .header-center {
    margin: 0 12px;
  }
  
  .search-btn {
    display: none;
  }
}
</style>
