import { NestFactory } from '@nestjs/core';
import { config } from 'dotenv';
import { resolve } from 'path';
import { AppModule } from '../app.module';
import { LanguageService } from '../language/language.service';

config({ path: resolve(process.cwd(), '.env') });

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const languageService = app.get(LanguageService);
    const { created, skipped } = await languageService.seedLanguages();

    console.log('\n✅ Language seed finished');
    console.log(`   Created: ${created.length}`);
    console.log(`   Skipped (already exist): ${skipped.length}`);

    if (created.length) {
      console.log('\n   New languages:');
      created.forEach((l) =>
        console.log(`   - [${l.id}] ${l.name} (${l.code})`),
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
  console.error('❌ seed:languages failed:', err.message || err);
  process.exit(1);
});
