import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { FilterService } from '../filter/filter.service';

/**
 * Seed job filters with Tabler icon JSON.
 *
 *   npm run seed:filters
 *   npm run seed:filters -- --user=1
 *   npm run seed:filters -- --update-icons   # refresh icons on existing rows
 *   npm run seed:filters -- --pending       # create as pending (not approved)
 */
async function run() {
  const createdByArg = process.argv.find((a) => a.startsWith('--user='));
  const createdBy = createdByArg
    ? Number(createdByArg.split('=')[1])
    : undefined;

  const pending = process.argv.includes('--pending');
  const updateIcons = process.argv.includes('--update-icons');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const filterService = app.get(FilterService);
    const { created, updated, skipped } = await filterService.seedFakeFilters({
      createdBy,
      approve: !pending,
      updateIcons,
    });

    console.log('\n✅ Filter seed finished (Tabler icons)');
    console.log(`   Created: ${created.length}`);
    console.log(`   Updated icons: ${updated.length}`);
    console.log(`   Skipped (already exist): ${skipped.length}`);

    if (created.length) {
      console.log('\n   New filters:');
      created.forEach((f) =>
        console.log(
          `   - [${f.id}] ${f.name} → ${JSON.stringify(f.icon)} (${f.approvalStatus})`,
        ),
      );
    }

    if (updated.length) {
      console.log('\n   Updated icons:');
      updated.forEach((f) =>
        console.log(`   - [${f.id}] ${f.name} → ${JSON.stringify(f.icon)}`),
      );
    }

    if (skipped.length) {
      console.log(
        '\n   Skipped names (use --update-icons to refresh):',
        skipped.join(', '),
      );
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
