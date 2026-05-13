import { IsString, IsNotEmpty, IsDateString, Length, IsOptional } from 'class-validator';

export class CreateTravelPlanDto {
  @IsString()
  @Length(3, 3) 
  @IsNotEmpty()
  countryCode: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsDateString() 
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
