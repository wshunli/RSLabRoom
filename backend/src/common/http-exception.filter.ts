import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { Response } from 'express'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>()
    if (!(exception instanceof HttpException)) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception))
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: '服务器内部错误' })
      return
    }

    const status = exception.getStatus()
    const raw = exception.getResponse()
    if (typeof raw === 'string') {
      response.status(status).json({ error: raw })
      return
    }
    const body = raw as Record<string, unknown>
    const message = Array.isArray(body.message) ? body.message[0] : body.message
    const genericErrors = ['Bad Request', 'Unauthorized', 'Forbidden', 'Not Found']
    const error = typeof body.error === 'string' && !genericErrors.includes(body.error)
      ? body.error
      : typeof message === 'string' ? message : '请求处理失败'
    response.status(status).json({ ...body, error })
  }
}
