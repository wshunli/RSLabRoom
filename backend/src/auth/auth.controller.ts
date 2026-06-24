import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { IsNotEmpty, IsString, MaxLength } from 'class-validator'
import { AuthGuard } from './auth.guard'
import { AuthService } from './auth.service'

class LoginDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  username: string

  @IsString() @IsNotEmpty() @MaxLength(200)
  password: string
}

@Controller('api/admin')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.auth.login(body.username, body.password)
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  logout() {
    return { ok: true }
  }
}
