import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const packageJson = require('../package.json') as { version?: string };

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('JadeedJob API')
    .setVersion(packageJson.version ?? '0.0.1')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, {
    jsonDocumentUrl: 'docs-json',
  });

  // Serve uploaded files
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  await app.listen(3000, '0.0.0.0');
}
bootstrap();
