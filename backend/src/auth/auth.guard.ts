import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Request } from 'express'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { admin?: { username: string } }>()
    const header = request.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!token) throw new UnauthorizedException({ error: '未登录或登录已失效' })
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token)
      request.admin = { username: payload.sub }
      return true
    } catch {
      throw new UnauthorizedException({ error: '未登录或登录已失效' })
    }
  }
}
