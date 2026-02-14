# 洛一前端 Dockerfile - 开发模式

FROM node:20-slim

WORKDIR /app

# 安装所有依赖
COPY package.json package-lock.json ./
RUN npm ci

# 复制源代码
COPY . .

# 暴露 Vite 开发服务器端口
EXPOSE 5173

# 启动开发模式
CMD ["npm", "run", "dev"]
