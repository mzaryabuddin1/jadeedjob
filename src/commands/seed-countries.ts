import { NestFactory } from '@nestjs/core';
import { config } from 'dotenv';
import { resolve } from 'path';
import { AppModule } from '../app.module';
import { CountryService } from '../country/country.service';

config({ path: resolve(process.cwd(), '.env') });

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const countryService = app.get(CountryService);
    const { created, skipped } = await countryService.seedCountries();

    console.log('\n✅ Country seed finished');
    console.log(`   Created: ${created.length}`);
    console.log(`   Skipped (already exist): ${skipped.length}`);

    if (created.length) {
      console.log('\n   New countries:');
      created.forEach((c) =>
        console.log(`   - [${c.id}] ${c.name} (${c.code}) ${c.dial_code}`),
      );
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
  console.error('❌ seed:countries failed:', err.message || err);
  process.exit(1);
});
