# Electron 桌面端构建说明

## 目录结构

```
electron/
├── main.ts           # Electron 主进程入口
├── preload.ts        # 预加载脚本（安全 API 暴露）
├── electron-builder.json  # 打包配置
└── README.md         # 本文件
```

## 开发环境

```bash
# 启动 Vite 开发服务器
npm run dev

# 在另一个终端启动 Electron（开发模式）
npm run electron:dev
```

## 生产构建

### 构建所有平台

```bash
npm run electron:build:all
```

### 仅构建 Windows

```bash
npm run electron:build:win
```

### 仅构建 macOS

```bash
npm run electron:build:mac
```

### 仅构建 Linux

```bash
npm run electron:build:linux
```

## 图标要求

在 `public/` 目录下需要以下图标文件：

- `icon.png` - 通用图标 (512x512 或更大)
- `icon.ico` - Windows 图标
- `icon.icns` - macOS 图标
- `icons/` - Linux 图标目录（包含多种尺寸的 PNG）

### 生成图标

推荐使用 [electron-icon-builder](https://www.npmjs.com/package/electron-icon-builder) 工具：

```bash
npx electron-icon-builder --input=./public/icon.png --output=./public
```

## 输出目录

构建产物将输出到 `release/` 目录：

- Windows: `.exe` (NSIS 安装包) 和 `.exe` (便携版)
- macOS: `.dmg` 和 `.zip`
- Linux: `.AppImage`, `.deb`, `.rpm`

## 环境变量

- `NODE_ENV` - 设置为 `development` 启用开发模式
- `BACKEND_URL` - 后端服务地址（默认: `http://localhost:8080`）

## 功能特性

- ✅ 系统托盘支持
- ✅ 桌面通知
- ✅ 窗口最小化到托盘
- ✅ 内置反向代理服务器
- ✅ 跨平台支持 (Windows, macOS, Linux)
