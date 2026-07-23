#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const root = path.resolve(__dirname, '..');
const POST_TABLE = 'community_posts';
const SESSION_TABLE = 'community_post_video_upload_sessions';
const MEDIA_INDEX = 'IDX_community_posts_media_status_created';
const UPLOAD_ID_INDEX = 'IDX_post_video_upload_id';
const POST_USER_INDEX = 'IDX_post_video_upload_post_user';
const POST_FOREIGN_KEY = 'FK_post_video_upload_post';
const USER_FOREIGN_KEY = 'FK_post_video_upload_user';

const postVideoColumns = [
  {
    name: 'mediaType',
    definition:
      "ENUM('none', 'image', 'video') NOT NULL DEFAULT 'none' AFTER imageStorageKey",
  },
  {
    name: 'mediaStatus',
    definition:
      "ENUM('published', 'upload_pending', 'failed') NOT NULL DEFAULT 'published' AFTER mediaType",
  },
  { name: 'videoUrl', definition: 'VARCHAR(2000) NULL AFTER mediaStatus' },
  {
    name: 'videoStorageKey',
    definition: 'VARCHAR(500) NULL AFTER videoUrl',
  },
  {
    name: 'videoThumbnailUrl',
    definition: 'VARCHAR(2000) NULL AFTER videoStorageKey',
  },
  {
    name: 'videoThumbnailStorageKey',
    definition: 'VARCHAR(500) NULL AFTER videoThumbnailUrl',
  },
  {
    name: 'videoContentType',
    definition: 'VARCHAR(100) NULL AFTER videoThumbnailStorageKey',
  },
  {
    name: 'videoFileSizeBytes',
    definition: 'INT UNSIGNED NULL AFTER videoContentType',
  },
  {
    name: 'videoDurationSeconds',
    definition: 'INT UNSIGNED NULL AFTER videoFileSizeBytes',
  },
];

const sessionColumns = [
  { name: 'id', definition: 'INT NOT NULL AUTO_INCREMENT', required: true },
  {
    name: 'uploadId',
    definition: 'VARCHAR(255) NOT NULL AFTER id',
    required: true,
  },
  {
    name: 'postId',
    definition: 'INT NOT NULL AFTER uploadId',
    required: true,
  },
  {
    name: 'userId',
    definition: 'INT NOT NULL AFTER postId',
    required: true,
  },
  {
    name: 'replacement',
    definition: 'TINYINT(1) NOT NULL DEFAULT 0 AFTER userId',
  },
  {
    name: 'status',
    definition:
      "ENUM('pending', 'uploaded', 'completed', 'expired', 'failed') NOT NULL DEFAULT 'pending' AFTER replacement",
  },
  {
    name: 'uploadKey',
    definition: 'VARCHAR(500) NULL AFTER status',
  },
  {
    name: 'originalFileName',
    definition: 'VARCHAR(255) NOT NULL AFTER uploadKey',
    required: true,
  },
  {
    name: 'contentType',
    definition: 'VARCHAR(100) NOT NULL AFTER originalFileName',
    required: true,
  },
  {
    name: 'expectedFileSizeBytes',
    definition: 'INT UNSIGNED NULL AFTER contentType',
  },
  {
    name: 'clientDurationSeconds',
    definition: 'INT UNSIGNED NULL AFTER expectedFileSizeBytes',
  },
  {
    name: 'uploadedFileName',
    definition: 'VARCHAR(255) NULL AFTER clientDurationSeconds',
  },
  {
    name: 'localFilePath',
    definition: 'VARCHAR(2000) NULL AFTER uploadedFileName',
  },
  {
    name: 'publicUrl',
    definition: 'VARCHAR(2000) NULL AFTER localFilePath',
  },
  {
    name: 'uploadedFileSizeBytes',
    definition: 'INT UNSIGNED NULL AFTER publicUrl',
  },
  {
    name: 'uploadedDurationSeconds',
    definition: 'INT UNSIGNED NULL AFTER uploadedFileSizeBytes',
  },
  {
    name: 'uploadedContentType',
    definition: 'VARCHAR(100) NULL AFTER uploadedDurationSeconds',
  },
  {
    name: 'expiresAt',
    definition: 'DATETIME NOT NULL AFTER uploadedContentType',
    required: true,
  },
  {
    name: 'completedAt',
    definition: 'DATETIME NULL AFTER expiresAt',
  },
  {
    name: 'errorMessage',
    definition: 'TEXT NULL AFTER completedAt',
  },
  {
    name: 'createdAt',
    definition:
      'DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) AFTER errorMessage',
  },
  {
    name: 'updatedAt',
    definition:
      'DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) AFTER createdAt',
  },
];

