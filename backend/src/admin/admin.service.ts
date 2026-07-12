import { createHash, randomUUID } from 'node:crypto'
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { ResultSetHeader, RowDataPacket } from 'mysql2'
import { DatabaseService } from '../database/database.service'
import { MailService } from '../mail/mail.service'
import { JwtService } from '@nestjs/jwt'
import { UnauthorizedException } from '@nestjs/common'
import { rowToRoom } from '../shared/rooms'
import { formatDate, parseDate, PERIOD_HOURS, PERIOD_NAMES, periodToTag, slotDate } from '../shared/time'
import { currentSemester, Semester, semesterLabel, semesterTotalWeeks, sortSemesters } from '../shared/semesters'
import { SemesterStore } from '../shared/semester-store.service'
import { ApplicationQueryDto, CreateScheduleDto, CreateUserDto, RoomDto, UpdateSemestersDto, UpdateSettingsDto, UpdateUserDto } from './admin.dto'

const STATE_BY_CODE: Record<number, string> = { 0: 'pending', 1: 'approved', 2: 'rejected' }
const SCHEDULING_LOCK = 'rslabroom:scheduling'

function userResponse(row: RowDataPacket) {
  return {
    id: String(row.username),
    username: String(row.username),
    name: '',
    email: '',
    phone: '',
    role: '管理员',
  }
}

@Injectable()
export class AdminService {
  constructor(private readonly database: DatabaseService, private readonly mail: MailService, private readonly jwt: JwtService, private readonly semesterStore: SemesterStore) {}

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
    const conditions: string[] = []
    const params: unknown[] = []
    const trimmedDate = query.date?.trim()
    const courseName = query.courseName?.trim()
    const teacher = query.teacher?.trim()

    if (query.status === 'pending') conditions.push('s.sstatus = 0')
    else if (query.status === 'approved') conditions.push('s.sstatus = 1')
    else if (query.status === 'rejected') conditions.push('s.sstatus = 2')
    if (courseName) {
      conditions.push('s.sname LIKE ?')
      params.push(`%${courseName}%`)
    }
    if (trimmedDate) {
      conditions.push('EXISTS (SELECT 1 FROM borrow b WHERE b.btimeid = s.stimeid AND b.btime = ?)')
      params.push(trimmedDate)
    }
    if (teacher) {
      conditions.push('EXISTS (SELECT 1 FROM borrow b WHERE b.btimeid = s.stimeid AND b.bperson LIKE ?)')
      params.push(`%${teacher}%`)
    }

    const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''
    const count = await this.database.queryOne<RowDataPacket>(`SELECT COUNT(*) AS total FROM submit s${where}`, params)
    const total = Number(count?.total || 0)
    const offset = (query.page - 1) * query.pageSize
    const rows = await this.database.query<RowDataPacket[]>(
      `SELECT sid, stimeid, sperson, sphone, ssoftware, snumer, sname, smore, sstatus
         FROM submit s${where} ORDER BY sid DESC LIMIT ${query.pageSize} OFFSET ${offset}`,
      params,
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

  // 概览统计：本周 / 本月 / 今日 的排课次数与课时，以及亮点数据和今日占用明细。
  async getStats() {
    const now = new Date()
    const today = formatDate(now)
    // 本周一 ~ 本周日（周一为一周起点）。
    const mondayOffset = (now.getDay() + 6) % 7
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - mondayOffset)
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6)
    // 本月一日 ~ 本月最后一日。
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const hoursSql = `CASE tag ${PERIOD_HOURS.map((h, i) => `WHEN ${i + 1} THEN ${h}`).join(' ')} ELSE 0 END`
    const rangeStat = async (start: string, end: string) => {
      const row = await this.database.queryOne<RowDataPacket>(
        `SELECT COUNT(*) AS cnt, COALESCE(SUM(${hoursSql}), 0) AS hours,
                COUNT(DISTINCT bclassid) AS rooms, COUNT(DISTINCT btime) AS days
           FROM borrow WHERE status = 1 AND btime BETWEEN ? AND ?`,
        [start, end],
      )
      return {
        count: Number(row?.cnt || 0),
        hours: Number(row?.hours || 0),
        rooms: Number(row?.rooms || 0),
        days: Number(row?.days || 0),
      }
    }

    const monthRange: [string, string] = [formatDate(monthStart), formatDate(monthEnd)]
    const [todayStat, weekStat, monthStat] = await Promise.all([
      rangeStat(today, today),
      rangeStat(formatDate(weekStart), formatDate(weekEnd)),
      rangeStat(...monthRange),
    ])

