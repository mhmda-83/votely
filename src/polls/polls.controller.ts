import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as Prisma from '@prisma/client';

import { TWO_MEGABYTES_IN_BYTES } from 'src/utils/constants';
import { imageFilter } from 'src/utils/image-filter';
import { User } from 'src/decorators/user.decorator';
import { coverStorage } from './cover.storage';
import { PollsService } from './polls.service';
import { CreatePollDto } from './dto/create.dto';
import { UpdatePollDto } from './dto/update.dto';
import { OptionalJwtAuthGuard } from 'src/auth/optional-jwt-auth.guard';
import { AccessTokenAuthGuard } from 'src/auth/access-token-auth.guard';
import { RequestUser } from 'src/types/req-user';

@Controller('polls')
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @UseGuards(AccessTokenAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Get('/active-counts')
  async getActiveCounts(@User() requestUser: RequestUser) {
    const count = await this.pollsService.getActiveCounts(requestUser.id);
    return { count };
  }
  @UseGuards(AccessTokenAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('cover', {
      storage: coverStorage,
      fileFilter: imageFilter,
      limits: {
        fieldSize: TWO_MEGABYTES_IN_BYTES,
      },
    }),
  )
  @Post('/')
  async create(
    @Body() createPollDto: CreatePollDto,
    @UploadedFile() cover: Express.Multer.File,
    @User() requestUser: RequestUser,
  ) {
    const tagIds = createPollDto.tag_ids?.map((tag_id) => +tag_id);
    Reflect.deleteProperty(createPollDto, 'tag_ids');
    const poll = await this.pollsService.create({
      poll: createPollDto,
      coverPath: cover?.filename,
      ownerId: requestUser.id,
      tagIds: tagIds ?? [],
    });
    return poll;
  }

  @UseGuards(AccessTokenAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Patch('/:id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @User() requestUser: RequestUser,
    @Body() updatePollDto: UpdatePollDto,
  ) {
    const updatedPoll = await this.pollsService.update({
      filters: { ownerId: requestUser.id, id },
      data: updatePollDto,
    });

    return updatedPoll;
  }

  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Get('/:idOrShortIdentifier')
  async findOne(
    @Param('idOrShortIdentifier') idOrShortIdentifier: number | string,
    @User() requestUser?: RequestUser,
  ) {
    const poll = await this.pollsService.findOne({
      idOrShortIdentifier,
      ownerId: requestUser?.id,
    });

    return poll;
  }

  @HttpCode(HttpStatus.OK)
  @Get('/')
  async findAll(
    @Query('page', ParseIntPipe) page: number,
    @Query('search') search?: string,
    @Query('tag_id') tagId?: string,
    @Query('owner_id') ownerId?: string,
    @Query('owner_username') ownerUsername?: string,
    @Query('is_closed') is_closed?: string,
  ) {
    const polls = await this.pollsService.findAll({
      page,
      search,
      tagId: +tagId, // id tag_id not provided then will be NaN and NaN is falsy,
      ownerId: +ownerId,
      ownerUsername,
      isClosed: is_closed ? (is_closed === 'true' ? true : false) : undefined,
    });
    return polls;
  }

  @UseGuards(AccessTokenAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('/:id')
  async delete(
    @User() requestUser: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.pollsService.delete({ ownerId: requestUser.id, id });
  }
}
