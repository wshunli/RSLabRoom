import { Injectable, OnApplicationShutdown } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import mysql, { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { databaseDefaults } from '../defaults'

type QueryResult = RowDataPacket[] | ResultSetHeader

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly pool: Pool

  constructor(config: ConfigService) {
    this.pool = mysql.createPool({
      host: config.get<string>('DB_HOST', databaseDefaults.host),
      port: config.get<number>('DB_PORT', databaseDefaults.port),
      user: config.get<string>('DB_USER', databaseDefaults.user),
      password: config.get<string>('DB_PASSWORD', databaseDefaults.password),
      database: config.get<string>('DB_NAME', databaseDefaults.database),
      charset: 'utf8mb4',
      timezone: 'Z',
      dateStrings: true,
      waitForConnections: true,
      connectionLimit: config.get<number>('DB_POOL_SIZE', databaseDefaults.poolSize),
      queueLimit: 0,
    })
  }

  async query<T extends QueryResult = RowDataPacket[]>(sql: string, params: any[] = []): Promise<T> {
    const [rows] = await this.pool.execute(sql, params)
    return rows as T
  }

  // DDL（例如 CREATE TABLE）使用普通查询，兼容 MySQL 对预处理 DDL 的限制。
  async queryRaw<T extends QueryResult = RowDataPacket[]>(sql: string, params: any[] = []): Promise<T> {
    const [rows] = await this.pool.query(sql, params)
    return rows as T
  }

  async queryOne<T extends RowDataPacket = RowDataPacket>(sql: string, params: any[] = []): Promise<T | undefined> {
    const rows = await this.query<T[]>(sql, params)
    return rows[0]
  }

  async transaction<T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> {
    const connection = await this.pool.getConnection()
    try {
      await connection.beginTransaction()
      const result = await work(connection)
      await connection.commit()
      return result
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  async serializedTransaction<T>(lockName: string, work: (connection: PoolConnection) => Promise<T>): Promise<T> {
    const connection = await this.pool.getConnection()
    let locked = false
    try {
      const [lockRows] = await connection.query<RowDataPacket[]>('SELECT GET_LOCK(?, 10) AS acquired', [lockName])
      locked = Number(lockRows[0]?.acquired) === 1
      if (!locked) throw new Error('系统正忙，请稍后重试')
      await connection.beginTransaction()
      const result = await work(connection)
      await connection.commit()
      return result
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      if (locked) await connection.query('SELECT RELEASE_LOCK(?)', [lockName])
      connection.release()
    }
  }

  async ping(): Promise<boolean> {
    const connection = await this.pool.getConnection()
    try {
      await connection.ping()
      return true
    } finally {
      connection.release()
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end()
  }
}
