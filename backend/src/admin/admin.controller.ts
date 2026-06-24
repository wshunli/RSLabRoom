import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '../auth/auth.guard'
import { AdminService } from './admin.service'
import { ApplicationQueryDto, CreateScheduleDto, UpdateSettingsDto } from './admin.dto'

@Controller('api/admin')
@UseGuards(AuthGuard)
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('applications')
  getApplications(@Query() query: ApplicationQueryDto) { return this.service.getApplications(query) }

  @Post('applications/:id/approve')
  approve(@Param('id') id: string) { return this.service.approve(id) }

  @Post('applications/:id/reject')
  reject(@Param('id') id: string) { return this.service.reject(id) }

  @Delete('applications/:id')
  deleteApplication(@Param('id') id: string) { return this.service.deleteApplication(id) }

  @Get('settings')
  getSettings() { return this.service.getSettings() }

  @Put('settings')
  updateSettings(@Body() body: UpdateSettingsDto) { return this.service.updateSettings(body) }

  @Get('users')
  getUsers() { return this.service.getUsers() }

  @Get('schedules')
  getSchedules() { return this.service.getSchedules() }

  @Post('schedules')
  createSchedule(@Body() body: CreateScheduleDto) { return this.service.createSchedule(body) }

  @Delete('schedules/:id')
  deleteSchedule(@Param('id') id: string) { return this.service.deleteSchedule(id) }
}
