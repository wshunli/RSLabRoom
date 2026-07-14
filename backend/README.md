# RSLabRoom Backend

NestJS 后端，同时提供 `/api` 接口和 Vue 生产静态文件。生产环境只需运行一个 Node.js 进程、监听一个端口。

## 本地开发

```bash
npm run dev:backend
npm run dev:frontend
```

默认数据库连接沿用历史系统配置，无需额外配置即可运行。Vite 开发服务器会把 `/api` 代理到 `http://localhost:3000`。生产构建后，NestJS 会从 `backend/public/` 提供 Vue 页面。

## 生产部署（PM2）

服务器需要 Node.js LTS、npm 和 PM2。首次部署：

```bash
git clone <repository> /opt/rslabroom
cd /opt/rslabroom
npm run deploy
pm2 startup
# 执行 pm2 startup 输出的 sudo 命令
pm2 save
```

后续发布只需：

```bash
cd /opt/rslabroom
git pull --ff-only
npm run deploy
```

默认地址为 `http://服务器:3000/`，API 位于同源的 `/api`。常用命令：

```bash
pm2 status
pm2 logs rslabroom
pm2 restart rslabroom
```

建议一次性安装日志轮转：

```bash
pm2 install pm2-logrotate
```

## 可选环境变量

数据库和端口均有代码内置默认值，无需额外配置文件即可运行。如需在不同环境覆盖，通过操作系统环境变量设置 `DB_HOST`、`DB_USER`、`DB_PASSWORD`、`DB_NAME`、`PORT` 或 `JWT_SECRET` 即可。

未提供 `JWT_SECRET` 时，服务每次启动会自动生成临时密钥，因此重启后已有登录 token 会失效；单机部署不受影响。

新后台使用独立的 `admin_user` 表，默认账号为 `admin`，默认密码为 `admin`；历史 `user` 表不会被新后台读取或修改。密码字段目前沿用 MD5 格式以兼容现有管理接口，正式上线后建议尽快更换为强哈希并修改默认密码。

可使用以下命令生成 JWT 密钥：

```bash
openssl rand -hex 32
```

## 数据库事务

历史数据库的关键表是 MyISAM，不支持真正的事务回滚。代码已经使用事务并对审批、排期操作加数据库级串行锁；正式上线前，应备份数据库并在测试库验证后执行：

```text
db/001_innodb_transactions.sql
```

迁移到 InnoDB 后，多表申请、审批和设置修改才能获得原子提交与回滚。

## 健康检查

`GET /api/health`：应用及数据库正常时返回 HTTP 200；数据库不可用时返回 HTTP 503。
