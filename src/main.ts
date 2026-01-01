/**
 * 洛一 (Luo One) 邮箱管理系统 - 应用入口
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useThemeStore } from './stores/theme';
import './style.css';

const app = createApp(App);

// 使用 Pinia 状态管理
const pinia = createPinia();
app.use(pinia);

// 初始化主题
const themeStore = useThemeStore();
themeStore.initTheme();

// 使用路由
app.use(router);

app.mount('#app');
