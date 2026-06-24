import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'

export class BookingSlotDto {
  @Type(() => Number) @IsInt() @Min(1)
  roomId: number

  @Type(() => Number) @IsInt() @Min(1) @Max(60)
  week: number

  @Type(() => Number) @IsInt() @Min(0) @Max(6)
  day: number

  @Type(() => Number) @IsInt() @Min(0) @Max(2)
  period: number

  @IsOptional() @IsDateString()
  date?: string
}

export class CreateApplicationDto {
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

  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => BookingSlotDto)
  slots: BookingSlotDto[]
}
