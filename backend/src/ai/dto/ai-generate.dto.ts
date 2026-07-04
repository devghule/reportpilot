import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

interface TabData {
  headers: string[];
  rows: string[][];
}

export class AiGenerateDto {
  @IsString()
  @IsNotEmpty()
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
