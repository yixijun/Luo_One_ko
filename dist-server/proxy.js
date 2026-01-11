/**
 * 反向代理中间件
 * 将 /api/* 请求转发到后端服务
 * Requirements: 11.1, 11.2, 11.5, 11.6
 */
import { createProxyMiddleware } from 'http-proxy-middleware';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// 配置文件路径
const CONFIG_FILE = path.join(__dirname, 'backend-config.json');
// 默认后端地址
const DEFAULT_BACKEND_URL = 'http://localhost:8080';
/**
 * 读取后端配置
 */
function readConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
            return JSON.parse(data);
        }
    }
    catch (e) {
        console.error('[Config] Failed to read config:', e);
    }
    return { backendUrl: process.env.BACKEND_URL || DEFAULT_BACKEND_URL };
}
/**
 * 保存后端配置
 */
function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        console.log('[Config] Saved backend URL:', config.backendUrl);
    }
    catch (e) {
        console.error('[Config] Failed to save config:', e);
    }
}
/**
 * 获取后端服务地址
 */
export function getBackendUrl() {
    return readConfig().backendUrl;
}
/**
 * 设置后端服务地址
 */
export function setBackendUrl(url) {
    saveConfig({ backendUrl: url });
}
/**
 * 创建配置 API 路由
 */
export function createConfigRoutes() {
    return (req, res, next) => {
        if (req.method === 'GET' && req.path === '/config/backend') {
            // 获取当前后端地址
            res.json({ success: true, data: { backendUrl: getBackendUrl() } });
        }
        else if (req.method === 'POST' && req.path === '/config/backend') {
            // 设置后端地址
            const { backendUrl } = req.body || {};
            if (!backendUrl) {
                res.status(400).json({ success: false, error: { message: 'backendUrl is required' } });
                return;
            }
            setBackendUrl(backendUrl);
            res.json({ success: true, data: { backendUrl } });
        }
        else {
            next();
        }
    };
}
/**
 * 创建 API 代理中间件
 * 将 /api/* 请求转发到后端服务
 */
export function createApiProxy() {
    // 使用动态代理，每次请求都读取最新的后端地址
    return (req, res, next) => {
        const backendUrl = getBackendUrl();
        const proxyOptions = {
            target: backendUrl,
            changeOrigin: true,
            xfwd: true,
            on: {
                error: (err, _req, proxyRes) => {
                    console.error(`[Proxy Error] ${err.message}`);
                    if ('writeHead' in proxyRes && typeof proxyRes.writeHead === 'function') {
                        proxyRes.writeHead(502, { 'Content-Type': 'application/json' });
                        proxyRes.end(JSON.stringify({
                            success: false,
                            error: {
                                code: 'BACKEND_UNAVAILABLE',
                                message: 'Backend service is unavailable. Please try again later.',
                            },
                        }));
                    }
                },
                proxyReq: (proxyReq, req) => {
                    console.log(`[Proxy] ${req.method} ${req.url} -> ${backendUrl}${req.url}`);
                },
                proxyRes: (proxyRes, req) => {
                    console.log(`[Proxy] ${req.method} ${req.url} <- ${proxyRes.statusCode}`);
                },
            },
        };
        const proxy = createProxyMiddleware(proxyOptions);
        proxy(req, res, next);
    };
}
export default createApiProxy;
//# sourceMappingURL=proxy.js.map