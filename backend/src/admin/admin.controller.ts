import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '../auth/auth.guard'
import { AdminService } from './admin.service'
import { ApplicationQueryDto, CreateScheduleDto, CreateUserDto, RoomDto, UpdateSettingsDto, UpdateUserDto } from './admin.dto'

@Controller('api/admin')
@UseGuards(AuthGuard)
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('stats')
  getStats() { return this.service.getStats() }

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

  @Post('settings/test-email')
  testEmail() { return this.service.testEmail() }

  @Get('users')
  getUsers() { return this.service.getUsers() }

  @Post('users')
  createUser(@Body() body: CreateUserDto) { return this.service.createUser(body) }

  @Put('users/:username')
  updateUser(@Param('username') username: string, @Body() body: UpdateUserDto) { return this.service.updateUser(username, body) }

  @Delete('users/:username')
  deleteUser(@Param('username') username: string) { return this.service.deleteUser(username) }

  @Get('rooms')
  getRooms() { return this.service.getRooms() }

  @Post('rooms')
  createRoom(@Body() body: RoomDto) { return this.service.createRoom(body) }

  @Put('rooms/:id')
  updateRoom(@Param('id') id: string, @Body() body: RoomDto) { return this.service.updateRoom(id, body) }

  @Delete('rooms/:id')
  deleteRoom(@Param('id') id: string) { return this.service.deleteRoom(id) }

  @Post('schedules')
  createSchedule(@Body() body: CreateScheduleDto) { return this.service.createSchedule(body) }
}
