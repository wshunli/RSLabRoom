import { createHash, randomUUID } from 'node:crypto'
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { ResultSetHeader, RowDataPacket } from 'mysql2'
import { DatabaseService } from '../database/database.service'
import { rowToRoom } from '../shared/rooms'
import { formatDate, parseDate, PERIOD_NAMES, periodToTag, slotDate } from '../shared/time'
import { ApplicationQueryDto, CreateScheduleDto, CreateUserDto, RoomDto, UpdateSettingsDto, UpdateUserDto } from './admin.dto'

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
    return rows.map((row) => ({ id: row.username, username: row.username, role: '管理员' }))
  }

  async createUser(body: CreateUserDto) {
    const existing = await this.database.queryOne<RowDataPacket>('SELECT username FROM user WHERE username = ?', [body.username])
    if (existing) throw new ConflictException({ error: '账号已存在' })
    await this.database.query('INSERT INTO user (username, upwd) VALUES (?, ?)', [
      body.username, createHash('md5').update(body.password).digest('hex'),
    ])
    return { id: body.username, username: body.username, role: '管理员' }
  }

  async updateUser(currentUsername: string, body: UpdateUserDto) {
    const existing = await this.database.queryOne<RowDataPacket>('SELECT username FROM user WHERE username = ?', [currentUsername])
    if (!existing) throw new NotFoundException({ error: '账号不存在' })
    if (body.username !== currentUsername) {
      const duplicate = await this.database.queryOne<RowDataPacket>('SELECT username FROM user WHERE username = ?', [body.username])
      if (duplicate) throw new ConflictException({ error: '新账号名已存在' })
    }
    if (body.password) {
      await this.database.query('UPDATE user SET username = ?, upwd = ? WHERE username = ?', [
        body.username, createHash('md5').update(body.password).digest('hex'), currentUsername,
      ])
    } else {
      await this.database.query('UPDATE user SET username = ? WHERE username = ?', [body.username, currentUsername])
    }
    return { id: body.username, username: body.username, role: '管理员' }
  }

  async deleteUser(username: string) {
    const count = await this.database.queryOne<RowDataPacket>('SELECT COUNT(*) AS total FROM user')
    if (Number(count?.total) <= 1) throw new BadRequestException({ error: '至少需要保留一个管理员账号' })
    const result = await this.database.query<ResultSetHeader>('DELETE FROM user WHERE username = ?', [username])
    if (!result.affectedRows) throw new NotFoundException({ error: '账号不存在' })
    return { id: username, deleted: true }
  }

  async getRooms() {
    const rows = await this.database.query<RowDataPacket[]>('SELECT cid, cname, cintro FROM class ORDER BY cid')
    return rows.map((row) => rowToRoom({ cid: Number(row.cid), cname: String(row.cname), cintro: String(row.cintro) }))
  }

  private roomColumns(body: RoomDto) {
    const location = [body.building.trim(), body.name.trim()].filter(Boolean).join('-')
    const suffix = `（${body.seats}座，${body.audience || '实验教学中心'}）`
    const cname = `${location}${suffix}`
    const cintro = [body.intro, `机位：${body.seats}`, `管理员：${body.administrator}`, `联系电话：${body.phone}`].filter(Boolean).join('\n')
    return { cname, cintro }
  }

  async createRoom(body: RoomDto) {
    const { cname, cintro } = this.roomColumns(body)
    const result = await this.database.query<ResultSetHeader>('INSERT INTO class (cintro, cname) VALUES (?, ?)', [cintro, cname])
    return rowToRoom({ cid: result.insertId, cname, cintro })
  }

  async updateRoom(idValue: string, body: RoomDto) {
    const id = Number(idValue)
    if (!Number.isInteger(id) || id < 1) throw new BadRequestException({ error: '非法的机房编号' })
    const { cname, cintro } = this.roomColumns(body)
    const result = await this.database.query<ResultSetHeader>('UPDATE class SET cintro = ?, cname = ? WHERE cid = ?', [cintro, cname, id])
    if (!result.affectedRows) throw new NotFoundException({ error: '机房不存在' })
    return rowToRoom({ cid: id, cname, cintro })
  }

  async deleteRoom(idValue: string) {
    const id = Number(idValue)
    if (!Number.isInteger(id) || id < 1) throw new BadRequestException({ error: '非法的机房编号' })
    const used = await this.database.queryOne<RowDataPacket>('SELECT bid FROM borrow WHERE bclassid = ? LIMIT 1', [id])
    if (used) throw new ConflictException({ error: '该机房已有预约记录，不能删除' })
    const result = await this.database.query<ResultSetHeader>('DELETE FROM class WHERE cid = ?', [id])
    if (!result.affectedRows) throw new NotFoundException({ error: '机房不存在' })
    return { id, deleted: true }
  }

  // 批量排期不再单独记录批次表，而是生成一条普通申请（borrow + submit，待审批），
  // 直接进入「预约审批」流程，与首页预约提交一致。
  async createSchedule(body: CreateScheduleDto) {
    const config = await this.loadConsole()
    const semesterStart = config.begtime || formatDate(new Date())
    const dates = body.mode === 'daily'
      ? this.dailyDates(body, semesterStart)
      : this.weeklyDates(body, semesterStart)
    const id = `${Date.now()}${randomUUID().replaceAll('-', '').slice(0, 8)}`
    const tag = periodToTag(body.period)
    let created = 0
    let skipped = 0
    await this.database.serializedTransaction(SCHEDULING_LOCK, async (connection) => {
      for (const date of dates) {
        const [conflicts] = await connection.execute<RowDataPacket[]>(
          'SELECT bid FROM borrow WHERE status = 1 AND btime = ? AND bclassid = ? AND tag = ? LIMIT 1',
          [date, body.roomId, tag],
        )
        if (conflicts.length) { skipped++; continue }
        await connection.execute(
          `INSERT INTO borrow
            (btimeid, bperson, bname, btime, tag, bclassid, status, bphone, bsoftware, bnumer, bmore)
           VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
          [id, body.applicantName, body.courseName, date, tag, body.roomId,
            body.phone, body.requiredSoftware, String(body.attendees), body.remarks],
        )
        created++
      }
      if (created > 0) {
        await connection.execute(
          `INSERT INTO submit
            (stimeid, sperson, sphone, ssoftware, snumer, sname, smore, sstatus)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
          [id, body.applicantName, body.phone, body.requiredSoftware, String(body.attendees), body.courseName, body.remarks],
        )
      }
    })
    return { id, weeks: created, skipped, state: 'pending' }
  }

  private weeklyDates(body: CreateScheduleDto, semesterStart: string): string[] {
    if (body.startWeek > body.endWeek) throw new BadRequestException({ error: '结束周不能早于开始周' })
    const dates: string[] = []
    for (let week = body.startWeek; week <= body.endWeek; week++) {
      if (body.recurrence === 'odd' && week % 2 === 0) continue
      if (body.recurrence === 'even' && week % 2 === 1) continue
      dates.push(slotDate(semesterStart, week, body.weekday))
    }
    return dates
  }

  // 每天模式：从「开始周·周几」到「结束周·周几」，区间内逐天生成
  private dailyDates(body: CreateScheduleDto, semesterStart: string): string[] {
    const start = parseDate(slotDate(semesterStart, body.startWeek, body.startWeekday))
    const end = parseDate(slotDate(semesterStart, body.endWeek, body.endWeekday))
    if (start.getTime() > end.getTime()) throw new BadRequestException({ error: '结束时间不能早于开始时间' })
    const dates: string[] = []
    for (const cursor = new Date(start); cursor.getTime() <= end.getTime(); cursor.setDate(cursor.getDate() + 1)) {
      dates.push(formatDate(cursor))
    }
    return dates
  }
}
