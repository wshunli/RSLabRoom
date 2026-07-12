import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { RowDataPacket } from 'mysql2'
import { DatabaseService } from '../database/database.service'
import { MailService } from '../mail/mail.service'
import { rowToRoom } from '../shared/rooms'
import { currentWeek, dayIndexOf, formatDate, periodToTag, slotDate, weekRange } from '../shared/time'
import { currentSemester, isVacationWeek, Semester, semesterLabel, semesterTotalWeeks, semesterWeekLabel, vacationLabel } from '../shared/semesters'
import { SemesterStore } from '../shared/semester-store.service'
import { CreateApplicationDto } from './public.dto'

interface ConsoleRow extends RowDataPacket { name: string; value: string }

@Injectable()
export class PublicService {
  constructor(private readonly database: DatabaseService, private readonly mail: MailService, private readonly semesterStore: SemesterStore) {}

  private async loadConsole(): Promise<Record<string, string>> {
    const rows = await this.database.query<ConsoleRow[]>('SELECT name, value FROM console')
    return Object.fromEntries(rows.map((row) => [row.name, row.value]))
  }

  // 未指定学期时按今天日期自动选取；指定 term 时允许查看第 1/2/3 学期。
  private async activeSemester(term?: number): Promise<{
    config: Record<string, string>
    semesters: Semester[]
    semester: Semester | null
  }> {
    const [config, semesters] = await Promise.all([this.loadConsole(), this.semesterStore.list()])
    const selected = Number.isInteger(term) ? semesters.find((item) => item.term === term) : undefined
    return { config, semesters, semester: selected ?? currentSemester(semesters) }
  }

  private teachingWeek(semester: Semester | null): number {
    if (!semester) return 1
    const week = currentWeek(semester.startDate)
    return Math.min(Math.max(week, 1), semesterTotalWeeks(semester) || Math.max(week, 1))
  }

  async getConfig() {
    const { config, semesters, semester } = await this.activeSemester()
    const semesterStart = semester?.startDate || formatDate(new Date())
    const teachingWeeks = semester?.weeks || 0
    const totalWeeks = semester ? semesterTotalWeeks(semester) : 0
    const week = this.teachingWeek(semester)
    return {
      semesterStart,
      totalWeeks,
      teachingWeeks,
      currentWeek: week,
      weekLabel: semester ? semesterWeekLabel(semester, week) : '',
      isVacation: semester ? isVacationWeek(semester, week) : false,
      vacationLabel: semester ? vacationLabel(semester) : '',
      semesterLabel: semester ? semesterLabel(semester) : '',
      currentTerm: semester?.term ?? null,
      semesters: semesters.filter((item) => [1, 2, 3].includes(item.term)),
      contact: { name: config.lianxiren || '', phone: config.lianxidianhua || '' },
    }
  }

  async getRooms() {
    const rows = await this.database.query<RowDataPacket[]>(
      'SELECT cid, cname, cintro FROM class WHERE cid <> 611 ORDER BY cname, cid',
    )
    return rows.map((row) => rowToRoom(row as { cid: number; cname: string; cintro: string }))
  }

  async getAvailability(requestedWeek?: number, term?: number) {
    const { semesters, semester } = await this.activeSemester(term)
    const semesterStart = semester?.startDate || formatDate(new Date())
    const teachingWeeks = semester?.weeks || 0
    const totalWeeks = semester ? semesterTotalWeeks(semester) : 0
    const week = requestedWeek ?? this.teachingWeek(semester)
    const active = currentSemester(semesters)
    const currentTeachingWeek = active?.term === semester?.term ? this.teachingWeek(semester) : 0
    const range = weekRange(semesterStart, week)
    const rows = await this.database.query<RowDataPacket[]>(
      'SELECT bid, btime, bname, bperson, bphone, tag, bclassid FROM borrow WHERE btime >= ? AND btime <= ? AND status = 1',
      [range.start, range.end],
    )
    const slots = rows.flatMap((row) => {
      const day = dayIndexOf(semesterStart, week, row.btime as string)
      if (day < 0 || day > 6) return []
      const period = Number(row.tag) - 1
      return [{
        key: `${row.bclassid}-${day}-${period}`,
        bid: row.bid,
        roomId: row.bclassid,
        day,
        period,
        courseName: row.bname,
        teacher: row.bperson,
        phone: row.bphone,
        date: String(row.btime).slice(0, 10),
      }]
    })
    return {
      week,
      totalWeeks,
      teachingWeeks,
      currentWeek: currentTeachingWeek,
      term: semester?.term ?? null,
      semesterLabel: semester ? semesterLabel(semester) : '',
      weekLabel: semester ? semesterWeekLabel(semester, week) : `第 ${week} 周`,
      isVacation: semester ? isVacationWeek(semester, week) : false,
      vacationLabel: semester ? vacationLabel(semester) : '',
      range,
      busySlots: slots.map((slot) => slot.key),
      slots,
    }
  }

  async createApplication(body: CreateApplicationDto) {
    const { semester } = await this.activeSemester(body.semesterTerm)
    const semesterStart = semester?.startDate || formatDate(new Date())
    const groupId = `${Date.now()}${randomUUID().replaceAll('-', '').slice(0, 8)}`
    const dates: string[] = []

    await this.database.transaction(async (connection) => {
      for (const booking of body.slots) {
        const date = booking.date?.slice(0, 10) || slotDate(semesterStart, booking.week, booking.day)
        dates.push(date)
        await connection.execute(
          `INSERT INTO borrow
            (btimeid, bperson, bname, btime, tag, bclassid, status, bphone, bsoftware, bnumer, bmore)
           VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
          [groupId, body.applicantName, body.courseName, date, periodToTag(booking.period), booking.roomId,
            body.phone, body.requiredSoftware, String(body.attendees), body.remarks],
        )
      }
      await connection.execute(
        `INSERT INTO submit
          (stimeid, sperson, sphone, ssoftware, snumer, sname, smore, sstatus)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [groupId, body.applicantName, body.phone, body.requiredSoftware, String(body.attendees), body.courseName, body.remarks],
      )
    })
    const notificationSent = await this.mail.sendApplicationNotification(groupId, body, dates)
    return { id: groupId, slots: body.slots.length, state: 'pending', notificationSent }
  }
}
