import { randomUUID } from 'node:crypto'
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { ResultSetHeader, RowDataPacket } from 'mysql2'
import { DatabaseService } from '../database/database.service'
import { rowToRoom } from '../shared/rooms'
import { dayIndexOf, formatDate, parseDate, PERIOD_NAMES, periodToTag, slotDate } from '../shared/time'
import { ApplicationQueryDto, CreateScheduleDto, UpdateSettingsDto } from './admin.dto'

const STATE_BY_CODE: Record<number, string> = { 0: 'pending', 1: 'approved' }
const SCHEDULING_LOCK = 'rslabroom:scheduling'

@Injectable()
export class AdminService {
  constructor(private readonly database: DatabaseService) {}

  private async loadConsole(): Promise<Record<string, string>> {
    const rows = await this.database.query<RowDataPacket[]>('SELECT name, value FROM console')
    return Object.fromEntries(rows.map((row) => [row.name, row.value]))
  }

  private async buildDetails(id: string): Promise<string[]> {
    const rows = await this.database.query<RowDataPacket[]>(
      `SELECT b.btime, b.tag, b.bclassid, c.cname
         FROM borrow b LEFT JOIN class c ON b.bclassid = c.cid
        WHERE b.btimeid = ? ORDER BY b.btime, b.tag`,
      [id],
    )
    return rows.map((row) => {
      const room = rowToRoom({ cid: row.bclassid, cname: row.cname || '', cintro: '' })
      return `${room.name || `机房${row.bclassid}`} · ${String(row.btime).slice(0, 10)} · ${PERIOD_NAMES[Number(row.tag) - 1] || ''}`
    })
  }

  async getApplications(query: ApplicationQueryDto) {
    const where = query.status === 'pending' ? ' WHERE sstatus = 0'
      : query.status === 'approved' ? ' WHERE sstatus = 1' : ''
    const count = await this.database.queryOne<RowDataPacket>(`SELECT COUNT(*) AS total FROM submit${where}`)
    const total = Number(count?.total || 0)
    const offset = (query.page - 1) * query.pageSize
    const rows = await this.database.query<RowDataPacket[]>(
      `SELECT sid, stimeid, sperson, sphone, ssoftware, snumer, sname, smore, sstatus
         FROM submit${where} ORDER BY sid DESC LIMIT ${query.pageSize} OFFSET ${offset}`,
    )
    const items = await Promise.all(rows.map(async (row) => {
      const detailList = await this.buildDetails(String(row.stimeid))
      return {
        id: row.stimeid,
        sid: row.sid,
        applicant: row.sperson,
        phone: row.sphone,
        requiredSoftware: row.ssoftware,
        people: Number(row.snumer) || 0,
        details: detailList.join('；'),
        detailList,
        courseName: row.sname,
        remarks: row.smore,
        state: STATE_BY_CODE[Number(row.sstatus)] || 'pending',
      }
    }))
    const pending = await this.database.queryOne<RowDataPacket>('SELECT COUNT(*) AS total FROM submit WHERE sstatus = 0')
    return { items, total, page: query.page, pageSize: query.pageSize, pendingTotal: Number(pending?.total || 0) }
  }

  async approve(id: string) {
    await this.database.serializedTransaction(SCHEDULING_LOCK, async (connection) => {
      const [slots] = await connection.execute<RowDataPacket[]>(
        'SELECT btime, bclassid, tag FROM borrow WHERE btimeid = ?', [id],
      )
      if (!slots.length) throw new NotFoundException({ error: '申请不存在' })
      for (const slot of slots) {
        const [conflicts] = await connection.execute<RowDataPacket[]>(
          `SELECT b.bname, b.bperson, b.btime, c.cname
             FROM borrow b LEFT JOIN class c ON b.bclassid = c.cid
            WHERE b.status = 1 AND b.btimeid <> ? AND b.btime = ? AND b.bclassid = ? AND b.tag = ? LIMIT 1`,
          [id, String(slot.btime).slice(0, 10), slot.bclassid, slot.tag],
        )
        if (conflicts[0]) {
          const conflict = conflicts[0]
          throw new ConflictException({
            error: '操作失败，该时间段已存在已通过课程',
            conflict: {
              courseName: conflict.bname,
              teacher: conflict.bperson,
              date: String(conflict.btime).slice(0, 10),
              room: conflict.cname,
            },
          })
        }
      }
      await connection.execute('UPDATE borrow SET status = 1 WHERE btimeid = ?', [id])
      await connection.execute('UPDATE submit SET sstatus = 1 WHERE stimeid = ?', [id])
    })
    return { id, state: 'approved' }
  }

  async reject(id: string) {
    await this.database.transaction(async (connection) => {
      await connection.execute('UPDATE borrow SET status = 0 WHERE btimeid = ?', [id])
      await connection.execute('UPDATE submit SET sstatus = 0 WHERE stimeid = ?', [id])
    })
    return { id, state: 'pending' }
  }

