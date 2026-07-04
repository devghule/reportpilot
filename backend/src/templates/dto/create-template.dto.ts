import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Prisma } from '@prisma/client';

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsIn(['campaign', 'adset', 'ad'])
  reportLevel!: string;

  @IsIn(['day', 'week', 'month'])
  dateGranularity!: string;

  @IsString()
  @IsNotEmpty()
  dateRange!: string;

  @IsArray()
  @IsString({ each: true })
  metrics!: string[];

  @IsArray()
  @IsString({ each: true })
  dimensions!: string[];

  @IsArray()
  @IsString({ each: true })
  columnOrder!: string[];

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
