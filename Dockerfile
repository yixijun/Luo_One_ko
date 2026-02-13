# 洛一前端 Dockerfile
# 多阶段构建

# ============ 构建阶段 ============
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package.json package-lock.json ./

# 安装依赖
# ELECTRON_SKIP_BINARY_DOWNLOAD=1 跳过 electron 二进制下载（不需要 GUI）
# --unsafe-perm 解决 electron postinstall 权限问题
RUN ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci --unsafe-perm

# 复制源代码
COPY . .

# 构建前端静态资源
RUN npm run build

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
