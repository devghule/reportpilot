import { IsIn, IsNotEmpty, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class CreateScheduleDto {
  @IsUUID()
  templateId!: string;

  @IsUUID()
  accountId!: string;

  @IsIn(['daily', 'weekly', 'monthly'])
  frequency!: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'refreshTime must be in HH:MM 24-hour format',
  })
  refreshTime!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  timezone!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  sheetId!: string;

  // Google Sheets' own tab name limit is 100 characters.
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sheetTabName!: string;
}
