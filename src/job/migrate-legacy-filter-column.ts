import { createConnection } from 'mysql2/promise';

/**
 * One-time move of the legacy single-category column `jobs.filterId`
 * into the `job_filters` join table, then drops the column.
 *
 * Runs in the TypeORM factory (app.module.ts) BEFORE the DataSource
 * connects — for the app and seed commands alike. `synchronize: true` would drop
 * the column (and its data) because the Job entity no longer maps it.
 * Idempotent — does nothing once the column is gone.
 *
 * Manual run: `npm run migrate:job-filters`
 */
export async function migrateLegacyJobFilterColumn(): Promise<void> {
  const conn = await createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  try {
    const [cols] = await conn.query<any[]>(
      `SELECT 1 FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'jobs' AND COLUMN_NAME = 'filterId'`,
    );
    if (!cols.length) return; // already migrated (or fresh DB)

    const [joinTable] = await conn.query<any[]>(
      `SELECT 1 FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'job_filters'`,
    );
    if (!joinTable.length) {
      throw new Error(
        'jobs.filterId exists but job_filters table is missing — cannot migrate categories',
      );
    }

    const [copied] = await conn.query<any>(
      `INSERT IGNORE INTO job_filters (jobId, filterId)
       SELECT j.id, j.filterId
       FROM jobs j
       JOIN filters f ON f.id = j.filterId
       WHERE j.filterId IS NOT NULL`,
    );

    const [fks] = await conn.query<any[]>(
      `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'jobs'
         AND COLUMN_NAME = 'filterId' AND REFERENCED_TABLE_NAME IS NOT NULL`,
    );
    for (const fk of fks) {
      await conn.query(
        `ALTER TABLE jobs DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``,
      );
    }
    await conn.query('ALTER TABLE jobs DROP COLUMN filterId');

    console.log(
      `[migrate] jobs.filterId → job_filters: ${copied.affectedRows} row(s) copied, column dropped`,
    );
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  require('dotenv').config();
  migrateLegacyJobFilterColumn()
    .then(() => console.log('✅ migrate:job-filters finished'))
    .catch((err) => {
      console.error('❌ migrate:job-filters failed:', err.message || err);
      process.exit(1);
    });
}
