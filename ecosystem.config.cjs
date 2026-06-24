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
    },
  }],
}
