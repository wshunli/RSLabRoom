# RSLabRoom

武汉大学遥感信息工程学院实验教学中心机房预约系统。

## 项目结构

```text
RSLabRoom/
├── frontend/   Vue 3 前端应用
├── backend/    NestJS API 与 Vue 静态文件服务
├── db/         数据库脚本
├── docs/       设计与实现文档
└── hall/       历史系统（保持不变）
```

前后端代码独立开发，生产环境由 NestJS 在同一端口提供 Vue 页面和 `/api` 接口。

## 本地运行

后端（NestJS，不依赖 `hall/` 目录；配置与部署见 [backend/README.md](backend/README.md)）：

```bash
npm run dev:backend      # 默认 http://localhost:3000
```

前端（开发期通过 Vite 代理把 `/api` 转发到后端）：

```bash
npm run dev:frontend
```

生产构建：

```bash
npm run build
```

生产服务器使用 PM2 时，安装 Node.js LTS 与 PM2 后执行 `npm run deploy`，即可完成依赖安装、前后端构建与进程重启；数据库默认连接沿用历史配置。

系统包含两个可在顶部切换的界面：

- 普通用户端：查询空闲机房、按时段预约、查看申请入口。
- 管理工作台：待审批申请、机房动态、审批操作和管理导航。

前端技术栈为 Vue 3、TypeScript、Vite 和 Lucide Icons，界面按视图、通用组件、数据与类型分层组织。接口调用集中在 `frontend/src/api.ts`，所有数据均来自后端真实接口，加载失败时显示错误/空状态，不再使用本地模拟数据。
