# Greenworks安装
1. 在Petmate目录下，控制台运行命令：
   ```shell
   npm install --save --ignore-scripts git+https://github.com/greenheartgames/greenworks.git
   ```
2. 将steamworks_sdk.zip解压到**petmate\node_modules\greenworks\deps**目录下。
3. 运行命令：
   ```shell
   npm install
   ```
4. 安装 Electron Rebuild，Greenworks 推荐我们用它来进行构建。
   ```shell
   npm install --save-dev electron-rebuild
   ```
5. 执行命令构建Greenworks：
   ```shell
   .\node_modules\.bin\electron-rebuild.cmd
   ```

# 说明
1. 启动程序后，控制台成功打印出steamId和username即为接入成功。
2. petmate/steam_appid.txt中保存了appId，仅用于测试阶段，否则会自动启动线上的petmate程序。
3. 如果启动失败：steam is not running，需要启动steam再运行程序。

