import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';

import { CreateOptionDto } from 'src/options/dto/create.dto';

export class CreatePollDto {
  @IsString()
  @Length(6, 1000)
  title: string;

  @IsOptional()
  @IsString()
  @Length(6)
  description?: string;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options: CreateOptionDto[];

  @IsArray()
  @IsOptional()
  tag_ids?: string[];
}
