import { Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsDateString,
  Length,
  IsOptional,
  MaxLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isAfterStartDate', async: false })
class IsAfterStartDate implements ValidatorConstraintInterface {
  validate(endDate: string, args: ValidationArguments) {
    const dto = args.object as CreateTravelPlanDto;
    if (!dto.startDate || !endDate) return true;
    return new Date(endDate) > new Date(dto.startDate);
  }

  defaultMessage() {
    return 'endDate must be after startDate';
  }
}

export class CreateTravelPlanDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsString()
  @Length(3, 3)
  @IsNotEmpty()
  countryCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @Validate(IsAfterStartDate)
  endDate: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
