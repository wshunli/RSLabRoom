import { Controller, Get, Param, Post } from '@nestjs/common'
import { AdminService } from './admin.service'

@Controller('api/mail-approval')
export class MailApprovalController {
  constructor(private readonly service: AdminService) {}

  @Get(':token')
  get(@Param('token') token: string) { return this.service.getMailApproval(token) }

  @Post(':token/approve')
  approve(@Param('token') token: string) { return this.service.approveByMail(token) }

  @Post(':token/reject')
  reject(@Param('token') token: string) { return this.service.rejectByMail(token) }
}
