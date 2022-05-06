import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Poll, Tag, User } from '@prisma/client';
import * as _ from 'lodash';
import { nanoid } from 'nanoid';

import { PrismaService } from 'src/prisma/prisma.service';
import { PAGE_SIZE } from 'src/utils/constants';
import { VotesService } from 'src/votes/votes.service';
import { CreatePollDto } from './dto/create.dto';
import { UpdatePollDto } from './dto/update.dto';

@Injectable()
export class PollsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly votesService: VotesService,
  ) {}

  async create({
    poll,
    coverPath,
    ownerId,
    tagIds,
  }: {
    poll: CreatePollDto;
    coverPath?: string;
    ownerId: number;
    tagIds: number[];
  }) {
    let newPoll: Poll & { tags?: Tag[] };
    const tags: Tag[] = [];
    try {
      const transactionResult = await this.prismaService.$transaction(
        async (prisma) => {
          let foundPollWithShortIdentifier: any = true;
          let shortIdentifier: string;
          while (foundPollWithShortIdentifier) {
            shortIdentifier = nanoid(5);
            foundPollWithShortIdentifier = await prisma.poll.findUnique({
              where: {
                short_identifier: shortIdentifier,
              },
            });
          }
          const newPoll = await prisma.poll.create({
            data: {
              ...poll,
              ...(coverPath && { cover: coverPath }),
              owner_id: ownerId,
              options: {
                createMany: {
                  data: poll.options,
                },
              },
              short_identifier: shortIdentifier,
            },
            include: {
              options: true,
            },
          });

          for (const tagId of tagIds) {
            const pollTag = await prisma.pollTag.create({
              data: {
                poll_id: newPoll.id,
                tag_id: tagId,
              },
              select: {
                tag: true,
              },
            });

            tags.push(pollTag.tag);
          }
          return { ...newPoll, tags };
        },
      );
      newPoll = transactionResult;
    } catch (error) {
      console.error({ errorOnCreatePoll: error });
      if (error.code === 'P2003') {
        throw new BadRequestException('there is no tag with this id.');
      }
      if (error.code === 'P2002') {
        throw new BadRequestException(
          `there is duplicate value with this ${error.meta.target.join(', ')}.`,
        );
      }

      console.dir({ errorOnCreatePoll: error }, { depth: null });
      throw error;
    }

    newPoll.tags = tags;

    return newPoll;
  }

  async update({
    filters: { ownerId, id },
    data,
  }: {
    filters: { ownerId: number; id: number };
    data: UpdatePollDto;
  }) {
    try {
      const poll = await this.prismaService.poll.findUnique({ where: { id } });
      if (!poll)
        throw new BadRequestException('there is no poll with this id.');
      if (poll.owner_id !== ownerId)
        throw new ForbiddenException("you can't edit someone else poll.");
      const updatedPoll = await this.prismaService.poll.update({
        where: {
          id,
        },
        data: {
          is_closed: data.is_closed === 'true' ? true : false,
        },
      });
      return updatedPoll;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error({ errorOnUpdatePoll: error });
      throw error;
    }
  }

  async findAll(filters: {
    page: number;
    search?: string;
    tagId?: number;
    ownerId?: number;
    ownerUsername?: string;
    isClosed?: boolean;
  }) {
    const polls = await this.prismaService.poll.findMany({
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      where: {
        ...(filters.search && {
          title: {
            contains: filters.search,
            mode: 'insensitive',
          },
        }),
        ...(filters.tagId && {
          poll_tags: {
            some: {
              tag_id: filters.tagId,
            },
          },
        }),
        ...(filters.ownerId && {
          owner_id: filters.ownerId,
        }),
        ...(filters.ownerUsername && {
          owner: {
            username: filters.ownerUsername,
          },
        }),
        ...(!_.isUndefined(filters.isClosed) && {
          is_closed: filters.isClosed,
        }),
      },
      include: {
        options: true,
        poll_tags: {
          include: {
            tag: true,
          },
        },
        owner: {
          select: {
            id: true,
            username: true,
            photo: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const voteCounts = await this.prismaService.vote.groupBy({
      _count: true,
      by: ['poll_id'],
      where: {
        poll_id: { in: polls.map((poll) => poll.id) },
      },
    });

    const pollsFormatted = polls.map((poll) => {
      const pollFormatted = {
        ...poll,
        tags: poll.poll_tags.map(({ tag }) => tag),
        votes_count:
          voteCounts.find((voterCount) => voterCount.poll_id === poll.id)
            ?._count ?? 0,
      };
      Reflect.deleteProperty(pollFormatted, 'poll_tags');
      return pollFormatted;
    });

    return pollsFormatted;
  }

  async findOne(filters: {
    id?: number;
    shortIdentifier?: string;
    idOrShortIdentifier?: number | string;
    ownerId?: number;
  }) {
    try {
      const poll = await this.prismaService.poll.findUnique({
        include: {
          options: true,
          poll_tags: {
            include: {
              tag: true,
            },
          },
          owner: {
            select: {
              id: true,
              username: true,
              photo: true,
            },
          },
        },
        where: {
          ...(filters.id && { id: filters.id }),
          ...(filters.shortIdentifier && {
            short_identifier: filters.shortIdentifier,
          }),
          ...(filters.idOrShortIdentifier &&
          _.isNaN(+filters.idOrShortIdentifier)
            ? {
                short_identifier: filters.idOrShortIdentifier.toString(),
              }
            : {
                id: +filters.idOrShortIdentifier,
              }),
        },
      });

      if (!poll)
        throw new NotFoundException('there is no poll with this identifier.');

      const totalVotesCount = await this.prismaService.vote.count({
        where: {
          poll_id: poll.id,
        },
      });

      const optionsWithStatistics = await this.votesService.getStatistics({
        pollId: poll.id,
        userId: filters.ownerId,
      });

      const pollFormatted = {
        ...poll,
        options: optionsWithStatistics,
        tags: poll.poll_tags.map((pollTag) => pollTag.tag),
        votes_count: totalVotesCount,
      };

      Reflect.deleteProperty(pollFormatted, 'poll_tags');

      return pollFormatted;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error({ errorOnFindOnePoll: error });
      throw error;
    }
  }

  async isUserOwner({ id, user }: { id: number; user: User }) {
    const poll = await this.prismaService.poll.findUnique({
      select: { owner_id: true },
      where: {
        id,
      },
    });
    return poll?.owner_id === user.id;
  }

  async delete({ id, ownerId }: { id: number; ownerId: number }) {
    const poll = await this.prismaService.poll.findUnique({
      where: {
        id,
      },
    });
    if (!poll) throw new NotFoundException('there is no poll with this id.');
    if (poll.owner_id !== ownerId)
      throw new ForbiddenException("you can't delete someone else poll.");
    await this.prismaService.poll.delete({
      where: {
        id,
      },
    });
  }

  async getActiveCounts(ownerId: number) {
    const count = await this.prismaService.poll.count({
      where: {
        owner_id: ownerId,
        is_closed: false,
      },
    });

    return count;
  }
}
