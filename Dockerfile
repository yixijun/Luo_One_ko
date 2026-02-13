# 洛一前端 Dockerfile
# 多阶段构建

# ============ 构建阶段 ============
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package.json package-lock.json ./

# 安装依赖（跳过所有脚本）
RUN npm ci --ignore-scripts

# 安装 curl 并下载 esbuild 二进制文件
RUN apk add --no-cache curl && \
    curl -sL https://github.com/evanw/esbuild/releases/download/v0.20.0/esbuild-linux-amd64 -o /tmp/esbuild && \
    chmod +x /tmp/esbuild && \
    mkdir -p /app/node_modules/.bin && \
    cp /tmp/esbuild /app/node_modules/.bin/esbuild

# 复制源代码
COPY . .

# 使用直接下载的 esbuild
ENV ESBUILD_BINARY_PATH=/tmp/esbuild

# 构建前端静态资源
RUN npx vue-tsc -b && npx vite build

# 编译服务端代码
RUN npm run build:server

# ============ 运行阶段 ============
FROM node:20-alpine

WORKDIR /app

# 复制 package.json
COPY package.json package-lock.json ./

# 只安装生产依赖
RUN npm ci --omit=dev

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