    // 本月最常用机房。
    const top = await this.database.queryOne<RowDataPacket>(
      `SELECT b.bclassid AS cid, c.cname, COUNT(*) AS cnt
         FROM borrow b LEFT JOIN class c ON b.bclassid = c.cid
        WHERE b.status = 1 AND b.btime BETWEEN ? AND ?
        GROUP BY b.bclassid, c.cname ORDER BY cnt DESC LIMIT 1`,
      monthRange,
    )
    const topRoom = top
      ? { name: rowToRoom({ cid: Number(top.cid), cname: String(top.cname || ''), cintro: '' }).name || `机房${top.cid}`, count: Number(top.cnt) }
      : null

    // 本月最忙时段。
    const busiest = await this.database.queryOne<RowDataPacket>(
      `SELECT tag, COUNT(*) AS cnt FROM borrow
        WHERE status = 1 AND btime BETWEEN ? AND ?
        GROUP BY tag ORDER BY cnt DESC LIMIT 1`,
      monthRange,
    )
    const busiestPeriod = busiest ? (PERIOD_NAMES[Number(busiest.tag) - 1] || '') : ''

    // 今日各机房各时段占用明细。
    const todayRows = await this.database.query<RowDataPacket[]>(
      `SELECT bclassid, tag, bname, bperson, bnumer, bsoftware
         FROM borrow WHERE status = 1 AND btime = ?`,
      [today],
    )
    const todayList = todayRows.map((row) => ({
      roomId: Number(row.bclassid),
      period: Number(row.tag) - 1,
      courseName: String(row.bname || ''),
      teacher: String(row.bperson || ''),
      people: Number(row.bnumer) || 0,
      software: String(row.bsoftware || ''),
    }))

    const submitCount = await this.database.queryOne<RowDataPacket>('SELECT COUNT(*) AS total FROM submit')
    const pendingCount = await this.database.queryOne<RowDataPacket>('SELECT COUNT(*) AS total FROM submit WHERE sstatus = 0')
    const userCount = await this.database.queryOne<RowDataPacket>('SELECT COUNT(*) AS total FROM user')

