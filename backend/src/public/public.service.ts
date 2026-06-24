import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { RowDataPacket } from 'mysql2'
import { DatabaseService } from '../database/database.service'
import { rowToRoom } from '../shared/rooms'
import { currentWeek, dayIndexOf, formatDate, periodToTag, slotDate, weekRange } from '../shared/time'
import { CreateApplicationDto } from './public.dto'

interface ConsoleRow extends RowDataPacket { name: string; value: string }

@Injectable()
export class PublicService {
  constructor(private readonly database: DatabaseService) {}

  private async loadConsole(): Promise<Record<string, string>> {
    const rows = await this.database.query<ConsoleRow[]>('SELECT name, value FROM console')
    return Object.fromEntries(rows.map((row) => [row.name, row.value]))
  }

  async getConfig() {
    const config = await this.loadConsole()
    const semesterStart = config.begtime || formatDate(new Date())
    const totalWeeks = Number(config.week || 0)
    const week = currentWeek(semesterStart)
    return {
      semesterStart,
      totalWeeks,
      currentWeek: Math.min(Math.max(week, 1), totalWeeks || week),
      contact: { name: config.lianxiren || '', phone: config.lianxidianhua || '' },
    }
  }

  async getRooms() {
    const rows = await this.database.query<RowDataPacket[]>(
      'SELECT cid, cname, cintro FROM class WHERE cid <> 611 ORDER BY cname, cid',
    )
    return rows.map((row) => rowToRoom(row as { cid: number; cname: string; cintro: string }))
  }

  async getAvailability(requestedWeek?: number) {
    const config = await this.loadConsole()
    const semesterStart = config.begtime || formatDate(new Date())
    const totalWeeks = Number(config.week || 0)
    const week = requestedWeek || currentWeek(semesterStart)
    const range = weekRange(semesterStart, week)
    const rows = await this.database.query<RowDataPacket[]>(
      'SELECT bid, btime, bname, bperson, tag, bclassid FROM borrow WHERE btime >= ? AND btime <= ? AND status = 1',
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
        date: String(row.btime).slice(0, 10),
      }]
    })
    return { week, totalWeeks, range, busySlots: slots.map((slot) => slot.key), slots }
  }

  async createApplication(body: CreateApplicationDto) {
    const config = await this.loadConsole()
    const semesterStart = config.begtime || formatDate(new Date())
    const groupId = `${Date.now()}${randomUUID().replaceAll('-', '').slice(0, 8)}`

    await this.database.transaction(async (connection) => {
      for (const booking of body.slots) {
        const date = booking.date?.slice(0, 10) || slotDate(semesterStart, booking.week, booking.day)
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
    return { id: groupId, slots: body.slots.length, state: 'pending' }
  }
}
