import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ServeStaticModule } from '@nestjs/serve-static'
import { join } from 'node:path'
import { AdminModule } from './admin/admin.module'
import { AuthModule } from './auth/auth.module'
import { validateEnvironment } from './configuration'
import { DatabaseModule } from './database/database.module'
import { HealthController } from './health.controller'
import { PublicModule } from './public/public.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      exclude: ['/api/{*path}'],
    }),
    DatabaseModule,
    AuthModule,
    PublicModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
