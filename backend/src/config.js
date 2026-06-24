// 数据库连接配置。
//
// 后端独立运行，不依赖 hall/ 目录的任何文件。
// 默认值即为目标数据库的连接信息，可按需用环境变量覆盖（便于本地开发）。

export const dbConfig = {
  host: process.env.DB_HOST || '10.101.242.104',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'halladmin',
  password: process.env.DB_PASSWORD ?? 'LES8sZsdqNmRNHxe',
  database: process.env.DB_NAME || 'hall',
  // 历史数据使用 utf8 / utf8_unicode_ci 存储。
  charset: 'utf8',
}

export const serverConfig = {
  port: Number(process.env.PORT || 3001),
}
