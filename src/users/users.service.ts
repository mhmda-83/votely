import { ConflictException, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as _ from 'lodash';

import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async findByIdentifier({ identifier }: { identifier: string }) {
    const users = await this.prismaService.user.findMany({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    const user = users[0];

    return user;
  }

  async findById(id: number) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
    });

    return user;
  }

  async create(user: CreateUserDto) {
    if (user.password) {
      const hashedPassword = await bcrypt.hash(user.password, 12);
      user.password = hashedPassword;
    }

    let newUser: User;
    try {
      newUser = await this.prismaService.user.create({
        data: user,
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          `a user with this ${error.meta.target[0]} already exists.`,
        );
      }
      console.dir({ error }, { depth: null });
      throw error;
    }

    return newUser;
  }

  async update({
    filters: { id },
    data: { password, username },
  }: {
    filters: { id: number };
    data: { password?: string; username?: string };
  }) {
    try {
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 12);
        password = hashedPassword;
      }

      const updatedUser = await this.prismaService.user.update({
        where: { id },
        data: {
          ...(password && { password }),
          ...(username && { username }),
        },
      });

      return updatedUser;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          `there is duplicate value with this ${error.meta.target.join(', ')}.`,
        );
      }
      console.dir({ error }, { depth: null });
      throw error;
    }
  }

  async updateOne(filters: { id: number }, data: { refreshToken?: string }) {
    try {
      const updatedUser = await this.prismaService.user.update({
        where: {
          id: filters.id,
        },
        data: {
          ...(!_.isUndefined(data.refreshToken) && {
            refresh_token: data.refreshToken,
          }),
        },
      });
      return updatedUser;
    } catch (error) {
      console.error({ errorOnUpdateOneUser: error });
      throw error;
    }
  }
}
