import { IsUUID } from 'class-validator';

export class MetaDisconnectDto {
  @IsUUID()
  accountId!: string;
}
