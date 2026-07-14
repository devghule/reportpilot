import { IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

interface TabData {
  headers: string[];
  rows: string[][];
}

export class AiGenerateDto {
  @IsUUID()
  accountId!: string;

  @IsObject()
  reportData!: {
    campaigns?: TabData;
    ad_sets?: TabData;
    ads?: TabData;
  };

  @IsOptional()
  @IsString()
  dateRange?: string;

  @IsOptional()
  @IsString()
  prevDateRange?: string;
}
