/**
 * 洛一 (Luo One) 邮箱管理系统 - 应用入口
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './style.css';

const app = createApp(App);

// 使用 Pinia 状态管理
app.use(createPinia());

// 使用路由
app.use(router);

app.mount('#app');
