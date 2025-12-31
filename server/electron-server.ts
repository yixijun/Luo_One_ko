/**
 * Electron 内置 Express 服务器
 * 用于生产环境下提供静态资源和 API 代理
 * Requirements: 12.3
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApiProxy, getBackendUrl } from './proxy.js';

// ES Module 中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建 Express 应用
const app = express();

// 静态资源目录（Vite 构建输出目录）
const DIST_DIR = path.resolve(__dirname, '../dist');

/**
 * 配置 API 反向代理
 */
app.use('/api', createApiProxy());

/**
 * 配置静态资源服务
 */
app.use(express.static(DIST_DIR, {
  maxAge: '1d',
  etag: true,
}));

/**
 * SPA 路由回退
 */
app.get('*', (_req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

/**
 * 错误处理中间件
 */
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(`[Electron Server Error] ${err.message}`);
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
function startServer(port: number = 3000): void {
  app.listen(port, () => {
    console.log('='.repeat(50));
    console.log('洛一 (Luo One) Electron 内置服务器已启动');
    console.log('='.repeat(50));
    console.log(`服务地址: http://localhost:${port}`);
    console.log(`后端代理: ${getBackendUrl()}`);
    console.log('='.repeat(50));
  });
}

export { app, startServer };
