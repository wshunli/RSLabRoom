# RSLabRoom 部署手册

> 本文档面向运维工程师。开发完成构建后，将产物交付给你，你负责在服务器上完成部署。
>
> **产物已包含所有运行时依赖（`node_modules`）和编译代码，你无需执行 `npm install`，解压即可运行。**

---

## 1. 交付产物说明

开发构建完成后，交付的产物目录结构如下：

```text
rslabroom-dist/
├── backend/
│   ├── node_modules/    ← 运行时依赖（已安装，无需 npm install）
│   ├── dist/            ← NestJS 编译产物（后端运行入口）
│   └── public/          ← Vue 前端静态文件（浏览器直接访问）
└── ecosystem.config.cjs ← PM2 进程管理配置（含环境变量）
```

- **`backend/node_modules/`** — 所有运行时依赖已在构建机上装好，你不再需要执行任何 `npm install`。
- **`backend/dist/`** — 后端已编译为 JavaScript，无需再次构建。
- **`backend/public/`** — 前端已构建，包含 `index.html` 等静态资源。
- **`ecosystem.config.cjs`** — 已经配置好 PM2 参数和环境变量，部署前按需修改其中的生产配置。

---

## 2. 服务器环境要求

| 组件 | 版本要求 | 说明 |
|------|---------|------|
| 操作系统 | Linux（CentOS 7+ / Ubuntu 20.04+） | — |
| Node.js | **>= 18 LTS**（推荐 20 LTS） | 仅需运行时，无需 npm |
| PM2 | `npm install -g pm2` | 进程守护、日志、自启 |
| MySQL | 5.7+ / 8.0 | 已有历史数据库，仅需网络可达 |
| 可用端口 | `3000`（可配置） | 需开放防火墙 |

---

## 3. 首次部署

### 3.1 安装 Node.js

```bash
# 方式一：使用 nvm（推荐，便于版本切换）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
node -v   # 确认版本 >= 18

# 方式二：使用系统包管理器（CentOS 示例）
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
```

### 3.2 安装 PM2

```bash
npm install -g pm2
pm2 -v   # 确认安装成功
```

### 3.3 解压产物到部署目录

```bash
# 假设产物压缩包为 rslabroom-dist.tar.gz
sudo mkdir -p /opt/rslabroom
sudo chown $(whoami):$(whoami) /opt/rslabroom
tar -xzf rslabroom-dist.tar.gz -C /opt/rslabroom
cd /opt/rslabroom
```

### 3.4 配置 PM2 环境变量

环境变量直接配置在 `ecosystem.config.cjs` 的 `env_production` 中，PM2 启动时会注入到进程。部署前编辑该文件，根据生产环境填写实际值：

```javascript
env_production: {
  NODE_ENV: 'production',
  PORT: 3000,

  // 数据库连接（指向已有 MySQL 实例）
  DB_HOST: '10.101.242.104',
  DB_PORT: 3306,
  DB_USER: 'halladmin',
  DB_PASSWORD: 'LES8sZsdqNmRNHxe',
  DB_NAME: 'hall',
  DB_POOL_SIZE: 10,

  // JWT 密钥 —— 必须修改为高强度随机字符串！
  // 生成方式：openssl rand -hex 32
  JWT_SECRET: '你的随机密钥',
  JWT_EXPIRES_IN: '8h',
},
```

> ⚠️ **JWT_SECRET 必须修改**：不要使用默认值。运行时请执行 `openssl rand -hex 32` 生成一个 64 字符的随机字符串，填入 `ecosystem.config.cjs` 的 `JWT_SECRET`。

### 3.5 启动服务

```bash
cd /opt/rslabroom
pm2 start ecosystem.config.cjs --env production
```

验证服务状态：

```bash
pm2 status
# 应显示 rslabroom 状态为 online
```

### 3.6 配置 PM2 开机自启

```bash
pm2 startup
# 执行屏幕上输出的 sudo 命令（类似 sudo env PATH=... pm2 startup ...）
pm2 save
```

> 执行 `pm2 save` 后，当前运行的进程列表会被持久化，服务器重启后 PM2 会自动恢复。

### 3.7 验证部署

```bash
# 健康检查（应返回 200）
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health

# 前端页面（应返回 200，包含 HTML）
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
```

浏览器访问 `http://服务器IP:3000/`，应该能看到机房预约系统首页。

---

## 4. 后续更新部署

当开发交付新的构建产物时（产物已包含 `node_modules`，无需再安装依赖）：

```bash
# 1. 停止服务
pm2 stop rslabroom

# 2. 备份当前版本（可选但推荐）
cp -r /opt/rslabroom/backend /opt/rslabroom/backend.bak.$(date +%Y%m%d_%H%M%S)

# 3. 解压新产物覆盖
tar -xzf rslabroom-dist.tar.gz -C /opt/rslabroom

# 4. 检查 ecosystem.config.cjs 配置是否被覆盖，如被覆盖则从备份恢复
# cp /opt/rslabroom/backend.bak.XXXX/../ecosystem.config.cjs /opt/rslabroom/

# 5. 启动服务
cd /opt/rslabroom
pm2 start ecosystem.config.cjs --env production
```

---

## 5. PM2 常用管理命令

