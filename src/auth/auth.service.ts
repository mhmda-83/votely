import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser({
    identifier,
    password,
  }: {
    identifier: string;
    password: string;
  }): Promise<User | null> {
    const user = await this.usersService.findByIdentifier({ identifier });
    if (!user) return null;

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return null;

    return user;
  }

  async findOrCreateUser({
    email,
    provider,
  }: {
    email: string;
    provider: 'local' | 'google';
  }) {
    let user: User;

    user = await this.usersService.findByIdentifier({
      identifier: email,
    });

    if (user) return user;

    user = await this.usersService.create({
      email,
      provider,
      username: email.split('@')[0],
    });

    return user;
  }

  async changePassword({
    currentPassword,
    user,
    newPassword,
  }: {
    user: User;
    currentPassword: string;
    newPassword: string;
  }) {
    const isPasswordValid = user.password
      ? await bcrypt.compare(currentPassword, user.password)
      : true;
    if (!isPasswordValid)
      throw new BadRequestException('current password is incorrect.');

    const updatedUser = await this.usersService.update({
      filters: { id: user.id },
      data: {
        password: newPassword,
      },
    });

    return updatedUser;
  }

  async getAccessToken(user: { id: number; username: string; email: string }) {
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
    };
    const accessToken = this.jwtService.signAsync(payload, {
      algorithm: 'HS256',
      expiresIn:
        this.configService.get<string>(
          'ACCESS_TOKEN_EXPIRATION_TIME_IN_MINUTES',
        ) + 'm',
      secret: this.configService.get<string>('ACCESS_TOKEN_SECRET'),
    });
    return accessToken;
  }

  async getRefreshToken(user: { id: number }) {
    const payload = {
      sub: user.id,
    };
    const refreshToken = await this.jwtService.signAsync(payload, {
      algorithm: 'HS256',
      expiresIn:
        this.configService.get<string>(
          'REFRESH_TOKEN_EXPIRATION_TIME_IN_MINUTES',
        ) + 'm',
      secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
    });

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);

    await this.usersService.updateOne(
      { id: user.id },
      { refreshToken: hashedRefreshToken },
    );

    return refreshToken;
  }

  async isRefreshTokenValid({
    refreshToken,
    user,
  }: {
    refreshToken: string;
    user: User;
  }) {
    if (!user.refresh_token)
      throw new BadRequestException('user has no refresh token.');
    const isValid = await bcrypt.compare(refreshToken, user.refresh_token);
    return isValid;
  }
}
