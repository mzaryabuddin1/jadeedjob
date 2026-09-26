import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';
import { setupSwagger } from './swagger/swagger.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  setupSwagger(app);

  await app.listen(3000, '0.0.0.0');
  console.log(`API running on http://localhost:3000`);
  console.log(`Swagger docs: http://localhost:3000/docs`);
}
bootstrap();
