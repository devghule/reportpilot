import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';
import { Prisma } from '@prisma/client';

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['campaign', 'adset', 'ad'])
  reportLevel?: string;

  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  dateGranularity?: string;

  @IsOptional()
  @IsString()
  dateRange?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metrics?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dimensions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  columnOrder?: string[];

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: string;

  @IsOptional()
  @Type(() => Object)
  filters?: Prisma.InputJsonValue;
}
