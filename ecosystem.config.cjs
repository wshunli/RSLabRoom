const path = require('node:path')

module.exports = {
  apps: [{
    name: 'rslabroom',
    cwd: path.join(__dirname, 'backend'),
    script: 'dist/main.js',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    autorestart: true,
    restart_delay: 3000,
    max_memory_restart: '512M',
    kill_timeout: 10000,
    time: true,
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,

      // 数据库连接
      DB_HOST: '10.101.242.104',
      DB_PORT: 3306,
      DB_USER: 'halladmin',
      DB_PASSWORD: 'LES8sZsdqNmRNHxe',
      DB_NAME: 'hall',
      DB_POOL_SIZE: 10,

      // JWT 认证 —— 生产环境必须修改为高强度随机字符串
      // 生成方式：openssl rand -hex 32
      JWT_SECRET: 'ba4723f3e87234703420e37aa11be2024383bbe94de68d6c1ac5f6ac8e18b35a',
      JWT_EXPIRES_IN: '8h',
    },
  }],
}
