/**
 * 移动端滑动导航组合式函数
 * Requirements: 13.3, 13.4, 13.5, 13.6
 * 
 * 实现移动端专属导航交互：
 * - 默认显示邮件列表（主页）
 * - 向右滑动：显示邮箱账户列表
 * - 点击邮件：向左递进到邮件详情
 * - 向左滑动/返回：返回上一级
 */

import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';

/** 移动端视图类型 */
export type MobileView = 'accounts' | 'emails' | 'detail';

/** 导航历史记录项 */
interface NavigationHistoryItem {
  view: MobileView;
  params?: Record<string, unknown>;
}

export function useSwipeNavigation() {
  const router = useRouter();
  const route = useRoute();
  
  // 当前视图
  const currentView = ref<MobileView>('emails');
  
  // 导航历史栈
  const navigationHistory = ref<NavigationHistoryItem[]>([
    { view: 'emails' }
  ]);
  
  // 当前选中的邮件 ID
  const selectedEmailId = ref<number | null>(null);
  
  // 是否正在过渡动画中
  const isTransitioning = ref(false);
  
  // 过渡方向
  const transitionDirection = ref<'left' | 'right' | 'none'>('none');
  
  // 计算属性
  const canGoBack = computed(() => navigationHistory.value.length > 1);
  const isAtRoot = computed(() => currentView.value === 'emails' && navigationHistory.value.length <= 1);
  
  /**
   * 导航到指定视图
   */
  const navigateTo = (view: MobileView, params?: Record<string, unknown>) => {
    if (isTransitioning.value) return;
    
    // 设置过渡方向
    if (view === 'accounts') {
      transitionDirection.value = 'right';
    } else if (view === 'detail') {
      transitionDirection.value = 'left';
    } else {
      transitionDirection.value = 'none';
    }
    
    isTransitioning.value = true;
    
    // 更新历史栈
    navigationHistory.value.push({ view, params });
    currentView.value = view;
    
    // 更新路由
    updateRoute(view, params);
    
    // 重置过渡状态
    setTimeout(() => {
      isTransitioning.value = false;
      transitionDirection.value = 'none';
    }, 300);
  };
  
  /**
   * 返回上一级
   */
  const goBack = () => {
    if (!canGoBack.value || isTransitioning.value) return;
    
    // 设置过渡方向（返回时方向相反）
    const currentViewType = currentView.value;
    if (currentViewType === 'accounts') {
      transitionDirection.value = 'left';
    } else if (currentViewType === 'detail') {
      transitionDirection.value = 'right';
    } else {
      transitionDirection.value = 'none';
    }
    
    isTransitioning.value = true;
    
    // 弹出当前视图
    navigationHistory.value.pop();
    
    // 获取上一个视图
    const previousItem = navigationHistory.value[navigationHistory.value.length - 1];
    if (!previousItem) {
      // 如果没有上一个视图，重置到邮件列表
      currentView.value = 'emails';
      updateRoute('emails');
    } else {
      currentView.value = previousItem.view;
      updateRoute(previousItem.view, previousItem.params);
    }
    
    // 重置过渡状态
    setTimeout(() => {
      isTransitioning.value = false;
      transitionDirection.value = 'none';
    }, 300);
  };
  
  /**
   * 显示邮箱账户列表（右滑）
   */
  const showAccounts = () => {
    if (currentView.value === 'emails') {
      navigateTo('accounts');
    }
  };
  
  /**
   * 显示邮件列表（从账户列表返回）
   */
  const showEmails = () => {
    if (currentView.value === 'accounts') {
      goBack();
    } else if (currentView.value === 'detail') {
      goBack();
    }
  };
  
  /**
   * 打开邮件详情
   */
  const openEmailDetail = (emailId: number) => {
    selectedEmailId.value = emailId;
    navigateTo('detail', { emailId });
  };
  
  /**
   * 关闭邮件详情（返回邮件列表）
   */
  const closeEmailDetail = () => {
    if (currentView.value === 'detail') {
      selectedEmailId.value = null;
      goBack();
    }
  };
  
  /**
   * 处理右滑手势
   */
  const handleSwipeRight = () => {
    if (currentView.value === 'emails') {
      showAccounts();
    } else if (currentView.value === 'detail') {
      closeEmailDetail();
    }
  };
  
  /**
   * 处理左滑手势
   */
  const handleSwipeLeft = () => {
    if (currentView.value === 'accounts') {
      showEmails();
    }
  };
  
  /**
   * 更新路由
   */
  const updateRoute = (view: MobileView, params?: Record<string, unknown>) => {
    switch (view) {
      case 'accounts':
        router.push('/mobile/accounts');
        break;
      case 'detail':
        if (params?.emailId) {
          router.push(`/mobile/email/${params.emailId}`);
        }
        break;
      case 'emails':
      default:
        router.push('/mobile');
        break;
    }
  };
  
  /**
   * 根据路由初始化视图状态
   */
  const initFromRoute = () => {
    const path = route.path;
    
    if (path.startsWith('/mobile/email/')) {
      const emailId = parseInt(route.params.id as string);
      if (!isNaN(emailId)) {
        currentView.value = 'detail';
        selectedEmailId.value = emailId;
        navigationHistory.value = [
          { view: 'emails' },
          { view: 'detail', params: { emailId } }
        ];
      }
    } else if (path === '/mobile/accounts') {
      currentView.value = 'accounts';
      navigationHistory.value = [
        { view: 'emails' },
        { view: 'accounts' }
      ];
    } else {
      currentView.value = 'emails';
      navigationHistory.value = [{ view: 'emails' }];
    }
  };
  
  /**
   * 重置导航状态
   */
  const reset = () => {
    currentView.value = 'emails';
    selectedEmailId.value = null;
    navigationHistory.value = [{ view: 'emails' }];
    transitionDirection.value = 'none';
    isTransitioning.value = false;
  };
  
  // 监听路由变化
  watch(
    () => route.path,
    () => {
      // 如果不是由内部导航触发的路由变化，则同步状态
      if (!isTransitioning.value) {
        initFromRoute();
      }
    }
  );
  
  return {
    // 状态
    currentView,
    selectedEmailId,
    isTransitioning,
    transitionDirection,
    
    // 计算属性
    canGoBack,
    isAtRoot,
    
    // 方法
    navigateTo,
    goBack,
    showAccounts,
    showEmails,
    openEmailDetail,
    closeEmailDetail,
    handleSwipeRight,
    handleSwipeLeft,
    initFromRoute,
    reset,
  };
}
