# Pindo 拼豆图纸生成器

Pindo 是一个**本地运行**的拼豆图纸工具：把图片转换成带网格、色号和用量统计的拼豆图纸，也可以识别已有的无色号图纸并自动补全色号标注。所有图片处理都在浏览器本地完成，图片不会上传到任何服务器。

## 功能特性

- **图片生成图纸**：上传照片、插画或像素图，按品牌色板生成拼豆图纸
- **拼豆图纸识别**：识别有网格或无网格的无色号图纸，自动补全网格、色号和用量
- **品牌色板**：MARD、Hama、Perler、Artkal S、COCO、漫漫、盼盼、咪小窝 共 8 套
- **创作模式**：写实、主色、清晰三种还原风格
- **颜色筛选**：按色系或单色（已有/没有）控制生成范围
- **尺寸设置**：按「颗」为单位设置宽高，支持锁定宽高比
- **图纸预览**：每个颗粒显示对应品牌的色号
- **导出**：导出 PNG（底部附带所需色号和数量统计），或导出 PDF
- **拼图模式**：引导式拼图视图（`/focus`）
- **多语言**：简体中文 / English 界面
- **Android**：基于 Capacitor 打包为 Android 应用（见 [ANDROID.md](ANDROID.md)）

## 快速开始

**Windows 用户**：双击 `打开 Pindo.lnk` 即可（首次启动会自动安装依赖并构建）。

手动启动：

```powershell
npm install
npm run build
node server.mjs --open
```

浏览器打开 <http://localhost:3000>。

## 开发命令

```powershell
npm run dev        # 开发模式（热更新）
npm run build      # 构建静态导出到 out/
npm test           # 运行 Vitest 测试
npm run lint       # ESLint 检查
```

## Android 打包

```powershell
npm run android:sync   # 构建并同步到 android/ 平台
npx cap open android   # 用 Android Studio 打开
```

应用配置（`capacitor.config.ts`）：`appId: com.pindo.app`，`webDir: out`。详细说明见 [ANDROID.md](ANDROID.md)。

> ⚠️ 签名密钥（`pindo-release.jks`）属于敏感文件，已被 `.gitignore` 排除，不要提交到仓库。

## 技术栈

- **框架**：Next.js 16（静态导出）+ React 19 + TypeScript
- **样式**：Tailwind CSS 4 + shadcn/ui
- **图像处理**：Canvas + Typed Arrays（浏览器本地）
- **测试**：Vitest
- **移动端**：Capacitor 8（Android）
- **导出**：jspdf、Canvas PNG

## 项目结构

```
├── app/                  # 页面（主工作台、focus 拼图模式）
├── components/           # UI 组件（上传、参数、预览、用量、导出等）
├── lib/
│   ├── engine/           # 图像处理核心（缩放、配色、清洗、图纸识别）
│   ├── export/           # PNG / PDF 导出
│   ├── data/palettes/    # 品牌色板数据
│   ├── i18n/             # 中英文界面
│   └── native/           # 原生能力（保存到相册等）
├── public/               # 静态资源、PWA 图标
├── scripts/              # 色板编译、图标生成等脚本
└── server.mjs            # 本地静态服务器（配合双击启动）
```
