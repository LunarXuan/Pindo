[English](README.md) | **简体中文**

# Pindo — 拼豆图纸生成器

Pindo 是一个本地优先的拼豆图纸工具，可将照片、插画和像素图转换为带色号的拼豆图纸，也可以识别已有但没有色号的图纸，并补充网格、色号和用量信息。

所有图片处理均在浏览器中完成。Pindo 不会将原始图片上传到应用服务器。

[在线体验 Pindo](https://pindo-eight.vercel.app)

## 功能特性

- **图片生成图纸** — 将照片、插画或像素图转换为拼豆图纸。
- **拼豆图纸识别** — 识别有网格或无网格的无色号图纸。
- **色号高亮** — 查看并单独高亮图纸中的拼豆颜色。
- **八套品牌色板** — MARD、Hama、Perler、Artkal S、COCO、漫漫、盼盼、咪小窝。
- **灵活的还原设置** — 可选择创作模式、抖动方式、最大颜色数和图像调整参数。
- **色板筛选** — 可按色系或单个色号进行包含或排除。
- **按颗设置尺寸** — 以拼豆颗数设置宽高，并可锁定宽高比。
- **用量统计** — 查看所需色号和每种颜色的拼豆数量。
- **PNG 导出** — 保存包含网格、色号和用量图例的图纸。
- **双语界面** — 支持简体中文和 English。
- **本地与多平台使用** — 支持静态网页、PWA 资源、Windows 启动器和 Capacitor Android 打包路径。

## 隐私模型

上传的图片通过浏览器 Canvas API 和 Typed Arrays 解码、处理。应用没有图片上传 API，也没有业务后端。自行部署时，所选静态托管平台仍会正常提供应用自身的静态资源。

## 快速开始

### Windows 启动器

克隆或下载仓库后，双击 `启动 Pindo.cmd`。首次启动时，脚本会安装锁定版本的依赖、构建静态应用并打开本地服务器。

### 开发服务器

```powershell
npm ci
npm run dev
```

浏览器打开 <http://localhost:3000>。

### 本地生产构建

```powershell
npm ci
npm run build
node server.mjs --open
```

静态文件会生成到 `out/`，本地服务器默认仅监听 `127.0.0.1`。

## 开发命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动 Next.js 开发服务器 |
| `npm run build` | 构建静态文件到 `out/` |
| `npm test` | 运行 Vitest 测试 |
| `npm run lint` | 运行 ESLint |
| `npm run android:sync` | 构建并同步网页资源到 Capacitor Android |
| `npm run android:open` | 在 Android Studio 中打开 Android 工程 |

## Android 打包

项目包含 Capacitor 配置，应用 ID 为 `com.pindo.app`，网页目录为 `out`。首次使用时在本地生成 Android 工程，然后同步并打开：

```powershell
npm run android:add
npm run android:sync
npm run android:open
```

详细说明见 [ANDROID.md](ANDROID.md)。Android 签名密钥（如 `pindo-release.jks`）属于敏感文件，不得提交到仓库。

## 技术栈

- Next.js 16 静态导出、React 19、TypeScript
- Tailwind CSS 4、shadcn/ui
- 浏览器 Canvas、Typed Arrays 图像处理
- Vitest 算法测试
- Capacitor 8 Android 打包路径
- jsPDF 与 Canvas 导出模块

## 项目结构

```text
├── app/                  # 主工作台和 focus 模式页面
├── components/           # 上传、参数、预览、用量和导出界面
├── lib/
│   ├── engine/           # 缩放、颜色匹配、清理和图纸识别
│   ├── export/           # PNG 和 PDF 导出模块
│   ├── data/palettes/    # 编译后的品牌色板数据
│   ├── i18n/             # 中英文界面文本
│   └── native/           # 原生桥定义
├── public/               # PWA 清单、Service Worker、图标和静态资源
├── scripts/              # 色板和图标生成脚本
└── server.mjs            # 无额外依赖的本地静态服务器
```

## 参与贡献

欢迎提交 Issue 和 Pull Request。行为变更应补充或更新相关测试，并验证静态构建。依赖、启动脚本、本地文件服务和原生桥相关改动应视为安全敏感变更。
