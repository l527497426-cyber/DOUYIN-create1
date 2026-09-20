# CreativeStudio 首页独立版

保留当前首页布局、导航图标 hover 动画、发布按钮 WebGL 效果、卡片交互和模拟数据。
仅包含首页；其他产品和管理页面入口显示演示提示。AI 助手显示本地演示回复，不使用外部模型。

## 运行
Node.js 22 或更新版本。

```sh
npm ci
npm run dev
npm run build
```

Vercel 使用 Vite 构建，`api/creator` 提供首页模拟数据，无需环境密钥。
