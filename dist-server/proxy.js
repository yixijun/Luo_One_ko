/**
 * 反向代理中间件
 * 将 /api/* 请求转发到后端服务
 * Requirements: 11.1, 11.2, 11.5, 11.6
 */
import { createProxyMiddleware } from 'http-proxy-middleware';
/**
 * 获取后端服务地址
 * 优先从环境变量读取，默认为 localhost:8080
 */
export function getBackendUrl() {
    return process.env.BACKEND_URL || 'http://localhost:8080';
}
/**
 * 创建 API 代理中间件
 * 将 /api/* 请求转发到后端服务
 */
export function createApiProxy() {
    const backendUrl = getBackendUrl();
    const proxyOptions = {
        target: backendUrl,
        changeOrigin: true,
        // 正确传递请求头和认证信息 (Requirement 11.5)
        xfwd: true,
        // 错误处理 (Requirement 11.6)
        on: {
            error: (err, req, res) => {
                console.error(`[Proxy Error] ${err.message}`);
                // 如果后端服务不可用，返回适当的错误响应
                if ('writeHead' in res && typeof res.writeHead === 'function') {
                    res.writeHead(502, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        error: {
                            code: 'BACKEND_UNAVAILABLE',
                            message: 'Backend service is unavailable. Please try again later.',
                        },
                    }));
                }
            },
            proxyReq: (proxyReq, req) => {
                // 记录代理请求日志
                console.log(`[Proxy] ${req.method} ${req.url} -> ${backendUrl}${req.url}`);
            },
            proxyRes: (proxyRes, req) => {
                // 记录代理响应日志
                console.log(`[Proxy] ${req.method} ${req.url} <- ${proxyRes.statusCode}`);
            },
        },
    };
    return createProxyMiddleware(proxyOptions);
}
export default createApiProxy;
//# sourceMappingURL=proxy.js.map