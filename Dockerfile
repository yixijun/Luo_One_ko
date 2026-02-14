# 洛一前端 Dockerfile - 编译模式

# ============ 构建阶段 ============
FROM node:20-slim AS builder

WORKDIR /app

# 复制依赖文件
COPY package.json package-lock.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 禁用 esbuild 自动下载，强制使用本地版本
ENV ESBUILD_BINARY_PATH=/app/node_modules/.bin/esbuild
ENV VITE_SKIP_ESBUILD_DOWNLOAD=1
ENV npm_config_build_from_source=true

# 构建前端静态资源
RUN npm run build

# 编译服务端代码
RUN npm run build:server

# ============ 运行阶段 ============
FROM node:20-slim

WORKDIR /app

# 只安装生产依赖
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && rm -rf /root/.npm

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV BACKEND_URL=http://127.0.0.1:8080

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "dist-server/index.js"]
