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
