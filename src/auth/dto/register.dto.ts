import { IsAlphanumeric, IsEmail, IsString, Length } from 'class-validator';

import { IsEqualTo } from 'src/decorators/is-equal-to.validator';

export class RegisterDto {
  @IsAlphanumeric()
  @Length(4, 100)
  username: string;

  @IsEmail()
  email: string;

  @Length(6)
  @IsString()
  password: string;

  @IsEqualTo('password')
  confirm_password: string;
}
