
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { CountriesService } from './countries.service';
import { CountriesController } from './countries.controller';
import { Country } from './entities/country.entity';
import { RestCountriesProvider } from './providers/rest-countries.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Country]), HttpModule],
  controllers: [CountriesController],
  providers: [CountriesService, RestCountriesProvider],
  exports: [CountriesService], 
})
export class CountriesModule {}