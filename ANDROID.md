# Pindo 安卓应用打包说明

项目已经接入 Capacitor，可以作为安卓应用运行。安卓工程位于：

```text
android/
```

## 开发/同步

每次修改前端后执行：

```powershell
npm run android:sync
```

这会先构建静态前端，再同步到安卓工程。

## 使用 Android Studio 打包

1. 安装 Android Studio。
2. 打开本项目的 `android/` 文件夹。
3. 等待 Gradle 同步完成。
4. 连接安卓手机或打开模拟器。
5. 点击 Run 运行，或使用 Build 生成 APK。

## 命令行构建 APK

需要先安装 JDK 和 Android SDK，然后运行：

```powershell
cd android
.\gradlew.bat assembleDebug
```

生成位置通常为：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## 应用信息

- 应用名：Pindo
- 包名：com.pindo.app
- 页面资源：打包自 `out/`
- 运行方式：安卓 WebView 本地离线运行
