import { createConnection } from 'mysql2/promise';

/**
 * One-time rename of the `company_*` columns of `pages` to `page_*`.
 *
 * Runs in the TypeORM factory (app.module.ts) BEFORE `synchronize`, because
 * synchronize would treat a renamed entity column as "drop the old one, add a
 * new one" and silently delete every page's name, logo, description, type and
 * rating. Idempotent: does nothing once renamed (or on a fresh database).
 *
 * Manual run: `npm run migrate:company-to-page`
 */
const RENAMES: [string, string][] = [
  ['company_name', 'page_name'],
  ['company_logo', 'page_logo'],
  ['company_description', 'page_description'],
  ['company_type', 'page_type'],
  ['company_rating', 'page_rating'],
  ['company_rating_count', 'page_rating_count'],
];

export async function migrateCompanyToPageNaming(): Promise<void> {
  const conn = await createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  try {
    const [tables] = await conn.query<any[]>(
      `SELECT 1 FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pages'`,
    );
    if (!tables.length) return; // fresh database

    const [cols] = await conn.query<any[]>(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pages'`,
    );
    const existing = new Set(cols.map((c) => c.COLUMN_NAME));

    for (const [oldName, newName] of RENAMES) {
      if (!existing.has(oldName)) continue; // already migrated

      if (!existing.has(newName)) {
        await conn.query(
          `ALTER TABLE pages RENAME COLUMN \`${oldName}\` TO \`${newName}\``,
        );
        console.log(`[migrate] pages.${oldName} -> pages.${newName}`);
      } else {
        // both exist (new one was created empty): keep the data, drop the old
        await conn.query(
          `UPDATE pages SET \`${newName}\` = \`${oldName}\`
           WHERE \`${newName}\` IS NULL OR \`${newName}\` = ''`,
        );
        await conn.query(`ALTER TABLE pages DROP COLUMN \`${oldName}\``);
        console.log(`[migrate] pages.${oldName} merged into pages.${newName}`);
      }
    }
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  require('dotenv').config();
  migrateCompanyToPageNaming()
    .then(() => console.log('✅ migrate:company-to-page finished'))
    .catch((err) => {
      console.error('❌ migrate:company-to-page failed:', err.message || err);
      process.exit(1);
    });
}
