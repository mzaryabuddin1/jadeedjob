import { NestFactory } from '@nestjs/core';
import { config } from 'dotenv';
import { resolve } from 'path';
import { AppModule } from '../app.module';
import { CityService } from '../city/city.service';

config({ path: resolve(process.cwd(), '.env') });

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const cityService = app.get(CityService);
    const { created, skipped, countryId } =
      await cityService.seedPakistanCities();

    console.log('\n✅ City seed finished (Pakistan)');
    console.log(`   Country ID: ${countryId}`);
    console.log(`   Created: ${created.length}`);
    console.log(`   Skipped (already exist): ${skipped.length}`);

    if (created.length) {
      console.log('\n   New cities:');
      created.forEach((c) => console.log(`   - [${c.id}] ${c.name}`));
    }

    if (skipped.length) {
      console.log('\n   Skipped names:', skipped.join(', '));
    }

    console.log('');
  } finally {
    await app.close();
  }
}

run().catch((err) => {
  console.error('❌ seed:cities failed:', err.message || err);
  process.exit(1);
});
