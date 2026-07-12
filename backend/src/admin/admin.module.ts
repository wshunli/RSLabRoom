import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { MailApprovalController } from './mail-approval.controller'

@Module({ imports: [AuthModule], controllers: [AdminController, MailApprovalController], providers: [AdminService] })
export class AdminModule {}
