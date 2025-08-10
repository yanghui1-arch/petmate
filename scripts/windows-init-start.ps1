# 设置执行策略（如果尚未设置）
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force

# 安装 greenworks
Write-Host "安装 greenworks..."
npm install --save --ignore-scripts git+https://github.com/greenheartgames/greenworks.git

# 复制 steamworks 文件夹到目标目录
Write-Host "复制 steamworks 文件夹..."
Copy-Item -Path "./steamworks_sdk" -Destination "./node_modules/greenworks/deps/" -Recurse

# 安装依赖
Write-Host "安装依赖..."
npm install

# 安装 electron-rebuild
Write-Host "安装 electron-rebuild..."
npm install --save-dev electron-rebuild

# 执行 electron-rebuild
Write-Host "执行 electron-rebuild..."
Start-Process -FilePath "./node_modules/.bin/electron-rebuild.cmd" -Wait
