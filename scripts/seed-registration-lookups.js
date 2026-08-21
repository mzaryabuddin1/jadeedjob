#!/usr/bin/env node
'use strict';

require('dotenv').config();

const mysql = require('mysql2/promise');

const COUNTRIES = [
  { name: 'Pakistan', code: 'PK', dial_code: '+92' },
  { name: 'United Arab Emirates', code: 'AE', dial_code: '+971' },
  { name: 'Saudi Arabia', code: 'SA', dial_code: '+966' },
  { name: 'Qatar', code: 'QA', dial_code: '+974' },
  { name: 'Oman', code: 'OM', dial_code: '+968' },
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ur', name: 'Urdu' },
  { code: 'ar', name: 'Arabic' },
  { code: 'pa', name: 'Punjabi' },
];

function parseArgs(argv) {
  return argv.reduce(
    (result, argument) => {
      if (argument === '--dry-run') {
        result.dryRun = true;
      } else if (argument.startsWith('--confirm-db=')) {
        result.confirmDatabase = argument.slice('--confirm-db='.length).trim();
      } else {
        throw new Error(`Unknown registration lookup seed option: ${argument}`);
      }
      return result;
    },
    { dryRun: false, confirmDatabase: '' },
  );
}

function requireConfiguration(options) {
  const database = String(process.env.DB_DATABASE || '').trim();
  if (!database) throw new Error('DB_DATABASE is required');
  if (options.confirmDatabase !== database) {
    throw new Error(
      `Refusing to seed ${database}. Pass --confirm-db=${database} to confirm the exact target.`,
    );
  }
  if (process.env.DB_SYNCHRONIZE !== 'false') {
    throw new Error('DB_SYNCHRONIZE must be exactly false before seeding');
  }
  return database;
}

async function assertTable(connection, database, table) {
  const [rows] = await connection.execute(
    `SELECT 1
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      LIMIT 1`,
    [database, table],
  );
  if (!rows.length) {
    throw new Error(`Missing ${table} table. Run TypeORM migrations first.`);
  }
}

async function upsertCountry(connection, country) {
  const [rows] = await connection.execute(
    `SELECT id FROM countries
      WHERE UPPER(code) = ? OR LOWER(name) = LOWER(?)
      ORDER BY id ASC LIMIT 1 FOR UPDATE`,
    [country.code, country.name],
  );
  if (rows.length) {
    await connection.execute(
      'UPDATE countries SET name = ?, code = ?, dial_code = ? WHERE id = ?',
      [country.name, country.code, country.dial_code, rows[0].id],
    );
    return 'updated';
  }
  await connection.execute(
    'INSERT INTO countries (name, code, dial_code) VALUES (?, ?, ?)',
    [country.name, country.code, country.dial_code],
  );
  return 'inserted';
}

async function upsertLanguage(connection, language) {
  const [rows] = await connection.execute(
    `SELECT id FROM languages
      WHERE LOWER(code) = LOWER(?) OR LOWER(name) = LOWER(?)
      ORDER BY id ASC LIMIT 1 FOR UPDATE`,
    [language.code, language.name],
  );
  if (rows.length) {
    await connection.execute(
      'UPDATE languages SET code = ?, name = ? WHERE id = ?',
      [language.code, language.name, rows[0].id],
    );
    return 'updated';
  }
  await connection.execute('INSERT INTO languages (code, name) VALUES (?, ?)', [
    language.code,
    language.name,
  ]);
  return 'inserted';
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const database = requireConfiguration(options);
  if (options.dryRun) {
    process.stdout.write(
      `${JSON.stringify(
        {
          dryRun: true,
          database,
          countries: COUNTRIES,
          languages: LANGUAGES,
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database,
  });

  const counts = {
    countries: { inserted: 0, updated: 0 },
    languages: { inserted: 0, updated: 0 },
  };
  try {
    await assertTable(connection, database, 'countries');
    await assertTable(connection, database, 'languages');
    await connection.beginTransaction();
    for (const country of COUNTRIES) {
      counts.countries[await upsertCountry(connection, country)] += 1;
    }
    for (const language of LANGUAGES) {
      counts.languages[await upsertLanguage(connection, language)] += 1;
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    await connection.end();
  }

  process.stdout.write(
    `Registration lookups ready in ${database}: ${JSON.stringify(counts)}\n`,
  );
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}

module.exports = {
  COUNTRIES,
  LANGUAGES,
  parseArgs,
  requireConfiguration,
};