    return {
      today: todayStat,
      week: weekStat,
      month: monthStat,
      topRoom,
      busiestPeriod,
      monthLabel: `${now.getFullYear()}年${now.getMonth() + 1}月`,
      weekRange: { start: formatDate(weekStart), end: formatDate(weekEnd) },
      todayList,
      applications: { total: Number(submitCount?.total || 0), pending: Number(pendingCount?.total || 0) },
      users: Number(userCount?.total || 0),
    }
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
      await connection.execute('UPDATE submit SET sstatus = 2 WHERE stimeid = ?', [id])
    })
    return { id, state: 'rejected' }
  }

  async deleteApplication(id: string) {
    await this.database.serializedTransaction(SCHEDULING_LOCK, async (connection) => {
      await connection.execute('DELETE FROM borrow WHERE btimeid = ?', [id])
      await connection.execute('DELETE FROM submit WHERE stimeid = ?', [id])
    })
    return { id, deleted: true }
  }

  async getSemesters() {
    const semesters = await this.semesterStore.list()
    const active = currentSemester(semesters)
    // 学年直接读取已保存配置；首次配置时仅提供当前年份作为表单初始值。
    const startYear = sortSemesters(semesters)[0]?.startYear ?? new Date().getFullYear()
    return { startYear, semesters, currentSemesterLabel: active ? semesterLabel(active) : '' }
  }

  async updateSemesters(body: UpdateSemestersDto) {
    const rangeStart = `${body.startYear}-08-01`
    const rangeEnd = `${body.startYear + 1}-07-31`
    const seen = new Set<number>()
    const semesters: Semester[] = body.semesters.map((item) => {
      const date = parseDate(item.startDate)
      if (formatDate(date) !== item.startDate) {
        throw new BadRequestException({ error: `第${item.term}学期的开学日期无效` })
      }
      if (item.startDate < rangeStart || item.startDate > rangeEnd) {
        throw new BadRequestException({
          error: `第${item.term}学期的开学日期不在 ${body.startYear}-${body.startYear + 1} 学年内（${body.startYear} 年 8 月 — ${body.startYear + 1} 年 7 月）`,
        })
      }
      if (seen.has(item.term)) throw new BadRequestException({ error: `第${item.term}学期配置重复` })
      seen.add(item.term)
      return {
        startYear: body.startYear,
        term: item.term,
        startDate: item.startDate,
        weeks: item.weeks,
        extraWeeks: item.extraWeeks ?? 0,
      }
    })
    const sorted = sortSemesters(semesters)
    await this.semesterStore.replace(body.startYear, sorted)
    // begtime/week 保留为「当前学期」的快照，兼容仍直接读取这两个键的旧版预约大厅页面。
    const active = currentSemester(sorted) || sorted[0]
    await this.saveConsole([
      ['begtime', active.startDate],
      ['week', String(semesterTotalWeeks(active))],
    ])
    return this.getSemesters()
  }

  async getSettings() {
    const config = await this.loadConsole()
    return {
      contactName: config.lianxiren || '',
      contactPhone: config.lianxidianhua || '',
      smtpEnabled: config.smtp_enabled === 'true',
      smtpHost: config.smtp_host || '',
      smtpPort: Number(config.smtp_port || 465),
      smtpSecure: config.smtp_secure !== 'false',
      smtpUser: config.smtp_user || '',
      smtpPassword: '',
      smtpPasswordSet: Boolean(config.smtp_password),
      smtpFrom: config.smtp_from || '',
      adminEmail: config.admin_email || '',
      siteUrl: config.site_url || '',
    }
  }

  private async saveConsole(values: Array<[string, string]>) {
    await this.database.transaction(async (connection) => {
      for (const [name, value] of values) {
        const [existing] = await connection.execute<RowDataPacket[]>('SELECT name FROM console WHERE name = ?', [name])
        if (existing.length) await connection.execute('UPDATE console SET value = ? WHERE name = ?', [value, name])
        else await connection.execute('INSERT INTO console (name, value) VALUES (?, ?)', [name, value])
      }
    })
  }

  async updateSettings(body: UpdateSettingsDto) {
    const values: Array<[string, string]> = [
      ['lianxiren', body.contactName],
      ['lianxidianhua', body.contactPhone],
      ['smtp_enabled', String(body.smtpEnabled)],
      ['smtp_host', body.smtpHost.trim()],
      ['smtp_port', String(body.smtpPort)],
      ['smtp_secure', String(body.smtpSecure)],
      ['smtp_user', body.smtpUser.trim()],
      ['smtp_from', body.smtpFrom.trim()],
      ['admin_email', body.adminEmail.trim()],
      ['site_url', body.siteUrl.trim().replace(/\/$/, '')],
    ]
    if (body.smtpPassword) values.push(['smtp_password', body.smtpPassword])
    await this.saveConsole(values)
    return { ok: true }
  }

  async testEmail() {
    try {
      return await this.mail.sendTestEmail()
    } catch (error) {
      throw new BadRequestException({ error: error instanceof Error ? error.message : '测试邮件发送失败' })
    }
  }

  async getMailApproval(token: string) {
    const id = await this.mailApprovalId(token)
    const row = await this.database.queryOne<RowDataPacket>(
      'SELECT stimeid, sperson, sphone, snumer, sname, smore, sstatus FROM submit WHERE stimeid = ?', [id],
    )
    if (!row) throw new NotFoundException({ error: '申请不存在' })
    return { id, applicant: row.sperson, phone: row.sphone, people: Number(row.snumer) || 0,
      courseName: row.sname, remarks: row.smore, state: STATE_BY_CODE[Number(row.sstatus)] || 'pending',
      detailList: await this.buildDetails(id) }
  }

  async approveByMail(token: string) {
    const id = await this.mailApprovalId(token)
    return this.approve(id)
  }

  private async mailApprovalId(token: string) {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; purpose: string }>(token)
      if (payload.purpose !== 'mail-approval' || !payload.sub) throw new Error('invalid scope')
      return payload.sub
    } catch { throw new UnauthorizedException({ error: '审批链接无效或已过期' }) }
  }

  async getUsers() {
    const rows = await this.database.query<RowDataPacket[]>('SELECT username FROM user ORDER BY username')
    return rows.map(userResponse)
  }

  async createUser(body: CreateUserDto) {
    const existing = await this.database.queryOne<RowDataPacket>('SELECT username FROM user WHERE username = ?', [body.username])
    if (existing) throw new ConflictException({ error: '账号已存在' })
    await this.database.query('INSERT INTO user (username, upwd) VALUES (?, ?)', [
      body.username,
      createHash('md5').update(body.password).digest('hex'),
    ])
    return userResponse(body as unknown as RowDataPacket)
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
        body.username,
        createHash('md5').update(body.password).digest('hex'),
        currentUsername,
      ])
    } else {
      await this.database.query('UPDATE user SET username = ? WHERE username = ?', [body.username, currentUsername])
    }
    return userResponse(body as unknown as RowDataPacket)
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
    const cname = `${location}${suffix}`.slice(0, 200)
    const cintro = [body.intro, `机位：${body.seats}`, `管理员：${body.administrator}`, `联系电话：${body.phone}`]
      .filter(Boolean)
      .join('\n')
      .slice(0, 200)
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
    const active = currentSemester(await this.semesterStore.list())
    const semesterStart = active?.startDate || formatDate(new Date())
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
