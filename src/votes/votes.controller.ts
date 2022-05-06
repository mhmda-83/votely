import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import * as Prisma from '@prisma/client';

import { User } from 'src/decorators/user.decorator';
import { PollsService } from 'src/polls/polls.service';
import { CreateVoteDto } from './dto/create.dto';
import { VotesService } from './votes.service';
import { AccessTokenAuthGuard } from 'src/auth/access-token-auth.guard';
import { RequestUser } from 'src/types/req-user';

@Controller('polls/:pollId')
export class VotesController {
  constructor(
    private readonly votesService: VotesService,
    private readonly pollsService: PollsService,
  ) {}

  @UseGuards(AccessTokenAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @Post('/vote')
  async vote(
    @Param('pollId', ParseIntPipe) pollId: number,
    @User() requestUser: RequestUser,
    @Body() createVoteDto: CreateVoteDto,
  ) {
    await this.votesService.vote({
      userId: requestUser.id,
      optionId: +createVoteDto.option_id,
      pollId,
    });

    const statistics = await this.votesService.getStatistics({
      pollId,
      userId: requestUser.id,
    });

    return statistics;
  }

  @UseGuards(AccessTokenAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('/unvote')
  async unvote(
    @Param('pollId', ParseIntPipe) pollId: number,
    @User() requestUser: RequestUser,
  ) {
    const vote = await this.votesService.unvote({
      userId: requestUser.id,
      pollId,
    });

    return vote;
  }
}
