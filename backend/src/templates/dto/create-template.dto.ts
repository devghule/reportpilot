import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Prisma } from '@prisma/client';

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsIn(['campaign', 'adset', 'ad'])
  reportLevel!: string;

  @IsIn(['day', 'week', 'month'])
  dateGranularity!: string;

  @IsString()
  @IsNotEmpty()
  dateRange!: string;

  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  metrics!: string[];

  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  dimensions!: string[];

  @IsArray()
  @ArrayMaxSize(50)
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
