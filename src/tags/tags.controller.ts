import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Query,
  Response,
  UseGuards,
} from '@nestjs/common';
import { Tag } from '@prisma/client';
import { Response as ExpressResponse } from 'express';
import { AccessTokenAuthGuard } from 'src/auth/access-token-auth.guard';

import { CreateTagDto } from './dto/create.dto';
import { TagsService } from './tags.service';

@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @UseGuards(AccessTokenAuthGuard)
  @Post('/')
  async create(
    @Body() createTagDto: CreateTagDto,
    @Response() res: ExpressResponse,
  ) {
    let tag: Tag;

    createTagDto.title = createTagDto.title
      .split(' ')
      .map((word) => `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`)
      .join(' ');

    tag = await this.tagsService.findByTitle(createTagDto.title);

    if (tag) return res.status(208).json(tag);

    tag = await this.tagsService.create(createTagDto);

    return res.status(201).json(tag);
  }

  @Get('/')
  async findAll(
    @Query('page', ParseIntPipe) page: number,
    @Query('search') search?: string,
  ) {
    const tags = this.tagsService.findAll({ page, search });

    return tags;
  }
}
