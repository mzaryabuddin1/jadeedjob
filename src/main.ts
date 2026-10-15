import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';
import { setupSwagger } from './swagger/swagger.setup';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors();
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));
  app.use(express.static(join(__dirname, '..', 'public')));

  setupSwagger(app);

  await app.listen(3000, '0.0.0.0');
  console.log(`API running on http://localhost:3000`);
  console.log(`Swagger docs: http://localhost:3000/docs`);
  console.log(`Google login test: http://localhost:3000/google-login.html`);
}
bootstrap();
