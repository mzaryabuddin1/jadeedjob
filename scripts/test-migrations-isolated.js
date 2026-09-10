#!/usr/bin/env node
'use strict';

require('ts-node/register');
require('tsconfig-paths/register');
require('dotenv').config();

const crypto = require('crypto');
const { spawnSync } = require('child_process');
const mysql = require('mysql2/promise');
const { COUNTRIES, LANGUAGES } = require('./seed-registration-lookups');

const database = `jobsloot_e2e_migrations_${Date.now()}_${crypto
  .randomBytes(4)
  .toString('hex')}`;

async function main() {
  if (!/^jobsloot_e2e_[a-zA-Z0-9_]+$/.test(database)) {
    throw new Error('Refusing unsafe disposable database name');
  }
  const admin = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
  });
  try {
    await admin.query(
      `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    process.env.NODE_ENV = 'test';
    process.env.DB_DATABASE = database;
    process.env.DB_SYNCHRONIZE = 'false';
    const dataSource = require('../src/database/data-source').default;
    const {
      FreshDatabaseBaseline1785000000000,
    } = require('../src/database/migrations/1785000000000-FreshDatabaseBaseline');
    const {
      AddUnifiedModerationAndLegal1786518000000,
    } = require('../src/database/migrations/1786518000000-AddUnifiedModerationAndLegal');
    await dataSource.initialize();
    try {
      const runner = dataSource.createQueryRunner();
      await runner.connect();
      try {
        const baseline = new FreshDatabaseBaseline1785000000000();
        await baseline.up(runner);
        await runner.query(
          "INSERT INTO users (firstName, lastName, phone, passwordHash, passwordSalt) VALUES ('Migration', 'Sentinel', ?, NULL, NULL)",
          [`e2e-sentinel-${Date.now()}`],
        );
        const before = await runner.query(
          "SELECT id, firstName, lastName FROM users WHERE firstName = 'Migration' AND lastName = 'Sentinel'",
        );
        await runner.query('DROP TABLE `notifications`');
        await baseline.up(runner);
        const after = await runner.query(
          "SELECT id, firstName, lastName FROM users WHERE firstName = 'Migration' AND lastName = 'Sentinel'",
        );
        if (JSON.stringify(before) !== JSON.stringify(after)) {
          throw new Error('Baseline changed populated sentinel data');
        }
        if (!(await runner.hasTable('notifications'))) {
          throw new Error('Baseline did not resume a missing entity table');
        }
        await runner.query(`
          CREATE TABLE IF NOT EXISTS typeorm_migrations (
            id int NOT NULL AUTO_INCREMENT,
            timestamp bigint NOT NULL,
            name varchar(255) NOT NULL,
            PRIMARY KEY (id)
          ) ENGINE=InnoDB
        `);
        await runner.query(
          'INSERT INTO typeorm_migrations (timestamp, name) VALUES (?, ?)',
          [1785000000000, 'FreshDatabaseBaseline1785000000000'],
        );
      } finally {
        await runner.release();
      }
      await dataSource.runMigrations({ transaction: 'each' });
      const migrations = await dataSource.query(
        'SELECT name FROM typeorm_migrations ORDER BY timestamp',
      );
      const required = [
        'FreshDatabaseBaseline1785000000000',
        'ProductionBackendCompletion1785342156433',
        'AddContentAssetReferences1786352400000',
        'AddUnifiedModerationAndLegal1786518000000',
        'HardenIdempotencyDeletionNotifications1786518060000',
        'DecoupleChatInvitations1787000000000',
      ];
      const applied = new Set(migrations.map((item) => item.name));
      const missing = required.filter((name) => !applied.has(name));
      if (missing.length)
        throw new Error(`Missing migrations: ${missing.join(', ')}`);

      await dataSource.query(
        "INSERT INTO countries (name, code, dial_code) VALUES ('Sentinel Country', 'XX', '+999')",
      );
      await dataSource.query(
        "INSERT INTO languages (code, name) VALUES ('zz', 'Sentinel Language')",
      );
      const seederArgs = [
        require.resolve('./seed-registration-lookups'),
        `--confirm-db=${database}`,
      ];
      for (let run = 0; run < 2; run += 1) {
        const seeded = spawnSync(process.execPath, seederArgs, {
          cwd: require('path').join(__dirname, '..'),
          env: {
            ...process.env,
            NODE_ENV: 'test',
            DB_DATABASE: database,
            DB_SYNCHRONIZE: 'false',
          },
          encoding: 'utf8',
        });
        if (seeded.status !== 0) {
          throw new Error(
            `Registration lookup seed run ${run + 1} failed: ${seeded.stderr || seeded.stdout}`,
          );
        }
      }
      const lookupCounts = await dataSource.query(
        `
        SELECT
          (SELECT COUNT(*) FROM countries WHERE code IN (${COUNTRIES.map(() => '?').join(', ')})) AS countries,
          (SELECT COUNT(*) FROM languages WHERE code IN (${LANGUAGES.map(() => '?').join(', ')})) AS languages,
          (SELECT COUNT(*) FROM countries WHERE code = 'XX' AND name = 'Sentinel Country') AS sentinelCountry,
          (SELECT COUNT(*) FROM languages WHERE code = 'zz' AND name = 'Sentinel Language') AS sentinelLanguage
      `,
        [
          ...COUNTRIES.map((item) => item.code),
          ...LANGUAGES.map((item) => item.code),
        ],
      );
      const lookupResult = lookupCounts[0] || {};
      if (
        Number(lookupResult.countries) !== COUNTRIES.length ||
        Number(lookupResult.languages) !== LANGUAGES.length ||
        Number(lookupResult.sentinelCountry) !== 1 ||
        Number(lookupResult.sentinelLanguage) !== 1
      ) {
        throw new Error(
          `Registration lookup seed was not idempotent or changed sentinel data: ${JSON.stringify(lookupResult)}`,
        );
      }

      const legacyRunner = dataSource.createQueryRunner();
      await legacyRunner.connect();
      try {
        const owner = await legacyRunner.query(
          "INSERT INTO users (firstName, lastName, phone, passwordHash, passwordSalt) VALUES ('Legacy', 'Owner', ?, NULL, NULL)",
          [`e2e-legacy-owner-${Date.now()}`],
        );
        const reporter = await legacyRunner.query(
          "INSERT INTO users (firstName, lastName, phone, passwordHash, passwordSalt) VALUES ('Legacy', 'Reporter', ?, NULL, NULL)",
          [`e2e-legacy-reporter-${Date.now()}`],
        );
        const post = await legacyRunner.query(
          "INSERT INTO community_posts (creatorId, publisherType, body) VALUES (?, 'user', 'Legacy migration fixture')",
          [owner.insertId],
        );
        const postReport = await legacyRunner.query(
          "INSERT INTO community_post_reports (postId, userId, reason, details) VALUES (?, ?, 'other', 'Legacy fixture')",
          [post.insertId, reporter.insertId],
        );
        const reel = await legacyRunner.query(
          "INSERT INTO reels (creatorId, publisherType, caption, category) VALUES (?, 'user', 'Legacy migration fixture', 'community')",
          [owner.insertId],
        );
        const reelReport = await legacyRunner.query(
          "INSERT INTO reel_reports (reelId, reporterUserId, reason, details) VALUES (?, ?, 'other', 'Legacy fixture')",
          [reel.insertId, reporter.insertId],
        );

        const moderationMigration =
          new AddUnifiedModerationAndLegal1786518000000();
        await moderationMigration.up(legacyRunner);
        await moderationMigration.up(legacyRunner);

        const canonical = await legacyRunner.query(
          `SELECT legacySourceType, legacySourceId
           FROM moderation_reports
           WHERE (legacySourceType = 'post_report' AND legacySourceId = ?)
              OR (legacySourceType = 'reel_report' AND legacySourceId = ?)`,
          [postReport.insertId, reelReport.insertId],
        );
        if (canonical.length !== 2) {
          throw new Error('Legacy reports were not backfilled exactly once');
        }
        const audits = await legacyRunner.query(
          `SELECT COUNT(*) AS total
           FROM moderation_audits
           WHERE dedupeKey IN (?, ?)`,
          [
            `legacy:post_report:${postReport.insertId}`,
            `legacy:reel_report:${reelReport.insertId}`,
          ],
        );
        if (Number(audits[0]?.total) !== 2) {
          throw new Error(
            'Legacy moderation audits were not backfilled exactly once',
          );
        }
      } finally {
        await legacyRunner.release();
      }
      process.stdout.write(`Migration fixtures passed in ${database}\n`);
    } finally {
      await dataSource.destroy();
    }
  } finally {
    await admin
      .query(`DROP DATABASE IF EXISTS \`${database}\``)
      .catch(() => undefined);
    await admin.end();
  }
}

main().catch((error) => {
  const code = error?.code || error?.name || 'MIGRATION_TEST_FAILED';
  const message =
    error?.message || String(error || 'Unknown migration failure');
  process.stderr.write(`${code}: ${message}\n`);
  process.exitCode = 1;
});
