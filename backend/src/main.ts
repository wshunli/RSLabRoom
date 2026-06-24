import 'reflect-metadata'
import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/http-exception.filter'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { cors: false })
  app.use(helmet({ contentSecurityPolicy: false }))
  app.useGlobalFilters(new HttpExceptionFilter())
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => new BadRequestException({
      error: Object.values(errors[0]?.constraints || {})[0] || '请求参数不正确',
    }),
  }))
  app.enableShutdownHooks()

  const config = app.get(ConfigService)
  const port = config.get<number>('PORT', 3000)
  await app.listen(port, '0.0.0.0')
  Logger.log(`RSLabRoom 已启动：http://0.0.0.0:${port}`, 'Bootstrap')
}

void bootstrap()
