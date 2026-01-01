/**
 * 生产环境 Express 服务器
 * 提供静态资源服务和 API 反向代理
 * Requirements: 11.1, 11.4
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApiProxy, createConfigRoutes, getBackendUrl } from './proxy.js';

// ES Module 中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建 Express 应用
const app = express();

// 获取端口配置
const PORT = parseInt(process.env.PORT || '3000', 10);

// 静态资源目录（Vite 构建输出目录）
const DIST_DIR = path.resolve(__dirname, '../dist');

// 解析 JSON 请求体
app.use(express.json());

/**
 * 配置路由 - 用于设置后端地址
 */
app.use('/config', createConfigRoutes());

/**
 * 配置 API 反向代理
 * 将 /api/* 请求转发到后端服务 (Requirement 11.1)
 */
app.use('/api', createApiProxy());

/**
 * 配置静态资源服务 (Requirement 11.4)
 * 服务 Vite 构建的前端资源
 */
app.use(express.static(DIST_DIR, {
  // 设置缓存控制
  maxAge: '1d',
  // 启用 gzip 压缩
  etag: true,
}));

/**
 * SPA 路由回退
 * 所有非 API 和非静态资源请求都返回 index.html
 */
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

/**
 * 错误处理中间件
 */
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(`[Server Error] ${err.message}`);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal server error occurred.',
    },
  });
});

/**
 * 启动服务器
 */
function startServer(): void {
  app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('洛一 (Luo One) 生产环境服务器已启动');
    console.log('='.repeat(50));
    console.log(`前端服务: http://localhost:${PORT}`);
    console.log(`后端代理: ${getBackendUrl()}`);
    console.log(`静态资源: ${DIST_DIR}`);
    console.log('='.repeat(50));
  });
}

// 如果直接运行此文件，启动服务器
startServer();

export { app, startServer };
