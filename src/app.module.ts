import * as path from 'path';
import Redis from 'ioredis';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RateLimiterGuard, RateLimiterModule } from 'nestjs-rate-limiter';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as Joi from 'joi';

import { PollsModule } from './polls/polls.module';
import { OptionsModule } from './options/options.module';
import { VotesModule } from './votes/votes.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TagsModule } from './tags/tags.module';
import { SEVEN_DAYS_IN_MINUTES } from './utils/constants';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        PORT: Joi.number().default(3000),
        HOST: Joi.string().ip().default('127.0.0.1'),
        DATABASE_URL: Joi.string()
          .uri({ scheme: ['postgres', 'postgresql'] })
          .required(),
        ACCESS_TOKEN_SECRET: Joi.string().min(16).required(),
        REFRESH_TOKEN_SECRET: Joi.string().min(16).required(),
        ACCESS_TOKEN_EXPIRATION_TIME_IN_MINUTES: Joi.number().default(15),
        REFRESH_TOKEN_EXPIRATION_TIME_IN_MINUTES: Joi.number().default(
          SEVEN_DAYS_IN_MINUTES,
        ),
        RATE_LIMIT_POINTS: Joi.number().required(),
        RATE_LIMIT_DURATION: Joi.number().required(),
        ALLOWED_ORIGIN: Joi.string()
          .uri({ scheme: ['http', 'https'] })
          .required(),
        REDIS_URL: Joi.string()
          .uri({ scheme: ['redis'] })
          .required(),
        GOOGLE_CLIENT_ID: Joi.string().required(),
        GOOGLE_CLIENT_SECRET: Joi.string().required(),
      }),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    PollsModule,
    OptionsModule,
    VotesModule,
    ServeStaticModule.forRoot({
      serveRoot: '/covers',
      rootPath: path.resolve(__dirname, '..', 'covers'),
    }),
    RateLimiterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        errorMessage: 'too many requests. please try again later.',
        points: configService.get<number>('RATE_LIMIT_POINTS'),
        duration: configService.get<number>('RATE_LIMIT_DURATION'),
        type: 'Redis',
        storeClient: new Redis(configService.get<string>('REDIS_URL')),
      }),
    }),
    TagsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RateLimiterGuard,
    },
  ],
})
export class AppModule {}
