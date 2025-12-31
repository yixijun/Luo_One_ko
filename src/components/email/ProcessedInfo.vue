<script setup lang="ts">
/**
 * 洛一 (Luo One) 邮箱管理系统 - 处理信息组件
 * Requirements: 8.5
 * 显示验证码、广告标识、重要度等处理结果
 */
import { computed } from 'vue';
import type { ProcessedResult } from '@/types';

// Props
const props = withDefaults(defineProps<{
  result: ProcessedResult;
  compact?: boolean;
}>(), {
  compact: false,
});

// 获取重要度颜色
const importanceColor = computed(() => {
  switch (props.result.importance) {
    case 'critical': return '#f44336';
    case 'high': return '#ff9800';
    case 'medium': return '#2196f3';
    default: return '#9e9e9e';
  }
});

// 获取重要度标签
const importanceLabel = computed(() => {
  switch (props.result.importance) {
    case 'critical': return '紧急';
    case 'high': return '重要';
    case 'medium': return '一般';
    default: return '普通';
  }
});

// 获取处理方式标签
const processedByLabel = computed(() => {
  return props.result.processedBy === 'ai' ? 'AI 处理' : '本地处理';
});

// 格式化处理时间
function formatProcessedTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('zh-CN');
}

// 复制验证码
async function copyVerificationCode() {
  if (props.result.verificationCode) {
    try {
      await navigator.clipboard.writeText(props.result.verificationCode);
      // 可以添加一个 toast 提示
    } catch (err) {
      console.error('复制失败:', err);
    }
  }
}
</script>

<template>
  <!-- 紧凑模式：用于邮件列表 -->
  <div v-if="compact" class="processed-info-compact">
    <span 
      v-if="result.verificationCode" 
      class="tag code-tag"
      title="验证码"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
      验证码
    </span>
    <span 
      v-if="result.isAd" 
      class="tag ad-tag"
      title="广告邮件"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      广告
    </span>
    <span 
      class="tag importance-tag"
      :style="{ backgroundColor: importanceColor }"
      :title="'重要度: ' + importanceLabel"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
      {{ importanceLabel }}
    </span>
  </div>

  <!-- 完整模式：用于邮件详情 -->
  <div v-else class="processed-info-full">
    <!-- 验证码卡片 -->
    <div class="info-card" v-if="result.verificationCode">
      <div class="info-icon code">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <div class="info-content">
        <span class="info-label">验证码</span>
        <div class="code-value-wrapper">
          <span class="info-value code-value">{{ result.verificationCode }}</span>
          <button class="copy-btn" @click="copyVerificationCode" title="复制验证码">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 广告标识卡片 -->
    <div class="info-card" v-if="result.isAd">
      <div class="info-icon ad">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
      <div class="info-content">
        <span class="info-label">广告邮件</span>
        <span class="info-value">此邮件被识别为广告或推广内容</span>
      </div>
    </div>

    <!-- 内容摘要卡片 -->
    <div class="info-card summary-card" v-if="result.summary">
      <div class="info-icon summary">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      </div>
      <div class="info-content">
        <span class="info-label">内容摘要</span>
        <span class="info-value summary-value">{{ result.summary }}</span>
      </div>
    </div>

    <!-- 重要度卡片 -->
    <div class="info-card">
      <div 
        class="info-icon" 
        :style="{ backgroundColor: importanceColor }"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      </div>
      <div class="info-content">
        <span class="info-label">重要度</span>
        <span class="info-value">{{ importanceLabel }}</span>
      </div>
    </div>

    <!-- 处理信息 -->
    <div class="process-meta">
      <span class="meta-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        {{ formatProcessedTime(result.processedAt) }}
      </span>
      <span class="meta-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
          <path d="M12 2a10 10 0 0 1 10 10"/>
        </svg>
        {{ processedByLabel }}
      </span>
    </div>
  </div>
</template>

<style scoped>
/* 紧凑模式样式 */
.processed-info-compact {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.625rem;
  font-weight: 500;
  color: #fff;
}

.tag svg {
  width: 10px;
  height: 10px;
}

.code-tag {
  background-color: #4caf50;
}

.ad-tag {
  background-color: #ff9800;
}

.importance-tag {
  background-color: #9e9e9e;
}

/* 完整模式样式 */
.processed-info-full {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.info-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background-color: var(--card-bg, rgba(255, 255, 255, 0.03));
  border-radius: 8px;
  min-width: 200px;
  flex: 1;
}

.info-card.summary-card {
  flex-basis: 100%;
}

.info-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.info-icon svg {
  width: 20px;
  height: 20px;
  color: #fff;
}

.info-icon.code {
  background-color: #4caf50;
}

.info-icon.ad {
  background-color: #ff9800;
}

.info-icon.summary {
  background-color: #2196f3;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.info-label {
  font-size: 0.75rem;
  color: var(--text-secondary, #888);
}

.info-value {
  font-size: 0.875rem;
  color: var(--text-primary, #fff);
}

.code-value-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.code-value {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
  font-size: 1.5rem;
  font-weight: 600;
  color: #4caf50;
  letter-spacing: 3px;
}

.copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background-color: var(--hover-bg, rgba(255, 255, 255, 0.1));
  color: var(--text-secondary, #888);
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
}

.copy-btn:hover {
  background-color: var(--primary-color, #646cff);
  color: #fff;
}

.copy-btn svg {
  width: 16px;
  height: 16px;
}

.summary-value {
  line-height: 1.5;
}

.process-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  width: 100%;
  padding-top: 8px;
  border-top: 1px solid var(--border-color, #2d2d44);
  margin-top: 4px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: var(--text-secondary, #888);
}

.meta-item svg {
  width: 14px;
  height: 14px;
}
</style>
