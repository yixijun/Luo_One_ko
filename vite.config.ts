import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import fs from 'fs'

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
  } catch (e) {
    console.error('Failed to save backend config:', e);
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
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
        target: getBackendUrl(),
        changeOrigin: true,
        configure: (proxy) => {
          // 动态更新代理目标
          proxy.on('proxyReq', () => {
            const newTarget = getBackendUrl();
            if (proxy.options.target !== newTarget) {
              proxy.options.target = newTarget;
            }
          });
        },
      },
      '/health': {
        target: getBackendUrl(),
        changeOrigin: true,
      },
      '/config/backend': {
        bypass: (req, res) => {
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
                res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
              }
            });
            return;
          }
        },
      },
    },
  },
})
