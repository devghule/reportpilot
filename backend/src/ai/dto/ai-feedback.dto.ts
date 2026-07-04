import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class AiFeedbackDto {
  @IsString()
  @IsNotEmpty()
  aiReportId!: string;

  @IsIn(['thumbs_up', 'thumbs_down'])
  feedback!: string;
}
