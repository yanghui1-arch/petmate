# Requirements
# Start
1. Node.js 22.14.0 (必须为此版本，否则无法跑起)
2. Steam 最新的sdk

# Start
首先先从steam上下载最新的[sdk包](https://partner.steamgames.com/downloads/list)，需要你有steam账号。下载完成以后，解压，拿到里面的`sdk`，将`sdk`重命名为`steamworks_sdk`，将`steamworks_sdk`放在项目的根目录下。**必须重命名为steamworks_sdk, 否则项目无法启动**
## 启动项目
### Windows
在windows上直接在终端运行下面的脚本即可，遇到warning是正常情况，运行好后尝试跑开发环境命令。
```powershell
.\scripts\windows-init-start.ps1
```
此后运行项目只需要`npm run dev`即可跑起项目
### 开发环境跑命令
```npm
npm run dev
```
