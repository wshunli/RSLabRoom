import { Type } from 'class-transformer'
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

export class ApplicationQueryDto {
  @IsOptional() @IsIn(['pending', 'approved', 'all'])
  status: 'pending' | 'approved' | 'all' = 'all'

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page = 1

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize = 10
}

export class UpdateSettingsDto {
  @Type(() => Number) @IsInt() @Min(2000) @Max(2100)
  startYear: number

  @Type(() => Number) @IsInt() @Min(1) @Max(12)
  startMonth: number

  @Type(() => Number) @IsInt() @Min(1) @Max(31)
  startDay: number

  @Type(() => Number) @IsInt() @Min(1) @Max(60)
  semesterWeeks: number

  @IsString() @MaxLength(100)
  contactName: string

  @IsString() @MaxLength(100)
  contactPhone: string
}

export class CreateScheduleDto {
  @IsString() @IsNotEmpty() @MaxLength(50)
  courseName: string

  @Type(() => Number) @IsInt() @Min(1)
  roomId: number

  @Type(() => Number) @IsInt() @Min(0) @Max(6)
  weekday: number

  @Type(() => Number) @IsInt() @Min(0) @Max(2)
  period: number

  @Type(() => Number) @IsInt() @Min(1) @Max(60)
  startWeek: number

  @Type(() => Number) @IsInt() @Min(1) @Max(60)
  endWeek: number

  @IsIn(['weekly', 'odd', 'even'])
  recurrence: 'weekly' | 'odd' | 'even' = 'weekly'
}

export class CreateUserDto {
  @IsString() @IsNotEmpty() @MaxLength(20)
  username: string

  @IsString() @IsNotEmpty() @MaxLength(200)
  password: string
}

export class UpdateUserDto {
  @IsString() @IsNotEmpty() @MaxLength(20)
  username: string

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200)
  password?: string
}

export class RoomDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string

  @IsString() @MaxLength(100)
  building: string

  @Type(() => Number) @IsInt() @Min(0) @Max(10000)
  seats: number

  @IsString() @MaxLength(100)
  audience: string

  @IsString() @MaxLength(200)
  intro: string

  @IsString() @MaxLength(100)
  administrator: string

  @IsString() @MaxLength(50)
  phone: string
}
