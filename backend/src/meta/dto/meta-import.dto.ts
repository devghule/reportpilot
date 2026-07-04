import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';

class DateRangeDto {
  @IsString()
  @IsNotEmpty()
  since!: string;

  @IsString()
  @IsNotEmpty()
  until!: string;
}

export class MetaImportDto {
  @IsString()
  @IsNotEmpty()
  templateId!: string;

  @IsString()
  @IsNotEmpty()
  accountId!: string;

  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange!: DateRangeDto;

  @ValidateNested()
  @Type(() => DateRangeDto)
  prevDateRange!: DateRangeDto;
}
