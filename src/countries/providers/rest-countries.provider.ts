import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';

interface RestCountryResponse {
  cca3: string;
  name: { common: string };
  region: string;
  subregion?: string;
  capital?: string[];
  population: number;
  flags?: { svg?: string; png?: string };
}

@Injectable()
export class RestCountriesProvider {
  private readonly logger = new Logger(RestCountriesProvider.name);
  private readonly API_URL = 'https://restcountries.com/v3.1';
  private readonly API_TIMEOUT_MS = 10000; // 10 segundos

  constructor(private readonly httpService: HttpService) {}

  async getCountryByCode(code: string) {
    if (!code || code.length !== 3 || !/^[A-Z]{3}$/.test(code.toUpperCase())) {
      throw new BadRequestException(`Invalid country code format: ${code}`);
    }

    try {
      this.logger.debug(`Consultando API RestCountries para código: ${code}`);
      
      const response = await firstValueFrom(
        this.httpService.get<RestCountryResponse[]>(
          `${this.API_URL}/alpha/${code}`,
        ).pipe(
          timeout(this.API_TIMEOUT_MS),
          catchError(error => {
            this.logger.error(`Error en API RestCountries para ${code}:`, error.message);
            throw error;
          })
        ),
      );

      if (!response.data || response.data.length === 0) {
        throw new NotFoundException(`No country data returned for code: ${code}`);
      }

      const data = response.data[0];
      return this.mapCountryData(data, code);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to fetch country ${code} from external API:`, error.message);
      throw new NotFoundException(
        `Country with code ${code} not found in external API.`,
      );
    }
  }

  private mapCountryData(data: RestCountryResponse, originalCode: string) {
    // Validar campos requeridos
    if (!data.cca3 || !data.name?.common || !data.region) {
      throw new BadRequestException(
        `Invalid country data structure received for ${originalCode}`,
      );
    }

    // Validar y limpiar datos
    const population = Math.max(0, Number(data.population) || 0);
    const flagUrl = data.flags?.svg || data.flags?.png || '';
    const capital = Array.isArray(data.capital) && data.capital.length > 0 
      ? data.capital[0] 
      : '';
    const subregion = data.subregion || '';

    return {
      code: data.cca3.toUpperCase(),
      name: data.name.common.trim(),
      region: data.region.trim(),
      subregion: subregion.trim(),
      capital: capital.trim(),
      population,
      flagUrl: flagUrl.trim(),
    };
  }
}
