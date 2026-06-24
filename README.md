# RSLabRoom

武汉大学遥感信息工程学院实验教学中心机房预约系统。

## 项目结构

```text
RSLabRoom/
├── frontend/   Vue 3 前端应用
├── backend/    新后端 API（独立开发、同域部署）
├── db/         数据库脚本
├── docs/       设计与实现文档
└── hall/       历史系统（保持不变）
```

前后端代码独立组织，生产环境推荐使用同一域名：Vue 页面部署在 `/`，后端接口统一使用 `/api` 前缀。

## 本地运行

后端（Node.js + Express，独立运行、不依赖 `hall/` 目录；接口与字段映射见 [backend/README.md](backend/README.md)）：

```bash
cd backend
npm install
npm run dev      # 默认 http://localhost:3001，凭据见 src/config.js（可用环境变量覆盖）
```

前端（开发期通过 Vite 代理把 `/api` 转发到后端）：

```bash
cd frontend
npm install
npm run dev
```

生产构建：

```bash
cd frontend
npm run build
```

系统包含两个可在顶部切换的界面：

- 普通用户端：查询空闲机房、按时段预约、查看申请入口。
- 管理工作台：待审批申请、机房动态、审批操作和管理导航。

前端技术栈为 Vue 3、TypeScript、Vite 和 Lucide Icons，界面按视图、通用组件、数据与类型分层组织。接口调用集中在 `frontend/src/api.ts`，所有数据均来自后端真实接口，加载失败时显示错误/空状态，不再使用本地模拟数据。
