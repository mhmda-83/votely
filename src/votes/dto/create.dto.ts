import { IsNumberString } from 'class-validator';

export class CreateVoteDto {
  @IsNumberString()
  option_id: number;
}
