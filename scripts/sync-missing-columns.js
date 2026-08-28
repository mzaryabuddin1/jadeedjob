#!/usr/bin/env node
'use strict';

require('dotenv').config();
require('reflect-metadata');

const { join } = require('path');
const { DataSource } = require('typeorm');

async function main() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [join(__dirname, '..', 'src', '**', '*.entity.{ts,js}')],
    synchronize: false,
    legacySpatialSupport: false,
  });

  await dataSource.initialize();
  try {
    const builder = dataSource.driver.createSchemaBuilder();
    const { upQueries } = await builder.log();
    const safeQueries = upQueries.filter(({ query }) => {
      const sql = query.trim().toUpperCase();
      return (
        sql.startsWith('ALTER TABLE') &&
        (sql.includes(' ADD ') ||
          sql.includes(' CHANGE ') ||
          sql.includes(' MODIFY '))
      );
    });

    if (!safeQueries.length) {
      console.log('No missing columns detected.');
      return;
    }

    console.log(`Applying ${safeQueries.length} schema updates...`);
    for (const { query } of safeQueries) {
      console.log(`\n> ${query.trim().slice(0, 160)}${query.length > 160 ? '...' : ''}`);
      await dataSource.query(query);
    }
    console.log('\nSchema sync complete.');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
