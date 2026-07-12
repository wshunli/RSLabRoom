import { Injectable, Logger } from '@nestjs/common'
import { createTransport } from 'nodemailer'
import { RowDataPacket } from 'mysql2'
import { DatabaseService } from '../database/database.service'
import { CreateApplicationDto } from '../public/public.dto'
import { PERIOD_NAMES } from '../shared/time'

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char] || char)
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)

  constructor(private readonly database: DatabaseService) {}

  private async config() {
    const rows = await this.database.query<RowDataPacket[]>(
      "SELECT name, value FROM console WHERE name LIKE 'smtp_%' OR name = 'admin_email'",
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
    const slotRows = body.slots.map((slot, index) =>
      `<li>${escapeHtml(dates[index])}，${escapeHtml(PERIOD_NAMES[slot.period] || `时段${slot.period + 1}`)}，机房 ${escapeHtml(slot.roomId)}</li>`,
    ).join('')
    try {
      await this.transporter(config).sendMail({
        from: config.smtp_from || config.smtp_user,
        to: config.admin_email,
        subject: `【机房预约】${body.applicantName} 提交了新的借用申请`,
        text: `申请编号：${id}\n申请人：${body.applicantName}\n联系电话：${body.phone}\n课程/用途：${body.courseName}\n人数：${body.attendees}\n软件需求：${body.requiredSoftware || '无'}\n备注：${body.remarks || '无'}\n预约日期：${dates.join('、')}`,
        html: `<h2>新的机房借用申请</h2><p>申请编号：${escapeHtml(id)}</p><p>申请人：${escapeHtml(body.applicantName)}（${escapeHtml(body.phone)}）</p><p>课程/用途：${escapeHtml(body.courseName)}</p><p>人数：${escapeHtml(body.attendees)}</p><p>软件需求：${escapeHtml(body.requiredSoftware || '无')}</p><p>备注：${escapeHtml(body.remarks || '无')}</p><ul>${slotRows}</ul><p>请登录管理后台处理。</p>`,
      })
      return true
    } catch (error) {
      this.logger.error(`申请 ${id} 的管理员通知邮件发送失败`, error instanceof Error ? error.stack : String(error))
      return false
    }
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