function loadEnv() {
  const envPath = path.join(root, '.env');
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

const quoteIdentifier = (value) => `\`${String(value).replace(/`/g, '``')}\``;

async function tableExists(connection, database, tableName) {
  const [rows] = await connection.query(
    `SELECT 1
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
     LIMIT 1`,
    [database, tableName],
  );
  return rows.length > 0;
}

async function getColumnNames(connection, database, tableName) {
  const [rows] = await connection.query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [database, tableName],
  );
  return new Set(rows.map((row) => row.COLUMN_NAME));
}

async function getIndexes(connection, database, tableName) {
  const [rows] = await connection.query(
    `SELECT
       INDEX_NAME,
       NON_UNIQUE,
       GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columnsList
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
     GROUP BY INDEX_NAME, NON_UNIQUE`,
    [database, tableName],
  );
  return rows.map((row) => ({
    name: row.INDEX_NAME,
    unique: Number(row.NON_UNIQUE) === 0,
    columns: String(row.columnsList || '')
      .split(',')
      .filter(Boolean),
  }));
}

async function getForeignKeys(connection, database, tableName) {
  const [rows] = await connection.query(
    `SELECT
       kcu.CONSTRAINT_NAME,
       kcu.COLUMN_NAME,
       kcu.REFERENCED_TABLE_NAME,
       kcu.REFERENCED_COLUMN_NAME,
       rc.DELETE_RULE
     FROM information_schema.KEY_COLUMN_USAGE kcu
     INNER JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
       ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
      AND rc.TABLE_NAME = kcu.TABLE_NAME
      AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
     WHERE kcu.TABLE_SCHEMA = ?
       AND kcu.TABLE_NAME = ?
       AND kcu.REFERENCED_TABLE_NAME IS NOT NULL`,
    [database, tableName],
  );
  return rows.map((row) => ({
    name: row.CONSTRAINT_NAME,
    column: row.COLUMN_NAME,
    referencedTable: row.REFERENCED_TABLE_NAME,
    referencedColumn: row.REFERENCED_COLUMN_NAME,
    deleteRule: row.DELETE_RULE,
  }));
}

const sameColumns = (left, right) =>
  left.length === right.length &&
  left.every((column, index) => column === right[index]);

async function executeChange(connection, actions, label, sql) {
  await connection.query(sql);
  actions.push(label);
}

async function ensureColumns(
  connection,
  database,
  tableName,
  columns,
  actions,
) {
  const existing = await getColumnNames(connection, database, tableName);
  let rowCount = 0;

  if (columns.some((column) => !existing.has(column.name) && column.required)) {
    const [rows] = await connection.query(
      `SELECT COUNT(*) AS rowCount FROM ${quoteIdentifier(tableName)}`,
    );
    rowCount = Number(rows[0]?.rowCount || 0);
  }

  for (const column of columns) {
    if (existing.has(column.name)) continue;
    if (column.name === 'id') {
      throw new Error(
        `${tableName}.id is missing and cannot be repaired safely`,
      );
    }
    if (column.required && rowCount > 0) {
      throw new Error(
        `${tableName}.${column.name} is missing from a non-empty table`,
      );
    }
    await executeChange(
      connection,
      actions,
      `added ${tableName}.${column.name}`,
      `ALTER TABLE ${quoteIdentifier(tableName)}
       ADD COLUMN ${quoteIdentifier(column.name)} ${column.definition}`,
    );
  }
}

