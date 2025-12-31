<script setup lang="ts">
/**
 * 可滑动视图组件
 * Requirements: 13.2
 * 
 * 提供触摸滑动交互支持：
 * - 左滑/右滑手势检测
 * - 滑动动画效果
 * - 触觉反馈支持
 */
import { ref, onMounted, onUnmounted } from 'vue';

interface Props {
  /** 是否启用左滑 */
  enableSwipeLeft?: boolean;
  /** 是否启用右滑 */
  enableSwipeRight?: boolean;
  /** 触发滑动的最小距离 (px) */
  threshold?: number;
  /** 滑动速度阈值 (px/ms) */
  velocityThreshold?: number;
}

const props = withDefaults(defineProps<Props>(), {
  enableSwipeLeft: true,
  enableSwipeRight: true,
  threshold: 50,
  velocityThreshold: 0.3,
});

const emit = defineEmits<{
  swipeLeft: [];
  swipeRight: [];
}>();

const containerRef = ref<HTMLElement | null>(null);
const translateX = ref(0);
const isSwiping = ref(false);

// 触摸状态
let startX = 0;
let startY = 0;
let startTime = 0;
let isHorizontalSwipe: boolean | null = null;

const handleTouchStart = (e: TouchEvent) => {
  if (e.touches.length !== 1) return;
  
  const touch = e.touches[0];
  if (!touch) return;
  startX = touch.clientX;
  startY = touch.clientY;
  startTime = Date.now();
  isHorizontalSwipe = null;
  isSwiping.value = true;
};

const handleTouchMove = (e: TouchEvent) => {
  if (!isSwiping.value || e.touches.length !== 1) return;
  
  const touch = e.touches[0];
  if (!touch) return;
  const deltaX = touch.clientX - startX;
  const deltaY = touch.clientY - startY;
  
  // 判断滑动方向（首次移动时确定）
  if (isHorizontalSwipe === null) {
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
    }
    return;
  }
  
  // 非水平滑动，忽略
  if (!isHorizontalSwipe) return;
  
  // 检查滑动方向是否启用
  if (deltaX > 0 && !props.enableSwipeRight) return;
  if (deltaX < 0 && !props.enableSwipeLeft) return;
  
  // 阻止默认行为（防止页面滚动）
  e.preventDefault();
  
  // 应用阻尼效果
  const dampedDelta = deltaX * 0.5;
  translateX.value = dampedDelta;
};

const handleTouchEnd = (e: TouchEvent) => {
  if (!isSwiping.value) return;
  
  const touch = e.changedTouches[0];
  if (!touch) return;
  const deltaX = touch.clientX - startX;
  const deltaTime = Date.now() - startTime;
  const velocity = Math.abs(deltaX) / deltaTime;
  
  // 判断是否触发滑动
  const shouldTrigger = 
    Math.abs(deltaX) > props.threshold || 
    velocity > props.velocityThreshold;
  
  if (shouldTrigger && isHorizontalSwipe) {
    if (deltaX > 0 && props.enableSwipeRight) {
      triggerHaptic();
      emit('swipeRight');
    } else if (deltaX < 0 && props.enableSwipeLeft) {
      triggerHaptic();
      emit('swipeLeft');
    }
  }
  
  // 重置状态
  translateX.value = 0;
  isSwiping.value = false;
  isHorizontalSwipe = null;
};

const handleTouchCancel = () => {
  translateX.value = 0;
  isSwiping.value = false;
  isHorizontalSwipe = null;
};

// 触觉反馈
const triggerHaptic = () => {
  // 使用 Web Vibration API 作为触觉反馈
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
};

onMounted(() => {
  const container = containerRef.value;
  if (!container) return;
  
  container.addEventListener('touchstart', handleTouchStart, { passive: true });
  container.addEventListener('touchmove', handleTouchMove, { passive: false });
  container.addEventListener('touchend', handleTouchEnd, { passive: true });
  container.addEventListener('touchcancel', handleTouchCancel, { passive: true });
});

onUnmounted(() => {
  const container = containerRef.value;
  if (!container) return;
  
  container.removeEventListener('touchstart', handleTouchStart);
  container.removeEventListener('touchmove', handleTouchMove);
  container.removeEventListener('touchend', handleTouchEnd);
  container.removeEventListener('touchcancel', handleTouchCancel);
});
</script>

<template>
  <div 
    ref="containerRef"
    class="swipeable-view"
    :class="{ swiping: isSwiping }"
    :style="{ transform: `translateX(${translateX}px)` }"
  >
    <slot></slot>
  </div>
</template>

<style scoped>
.swipeable-view {
  width: 100%;
  height: 100%;
  will-change: transform;
  transition: transform 0.3s ease-out;
}

.swipeable-view.swiping {
  transition: none;
}
</style>
