import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { User } from '@prisma/client';
import * as _ from 'lodash';

import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class VotesService {
  constructor(private readonly prismaService: PrismaService) {}

  async vote({
    userId,
    pollId,
    optionId,
  }: {
    userId: number;
    pollId: number;
    optionId: number;
  }) {
    try {
      const option = await this.prismaService.option.findUnique({
        where: { id: optionId },
      });

      if (option?.poll_id !== pollId) {
        throw new BadRequestException('option does not belong to poll');
      }

      const poll = await this.prismaService.poll.findUnique({
        where: { id: pollId },
      });

      if (!poll) throw new BadRequestException('poll does not exist');

      if (poll.is_closed) throw new ConflictException('this poll is closed');

      const vote = await this.prismaService.vote.create({
        data: {
          choice_id: optionId,
          poll_id: pollId,
          voter_id: userId,
        },
      });
      return vote;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('you have already voted');
      }
      if (error instanceof HttpException) throw error;
      console.error({ errorOnCreateVote: error });
      throw error;
    }
  }

  async unvote({ userId, pollId }: { userId: number; pollId: number }) {
    try {
      const poll = await this.prismaService.poll.findUnique({
        where: { id: pollId },
      });

      if (!poll) throw new BadRequestException('poll does not exist');

      if (poll.is_closed) throw new ConflictException('this poll is closed');

      const vote = await this.prismaService.vote.delete({
        where: {
          poll_id_voter_id: {
            poll_id: pollId,
            voter_id: userId,
          },
        },
      });
      return vote;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new BadRequestException('you have not voted');
      }
      if (error instanceof HttpException) throw error;
      console.error({ errorOnDeleteVote: error });
      throw error;
    }
  }

  async getStatistics({ pollId, userId }: { pollId: number; userId?: number }) {
    const userVote =
      userId &&
      (await this.prismaService.vote.findUnique({
        where: {
          poll_id_voter_id: {
            poll_id: pollId,
            voter_id: userId,
          },
        },
      }));

    const isUserVotedForPoll = userId
      ? await this.isUserVoted({
          pollId,
          userId,
        })
      : false;

    const poll = await this.prismaService.poll.findUnique({
      where: { id: pollId },
    });

    const isUserOwnerOfPoll = poll.owner_id === userId ?? false;

    const isUserAllowedToSeeStatistics =
      isUserVotedForPoll || isUserOwnerOfPoll || poll.is_closed;

    const votesCount = isUserAllowedToSeeStatistics
      ? await this.prismaService.vote.groupBy({
          _count: true,
          by: ['choice_id'],
          where: {
            poll_id: pollId,
          },
        })
      : null;

    const options = await this.prismaService.option.findMany({
      where: {
        poll_id: pollId,
      },
    });

    const totalVoteCount = _.sumBy(votesCount, '_count');

    const formattedOptions = options.map((option) => {
      const optionVotesCount: number = isUserAllowedToSeeStatistics
        ? votesCount.find((voteCount) => voteCount.choice_id === option.id)
            ?._count ?? 0
        : null;
      return {
        ...option,
        votes_count: optionVotesCount,
        percentage: isUserAllowedToSeeStatistics
          ? totalVoteCount === 0
            ? 0
            : Math.floor((optionVotesCount / totalVoteCount) * 100)
          : null,
        is_user_voted: isUserAllowedToSeeStatistics
          ? userVote?.choice_id === option.id
          : null,
      };
    });

    return formattedOptions;
  }

  async isUserVoted({ userId, pollId }: { userId: number; pollId: number }) {
    const vote = await this.prismaService.vote.findUnique({
      select: {
        id: true,
      },
      where: {
        poll_id_voter_id: {
          poll_id: pollId,
          voter_id: userId,
        },
      },
    });
    return !!vote;
  }
}
