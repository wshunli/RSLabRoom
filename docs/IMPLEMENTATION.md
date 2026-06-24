# 机房预约系统实现方案

## 技术架构

- Web：React + TypeScript + Vite，桌面和移动端使用同一套响应式界面。
- API：推荐 NestJS 或 Spring Boot；学校已有 Java 技术栈时优先 Spring Boot。
- 数据库：PostgreSQL / MySQL，Redis 用于短期占位、重复提交防护和热点周课表缓存。
- 身份认证：接入学校统一身份认证（CAS / OAuth2 / OIDC），本系统只保存用户标识、姓名、单位和角色。
- 通知：站内消息为主，可扩展企业微信、短信或邮件。

## 核心数据模型

```text
users        用户、单位、角色
rooms        机房、楼宇、座位数、设备、开放状态
time_slots   日期、时段、开始/结束时间
schedules    固定课程与临时占用
applications 借用申请、用途、人数、状态、审批意见
audit_logs   审批及关键配置的审计记录
```

不要在前端通过“先查询空闲、再新增申请”判断冲突。后端应对
`room_id + date + period` 建立唯一占用约束，并在事务中完成审批和占用写入，
否则两位用户同时申请时会发生重复预约。

## 建议 API

```text
GET    /api/rooms?week=2026-W17          查询机房与一周占用
GET    /api/rooms/:id/availability       查询单个机房空闲时段
POST   /api/applications                  提交申请
GET    /api/me/applications               查询我的申请
DELETE /api/applications/:id              撤销待审批申请
GET    /api/admin/applications?status=... 管理员查询
POST   /api/admin/applications/:id/approve 审批通过
POST   /api/admin/applications/:id/reject  审批驳回
POST   /api/admin/schedules/import         导入教务课表
```

## 权限与状态机

用户分为普通用户、审批管理员、系统管理员。申请状态建议固定为：

```text
DRAFT → PENDING → APPROVED → COMPLETED
                 ↘ REJECTED
PENDING / APPROVED → CANCELLED（按规则限制）
```

所有管理员动作记录操作者、时间、原值、新值和 IP。前端只负责隐藏无权限入口，
最终权限判断必须在 API 层完成。

## 上线顺序

1. 先完成统一身份认证、机房资料、周课表查询和申请审批闭环。
2. 再接入教务课表导入、消息通知、设备报修和统计导出。
3. 上线前重点测试同一时段并发申请、跨周查询、撤销后释放占用和越权访问。
