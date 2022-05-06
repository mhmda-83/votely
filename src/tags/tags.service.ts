import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from 'src/prisma/prisma.service';
import { PAGE_SIZE } from 'src/utils/constants';
import { CreateTagDto } from './dto/create.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findByTitle(title: string) {
    const tag = await this.prismaService.tag.findUnique({
      where: { title },
    });

    return tag;
  }

  async create(tag: CreateTagDto) {
    const newTag = await this.prismaService.tag.create({ data: tag });
    return newTag;
  }

  async findAll(filters: { page: number; search?: string }) {
    try {
      const tags = await this.prismaService.tag.findMany({
        skip: (filters.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        where: {
          ...(filters.search && {
            title: {
              contains: filters.search,
              mode: 'insensitive',
            },
          }),
        },
        include: {
          _count: {
            select: {
              poll_tags: true,
            },
          },
        },
        orderBy: {
          poll_tags: {
            _count: 'desc',
          },
        },
      });

      if (tags.length === 0) return [];

      const tagIds = tags.map((tag) => tag.id);

      const tagsVoterCount: { tag_id: number; count: number }[] = await this
        .prismaService.$queryRaw`select pt.tag_id, count(pt.tag_id) as "count"
from vote v 
inner join poll_tag pt on pt.poll_id = v.poll_id 
where pt.tag_id in (${Prisma.join(tagIds)})
group by pt.tag_id;`;

      const formattedTags = tags.map((tag) => {
        const formattedTag = {
          ...tag,
          count_of_polls: tag._count.poll_tags,
          count_of_voters:
            tagsVoterCount.find((voterCount) => voterCount.tag_id === tag.id)
              ?.count ?? 0,
        };
        Reflect.deleteProperty(formattedTag, '_count');
        return formattedTag;
      });

      return formattedTags;
    } catch (error) {
      console.error({ errorOnFindAllTags: error });
    }
  }
}