async function ensureNamedIndex(
  connection,
  database,
  tableName,
  indexName,
  columns,
  unique,
  actions,
) {
  let indexes = await getIndexes(connection, database, tableName);
  const named = indexes.find((index) => index.name === indexName);

  if (
    named &&
    (!sameColumns(named.columns, columns) || named.unique !== unique)
  ) {
    await executeChange(
      connection,
      actions,
      `removed incompatible index ${indexName}`,
      `ALTER TABLE ${quoteIdentifier(tableName)}
       DROP INDEX ${quoteIdentifier(indexName)}`,
    );
    indexes = await getIndexes(connection, database, tableName);
  }

  if (!indexes.some((index) => index.name === indexName)) {
    const equivalent = indexes.find(
      (index) =>
        index.name !== 'PRIMARY' &&
        sameColumns(index.columns, columns) &&
        index.unique === unique,
    );

    if (equivalent) {
      await executeChange(
        connection,
        actions,
        `added canonical index ${indexName}`,
        `ALTER TABLE ${quoteIdentifier(tableName)}
         ADD ${unique ? 'UNIQUE ' : ''}INDEX ${quoteIdentifier(indexName)}
         (${columns.map(quoteIdentifier).join(', ')})`,
      );
    } else {
      await executeChange(
        connection,
        actions,
        `added index ${indexName}`,
        `ALTER TABLE ${quoteIdentifier(tableName)}
         ADD ${unique ? 'UNIQUE ' : ''}INDEX ${quoteIdentifier(indexName)}
         (${columns.map(quoteIdentifier).join(', ')})`,
      );
    }
  }

  indexes = await getIndexes(connection, database, tableName);
  for (const duplicate of indexes.filter(
    (index) =>
      index.name !== indexName &&
      index.name !== 'PRIMARY' &&
      sameColumns(index.columns, columns) &&
      index.unique === unique,
  )) {
    await executeChange(
      connection,
      actions,
      `removed duplicate index ${duplicate.name}`,
      `ALTER TABLE ${quoteIdentifier(tableName)}
       DROP INDEX ${quoteIdentifier(duplicate.name)}`,
    );
  }
}

async function dropUploadForeignKeysForRepair(connection, database, actions) {
  const foreignKeys = await getForeignKeys(connection, database, SESSION_TABLE);
  const expected = [
    {
      name: POST_FOREIGN_KEY,
      column: 'postId',
      referencedTable: POST_TABLE,
    },
    {
      name: USER_FOREIGN_KEY,
      column: 'userId',
      referencedTable: 'users',
    },
  ];
  const isComplete = expected.every((item) =>
    foreignKeys.some(
      (foreignKey) =>
        foreignKey.name === item.name &&
        foreignKey.column === item.column &&
        foreignKey.referencedTable === item.referencedTable &&
        foreignKey.referencedColumn === 'id' &&
        foreignKey.deleteRule === 'CASCADE',
    ),
  );

  if (isComplete && foreignKeys.length === expected.length) return false;

  for (const foreignKey of foreignKeys.filter((item) =>
    ['postId', 'userId'].includes(item.column),
  )) {
    await executeChange(
      connection,
      actions,
      `removed foreign key ${foreignKey.name}`,
      `ALTER TABLE ${quoteIdentifier(SESSION_TABLE)}
       DROP FOREIGN KEY ${quoteIdentifier(foreignKey.name)}`,
    );
  }
  return true;
}

async function ensureUserForeignKeyIndex(connection, database, actions) {
  let indexes = await getIndexes(connection, database, SESSION_TABLE);
  if (!indexes.some((index) => index.name === USER_FOREIGN_KEY)) {
    const equivalent = indexes.find(
      (index) =>
        index.name !== 'PRIMARY' &&
        sameColumns(index.columns, ['userId']) &&
        !index.unique,
    );
    if (equivalent) {
      await executeChange(
        connection,
        actions,
        `added canonical index ${USER_FOREIGN_KEY}`,
        `ALTER TABLE ${quoteIdentifier(SESSION_TABLE)}
         ADD INDEX ${quoteIdentifier(USER_FOREIGN_KEY)} (${quoteIdentifier(
           'userId',
         )})`,
      );
    } else {
      await executeChange(
        connection,
        actions,
        `added index ${USER_FOREIGN_KEY}`,
        `ALTER TABLE ${quoteIdentifier(SESSION_TABLE)}
         ADD INDEX ${quoteIdentifier(USER_FOREIGN_KEY)} (${quoteIdentifier(
           'userId',
         )})`,
      );
    }
  }

  indexes = await getIndexes(connection, database, SESSION_TABLE);
  for (const duplicate of indexes.filter(
    (index) =>
      index.name !== USER_FOREIGN_KEY &&
      index.name !== 'PRIMARY' &&
      sameColumns(index.columns, ['userId']) &&
      !index.unique,
  )) {
    await executeChange(
      connection,
      actions,
      `removed duplicate index ${duplicate.name}`,
      `ALTER TABLE ${quoteIdentifier(SESSION_TABLE)}
       DROP INDEX ${quoteIdentifier(duplicate.name)}`,
    );
  }
}

