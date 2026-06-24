// MySQL 连接池与查询辅助函数。
//
// 数据库不可用时不让进程崩溃：查询会抛出错误，由路由层捕获后返回 503，
// 前端据此回退到占位数据。

import mysql from 'mysql2/promise'
import { dbConfig } from './config.js'

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // 历史表中日期以本地时区字符串存储，关闭自动时区换算避免偏移。
  timezone: 'Z',
  dateStrings: true,
})

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params)
  return rows
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params)
  return rows[0]
}

export async function ping() {
  const conn = await pool.getConnection()
  try {
    await conn.ping()
    return true
  } finally {
    conn.release()
  }
}

export default pool
