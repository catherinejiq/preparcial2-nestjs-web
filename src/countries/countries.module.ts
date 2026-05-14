
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { CountriesService } from './countries.service';
import { Country } from './entities/country.entity';
import { RestCountriesProvider } from './providers/rest-countries.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Country]), HttpModule],
  // NOTA: No se registra CountriesController - es un módulo interno
  // Sin endpoints públicos, solo servicio para uso de otros módulos
  controllers: [],
  providers: [CountriesService, RestCountriesProvider],
  exports: [CountriesService], 
})
export class CountriesModule {}