# RSLabRoom

武汉大学遥感信息工程学院实验教学中心机房预约系统。

## 项目结构

```text
RSLabRoom/
├── frontend/   Vue 3 前端应用
├── backend/    NestJS API 与 Vue 静态文件服务
├── db/         数据库脚本
├── docs/       设计与实现文档
├── scripts/    构建辅助脚本
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
npm run dev:frontend     # 默认 http://localhost:5180
```

系统包含两个可在顶部切换的界面：

- 普通用户端：查询空闲机房、按时段预约、查看申请入口。
- 管理工作台：待审批申请、机房动态、审批操作和管理导航。

前端技术栈为 Vue 3、TypeScript、Vite 和 Lucide Icons，界面按视图、通用组件、数据与类型分层组织。接口调用集中在 `frontend/src/api.ts`，所有数据均来自后端真实接口，加载失败时显示错误/空状态，不再使用本地模拟数据。

## 构建

项目通过根目录 `package.json` 统一管理构建流程，一条命令完成所有步骤：

```bash
npm run build
```

内部执行顺序：

| 步骤 | 命令 | 产物 |
|------|------|------|
| 1. 构建前端 | `npm run build --prefix frontend` | `frontend/dist/` — Vue 编译后的静态文件（含 index.html、JS/CSS bundle） |
| 2. 复制前端产物 | `node scripts/copy-frontend.mjs` | `backend/public/` — 前端静态文件复制到后端服务目录 |
| 3. 构建后端 | `npm run build --prefix backend` | `backend/dist/` — NestJS TypeScript 编译为 JavaScript（CommonJS，目标 ES2022） |

构建完成后，`backend/` 目录即为完整可运行的服务包。

### 打包交付产物

构建成功后，安装运行时依赖并一起打包，运维解压即可运行：

```bash
# 安装运行时依赖（仅在构建机上执行一次）
npm ci --omit=dev --prefix backend

# 打包：依赖 + 编译产物 + PM2 配置全部打进压缩包
tar -czf rslabroom-dist.tar.gz \
  backend/node_modules \
  backend/dist \
  backend/public \
  ecosystem.config.cjs
```

产物说明：

| 文件 | 用途 |
|------|------|
| `backend/node_modules/` | 运行时依赖（已在构建机装好，运维无需 `npm install`） |
| `backend/dist/` | 后端编译产物 |
| `backend/public/` | 前端静态文件 |
| `ecosystem.config.cjs` | PM2 进程管理配置（含环境变量，部署前按需修改） |

> 项目依赖均为纯 JS 包（`mysql2` 带原生绑定但会自动回退纯 JS 实现），因此跨平台打包（macOS → Linux）不会出问题。如果构建机和服务器都是 Linux，则完全不受影响。

## 部署

构建产物打包后，将 `rslabroom-dist.tar.gz` 交给运维工程师，按 **[DEPLOY.md](DEPLOY.md)** 执行部署。
