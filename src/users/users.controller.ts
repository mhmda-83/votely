import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';

import { AccessTokenAuthGuard } from 'src/auth/access-token-auth.guard';
import { User } from 'src/decorators/user.decorator';
import { RequestUser } from 'src/types/req-user';
import { UpdateUserDto } from './dto/update.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AccessTokenAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Patch('/me')
  async update(
    @User() requestUser: RequestUser,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const updatedUser = await this.usersService.update({
      filters: {
        id: requestUser.id,
      },
      data: updateUserDto,
    });

    return updatedUser;
  }
}
