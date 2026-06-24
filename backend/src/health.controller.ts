import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { DatabaseService } from './database/database.service'

@Controller('api/health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  async check() {
    try {
      await this.database.ping()
      return { ok: true, db: true }
    } catch {
      throw new ServiceUnavailableException({ error: '数据库不可用', ok: false, db: false })
    }
  }
}
