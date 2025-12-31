/**
 * 洛一 (Luo One) 邮箱管理系统 - 路由配置
 * Requirements: 8.1
 */

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { tokenManager } from '@/api/client';

// 路由配置
const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/compose',
    name: 'Compose',
    component: () => import('@/views/ComposeView.vue'),
    meta: { requiresAuth: true },
  },
  // 移动端路由
  {
    path: '/mobile',
    name: 'MobileHome',
    component: () => import('@/views/mobile/MobileHomeView.vue'),
    meta: { requiresAuth: true, mobile: true },
  },
  {
    path: '/mobile/accounts',
    name: 'MobileAccounts',
    component: () => import('@/views/mobile/MobileAccountsView.vue'),
    meta: { requiresAuth: true, mobile: true },
  },
  {
    path: '/mobile/email/:id',
    name: 'MobileEmailDetail',
    component: () => import('@/views/mobile/MobileEmailDetailView.vue'),
    meta: { requiresAuth: true, mobile: true },
  },
  // 404 重定向
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];


// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守卫 - 认证检查
router.beforeEach((to, _from, next) => {
  const requiresAuth = to.meta.requiresAuth !== false;
  const isAuthenticated = tokenManager.isAuthenticated();

  if (requiresAuth && !isAuthenticated) {
    // 需要认证但未登录，重定向到登录页
    next({
      name: 'Login',
      query: { redirect: to.fullPath },
    });
  } else if (to.name === 'Login' && isAuthenticated) {
    // 已登录但访问登录页，重定向到首页
    next({ name: 'Home' });
  } else {
    next();
  }
});

// 监听认证失效事件
if (typeof window !== 'undefined') {
  window.addEventListener('auth:unauthorized', () => {
    router.push({ name: 'Login' });
  });
}

export default router;
