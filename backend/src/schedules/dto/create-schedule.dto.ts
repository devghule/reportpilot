import { IsIn, IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateScheduleDto {
  @IsString()
  @IsNotEmpty()
  templateId!: string;

  @IsString()
  @IsNotEmpty()
  accountId!: string;

  @IsIn(['daily', 'weekly', 'monthly'])
  frequency!: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'refreshTime must be in HH:MM 24-hour format',
  })
  refreshTime!: string;

  @IsString()
  @IsNotEmpty()
  timezone!: string;

  @IsString()
  @IsNotEmpty()
  sheetId!: string;

  @IsString()
  @IsNotEmpty()
  sheetTabName!: string;
}
