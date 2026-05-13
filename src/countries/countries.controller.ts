
import { Controller, Get, Param, Delete, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { CountriesService } from './countries.service';
import { AdminGuard } from '../common/guards/admin.guard'; // Importamos el guard

@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Get()
  findAll() {
    return this.countriesService.findAll();
  }

  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.countriesService.findOneByCode(code);
  }

  @Delete(':code')
  @UseGuards(AdminGuard) // Requiere Header 'Authorization: web123'
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('code') code: string) {
    await this.countriesService.remove(code);
  }
}