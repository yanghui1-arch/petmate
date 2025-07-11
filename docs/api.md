# Petmate API 文档

该文档提供 Petmate 项目的 API 说明和使用指南。

## 文档类型

### 自动生成的 API 文档
我们使用 TypeDoc 从代码注释自动生成详细的 API 文档。

#### 生成文档
```bash
# 安装依赖（首次使用）
npm install

# 生成 API 文档
npm run docs:generate

# 在浏览器中查看文档
npm run docs:serve
```

生成的文档将位于 `docs-generated/` 目录中，包含：
- **工具函数**：计算、文件操作等实用工具
- **玩家操作**：购买物品、使用道具等基础操作  
- **Petmate 系统**：宠物属性、行为、升级机制
- **游戏机制**：活动、许愿、Buff 系统
- **类型定义**：完整的 TypeScript 接口和类型

### 开发文档
- [开发规范](./develop.md) - 代码风格和开发流程
- [Git 规范](./git.md) - 分支管理和提交规范  
- [项目概览](./overview.md) - 项目结构说明

## 快速开始

1. **安装依赖**
   ```bash
   npm install
   ```

2. **生成最新文档**
   ```bash
   npm run docs:generate
   ```

3. **启动本地服务器查看文档**
   ```bash
   npm run docs:serve
   ```
   然后在浏览器中访问 `http://localhost:8889`, 需要等一段时间

## 文档维护

- 所有公共方法都必须有 JSDoc 注释
- 使用 `@param`、`@returns`、`@throws` 标注参数和返回值
- 每次更新代码后重新生成文档
- 确保注释与实际代码保持同步

## 注释规范示例

```typescript
/**
 * 购买物品
 * Buff的CashConsumesRate不会影响到商品的价格
 * 
 * @param itemId 物品id
 * @param count 购买数量
 * @returns 购买的物品信息
 * @throws {NotFoundError} 如果物品不存在
 * @throws {NotEnoughError} 如果金币不足
 */
export function buyItem(itemId: number, count: number): Item {
    // 实现代码...
}
```
