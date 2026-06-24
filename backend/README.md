# Backend

新后端 API（Node.js + Express + mysql2）。连接目标 MySQL 数据库，为 Vue 前端提供 `/api` 接口。**后端独立运行，不依赖、不读取 `hall/` 目录的任何文件，也不改动历史表结构与 `db/hall.sql`。**

## 数据库连接

连接信息直接写在 `src/config.js` 的默认值中（库名 `hall`），任意一项都可用环境变量覆盖，便于本地开发：

| 变量 | 说明 | 默认 |
| --- | --- | --- |
| `DB_HOST` | 数据库地址 | `localhost` |
| `DB_PORT` | 端口 | `3306` |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | 账号 / 密码 / 库名 | `halladmin` / `…` / `hall` |
| `PORT` | 后端监听端口 | `3001` |

## 运行

```bash
cd backend
npm install
npm run dev      # node --watch，开发热重载
# 或 npm start
```

数据库不可用时进程不会崩溃：依赖数据库的接口返回 `503`，前端据此回退到本地占位数据。

开发期前端通过 Vite 代理把 `/api` 转发到本服务（见 `frontend/vite.config.ts`）；生产环境前后端同域部署，由网关转发 `/api`。

## 接口一览

公共：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/config` | 学期/当前周/首页联系人（console 表） |
| GET | `/api/rooms` | 机房列表（class 表解析） |
| GET | `/api/availability?week=N` | 某教学周占用，返回 `busySlots: ["roomId-day-period"]`（day 0=周日） |
| POST | `/api/applications` | 提交申请，写入 borrow + submit |
| GET | `/api/health` | 健康检查（含 `db` 连接状态） |

管理端（需 `Authorization: Bearer <token>`）：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/admin/login` | 校验 user 表（md5），签发内存 token |
| POST | `/api/admin/logout` | 注销 |
| GET | `/api/admin/applications?status=pending\|approved\|all` | 申请列表（submit + borrow 汇总） |
| POST | `/api/admin/applications/:id/approve` | 通过（含时段冲突检查，冲突返回 409） |
| POST | `/api/admin/applications/:id/reject` | 驳回/撤销（置 status=0） |
| DELETE | `/api/admin/applications/:id` | 删除申请及其占用 |
| GET / PUT | `/api/admin/settings` | 读写学期与联系人配置（console 表） |
| GET | `/api/admin/users` | 申请人列表（按 submit 的姓名+电话聚合，含申请次数） |
| GET / POST / DELETE | `/api/admin/schedules` | 机房排期：生成/查询/删除真实占用 |

## 历史库与字段映射

| 前端概念 | 历史表/字段 |
| --- | --- |
| 机房 Room | `class.cid / cname / cintro`（座位、单位从 `cname` 解析；简介、管理员、电话从 `cintro` 解析） |
| 时段 period 0/1/2 | `borrow.tag` 1/2/3（上午/下午/晚上） |
| 占用 / 申请明细行 | `borrow`（`status` 1=已通过、0=待审；`btimeid` 归并一次申请） |
| 申请单 | `submit`（`sstatus` 1=已通过、0=待审；`stimeid` 关联 borrow） |
| 学期/联系人配置 | `console`（`begtime/week/lianxiren/lianxidianhua`） |
| 管理员账号 | `user`（`upwd` = md5 密码） |

## 历史表结构带来的取舍

历史库无独立的排期规则表与用户档案表，新后端在不改表结构的前提下基于现有表实现：

- **机房排期**：一条排期落地为一组“已通过”的 `borrow` 占用，同组共用一个以 `SCH` 前缀标记的 `btimeid`，便于按组回查与删除。生成时若目标时段已有已通过占用则自动跳过，避免重复排课。它与预约共用同一套占用检测，会即时反映在 `/api/availability`。
- **用户管理**：历史库无普通用户档案，`/api/admin/users` 按 `submit` 的「姓名 + 电话」聚合出只读的申请人列表（含申请次数、最近课程）。
- **机房设备（equipment）**：历史库未存储，`/api/rooms` 返回空数组，前端按需兜底展示。

> 说明：历史库没有独立的「已驳回」状态，驳回与撤销都将状态置回 `0`（待审）。
