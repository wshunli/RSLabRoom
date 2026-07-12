import { Global, Module } from '@nestjs/common'
import { DatabaseService } from './database.service'
import { SemesterStore } from '../shared/semester-store.service'

@Global()
@Module({
  providers: [DatabaseService, SemesterStore],
  exports: [DatabaseService, SemesterStore],
})
export class DatabaseModule {}
