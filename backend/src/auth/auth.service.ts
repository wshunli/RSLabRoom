import { createHash } from 'node:crypto'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { RowDataPacket } from 'mysql2'
import { DatabaseService } from '../database/database.service'

interface UserRow extends RowDataPacket {
  username: string
  upwd: string
  name: string | null
}

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly jwt: JwtService,
  ) {}

  async login(username: string, password: string) {
    const row = await this.database.queryOne<UserRow>('SELECT username, upwd, name FROM user WHERE username = ?', [username])
    const digest = createHash('md5').update(password).digest('hex')
    if (!row || row.upwd !== digest) throw new UnauthorizedException({ error: '账号或密码错误' })
    const displayName = row.name?.trim() || row.username
    return {
      token: await this.jwt.signAsync({ sub: row.username }),
      user: { username: row.username, displayName },
    }
  }
}
