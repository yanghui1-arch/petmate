# 003 任务

- [x] 用户批准方案 A；确认无需旧农场测试存档兼容。
- [x] 编写 spec.md、plan.md 与 tasks.md。
- [x] 记录检查基线。
- [x] 原型移除布置和装饰分类，经营入口去圆框。
- [x] 接入卡通资源、24 阶段校准元数据和等距土地模型。
- [x] Phaser 场景、根部定位、光标、悬停与命中迁移。
- [x] 实际页面浮动 HUD、就近选种与直接地块操作。
- [x] 订单、背包、图鉴、商店、交易、等级与设置迁移。
- [x] 移除装饰状态与交易能力；更新文案及旧文档覆盖说明。
- [x] 完成规则、页面、场景、失败/重复交易及恢复回归。
- [x] 完成类型检查、修改文件 lint、构建与多尺寸截图验收；全仓 lint 的既有问题见下方。

## 2026-10-01 界面调整

- [x] 用户批准等比铺满及操作图标居中方案 A。
- [x] 删除实际页面和原型的上下模糊补边。
- [x] 更换尤美头像、商店图标，删除加号。
- [x] 首轮操作图标居中（已由下方鼠标交互修正替换）。
- [x] 完成类型、页面、Phaser 多尺寸和原型回归，检查截图。

本轮验证：typecheck、test:farm-ui、test:farm-scene、verify-prototype.cjs、修改文件 ESLint、build 与 git diff --check 通过。Phaser 原生鼠标检查验证三类图标在土地上缘与下缘悬停时仍位于同一中心；800×600、1080×720、1800×900 的背景覆盖整个窗口，12 块土地完整可见，点击与作物根部一致。已检查默认和最小窗口截图；测试使用隔离存档。

## 鼠标交互修正

- [x] 用户明确要求取消固定居中，改用鼠标位置替换系统指针。
- [x] 实际页面与原型校准三类图标热点，并隐藏系统鼠标。
- [x] 验证热点、跟随、系统鼠标隐藏与恢复、直接操作及窗口缩放。

修正验证：typecheck、test:farm-ui、test:farm-scene、verify-prototype.cjs、修改文件 ESLint 和 build 通过。原生鼠标检查三类热点跟随实际位置、热点源像素可见、计算样式 cursor 为 none；进入已浇水地块、空白区域、选种弹窗和订单弹窗时恢复普通鼠标。最小、默认和宽窗口回归通过；原型验证热点与鼠标位置误差小于 0.05 像素。截图 farm-actual-pointer.png 展示手形鼠标，使用隔离测试存档。

## 验证记录

2026-10-01：

- 修改前 typecheck、test:farm、test:save-recovery 通过。
- 修改后 typecheck、test:farm、test:farm-ui、test:farm-scene、test:save-recovery 通过。
- 原型 verify-prototype.cjs 与素材 inspect-crop-assets.cjs 通过；原型移除布置后重新生成验证记录与截图。
- 实际 Vue + Phaser 的隔离 Electron 检查使用原生鼠标事件，验证选种、直接浇水/收获、面板隔离、反馈消失、216 个作物落点、800×600 / 1080×720 / 1800×900、简繁英、卸载及重新进入。
- 页面 + 真实 FarmService 检查验证教学扣减、保存失败不扣资源、忙碌重复点击、购买/出售/订单、跨窗口刷新及恢复错误释放锁。
- renderer 图片均复制批准的 PNG 原图，未重绘或修改像素；UI 图标改用测量区域，避免等分切片带入邻近图标。
- npm run build 通过。首次构建遇到自动生成 components.d.ts 的短暂文件写入错误，重试通过。
- 修改文件 ESLint 无错误；FarmService 接口/构造参数有 4 条既有 no-unused-vars 警告。npm run lint 全仓未通过，剩余错误位于本次未修改的代码，以格式和导入排序为主；没有批量改动无关文件。
- 实际页面截图：farm-actual-1080.png、farm-actual-seeds-1080.png、farm-actual-hover-1080.png、farm-actual-orders-1080.png、farm-actual-codex-1080.png、farm-actual-store-1080.png、farm-actual-stage-0..3.png、farm-actual-800.png、farm-actual-seeds-800.png、farm-actual-backpack-三种语言-800.png、farm-actual-wide.png。
- 所有交易测试使用隔离测试存档；未清除或改写用户真实进度。未自动提交或推送 Git。用户实际应用试玩仍可继续作为体验反馈。
