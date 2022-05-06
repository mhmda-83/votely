import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ParseJsonPipe } from './pipes/parse-json.pipe';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);

  const isProduction: boolean =
    configService.get<string>('NODE_ENV') === 'production';

  app.set('trust proxy', 1);

  app.use(helmet());

  app.useGlobalPipes(new ParseJsonPipe());
  app.useGlobalPipes(
    new ValidationPipe({
      enableDebugMessages: !isProduction,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: configService.get('ALLOWED_ORIGIN'),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  await app.listen(3000, configService.get('HOST'));
}

bootstrap();
