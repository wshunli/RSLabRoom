import { Global, Module } from '@nestjs/common'
import { MailService } from './mail.service'
import { AuthModule } from '../auth/auth.module'

@Global()
@Module({ imports: [AuthModule], providers: [MailService], exports: [MailService] })
export class MailModule {}
