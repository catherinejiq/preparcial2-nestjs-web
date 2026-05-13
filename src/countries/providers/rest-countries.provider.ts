import { Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

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
  private readonly API_URL = 'https://restcountries.com/v3.1';

  constructor(private readonly httpService: HttpService) {}

  async getCountryByCode(code: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get<RestCountryResponse[]>(
          `${this.API_URL}/alpha/${code}`,
        ),
      );

      const data = response.data[0];

      return {
        code: data.cca3,
        name: data.name.common,
        region: data.region,
        subregion: data.subregion ?? '',
        capital: data.capital?.[0] ?? '',
        population: data.population,
        flagUrl: data.flags?.svg ?? data.flags?.png ?? '',
      };
    } catch {
      throw new NotFoundException(
        `Country with code ${code} not found in external API.`,
      );
    }
  }
}
