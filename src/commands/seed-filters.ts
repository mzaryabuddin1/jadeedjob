import { NestFactory } from '@nestjs/core';
import { config } from 'dotenv';
import { resolve } from 'path';
import { AppModule } from '../app.module';
import { FilterService } from '../filter/filter.service';

config({ path: resolve(process.cwd(), '.env') });

async function run() {
  const createdByArg = process.argv.find((a) => a.startsWith('--user='));
  const createdBy = createdByArg
    ? Number(createdByArg.split('=')[1])
    : undefined;

  const pending = process.argv.includes('--pending');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const filterService = app.get(FilterService);
    const { created, skipped } = await filterService.seedFakeFilters({
      createdBy,
      approve: !pending,
    });

    console.log('\n✅ Filter seed finished');
    console.log(`   Created: ${created.length}`);
    console.log(`   Skipped (already exist): ${skipped.length}`);

    if (created.length) {
      console.log('\n   New filters:');
      created.forEach((f) =>
        console.log(`   - [${f.id}] ${f.name} (${f.approvalStatus})`),
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
  console.error('❌ seed:filters failed:', err.message || err);
  process.exit(1);
});
