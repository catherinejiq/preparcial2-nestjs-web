import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TravelPlansService } from './travel-plans.service';
import { TravelPlansController } from './travel-plans.controller';
import { TravelPlan } from './entities/travel-plan.entity';
import { CountriesModule } from '../countries/countries.module'; // Importante para usar el servicio de países

@Module({
  imports: [
    TypeOrmModule.forFeature([TravelPlan]),
    CountriesModule 
  ],
  controllers: [TravelPlansController],
  providers: [TravelPlansService],
})
export class TravelPlansModule {}