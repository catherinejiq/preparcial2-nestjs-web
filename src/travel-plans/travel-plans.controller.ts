import { Controller, Get, Post, Body, Param, UsePipes, ValidationPipe, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { TravelPlansService } from './travel-plans.service';
import { CreateTravelPlanDto } from './dto/create-travel-plan.dto';

@Controller('travel-plans')
export class TravelPlansController {
  constructor(private readonly travelPlansService: TravelPlansService) {}

  @Post()
  @UsePipes(new ValidationPipe()) // Activa validaciones del DTO 
  create(@Body() createTravelPlanDto: CreateTravelPlanDto) {
    return this.travelPlansService.create(createTravelPlanDto);
  }

  @Get()
  findAll() {
    return this.travelPlansService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.travelPlansService.findOne(+id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.travelPlansService.remove(+id);
  }
}