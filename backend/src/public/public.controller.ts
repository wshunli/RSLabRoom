import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common'
import { CreateApplicationDto } from './public.dto'
import { PublicService } from './public.service'

@Controller('api')
export class PublicController {
  constructor(private readonly service: PublicService) {}

  @Get('config')
  getConfig() { return this.service.getConfig() }

  @Get('rooms')
  getRooms() { return this.service.getRooms() }

  @Get('availability')
  getAvailability(
    @Query('week', new ParseIntPipe({ optional: true })) week?: number,
    @Query('term', new ParseIntPipe({ optional: true })) term?: number,
  ) {
    return this.service.getAvailability(week, term)
  }

  @Post('applications')
  createApplication(@Body() body: CreateApplicationDto) {
    return this.service.createApplication(body)
  }

  @Get('applications/:id')
  getApplication(@Param('id') id: string) {
    return this.service.getApplication(id)
  }
}
