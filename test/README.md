# 项目测试

测试统一放在根目录 `test/`，从项目根目录运行。打包、环境安装及资源处理脚本保留在 `scripts/`。

## 常用回归

```powershell
npm run test:farm
npm run test:farm-life
npm run test:farm-life-development
npm run test:farm-life-window
npm run test:farm-achievements
npm run test:farm-ui
npm run test:farm-scene
npm run test:pet-farm-speech
npm run test:pet-speech
npm run test:startup
npm run test:save-recovery
npm run test:model-download
npm run typecheck
```

出行测试使用可控时钟覆盖首次教学、冷却、生活后等待劳动、连续两小时无劳动的例外、每日 4 次劳动/3 次生活、每次最多 3 块地、休眠/重启、成就保护及事务失败。无需等待真实时间，不连接 Steam 或修改玩家账号成就。

其他专项测试：

```powershell
node test/test-resource-achievements.mjs
node test/test-school-handbook-rewards.mjs
node test/test-version-reminder.mjs
npm run test:farm-assistant
```

`test:local-ai` 需要本地推理运行环境及已下载的模型；它会启动真实本地推理服务。`test/test-farm-departure-alpha.py` 需要原始视频、FFmpeg、OpenCV、NumPy 和 Pillow，用于可选透明视频质量检查。

## 手动验收

使用 `npm run dev` 启动真实游戏，按 **Ctrl+Alt+F8** 打开开发控制器。它使用当前玩家存档，劳动、金币和农田编辑会真实保存；触发按钮只跳过出行冷却，不绕过成就、属性、每日次数或生活/劳动交替规则。

旧的独立存档控制器已移除，`dev:farm-life` 和专用 lab 命令不再提供。正式构建不包含真实游戏开发控制器页面、快捷键和测试接口。

## 启动诊断

先运行 `npm run build`，再运行 `npm run test:startup`。测试使用隔离目录和模拟 Steam 模块，验证真实 Electron 构建入口的原生模块加载失败、损坏设置/恢复日志、Steam 重启与初始化失败退出，以及正常启动并显示桌宠，不读取玩家真实存档或改变账号成就。

正式程序日志默认在 `%APPDATA%\Petmate\logs\`：`startup.log` 同步记录启动阶段、Steam 检查结果、异常堆栈、窗口加载/崩溃和退出；`combined.log` 保存常规日志。用户目录不可写时尝试 `%TEMP%\Petmate\logs\`。日志按大小轮转；启动日志不记录 Steam 用户身份、命令行参数或聊天配置。排查时保留本次启动的日志及轮转文件。操作系统在主进程执行前阻止启动，或原生层硬崩溃时，仍需要系统事件记录。
