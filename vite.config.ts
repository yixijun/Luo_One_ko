import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import fs from 'fs'
import type { IncomingMessage, ServerResponse } from 'http'

// 配置文件路径
const CONFIG_FILE = resolve(__dirname, 'server/backend-config.json');

// 读取后端配置
function getBackendUrl(): string {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const config = JSON.parse(data);
      return config.backendUrl || 'http://localhost:8080';
    }
  } catch (e) {
    console.error('Failed to read backend config:', e);
  }
  return process.env.BACKEND_URL || 'http://localhost:8080';
}

// 保存后端配置
function saveBackendUrl(url: string): void {
  try {
    const dir = resolve(__dirname, 'server');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ backendUrl: url }, null, 2));
    console.log('[Config] Saved backend URL:', url);
  } catch (e) {
    console.error('Failed to save backend config:', e);
  }
}

// 配置 API 插件
function configApiPlugin(): Plugin {
  return {
    name: 'config-api',
    configureServer(server) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.url === '/config/backend') {
          if (req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, data: { backendUrl: getBackendUrl() } }));
            return;
          }
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
            req.on('end', () => {
              try {
                const { backendUrl } = JSON.parse(body);
                if (backendUrl) {
                  saveBackendUrl(backendUrl);
                }
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, data: { backendUrl } }));
              } catch (e) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
              }
            });
            return;
          }
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    configApiPlugin(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080', // 默认值，会被 router 覆盖
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // 动态读取最新的后端地址
            const newTarget = getBackendUrl();
            const url = new URL(newTarget);
            proxyReq.setHeader('host', url.host);
            console.log(`[Proxy] ${req.method} ${req.url} -> ${newTarget}`);
          });
        },
        router: () => {
          // 动态返回目标地址
          return getBackendUrl();
        },
      },
      '/health': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        router: () => getBackendUrl(),
      },
    },
  },
})
