import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Country } from './entities/country.entity';
import { RestCountriesProvider } from './providers/rest-countries.provider';

type CountryWithMeta = Country & { source: string; cacheAge: number };

@Injectable()
export class CountriesService {
  private readonly logger = new Logger(CountriesService.name);
  private readonly CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
  private inFlightRequests = new Map<string, Promise<CountryWithMeta>>();

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

    this.logger.log(`Iniciando sincronización de ${countryCodes.length} países`);
    const syncedCountries: Country[] = [];
    const failedCountries: string[] = [];
    
    for (const code of countryCodes) {
      try {
        // Verificar si ya existe en BD
        const existing = await this.countriesRepository.findOne({ where: { code } });
        if (!existing) {
          // Obtener de API externa
          const countryData = await this.restCountriesProvider.getCountryByCode(code);
          this.validateCountryData(countryData);
          const saved = await this.countriesRepository.save(countryData);
          syncedCountries.push(saved);
          this.logger.debug(`Sincronizado: ${code}`);
        } else {
          this.logger.debug(`${code} ya existe en caché`);
        }
      } catch (error) {
        failedCountries.push(code);
        this.logger.warn(`Error sincronizando ${code}: ${error.message}`);
      }
    }

    this.logger.log(`Sincronización completada: ${syncedCountries.length} nuevos, ${failedCountries.length} fallos`);
    return {
      message: 'Sincronización completada',
      synced: syncedCountries.length,
      total: countryCodes.length,
      failed: failedCountries,
      countries: syncedCountries,
    };
  }

  async findOneByCode(code: string) {
    const alpha3 = code.toUpperCase();

    // Validar código de país
    if (!alpha3 || alpha3.length !== 3 || !/^[A-Z]{3}$/.test(alpha3)) {
      throw new BadRequestException(`Invalid country code: ${code}`);
    }

    // 1. Buscar en BD Local con validación de caché
    const localCountry = await this.countriesRepository.findOne({ where: { code: alpha3 } });
    if (localCountry) {
      const isCacheValid = this.isCacheValid(localCountry.updatedAt);
      if (isCacheValid) {
        this.logger.debug(`Cache hit para país: ${alpha3}`);
        return { ...localCountry, source: 'local-cache', cacheAge: this.getCacheAge(localCountry.updatedAt) };
      }
    }

    // 2. Prevenir llamadas simultáneas al mismo país
    if (this.inFlightRequests.has(alpha3)) {
      this.logger.debug(`Esperando solicitud en vuelo para: ${alpha3}`);
      return this.inFlightRequests.get(alpha3)!;
    }

    // 3. Crear promesa para la solicitud
    const requestPromise = this.fetchAndCacheCountry(alpha3).finally(() => {
      this.inFlightRequests.delete(alpha3);
    });

    this.inFlightRequests.set(alpha3, requestPromise);
    return requestPromise;
  }

  private async fetchAndCacheCountry(alpha3: string): Promise<CountryWithMeta> {
    try {
      // Llamar API Externa
      this.logger.debug(`Obteniendo país ${alpha3} de API externa`);
      const externalData = await this.restCountriesProvider.getCountryByCode(alpha3);

      // Validar datos recibidos
      this.validateCountryData(externalData);

      // Guardar o actualizar en BD Local
      let country = await this.countriesRepository.findOne({ where: { code: alpha3 } });
      if (country) {
        // Actualizar existente
        Object.assign(country, externalData);
        country.updatedAt = new Date();
        await this.countriesRepository.save(country);
        this.logger.debug(`País ${alpha3} actualizado en caché local`);
      } else {
        // Crear nuevo
        country = this.countriesRepository.create(externalData);
        await this.countriesRepository.save(country);
        this.logger.debug(`País ${alpha3} guardado en caché local`);
      }

      return { ...country, source: 'external-api', cacheAge: 0 };
    } catch (error) {
      this.logger.error(`Error al obtener país ${alpha3}:`, error);
      throw error;
    }
  }

  private isCacheValid(updatedAt: Date): boolean {
    const cacheAge = Date.now() - updatedAt.getTime();
    return cacheAge < this.CACHE_TTL_MS;
  }

  private getCacheAge(updatedAt: Date): number {
    return Date.now() - updatedAt.getTime();
  }

  private validateCountryData(data: any): void {
    if (!data.code || !data.name || !data.region) {
      throw new BadRequestException('Datos de país inválidos recibidos de API externa');
    }
  }
  
  async findEntityByCode(code: string): Promise<Country> {
      const result = await this.findOneByCode(code);
      const { source, cacheAge, ...country } = result; 
      return country as Country;
  }

  async refreshCountryCache(code: string): Promise<CountryWithMeta> {
    const alpha3 = code.toUpperCase();
    this.logger.log(`Actualizando caché manualmente para: ${alpha3}`);
    
    // Limpiar solicitud en vuelo si existe
    this.inFlightRequests.delete(alpha3);
    
    // Eliminar del caché para forzar recarga
    const country = await this.countriesRepository.findOne({ where: { code: alpha3 } });
    if (country) {
      // Establecer updatedAt en pasado para invalidar caché
      country.updatedAt = new Date(0);
      await this.countriesRepository.save(country);
    }
    
    // Obtener nuevos datos
    return this.findOneByCode(alpha3);
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
      `SELECT COUNT(*) as total FROM travel_plan WHERE countryCode = ?`,
      [alpha3],
    );

    const count = Number(plansCountResult[0]?.total ?? 0);

    if (count > 0) {
      throw new BadRequestException(`Cannot delete country ${alpha3}: It has ${count} associated travel plan(s).`);
    }

    // Eliminar
    await this.countriesRepository.remove(country);
  }
}