async function addUploadForeignKeys(connection, database, actions) {
  const foreignKeys = await getForeignKeys(connection, database, SESSION_TABLE);
  const definitions = [
    {
      name: POST_FOREIGN_KEY,
      column: 'postId',
      referencedTable: POST_TABLE,
    },
    {
      name: USER_FOREIGN_KEY,
      column: 'userId',
      referencedTable: 'users',
    },
  ];

  for (const definition of definitions) {
    if (foreignKeys.some((foreignKey) => foreignKey.name === definition.name)) {
      continue;
    }
    await executeChange(
      connection,
      actions,
      `added foreign key ${definition.name}`,
      `ALTER TABLE ${quoteIdentifier(SESSION_TABLE)}
       ADD CONSTRAINT ${quoteIdentifier(definition.name)}
       FOREIGN KEY (${quoteIdentifier(definition.column)})
       REFERENCES ${quoteIdentifier(definition.referencedTable)} (${quoteIdentifier(
         'id',
       )})
       ON DELETE CASCADE`,
    );
  }
}

async function createSessionTable(connection, actions) {
  await executeChange(
    connection,
    actions,
    `created ${SESSION_TABLE}`,
    `CREATE TABLE ${quoteIdentifier(SESSION_TABLE)} (
      id INT NOT NULL AUTO_INCREMENT,
      uploadId VARCHAR(255) NOT NULL,
      postId INT NOT NULL,
      userId INT NOT NULL,
      replacement TINYINT(1) NOT NULL DEFAULT 0,
      status ENUM('pending', 'uploaded', 'completed', 'expired', 'failed')
        NOT NULL DEFAULT 'pending',
      uploadKey VARCHAR(500) NULL,
      originalFileName VARCHAR(255) NOT NULL,
      contentType VARCHAR(100) NOT NULL,
      expectedFileSizeBytes INT UNSIGNED NULL,
      clientDurationSeconds INT UNSIGNED NULL,
      uploadedFileName VARCHAR(255) NULL,
      localFilePath VARCHAR(2000) NULL,
      publicUrl VARCHAR(2000) NULL,
      uploadedFileSizeBytes INT UNSIGNED NULL,
      uploadedDurationSeconds INT UNSIGNED NULL,
      uploadedContentType VARCHAR(100) NULL,
      expiresAt DATETIME NOT NULL,
      completedAt DATETIME NULL,
      errorMessage TEXT NULL,
      createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (id),
      UNIQUE INDEX ${quoteIdentifier(UPLOAD_ID_INDEX)} (uploadId),
      INDEX ${quoteIdentifier(POST_USER_INDEX)} (postId, userId),
      CONSTRAINT ${quoteIdentifier(POST_FOREIGN_KEY)}
        FOREIGN KEY (postId) REFERENCES ${quoteIdentifier(POST_TABLE)}(id)
        ON DELETE CASCADE,
      CONSTRAINT ${quoteIdentifier(USER_FOREIGN_KEY)}
        FOREIGN KEY (userId) REFERENCES users(id)
        ON DELETE CASCADE
    )`,
  );
}

