import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Country } from './entities/country.entity';
import { RestCountriesProvider } from './providers/rest-countries.provider';

@Injectable()
export class CountriesService {
  constructor(
    @InjectRepository(Country)
    private countriesRepository: Repository<Country>,
    private restCountriesProvider: RestCountriesProvider,
  ) {}

  async findAll() {
    return this.countriesRepository.find();
  }

  async syncCountries() {
    // Lista de países comunes para sincronizar
    const countryCodes = [
      'USA', 'GBR', 'FRA', 'DEU', 'ITA', 'ESP', 'MEX', 'BRA', 
      'CAN', 'AUS', 'JPN', 'CHN', 'IND', 'KOR', 'COL', 'ARG', 'PER', 'VEN'
    ];

    const syncedCountries: Country[] = [];
    
    for (const code of countryCodes) {
      try {
        // Verificar si ya existe en BD
        const existing = await this.countriesRepository.findOne({ where: { code } });
        if (!existing) {
          // Obtener de API externa
          const countryData = await this.restCountriesProvider.getCountryByCode(code);
          const saved = await this.countriesRepository.save(countryData);
          syncedCountries.push(saved);
        }
      } catch (error) {
        // Si no existe en la API, continuar con el siguiente
        continue;
      }
    }

    return {
      message: 'Sincronización completada',
      synced: syncedCountries.length,
      total: countryCodes.length,
      countries: syncedCountries,
    };
  }

  async findOneByCode(code: string) {
    const alpha3 = code.toUpperCase();

    // Buscar en BD Local
    const localCountry = await this.countriesRepository.findOne({ where: { code: alpha3 } });
    if (localCountry) {
      return { ...localCountry, source: 'local-cache' };
    }

    // API Externa
    const externalData = await this.restCountriesProvider.getCountryByCode(alpha3);

    // Guardar en BD Local
    const newCountry = this.countriesRepository.create(externalData);
    await this.countriesRepository.save(newCountry);

    // Retornar
    return { ...newCountry, source: 'external-api' };
  }
  
  async findEntityByCode(code: string): Promise<Country> {
      const result = await this.findOneByCode(code);
      const { source, ...country } = result; 
      return country as Country;
  }

  // Borrar
  async remove(code: string): Promise<void> {
    const alpha3 = code.toUpperCase();

    // Verificar si el país existe en la BD local
    const country = await this.countriesRepository.findOne({ where: { code: alpha3 } });
    if (!country) {
      throw new NotFoundException(`Country with code ${alpha3} not found in local cache.`);
    }

    // Verificar si existen planes asociados
    const plansCountResult = await this.countriesRepository.query(
      `SELECT count(*) as count FROM travel_plan WHERE countryCode = ?`, 
      [alpha3]
    );

    const count = plansCountResult[0]?.count || plansCountResult[0]?.['count(*)'] || 0; // Manejo seguro del resultado SQL

    if (Number(count) > 0) {
      throw new BadRequestException(`Cannot delete country ${alpha3}: It has ${count} associated travel plan(s).`);
    }

    // Eliminar
    await this.countriesRepository.remove(country);
  }
}