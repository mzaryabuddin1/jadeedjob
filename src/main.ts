import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CountriesService } from './countries/countries.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Call Insert Method Once on App Startup
  const countriesService = app.get(CountriesService);
  await countriesService.insertCountries();

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
