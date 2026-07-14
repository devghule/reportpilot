import { IsIn, IsUUID } from 'class-validator';

export class AiFeedbackDto {
  @IsUUID()
  aiReportId!: string;

  @IsIn(['thumbs_up', 'thumbs_down'])
  feedback!: string;
}
