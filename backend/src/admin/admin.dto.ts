import { Type } from 'class-transformer'
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateIf, ValidateNested } from 'class-validator'

export class ApplicationQueryDto {
  @IsOptional() @IsIn(['pending', 'approved', 'rejected', 'deleted', 'all'])
  status: 'pending' | 'approved' | 'rejected' | 'deleted' | 'all' = 'all'

  @IsOptional() @IsString() @MaxLength(10)
  date?: string

  @IsOptional() @IsString() @MaxLength(50)
  courseName?: string

  @IsOptional() @IsString() @MaxLength(20)
  teacher?: string

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page = 1

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize = 15
}

// 学期配置：一个学年固定包含第一、二、三学期，每学期可配置教学周数及结束后的假期周数。
export class SemesterDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(3)
  term: number

  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '开学日期格式应为 YYYY-MM-DD' })
  startDate: string

  @Type(() => Number) @IsInt() @Min(1) @Max(60)
  weeks: number

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(60)
  extraWeeks: number
}

export class UpdateSemestersDto {
  // 学年起始年份：2025 表示 2025-2026 学年
  @Type(() => Number) @IsInt() @Min(2000) @Max(2100)
  startYear: number

  @IsArray() @ArrayMinSize(3, { message: '需要完整配置第一、二、三学期' }) @ArrayMaxSize(3, { message: '一个学年固定为三个学期' })
  @ValidateNested({ each: true }) @Type(() => SemesterDto)
  semesters: SemesterDto[]
}

export class UpdateSettingsDto {
  @IsString() @MaxLength(100)
  contactName: string

  @IsString() @MaxLength(100)
  contactPhone: string

  @IsBoolean()
  smtpEnabled = false

  @IsString() @MaxLength(255)
  smtpHost = ''

  @Type(() => Number) @IsInt() @Min(1) @Max(65535)
  smtpPort = 465

  @IsBoolean()
  smtpSecure = true

  @IsString() @MaxLength(255)
  smtpUser = ''

  @IsOptional() @IsString() @MaxLength(255)
  smtpPassword?: string

  // 兼容已缓存的旧版设置页：该字段仅用于提示密码是否已配置，服务端忽略其值。
  @IsOptional() @IsBoolean()
  smtpPasswordSet?: boolean

  @IsString() @MaxLength(255)
  smtpFrom = ''

  @ValidateIf((o) => o.adminEmail !== '') @IsEmail() @MaxLength(255)
  adminEmail = ''

  @IsString() @MaxLength(500)
  siteUrl = ''
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

  @IsOptional() @IsString() @MaxLength(50)
  name = ''

  @IsOptional() @IsString() @MaxLength(100)
  email = ''

  @IsOptional() @IsString() @MaxLength(25)
  phone = ''
}

export class UpdateUserDto {
  @IsString() @IsNotEmpty() @MaxLength(20)
  username: string

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200)
  password?: string

  @IsOptional() @IsString() @MaxLength(50)
  name = ''

  @IsOptional() @IsString() @MaxLength(100)
  email = ''

  @IsOptional() @IsString() @MaxLength(25)
  phone = ''
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
