#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const REPO_ROOT = path.resolve(__dirname, '..');

function loadEnv() {
  const envPath = path.join(REPO_ROOT, '.env');
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function dbConfig() {
  loadEnv();
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'jobsloot_staging',
  };
}

async function columnExists(conn, table, column) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS total FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column],
  );
  return Number(rows[0]?.total || 0) > 0;
}

async function indexExists(conn, table, index) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS total FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
    [table, index],
  );
  return Number(rows[0]?.total || 0) > 0;
}

async function constraintExists(conn, table, constraint) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS total FROM information_schema.table_constraints
     WHERE table_schema = DATABASE() AND table_name = ? AND constraint_name = ?`,
    [table, constraint],
  );
  return Number(rows[0]?.total || 0) > 0;
}

async function addColumn(conn, table, column, definition) {
  if (await columnExists(conn, table, column)) return false;
  await conn.query(
    `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`,
  );
  return true;
}

async function addIndex(conn, table, index, columns) {
  if (await indexExists(conn, table, index)) return false;
  await conn.query(
    `CREATE INDEX \`${index}\` ON \`${table}\` (${columns.map((column) => `\`${column}\``).join(', ')})`,
  );
  return true;
}

async function migrate(conn) {
  await addColumn(
    conn,
    'users',
    'systemRole',
    "enum('user','admin') NOT NULL DEFAULT 'user'",
  );

  await addColumn(
    conn,
    'pages',
    'verificationStatus',
    "enum('pending','approved','needs_changes','rejected','suspended') NOT NULL DEFAULT 'pending'",
  );
  await addColumn(conn, 'pages', 'verificationReason', 'text NULL');
  await addColumn(conn, 'pages', 'verifiedAt', 'datetime NULL');
  await addColumn(conn, 'pages', 'verifiedByAdminId', 'int NULL');
  await addIndex(conn, 'pages', 'IDX_pages_verification_status_created_at', [
    'verificationStatus',
    'createdAt',
  ]);
  if (!(await constraintExists(conn, 'pages', 'FK_pages_verified_by_admin'))) {
    await conn.query(
      `ALTER TABLE pages ADD CONSTRAINT FK_pages_verified_by_admin
       FOREIGN KEY (verifiedByAdminId) REFERENCES users(id) ON DELETE SET NULL`,
    );
  }

  await addColumn(
    conn,
    'reels',
    'publisherType',
    "enum('user','company') NOT NULL DEFAULT 'user'",
  );
  await addColumn(conn, 'reels', 'publisherCompanyId', 'int NULL');
  await conn.query(
    "UPDATE reels SET publisherType = 'user', publisherCompanyId = NULL WHERE publisherType IS NULL",
  );
  await addIndex(conn, 'reels', 'IDX_reels_publisher_user_status_created_at', [
    'publisherType',
    'creatorId',
    'status',
    'createdAt',
  ]);
  await addIndex(
    conn,
    'reels',
    'IDX_reels_publisher_company_status_created_at',
    ['publisherType', 'publisherCompanyId', 'status', 'createdAt'],
  );
  if (!(await constraintExists(conn, 'reels', 'FK_reels_publisher_company'))) {
    await conn.query(
      `ALTER TABLE reels ADD CONSTRAINT FK_reels_publisher_company
       FOREIGN KEY (publisherCompanyId) REFERENCES pages(id) ON DELETE RESTRICT`,
    );
  }

  await conn.query(`
    CREATE TABLE IF NOT EXISTS profile_follows (
      id int NOT NULL AUTO_INCREMENT,
      followerUserId int NOT NULL,
      profileType enum('user','company') NOT NULL,
      profileId int NOT NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY UQ_profile_follows_follower_type_profile (followerUserId, profileType, profileId),
      KEY IDX_profile_follows_target_follower (profileType, profileId, followerUserId),
      KEY IDX_profile_follows_follower_target (followerUserId, profileType, profileId),
      CONSTRAINT FK_profile_follows_follower_user
        FOREIGN KEY (followerUserId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await conn.query(`
    INSERT IGNORE INTO profile_follows (followerUserId, profileType, profileId, createdAt)
    SELECT followerId, 'user', creatorId, createdAt
    FROM reel_creator_follows
  `);

  await conn.query(`
    UPDATE page_members
    SET permissions = JSON_SET(
      CASE
        WHEN permissions IS NULL OR JSON_VALID(permissions) = 0 THEN JSON_OBJECT()
        ELSE permissions
      END,
      '$.publishContent',
      IF(
        role IN ('owner', 'admin'),
        JSON_EXTRACT('true', '$'),
        JSON_EXTRACT('false', '$')
      )
    )
    WHERE JSON_EXTRACT(
      CASE
        WHEN permissions IS NULL OR JSON_VALID(permissions) = 0 THEN JSON_OBJECT()
        ELSE permissions
      END,
      '$.publishContent'
    ) IS NULL
  `);
}

async function run() {
  const conn = await mysql.createConnection(dbConfig());
  try {
    await migrate(conn);
    console.log('Reel company publishing migration complete.');
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error('Reel company publishing migration failed.');
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { migrate, columnExists, indexExists, constraintExists };
