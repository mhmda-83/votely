import { Length, IsString } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @Length(3, 255)
  title: string;
}
