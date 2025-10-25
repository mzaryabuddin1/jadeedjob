import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // await app.listen(process.env.PORT ?? 3000);
    // Serve uploaded files
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));
  await app.listen(3000, '0.0.0.0');
}
bootstrap();
