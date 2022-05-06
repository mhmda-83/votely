import { IsString, Length } from 'class-validator';

import { IsEqualTo } from 'src/decorators/is-equal-to.validator';

export class ChangePasswordDto {
  @IsString()
  current_password: string;

  @Length(6)
  @IsString()
  new_password: string;

  @IsEqualTo('new_password')
  confirm_new_password: string;
}
