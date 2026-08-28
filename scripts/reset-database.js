#!/usr/bin/env node
'use strict';

require('dotenv').config();
const mysql = require('mysql2/promise');

async function dropAllTables(connection) {
  await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
  const [tables] = await connection.execute(
    `SELECT TABLE_NAME
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_TYPE = 'BASE TABLE'`,
  );
  for (const row of tables) {
    await connection.execute(`DROP TABLE IF EXISTS \`${row.TABLE_NAME}\``);
  }
  await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
  return tables.length;
}

async function main() {
  const database = String(process.env.DB_DATABASE || '').trim();
  if (!database) throw new Error('DB_DATABASE is required');

  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  };

  let droppedTables = 0;
  try {
    const admin = await mysql.createConnection(config);
    try {
      await admin.execute(`DROP DATABASE IF EXISTS \`${database}\``);
      await admin.execute(
        `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );
      console.log(`Database reset complete: ${database}`);
      return;
    } catch (error) {
      if (error.code !== 'ER_DBACCESS_DENIED_ERROR' && error.code !== 'ER_ACCESS_DENIED_ERROR') {
        throw error;
      }
      console.log('DROP DATABASE not permitted; dropping all tables instead.');
    } finally {
      await admin.end();
    }
  } catch (error) {
    if (error.code !== 'ER_DBACCESS_DENIED_ERROR' && error.code !== 'ER_ACCESS_DENIED_ERROR') {
      throw error;
    }
    console.log('DROP DATABASE not permitted; dropping all tables instead.');
  }

  const connection = await mysql.createConnection({ ...config, database });
  try {
    droppedTables = await dropAllTables(connection);
    console.log(`Dropped ${droppedTables} tables from ${database}.`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
