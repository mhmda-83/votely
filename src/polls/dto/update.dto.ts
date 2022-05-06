import { IsBooleanString } from 'class-validator';

export class UpdatePollDto {
  @IsBooleanString()
  is_closed: string;
}
