<script setup lang="ts">
/**
 * 移动端邮件详情视图
 * Requirements: 13.3, 13.4, 13.5, 13.6
 * 
 * 功能：
 * - 显示邮件完整内容
 * - 支持左滑/返回按钮返回邮件列表
 * - 显示处理结果信息
 */
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import MobileLayout from '@/components/mobile/MobileLayout.vue';
import SwipeableView from '@/components/mobile/SwipeableView.vue';
import { useEmailStore } from '@/stores/email';
import { useSwipeNavigation } from '@/composables/useSwipeNavigation';

const route = useRoute();
const emailStore = useEmailStore();
const { handleSwipeRight, closeEmailDetail, initFromRoute } = useSwipeNavigation();

// 状态
const showHtml = ref(false);
const iframeRef = ref<HTMLIFrameElement | null>(null);

// 计算属性
const email = computed(() => emailStore.currentEmail);

const emailId = computed(() => {
  const id = route.params.id;
  return typeof id === 'string' ? parseInt(id) : null;
});

const formattedDate = computed(() => {
  if (!email.value) return '';
  const date = new Date(email.value.date * 1000);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
});

const recipients = computed(() => {
  if (!email.value) return '';
  return email.value.to.join(', ');
});

const importanceLabel = computed(() => {
  const importance = email.value?.processedResult?.importance;
  switch (importance) {
    case 'critical': return '紧急';
    case 'high': return '重要';
    case 'medium': return '一般';
    case 'low': return '低';
    default: return '';
  }
});

const importanceColor = computed(() => {
  const importance = email.value?.processedResult?.importance;
  switch (importance) {
    case 'critical': return '#ef4444';
    case 'high': return '#f97316';
    case 'medium': return '#eab308';
    default: return '#22c55e';
  }
});

// 方法
const handleBack = () => {
  closeEmailDetail();
};

const toggleHtmlView = () => {
  showHtml.value = !showHtml.value;
};

const copyVerificationCode = async () => {
  const code = email.value?.processedResult?.verificationCode;
  if (!code) return;
  
  try {
    await navigator.clipboard.writeText(code);
    // 可以添加 toast 提示
  } catch (err) {
    console.error('复制失败:', err);
  }
};

const loadEmail = async () => {
  if (emailId.value) {
    await emailStore.fetchEmail(emailId.value);
    // 标记为已读
    if (email.value && !email.value.isRead) {
      await emailStore.markAsRead(emailId.value);
    }
  }
};

// 监听路由参数变化
watch(emailId, (newId) => {
  if (newId) {
    loadEmail();
  }
});

