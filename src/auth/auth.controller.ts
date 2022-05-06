import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import * as Prisma from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { RateLimit } from 'nestjs-rate-limiter';

import { UsersService } from 'src/users/users.service';
import { User } from 'src/decorators/user.decorator';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './local-auth.guard';
import { GoogleTokenAuthGuard } from './google-token-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthService } from './auth.service';
import { AccessTokenAuthGuard } from './access-token-auth.guard';
import { RequestUser } from 'src/types/req-user';
import { RefreshTokenAuthGuard } from './refresh-token-auth.guard';
import { Request as ExpressRequest } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  @RateLimit({ keyPrefix: 'register', points: 2 })
  async register(@Request() req, @Body() registerDto: RegisterDto) {
    Reflect.deleteProperty(registerDto, 'confirm_password');

    const user = await this.usersService.create({
      ...registerDto,
      provider: 'local',
    });

    const accessToken = await this.authService.getAccessToken({
      id: user.id,
      email: user.email,
      username: user.username,
    });
    const refreshToken = await this.authService.getRefreshToken({
      id: user.id,
    });

    return { access_token: accessToken, refresh_token: refreshToken, user };
  }

  @RateLimit({ keyPrefix: 'login', points: 2 })
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@User() user: Prisma.User) {
    const accessToken = await this.authService.getAccessToken({
      id: user.id,
      email: user.email,
      username: user.username,
    });
    const refreshToken = await this.authService.getRefreshToken({
      id: user.id,
    });

    return { access_token: accessToken, refresh_token: refreshToken, user };
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(GoogleTokenAuthGuard)
  @Post('google-token/login')
  async googleTokenLogin(@User() user: Prisma.User) {
    const accessToken = await this.authService.getAccessToken({
      id: user.id,
      email: user.email,
      username: user.username,
    });
    const refreshToken = await this.authService.getRefreshToken({
      id: user.id,
    });

    return { access_token: accessToken, refresh_token: refreshToken, user };
  }

  @UseGuards(AccessTokenAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@User() requestUser: RequestUser) {
    await this.usersService.updateOne(
      {
        id: requestUser.id,
      },
      { refreshToken: null },
    );
  }

  @UseGuards(AccessTokenAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Get('me')
  async getMe(@User() requestUser: RequestUser) {
    const user = await this.usersService.findById(requestUser.id);
    return user;
  }

  @RateLimit({ keyPrefix: 'change-password', points: 1 })
  @UseGuards(AccessTokenAuthGuard)
  @Patch('change-password')
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @User() requestUser: RequestUser,
  ) {
    const user = await this.usersService.findById(requestUser.id);

    const updatedUser = await this.authService.changePassword({
      currentPassword: changePasswordDto.current_password,
      newPassword: changePasswordDto.new_password,
      user,
    });

    return updatedUser;
  }

  @UseGuards(RefreshTokenAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('/refresh')
  async refresh(
    @User() requestUser: { id: number },
    @Request() req: ExpressRequest,
  ) {
    const user = await this.usersService.findById(requestUser.id);

    if (!user)
      throw new UnauthorizedException('there is no user with this id.');

    const token = req.get('authorization').split('Bearer ')[1];

    const isRefreshTokenValid = await this.authService.isRefreshTokenValid({
      user,
      refreshToken: token,
    });

    if (!isRefreshTokenValid)
      throw new UnauthorizedException(
        'this refresh token has been blacklisted.',
      );

    const accessToken = await this.authService.getAccessToken({
      id: user.id,
      username: user.username,
      email: user.email,
    });

    return {
      access_token: accessToken,
    };
  }
}
