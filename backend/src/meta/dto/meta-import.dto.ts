import { Type } from 'class-transformer';
import { IsUUID, Matches, ValidateNested } from 'class-validator';

class DateRangeDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'since must be in YYYY-MM-DD format' })
  since!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'until must be in YYYY-MM-DD format' })
  until!: string;
}

export class MetaImportDto {
  @IsUUID()
  templateId!: string;

  @IsUUID()
  accountId!: string;

  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange!: DateRangeDto;

  @ValidateNested()
  @Type(() => DateRangeDto)
  prevDateRange!: DateRangeDto;
}
