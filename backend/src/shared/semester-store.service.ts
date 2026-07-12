import { Injectable } from '@nestjs/common'
import { PoolConnection, RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'
import { Semester, sortSemesters } from './semesters'

interface SemesterRow extends RowDataPacket {
  start_year: number | string
  term: number | string
  start_date: string
  weeks: number | string
  extra_weeks: number | string
}

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS semesters (
    start_year SMALLINT NOT NULL,
    term TINYINT UNSIGNED NOT NULL,
    start_date DATE NOT NULL,
    weeks TINYINT UNSIGNED NOT NULL,
    extra_weeks TINYINT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (start_year, term),
    UNIQUE KEY uq_semesters_start_date (start_date)
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
`

@Injectable()
export class SemesterStore {
  private ready?: Promise<void>

  constructor(private readonly database: DatabaseService) {}

  private async ensureReady(): Promise<void> {
    if (!this.ready) {
      this.ready = this.createTable()
    }
    try {
      await this.ready
    } catch (error) {
      this.ready = undefined
      throw error
    }
  }

  private async createTable(): Promise<void> {
    await this.database.queryRaw(CREATE_TABLE_SQL)
  }

  private async insert(semesters: Semester[], connection: PoolConnection): Promise<void> {
    for (const semester of semesters) {
      const sql =
        `INSERT INTO semesters (start_year, term, start_date, weeks, extra_weeks)
         VALUES (?, ?, ?, ?, ?)`
      const params = [semester.startYear, semester.term, semester.startDate, semester.weeks, semester.extraWeeks]
      await connection.execute(sql, params)
    }
  }

  async list(): Promise<Semester[]> {
    await this.ensureReady()
    const rows = await this.database.query<SemesterRow[]>(
      'SELECT start_year, term, DATE_FORMAT(start_date, \'%Y-%m-%d\') AS start_date, weeks, extra_weeks FROM semesters ORDER BY start_date, term',
    )
    return sortSemesters(rows.map((row) => ({
      startYear: Number(row.start_year),
      term: Number(row.term),
      startDate: String(row.start_date),
      weeks: Number(row.weeks),
      extraWeeks: Number(row.extra_weeks),
    })))
  }

  async replace(startYear: number, semesters: Semester[]): Promise<void> {
    await this.ensureReady()
    await this.database.transaction(async (connection) => {
      await connection.execute('DELETE FROM semesters WHERE start_year = ?', [startYear])
      await this.insert(semesters, connection)
    })
  }
}
