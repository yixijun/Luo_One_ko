# 洛一 (Luo One) - Capacitor 移动端配置

## 概述

本目录包含 Capacitor 移动端应用的配置文件和模板。

## 目录结构

```
capacitor/
├── capacitor.config.ts      # Capacitor 主配置文件
├── ios/                     # iOS 项目配置模板
│   └── App/App/
│       └── Info.plist.template
├── android/                 # Android 项目配置模板
│   └── app/src/main/
│       ├── AndroidManifest.xml.template
│       └── res/values/
│           ├── strings.xml.template
│           └── styles.xml.template
└── README.md               # 本文件
```

## 初始化步骤

### 1. 安装依赖

```bash
cd Luo_One_ko
npm install
```

### 2. 构建 Web 应用

```bash
npm run build
```

### 3. 添加平台

```bash
# 添加 iOS 平台
npm run cap:add:ios

# 添加 Android 平台
npm run cap:add:android
```

### 4. 同步代码

```bash
npm run cap:sync
```

### 5. 打开原生项目

```bash
# 打开 iOS 项目 (需要 macOS + Xcode)
npm run cap:open:ios

# 打开 Android 项目 (需要 Android Studio)
npm run cap:open:android
```

## 配置说明

### capacitor.config.ts

主配置文件，包含：
- `appId`: 应用唯一标识符 (`one.luo.ko`)
- `appName`: 应用显示名称 (`洛一`)
- `webDir`: Web 构建输出目录 (`../dist`)
- `plugins`: 插件配置（状态栏、键盘、启动画面等）

### iOS 配置

运行 `npx cap add ios` 后，需要在 Xcode 中配置：

1. **签名配置**: 在 Xcode 中设置开发团队和签名证书
2. **Info.plist**: 参考 `Info.plist.template` 配置权限说明
3. **图标和启动画面**: 在 `ios/App/App/Assets.xcassets` 中替换

### Android 配置

运行 `npx cap add android` 后，需要在 Android Studio 中配置：

1. **签名配置**: 在 `android/app/build.gradle` 中配置签名
2. **AndroidManifest.xml**: 参考模板配置权限
3. **图标**: 在 `android/app/src/main/res/mipmap-*` 中替换
4. **主题颜色**: 在 `res/values/styles.xml` 中修改

## 开发命令

```bash
# 同步 Web 代码到原生项目
npm run cap:sync

# 仅复制 Web 代码（不更新插件）
npm run cap:copy

# 在 iOS 模拟器/设备上运行
npm run cap:run:ios

# 在 Android 模拟器/设备上运行
npm run cap:run:android

# 构建并打开 iOS 项目
npm run mobile:build:ios

# 构建并打开 Android 项目
npm run mobile:build:android
```

## 后端连接配置

移动端需要连接到后端服务器。有以下几种方式：

### 1. 开发环境

在 `capacitor.config.ts` 中配置开发服务器：

```typescript
server: {
  url: 'http://192.168.1.100:3000',  // 开发机 IP
  cleartext: true,
}
```

### 2. 生产环境

移动端应用需要配置后端服务器地址。可以通过以下方式：

- 在应用设置中让用户输入服务器地址
- 使用环境变量在构建时注入
- 使用配置文件

## 注意事项

1. **iOS 开发需要 macOS 和 Xcode**
2. **Android 开发需要 Android Studio 和 JDK**
3. **首次运行需要配置开发者账号和签名**
4. **模板文件仅供参考，实际配置在原生项目中修改**

## 常见问题

### Q: 如何更新 Capacitor 版本？

```bash
npm install @capacitor/core@latest @capacitor/cli@latest
npm install @capacitor/ios@latest @capacitor/android@latest
npx cap sync
```

### Q: 如何添加新的 Capacitor 插件？

```bash
npm install @capacitor/plugin-name
npx cap sync
```

### Q: 构建失败怎么办？

1. 确保已安装所有依赖：`npm install`
2. 清理并重新构建：`npm run build`
3. 同步原生项目：`npx cap sync`
4. 在原生 IDE 中清理并重新构建

## 相关链接

- [Capacitor 官方文档](https://capacitorjs.com/docs)
- [iOS 开发指南](https://capacitorjs.com/docs/ios)
- [Android 开发指南](https://capacitorjs.com/docs/android)
