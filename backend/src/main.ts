import 'reflect-metadata'
import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common'
import { ValidationError } from 'class-validator'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/http-exception.filter'

function firstValidationMessage(errors: ValidationError[]): string {
  for (const error of errors) {
    const message = Object.values(error.constraints || {})[0]
    if (message) return message
    if (error.children?.length) {
      const nested = firstValidationMessage(error.children)
      if (nested) return nested
    }
  }
  return '请求参数不正确'
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { cors: false })
  app.use(helmet({ contentSecurityPolicy: false }))
  app.useGlobalFilters(new HttpExceptionFilter())
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => new BadRequestException({
      error: firstValidationMessage(errors),
    }),
  }))
  app.enableShutdownHooks()

  const config = app.get(ConfigService)
  const port = config.get<number>('PORT', 3000)
  await app.listen(port, '0.0.0.0')
  Logger.log(`RSLabRoom 已启动：http://0.0.0.0:${port}`, 'Bootstrap')
}

void bootstrap()
