import { Controller, Get, Post, Body, Param, Delete, HttpCode, HttpStatus, ParseIntPipe } from '@nestjs/common';
import { TravelPlansService } from './travel-plans.service';
import { CreateTravelPlanDto } from './dto/create-travel-plan.dto';

@Controller('travel-plans')
export class TravelPlansController {
  constructor(private readonly travelPlansService: TravelPlansService) {}

  @Post()
  create(@Body() createTravelPlanDto: CreateTravelPlanDto) {
    return this.travelPlansService.create(createTravelPlanDto);
  }

  @Get()
  findAll() {
    return this.travelPlansService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.travelPlansService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.travelPlansService.remove(id);
  }
}