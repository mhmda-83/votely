import { IsAlphanumeric, Length } from 'class-validator';

export class UpdateUserDto {
  @IsAlphanumeric()
  @Length(4, 100)
  username?: string;
}