async function assertMigrationState(connection, database) {
  const postColumns = await getColumnNames(connection, database, POST_TABLE);
  const missingPostColumns = postVideoColumns
    .map((column) => column.name)
    .filter((name) => !postColumns.has(name));
  const sessionColumnNames = await getColumnNames(
    connection,
    database,
    SESSION_TABLE,
  );
  const missingSessionColumns = sessionColumns
    .map((column) => column.name)
    .filter((name) => !sessionColumnNames.has(name));
  const postIndexes = await getIndexes(connection, database, POST_TABLE);
  const sessionIndexes = await getIndexes(connection, database, SESSION_TABLE);
  const foreignKeys = await getForeignKeys(connection, database, SESSION_TABLE);

  const failures = [];
  if (missingPostColumns.length) {
    failures.push(`missing post columns: ${missingPostColumns.join(', ')}`);
  }
  if (missingSessionColumns.length) {
    failures.push(
      `missing upload-session columns: ${missingSessionColumns.join(', ')}`,
    );
  }
  if (
    !postIndexes.some(
      (index) =>
        index.name === MEDIA_INDEX &&
        sameColumns(index.columns, ['mediaStatus', 'deletedAt', 'createdAt']),
    )
  ) {
    failures.push(`missing index ${MEDIA_INDEX}`);
  }
  for (const expected of [
    { name: UPLOAD_ID_INDEX, columns: ['uploadId'], unique: true },
    {
      name: POST_USER_INDEX,
      columns: ['postId', 'userId'],
      unique: false,
    },
  ]) {
    if (
      !sessionIndexes.some(
        (index) =>
          index.name === expected.name &&
          index.unique === expected.unique &&
          sameColumns(index.columns, expected.columns),
      )
    ) {
      failures.push(`missing index ${expected.name}`);
    }
  }
  for (const expected of [
    { name: POST_FOREIGN_KEY, column: 'postId', table: POST_TABLE },
    { name: USER_FOREIGN_KEY, column: 'userId', table: 'users' },
  ]) {
    if (
      !foreignKeys.some(
        (foreignKey) =>
          foreignKey.name === expected.name &&
          foreignKey.column === expected.column &&
          foreignKey.referencedTable === expected.table &&
          foreignKey.referencedColumn === 'id' &&
          foreignKey.deleteRule === 'CASCADE',
      )
    ) {
      failures.push(`missing or invalid foreign key ${expected.name}`);
    }
  }

  if (failures.length) {
    throw new Error(
      `Community post video migration validation failed: ${failures.join('; ')}`,
    );
  }
}

async function main() {
  loadEnv();
  const database = process.env.DB_DATABASE || 'jobsloot_staging';
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database,
  });
  const actions = [];

  try {
    if (!(await tableExists(connection, database, POST_TABLE))) {
      throw new Error(
        `Missing ${POST_TABLE}; run npm run migrate:community-posts first`,
      );
    }

    await ensureColumns(
      connection,
      database,
      POST_TABLE,
      postVideoColumns,
      actions,
    );
    await connection.query(
      `UPDATE ${quoteIdentifier(POST_TABLE)}
       SET mediaType = CASE
         WHEN videoUrl IS NOT NULL THEN 'video'
         WHEN imageUrl IS NOT NULL THEN 'image'
         ELSE 'none'
       END
       WHERE mediaType IS NULL
          OR (mediaType = 'none' AND (videoUrl IS NOT NULL OR imageUrl IS NOT NULL))
          OR (mediaType = 'image' AND videoUrl IS NOT NULL)`,
    );
    await ensureNamedIndex(
      connection,
      database,
      POST_TABLE,
      MEDIA_INDEX,
      ['mediaStatus', 'deletedAt', 'createdAt'],
      false,
      actions,
    );

    if (!(await tableExists(connection, database, SESSION_TABLE))) {
      await createSessionTable(connection, actions);
    } else {
      await ensureColumns(
        connection,
        database,
        SESSION_TABLE,
        sessionColumns,
        actions,
      );
      const repairingForeignKeys = await dropUploadForeignKeysForRepair(
        connection,
        database,
        actions,
      );
      await ensureNamedIndex(
        connection,
        database,
        SESSION_TABLE,
        UPLOAD_ID_INDEX,
        ['uploadId'],
        true,
        actions,
      );
      await ensureNamedIndex(
        connection,
        database,
        SESSION_TABLE,
        POST_USER_INDEX,
        ['postId', 'userId'],
        false,
        actions,
      );
      if (repairingForeignKeys) {
        await ensureUserForeignKeyIndex(connection, database, actions);
        await addUploadForeignKeys(connection, database, actions);
      }
    }

    await assertMigrationState(connection, database);
    if (actions.length) {
      console.log('Community post video migration applied successfully:');
      for (const action of actions) console.log(`- ${action}`);
    } else {
      console.log(
        'Community post video migration already applied; no changes needed.',
      );
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