```bash
# 查看进程状态
pm2 status

# 查看实时日志（最近 200 行）
pm2 logs rslabroom --lines 200

# 实时日志流（Ctrl+C 退出）
pm2 logs rslabroom

# 重启
pm2 restart rslabroom

# 停止
pm2 stop rslabroom

# 从 PM2 列表中移除（停止且不再管理）
pm2 delete rslabroom

# 查看资源占用
pm2 monit

# 清空日志
pm2 flush
```

### 日志管理

建议安装日志轮转插件，防止磁盘写满：

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

- `max_size 10M` — 单个日志文件超过 10MB 时轮转
- `retain 30` — 保留最近 30 个轮转文件
- `compress true` — 压缩旧日志以节省空间

---

## 6. 防火墙配置

确保 `3000` 端口（或你配置的端口）开放：

```bash
# CentOS / RHEL（firewalld）
sudo firewall-cmd --add-port=3000/tcp --permanent
sudo firewall-cmd --reload

# Ubuntu（ufw）
sudo ufw allow 3000/tcp
```

如需使用 Nginx 反向代理（推荐生产环境），参考附录第 9 节。

---

## 7. 配置项完整参考

所有环境变量均在 `ecosystem.config.cjs` 的 `env_production` 中配置，PM2 启动时注入进程：

| 变量 | 默认值 | 说明 |
|------|-------|------|
| `NODE_ENV` | — | 设为 `production` |
| `PORT` | `3000` | 应用监听端口 |
| `DB_HOST` | `10.101.242.104` | MySQL 地址 |
| `DB_PORT` | `3306` | MySQL 端口 |
| `DB_USER` | `halladmin` | 数据库用户名 |
| `DB_PASSWORD` | — | 数据库密码 |
| `DB_NAME` | `hall` | 数据库名 |
| `DB_POOL_SIZE` | `10` | 连接池大小 |
| `JWT_SECRET` | — | JWT 签名密钥（生产必须设置） |
| `JWT_EXPIRES_IN` | `8h` | Token 过期时间 |

> 后端本身不加载任何 `.env` 文件，所有配置均通过操作系统环境变量传入。代码中仍保留了硬编码的默认值作为最后回退（参见 `backend/src/defaults.ts`），但生产环境应通过 PM2 显式设置所有必需变量。

---

## 8. 故障排查

### 8.1 启动失败

```bash
# 查看完整错误日志
pm2 logs rslabroom --err --lines 50

# 常见原因：
# - ecosystem.config.cjs 中环境变量配置错误 → 检查各项配置
# - 数据库连接失败 → 检查 DB_HOST / DB_PORT / 网络连通性
# - 端口被占用 → 更换 PORT 或 kill 占用进程
```

### 8.2 数据库不可达

```bash
# 从服务器测试数据库连接
mysql -h 10.101.242.104 -P 3306 -u halladmin -p hall -e "SELECT 1"

# 如果连接失败，检查：
# 1. 数据库服务器防火墙是否放行 3306 端口
# 2. 数据库用户是否有远程登录权限
# 3. 网络是否可达（ping 目标服务器）
```

### 8.3 前端页面 404

确认 `backend/public/` 目录存在且包含 `index.html`：

```bash
ls -la /opt/rslabroom/backend/public/
# 应列出 index.html 及 assets/ 目录
```

### 8.4 端口被占用

```bash
# 查看 3000 端口是否被占用
lsof -i :3000
# 或
ss -tlnp | grep 3000

# 如果被占用，修改 ecosystem.config.cjs 中的 PORT 变量
```

### 8.5 PM2 进程反复重启

```bash
# 查看崩溃前日志
pm2 logs rslabroom --err --lines 100

# 常见原因：
# - 内存不足（当前设置 max_memory_restart: 512M）
# - 数据库连接池耗尽
# - 未捕获异常
```

### 8.6 数据库表引擎问题

历史数据库使用 MyISAM 引擎。代码已使用事务和数据库级锁，但 MyISAM 不支持真正的事务回滚。正式上线前应执行迁移脚本（需先备份并在测试库验证）：

```bash
mysql -h <host> -u <user> -p <database> < db/001_init.sql
```

---

## 9. 附录：Nginx 反向代理（可选）

如果需要通过 80/443 端口访问，或配置 HTTPS，可在 Nginx 中配置反向代理：

```nginx
server {
    listen 80;
    server_name rslabroom.example.com;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

配置 HTTPS 可使用 Let's Encrypt 免费证书：

```bash
sudo apt install certbot python3-certbot-nginx   # Ubuntu
sudo certbot --nginx -d rslabroom.example.com
```

---

## 10. 附录：开发侧构建命令

> 本章节仅供开发人员参考，运维无需关注。

```bash
# 在项目根目录执行完整构建
npm run build

# 安装运行时依赖（仅在构建机上执行一次）
npm ci --omit=dev --prefix backend

# 打包：依赖 + 编译产物 + PM2 配置全部打进压缩包
tar -czf rslabroom-dist.tar.gz \
  backend/node_modules \
  backend/dist \
  backend/public \
  ecosystem.config.cjs
```

产物压缩包 `rslabroom-dist.tar.gz` 即为交付件，交给运维按本手册第 3 节部署即可。
