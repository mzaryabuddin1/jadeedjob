import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ApiExceptionFilter } from './common/errors/api-exception.filter';
import { RedisIoAdapter } from './chat/redis-io.adapter';
import { validateRuntimeConfiguration } from './config/validate-runtime-configuration';

const packageJson = require('../package.json') as { version?: string };

async function bootstrap() {
  validateRuntimeConfiguration();
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new ApiExceptionFilter());
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  const configuredOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin:
      configuredOrigins.length > 0
        ? configuredOrigins
        : process.env.NODE_ENV === 'production'
          ? false
          : true,
    credentials: true,
  });

  if (['staging', 'production'].includes(process.env.NODE_ENV || '')) {
    const redisAdapter = new RedisIoAdapter(app);
    await redisAdapter.connect();
    app.useWebSocketAdapter(redisAdapter);
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle('JadeedJob API')
    .setVersion(packageJson.version ?? '0.0.1')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, {
    jsonDocumentUrl: 'docs-json',
  });

  if ((process.env.NODE_ENV || 'development') === 'development') {
    app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));
  }

  await app.listen(Number(process.env.PORT || 3000), '0.0.0.0');
}
bootstrap();
