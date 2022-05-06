import { IsString, Length } from 'class-validator';

export class CreateOptionDto {
  @IsString()
  @Length(1, 255)
  title: string;
}
