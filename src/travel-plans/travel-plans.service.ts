import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TravelPlan } from './entities/travel-plan.entity';
import { CreateTravelPlanDto } from './dto/create-travel-plan.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CountriesService } from '../countries/countries.service';

@Injectable()
export class TravelPlansService {
  constructor(
    @InjectRepository(TravelPlan)
    private travelPlansRepository: Repository<TravelPlan>,
    private countriesService: CountriesService,
  ) {}

  async create(createTravelPlanDto: CreateTravelPlanDto) {
    // Verificar si el país existe o traerlo de la API
    try {
      await this.countriesService.findEntityByCode(
        createTravelPlanDto.countryCode,
      );
    } catch {
      throw new BadRequestException(
        `Country with code ${createTravelPlanDto.countryCode} not found or API invalid.`,
      );
    }

    // Guardar el plan de viaje
    const newPlan = this.travelPlansRepository.create(createTravelPlanDto);
    return this.travelPlansRepository.save(newPlan);
  }

  async findAll() {
    return this.travelPlansRepository.find();
  }

  async findOne(id: number) {
    const plan = await this.travelPlansRepository.findOneBy({ id });
    if (!plan) {
      throw new NotFoundException(`Travel plan with id ${id} not found.`);
    }
    return plan;
  }

  async addExpense(id: number, createExpenseDto: CreateExpenseDto) {
    const plan = await this.findOne(id);
    if (!plan.expenses) {
      plan.expenses = [];
    }
    plan.expenses.push(createExpenseDto);
    return this.travelPlansRepository.save(plan);
  }

  async remove(id: number): Promise<void> {
    const plan = await this.travelPlansRepository.findOneBy({ id });
    if (!plan) {
      throw new NotFoundException(`Travel plan with id ${id} not found.`);
    }
    await this.travelPlansRepository.remove(plan);
  }
}
