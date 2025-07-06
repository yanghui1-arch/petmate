# Project
项目文件目录 
```markdown
. 📂 petmate                  <----- 根目录     
├── 📄 README.md              <----- 项目说明               
└── 📂 docs/                  <----- 文档文件夹                          
├── 📄 package-lock.json      <----- 版本管理
├── 📄 package.json           <----- 脚本管理      
└── 📂 src/                   <----- 核心代码    
├── 📄 tsconfig.json          <----- ts配置文件
└── 📄 vite.config.js         <----- vite配置文件
```

## src
```
📂 src/
├── 📂 main/              <----- 主进程
├── 📂 renderer/          <----- 渲染层
├── 📂 types/             <----- 公用类型
├── 📄 preload.js         <----- preload桥接层
```
主进程负责主要逻辑代码，渲染层用于视图渲染，types为二者公用的类型，preload.js负责主进程和渲染层的通信
### main
```
📂 main/
├── 📄 error.ts             <----- 异常错误
├── 📄 index.ts             <----- 主入口
├── 📄 ipc.ts               <----- ipc事件暴露的文件，可以理解为Contoller但是不配置具体路由，而是只告诉preload.js以何种方式调用何种方法
└── 📂 modules/             <----- 模块代码（核心）
  ├── 📄 activity.ts        <----- 活动相关的代码
  ├── 📄 card.ts            <----- 卡面相关的代码
  └── 📂 petmate/           <----- petmate相关
    ├── 📄 dass.ts          <----- 黛丝的
    ├── 📄 petmate.ts       <----- petmate这个抽象类
  ├── 📄 player.ts          <----- 玩家行为相关
  ├── 📄 shop.ts            <----- 商店的逻辑代码
  ├── 📄 store.ts           <----- 存储管理器的代码
└── 📂 types/               <----- 所有类型
  ├── 📄 buff.ts            <----- buff类型
  ├── 📄 item.ts            <----- 物品类型
  ├── 📄 petmate.ts         <----- petmate的属性类型
  ├── 📄 player.ts          <----- 玩家信息类型
├── 📄 utils.ts             <----- 工具方法文件
├── 📄 window.ts            <----- 窗口文件
```
### renderer
比较麻烦先不写了