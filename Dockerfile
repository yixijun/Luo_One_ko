# 洛一前端 Dockerfile
# 多阶段构建

# ============ 构建阶段 ============
FROM node:20-slim AS builder

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY package.json package-lock.json ./

# 安装依赖（跳过所有脚本）
RUN npm ci --ignore-scripts

# 复制源代码
COPY . .

# 强制 esbuild 使用本地二进制文件，跳过服务守护进程
ENV ESBUILD_BINARY_PATH=/usr/local/bin/esbuild
ENV ESBUILD_DONT_USE_CACHE=1
ENV ESBUILD_LOG_PATH=/tmp/esbuild.log

# 下载 esbuild 二进制文件
RUN curl -sL https://github.com/evanw/esbuild/releases/download/v0.20.0/esbuild-linux-amd64 -o $ESBUILD_BINARY_PATH && \
    chmod +x $ESBUILD_BINARY_PATH

# 构建前端静态资源
RUN npx vue-tsc -b && npx vite build

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
ENV BACKEND_URL=http://luo-one-core:8080

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "dist-server/index.js"]
