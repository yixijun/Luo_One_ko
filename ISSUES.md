# 洛一前端 - 问题与优化建议

## 🔴 严重问题

### 1. API Key 存储在 localStorage
**文件**: `src/api/client.ts`
```typescript
const API_KEY_KEY = 'luo_one_api_key';
localStorage.setItem(API_KEY_KEY, apiKey);
```
**问题**: API Key 存储在 localStorage 中，容易被 XSS 攻击窃取。
**建议**: 
- 使用 HttpOnly Cookie 存储敏感信息
- 或者 API Key 只在服务端配置，前端不需要传递

### 2. 401 错误处理可能导致无限循环
**文件**: `src/api/client.ts`
```typescript
if (error.response?.status === 401) {
    tokenManager.removeToken();
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
}
```
**问题**: 如果登录接口返回 401，会触发事件导致重定向，可能造成循环。
**建议**: 排除登录接口的 401 处理。

## 🟡 中等问题

### 3. 邮件列表内存泄漏风险
**文件**: `src/stores/email.ts`
```typescript
emails.value = [...emails.value, ...uniqueNewEmails];
```
**问题**: 无限滚动加载时，邮件列表会无限增长，可能导致内存问题。
**建议**: 
- 实现虚拟滚动
- 或限制内存中的邮件数量，移除旧邮件

### 4. 缺少请求取消机制
**问题**: 切换账户或页面时，之前的请求没有被取消，可能导致数据错乱。
**建议**: 使用 AbortController 取消未完成的请求。

### 5. 错误信息未国际化
**问题**: 错误信息硬编码为中文，不支持多语言。
**建议**: 使用 i18n 库管理文本。

### 6. 移动端菜单 Teleport 可能导致样式问题
**文件**: `src/components/layout/AppHeader.vue`
**问题**: 使用 Teleport 将菜单移到 body，scoped 样式可能不生效。
**现状**: 已通过全局样式解决，但增加了维护成本。

## 🟢 优化建议

### 7. 状态持久化
**建议**: 使用 pinia-plugin-persistedstate 持久化部分状态：
- 当前选中的账户
- 邮件列表设置
- 主题偏好

### 8. 请求缓存
**建议**: 对不常变化的数据添加缓存：
- 账户列表
- 用户设置
- 使用 SWR 或 TanStack Query 模式

### 9. 图片懒加载
**问题**: 邮件中的图片没有懒加载，可能影响性能。
**建议**: 使用 IntersectionObserver 实现懒加载。

### 10. 骨架屏
**建议**: 加载时显示骨架屏而不是空白，提升用户体验。

### 11. 离线支持
**建议**: 使用 Service Worker 缓存静态资源，支持离线访问已加载的邮件。

### 12. 性能监控
**建议**: 集成性能监控工具（如 Sentry）追踪前端错误和性能问题。

### 13. 代码分割
**建议**: 对设置页面、邮件详情等组件进行懒加载：
```typescript
const SettingsView = () => import('@/views/SettingsView.vue')
```

### 14. TypeScript 严格模式
**建议**: 启用更严格的 TypeScript 配置：
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

## 📋 待办事项

- [ ] 改进敏感信息存储方式
- [ ] 修复 401 处理逻辑
- [ ] 实现虚拟滚动或限制列表大小
- [ ] 添加请求取消机制
- [ ] 国际化支持
- [ ] 状态持久化
- [ ] 请求缓存
- [ ] 图片懒加载
- [ ] 骨架屏
- [ ] 代码分割优化
- [ ] TypeScript 严格模式