  async deleteApplication(id: string) {
    await this.database.serializedTransaction(SCHEDULING_LOCK, async (connection) => {
      await connection.execute('DELETE FROM borrow WHERE btimeid = ?', [id])
      await connection.execute('DELETE FROM submit WHERE stimeid = ?', [id])
    })
    return { id, deleted: true }
  }

  async getSettings() {
    const config = await this.loadConsole()
    const start = parseDate(config.begtime || formatDate(new Date()))
    return {
      startYear: start.getFullYear(),
      startMonth: start.getMonth() + 1,
      startDay: start.getDate(),
      semesterWeeks: Number(config.week || 0),
      contactName: config.lianxiren || '',
      contactPhone: config.lianxidianhua || '',
    }
  }

  async updateSettings(body: UpdateSettingsDto) {
    const date = new Date(body.startYear, body.startMonth - 1, body.startDay)
    if (date.getFullYear() !== body.startYear || date.getMonth() !== body.startMonth - 1 || date.getDate() !== body.startDay) {
      throw new BadRequestException({ error: '开学日期无效' })
    }
    const values: Array<[string, string]> = [
      ['begtime', `${body.startYear}-${body.startMonth}-${body.startDay}`],
      ['week', String(body.semesterWeeks)],
      ['lianxiren', body.contactName],
      ['lianxidianhua', body.contactPhone],
    ]
    await this.database.transaction(async (connection) => {
      for (const [name, value] of values) {
        const [existing] = await connection.execute<RowDataPacket[]>('SELECT name FROM console WHERE name = ?', [name])
        if (existing.length) await connection.execute('UPDATE console SET value = ? WHERE name = ?', [value, name])
        else await connection.execute('INSERT INTO console (name, value) VALUES (?, ?)', [name, value])
      }
    })
    return { ok: true }
  }

  async getUsers() {
    const rows = await this.database.query<RowDataPacket[]>('SELECT username FROM user ORDER BY username')
    return rows.map((row, index) => ({ id: index + 1, username: row.username }))
  }

  async getSchedules() {
    const config = await this.loadConsole()
    const semesterStart = config.begtime || formatDate(new Date())
    const rows = await this.database.query<RowDataPacket[]>(
      `SELECT btimeid, MIN(bname) AS bname, bclassid, tag, COUNT(*) AS weeks, MIN(btime) AS firstDate
         FROM borrow WHERE btimeid LIKE 'SCH%'
        GROUP BY btimeid, bclassid, tag ORDER BY MIN(btime)`,
    )
    return rows.map((row) => ({
      id: row.btimeid,
      courseName: row.bname,
      roomId: row.bclassid,
      weekday: ((dayIndexOf(semesterStart, 1, row.firstDate) % 7) + 7) % 7,
      period: Number(row.tag) - 1,
      weeks: Number(row.weeks),
    }))
  }

  async createSchedule(body: CreateScheduleDto) {
    if (body.startWeek > body.endWeek) throw new BadRequestException({ error: '结束周不能早于开始周' })
    const config = await this.loadConsole()
    const semesterStart = config.begtime || formatDate(new Date())
    const id = `SCH${Date.now()}${randomUUID().replaceAll('-', '').slice(0, 8)}`
    let created = 0
    let skipped = 0
    await this.database.serializedTransaction(SCHEDULING_LOCK, async (connection) => {
      for (let week = body.startWeek; week <= body.endWeek; week++) {
        if (body.recurrence === 'odd' && week % 2 === 0) continue
        if (body.recurrence === 'even' && week % 2 === 1) continue
        const date = slotDate(semesterStart, week, body.weekday)
        const tag = periodToTag(body.period)
        const [conflicts] = await connection.execute<RowDataPacket[]>(
          'SELECT bid FROM borrow WHERE status = 1 AND btime = ? AND bclassid = ? AND tag = ? LIMIT 1',
          [date, body.roomId, tag],
        )
        if (conflicts.length) { skipped++; continue }
        await connection.execute(
          `INSERT INTO borrow
            (btimeid, bperson, bname, btime, tag, bclassid, status, bphone, bsoftware, bnumer, bmore)
           VALUES (?, '排期', ?, ?, ?, ?, 1, '', '', '', '')`,
          [id, body.courseName, date, tag, body.roomId],
        )
        created++
      }
    })
    return {
      id, courseName: body.courseName, roomId: body.roomId, weekday: body.weekday,
      period: body.period, weeks: created, skipped,
    }
  }

  async deleteSchedule(id: string) {
    if (!id.startsWith('SCH')) throw new BadRequestException({ error: '非法的排期编号' })
    const result = await this.database.query<ResultSetHeader>('DELETE FROM borrow WHERE btimeid = ?', [id])
    return { id, deleted: result.affectedRows }
  }
}