// 监听 HTML 内容变化，更新 iframe
watch([showHtml, email], () => {
  if (showHtml.value && iframeRef.value && email.value?.htmlBody) {
    const doc = iframeRef.value.contentDocument;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 14px;
              line-height: 1.6;
              color: #e0e0e0;
              background: #1a1a2e;
              padding: 16px;
              margin: 0;
            }
            a { color: #4a90d9; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>${email.value.htmlBody}</body>
        </html>
      `);
      doc.close();
    }
  }
});

// 生命周期
onMounted(() => {
  initFromRoute();
  loadEmail();
});
</script>

<template>
  <MobileLayout 
    :title="email?.subject || '邮件详情'" 
    :show-back="true" 
    :show-settings="false"
    @back="handleBack"
  >
    <SwipeableView
      :enable-swipe-left="false"
      :enable-swipe-right="true"
      @swipe-right="handleSwipeRight"
    >
      <div class="mobile-email-detail">
        <!-- 加载状态 -->
        <div v-if="emailStore.loading" class="loading-state">
          <div class="spinner"></div>
          <span>加载中...</span>
        </div>
        
        <!-- 邮件不存在 -->
        <div v-else-if="!email" class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <p>邮件不存在或已删除</p>
        </div>
        
        <!-- 邮件内容 -->
        <template v-else>
          <!-- 邮件头部信息 -->
          <div class="email-header">
            <h1 class="email-subject">{{ email.subject }}</h1>
            
            <div class="email-meta">
              <div class="meta-row">
                <span class="meta-label">发件人</span>
                <span class="meta-value">{{ email.from }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">收件人</span>
                <span class="meta-value">{{ recipients }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">时间</span>
                <span class="meta-value">{{ formattedDate }}</span>
              </div>
            </div>
          </div>
          
          <!-- 处理结果信息 -->
          <div v-if="email.processedResult" class="processed-info">
            <!-- 验证码 -->
            <div 
              v-if="email.processedResult.verificationCode" 
              class="info-card code-card"
              @click="copyVerificationCode"
            >
              <div class="card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div class="card-content">
                <div class="card-label">验证码</div>
                <div class="card-value code-value">{{ email.processedResult.verificationCode }}</div>
              </div>
              <div class="card-action">点击复制</div>
            </div>
            
            <!-- 广告标识 -->
            <div v-if="email.processedResult.isAd" class="info-card ad-card">
              <div class="card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div class="card-content">
                <div class="card-label">广告邮件</div>
                <div class="card-value">此邮件被识别为广告</div>
              </div>
            </div>
            
            <!-- 重要度 -->
            <div v-if="importanceLabel" class="info-card importance-card">
              <div class="card-icon" :style="{ color: importanceColor }">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div class="card-content">
                <div class="card-label">重要度</div>
                <div class="card-value" :style="{ color: importanceColor }">{{ importanceLabel }}</div>
              </div>
            </div>
            
            <!-- 摘要 -->
            <div v-if="email.processedResult.summary" class="info-card summary-card">
              <div class="card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <div class="card-content">
                <div class="card-label">内容摘要</div>
                <div class="card-value summary-value">{{ email.processedResult.summary }}</div>
              </div>
            </div>
          </div>
          
          <!-- 附件信息 -->
          <div v-if="email.hasAttachments" class="attachments-section">
            <div class="section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              <span>包含附件</span>
            </div>
          </div>
          
          <!-- 邮件正文 -->
          <div class="email-body-section">
            <div class="body-header">
              <span class="section-title">邮件正文</span>
              <button 
                v-if="email.htmlBody" 
                class="toggle-btn"
                @click="toggleHtmlView"
              >
                {{ showHtml ? '纯文本' : 'HTML' }}
              </button>
            </div>
            
            <div v-if="showHtml && email.htmlBody" class="html-body">
              <iframe 
                ref="iframeRef"
                class="html-iframe"
                sandbox="allow-same-origin"
              ></iframe>
            </div>
            <div v-else class="text-body">
              {{ email.body }}
            </div>
          </div>
        </template>
        
        <!-- 滑动提示 -->
        <div class="swipe-hint">
          <span>→ 右滑返回邮件列表</span>
        </div>
      </div>
    </SwipeableView>
  </MobileLayout>
</template>

<style scoped>
.mobile-email-detail {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding-bottom: env(safe-area-inset-bottom, 0px);
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

.email-header {
  padding: 16px;
  background: #16213e;
  border-bottom: 1px solid #2a2a4a;
}

.email-subject {
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.email-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.meta-row {
  display: flex;
  font-size: 13px;
}

.meta-label {
  color: #888;
  width: 60px;
  flex-shrink: 0;
}

.meta-value {
  color: #c0c0c0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.processed-info {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-bottom: 1px solid #2a2a4a;
}

.info-card {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  background: #16213e;
  border-radius: 8px;
  gap: 12px;
}

.card-icon {
  color: #4a90d9;
  flex-shrink: 0;
  margin-top: 2px;
}

.code-card .card-icon {
  color: #22c55e;
}

.ad-card .card-icon {
  color: #ef4444;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-label {
  font-size: 12px;
  color: #888;
  margin-bottom: 2px;
}

.card-value {
  font-size: 14px;
  color: #e0e0e0;
}

.code-value {
  font-size: 20px;
  font-weight: 600;
  font-family: monospace;
  color: #22c55e;
  letter-spacing: 2px;
}

.summary-value {
  line-height: 1.5;
}

.card-action {
  font-size: 12px;
  color: #4a90d9;
  flex-shrink: 0;
}

.attachments-section {
  padding: 12px 16px;
  border-bottom: 1px solid #2a2a4a;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #888;
}

.email-body-section {
  flex: 1;
  padding: 16px;
}

.body-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.toggle-btn {
  padding: 6px 12px;
  background: #2a2a4a;
  border: none;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 12px;
  cursor: pointer;
}

.toggle-btn:active {
  background: #3a3a5a;
}

.text-body {
  font-size: 14px;
  line-height: 1.7;
  color: #c0c0c0;
  white-space: pre-wrap;
  word-break: break-word;
}

.html-body {
  background: #1a1a2e;
  border-radius: 8px;
  overflow: hidden;
}

.html-iframe {
  width: 100%;
  min-height: 400px;
  border: none;
  background: #1a1a2e;
}

.swipe-hint {
  position: fixed;
  bottom: calc(24px + env(safe-area-inset-bottom, 0px));
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
