import { IsString, IsNotEmpty } from 'class-validator';

export class SheetsTestDto {
  @IsString()
  @IsNotEmpty()
  sheetId!: string;

  @IsString()
  @IsNotEmpty()
  value!: string;
}
