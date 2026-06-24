import { Type } from 'class-transformer'
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator'

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
  // 排课公用信息，与首页预约大厅提交字段保持一致
  @IsString() @IsNotEmpty() @MaxLength(10)
  applicantName: string

  @IsString() @IsNotEmpty() @MaxLength(25)
  phone: string

  @Type(() => Number) @IsInt() @Min(1) @Max(9999)
  attendees: number

  @IsString() @IsNotEmpty() @MaxLength(50)
  courseName: string

  @IsString() @MaxLength(200)
  requiredSoftware = ''

  @IsString() @MaxLength(100)
  remarks = ''

  @Type(() => Number) @IsInt() @Min(1)
  roomId: number

  @Type(() => Number) @IsInt() @Min(0) @Max(2)
  period: number

  @IsIn(['weekly', 'daily'])
  mode: 'weekly' | 'daily' = 'weekly'

  // 起止周次，两种模式都按周次选择
  @Type(() => Number) @IsInt() @Min(1) @Max(60)
  startWeek: number

  @Type(() => Number) @IsInt() @Min(1) @Max(60)
  endWeek: number

  // 每周模式：指定星期与重复方式（单/双/每周）
  @ValidateIf((o) => o.mode !== 'daily')
  @Type(() => Number) @IsInt() @Min(0) @Max(6)
  weekday: number

  @ValidateIf((o) => o.mode !== 'daily')
  @IsIn(['weekly', 'odd', 'even'])
  recurrence: 'weekly' | 'odd' | 'even' = 'weekly'

  // 每天模式：开始周/结束周各自指定周几，逐天生成区间内每一天
  @ValidateIf((o) => o.mode === 'daily')
  @Type(() => Number) @IsInt() @Min(0) @Max(6)
  startWeekday: number

  @ValidateIf((o) => o.mode === 'daily')
  @Type(() => Number) @IsInt() @Min(0) @Max(6)
  endWeekday: number
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
