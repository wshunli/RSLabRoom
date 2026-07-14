import { Injectable, Logger } from '@nestjs/common'
import { createTransport } from 'nodemailer'
import { RowDataPacket } from 'mysql2'
import { DatabaseService } from '../database/database.service'
import { CreateApplicationDto } from '../public/public.dto'
import { PERIOD_NAMES } from '../shared/time'
import { JwtService } from '@nestjs/jwt'
import { rowToRoom } from '../shared/rooms'

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char] || char)
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)

  constructor(private readonly database: DatabaseService, private readonly jwt: JwtService) {}

  private async config() {
    const rows = await this.database.query<RowDataPacket[]>(
      "SELECT name, value FROM console WHERE name LIKE 'smtp_%' OR name IN ('admin_email', 'site_url')",
    )
    return Object.fromEntries(rows.map((row) => [String(row.name), String(row.value || '')]))
  }

  private transporter(config: Record<string, string>) {
    return createTransport({
      host: config.smtp_host,
      port: Number(config.smtp_port || 465),
      secure: config.smtp_secure !== 'false',
      auth: config.smtp_user ? { user: config.smtp_user, pass: config.smtp_password } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    })
  }

  async sendApplicationNotification(id: string, body: CreateApplicationDto, dates: string[]) {
    const config = await this.config()
    if (config.smtp_enabled !== 'true' || !config.smtp_host || !config.admin_email) return false
    const roomIds = [...new Set(body.slots.map((slot) => slot.roomId))]
    const placeholders = roomIds.map(() => '?').join(',')
    const roomRows = await this.database.query<RowDataPacket[]>(
      `SELECT cid, cname, cintro FROM class WHERE cid IN (${placeholders})`,
      roomIds,
    )
    const roomLabels = new Map(roomRows.map((row) => {
      const room = rowToRoom({ cid: Number(row.cid), cname: String(row.cname || ''), cintro: String(row.cintro || '') })
      return [room.id, [room.building, room.name].filter(Boolean).join(' ') || `机房${room.id}`] as const
    }))
    const slotDetails = body.slots.map((slot, index) => {
      const roomLabel = roomLabels.get(slot.roomId) || `机房${slot.roomId}`
      const period = PERIOD_NAMES[slot.period] || `时段${slot.period + 1}`
      return `${dates[index]}，${period}，${roomLabel}`
    })
    const slotRows = body.slots.map((slot, index) =>
      `<li>${escapeHtml(slotDetails[index])}</li>`,
    ).join('')
    const links = await this.approvalLinks(config, id)
    try {
      await this.transporter(config).sendMail({
        from: config.smtp_from || config.smtp_user,
        to: config.admin_email,
        subject: `【机房预约】${body.applicantName} 提交了新的借用申请`,
        text: `申请编号：${id}\n申请人：${body.applicantName}\n联系电话：${body.phone}\n课程/用途：${body.courseName}\n人数：${body.attendees}\n软件需求：${body.requiredSoftware || '无'}\n备注：${body.remarks || '无'}\n预约时段：\n${slotDetails.join('\n')}\n\n审批链接：${links.page || '请登录管理后台处理'}`,
        html: await this.applicationHtml(config, id, body, slotRows),
      })
      return true
    } catch (error) {
      this.logger.error(`申请 ${id} 的管理员通知邮件发送失败`, error instanceof Error ? error.stack : String(error))
      return false
    }
  }

  private async approvalLinks(config: Record<string, string>, id: string) {
    const token = await this.jwt.signAsync({ sub: id, purpose: 'mail-approval' }, { expiresIn: '7d' })
    const baseUrl = config.site_url.replace(/\/$/, '')
    const page = baseUrl ? `${baseUrl}/mail-approval/${encodeURIComponent(token)}` : ''
    return {
      page,
    }
  }

  private async applicationHtml(config: Record<string, string>, id: string, body: CreateApplicationDto, slotRows: string) {
    const links = await this.approvalLinks(config, id)
    const approval = links.page
    const button = approval
      ? `<p style="margin:24px 0"><a href="${escapeHtml(approval)}" style="display:inline-block;padding:11px 20px;background:#24705a;color:#fff;text-decoration:none;border-radius:7px">打开审批页面</a></p><p style="font-size:12px;line-height:1.6;word-break:break-all">审批具体链接：<br><span>${escapeHtml(approval)}</span></p><p style="color:#77827d;font-size:12px">审批链接 7 天内有效，请勿转发。进入页面后可选择通过或驳回。</p>`
      : '<p>请登录管理后台处理。</p>'
    return `<h2>新的机房借用申请</h2><p>申请编号：${escapeHtml(id)}</p><p>申请人：${escapeHtml(body.applicantName)}（${escapeHtml(body.phone)}）</p><p>课程/用途：${escapeHtml(body.courseName)}</p><p>人数：${escapeHtml(body.attendees)}</p><p>软件需求：${escapeHtml(body.requiredSoftware || '无')}</p><p>备注：${escapeHtml(body.remarks || '无')}</p><ul>${slotRows}</ul>${button}`
  }

  async sendTestEmail() {
    const config = await this.config()
    if (!config.smtp_host || !config.admin_email) throw new Error('请先完整保存 SMTP 服务器和管理员邮箱配置')
    await this.transporter(config).sendMail({
      from: config.smtp_from || config.smtp_user,
      to: config.admin_email,
      subject: '【机房预约系统】SMTP 测试邮件',
      text: '邮件通知配置成功。此后有人提交申请时，管理员将收到通知。',
    })
    return { ok: true }
  }
}
