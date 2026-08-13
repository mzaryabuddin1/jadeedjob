#!/usr/bin/env node
'use strict';

const fs = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const {
  DEMO_PASSWORD,
  SEED_NAMESPACE,
  applicationStatusCounts,
  buildFixtures,
} = require('./demo-seed/fixtures');
const {
  assertSchemaReady,
  discoverDemoState,
  seedAll,
} = require('./demo-seed/database');
const {
  SeedMediaStore,
  generateTemplates,
  storageProvider,
} = require('./demo-seed/media-store');

function parseArguments(argv) {
  const options = {
    dryRun: false,
    backupConfirmed: false,
    confirmDatabase: null,
    help: false,
  };
  for (const argument of argv) {
    if (argument === '--dry-run') options.dryRun = true;
    else if (argument === '--backup-confirmed') options.backupConfirmed = true;
    else if (argument === '--help' || argument === '-h') options.help = true;
    else if (argument.startsWith('--confirm-db=')) {
      options.confirmDatabase = argument.slice('--confirm-db='.length).trim();
    } else {
      throw new Error(`Unknown seed option: ${argument}`);
    }
  }
  return options;
}

function publicBaseUrl(env = process.env) {
  return (env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

function databaseConfig(env = process.env) {
  return {
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    multipleStatements: false,
  };
}

function assertRuntimeSafety(options, env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';
  const database = env.DB_DATABASE;
  if (!database) throw new Error('DB_DATABASE is required');
  if (nodeEnv === 'production') {
    throw new Error('Demo seeding is permanently disabled in production');
  }
  if (env.DB_SYNCHRONIZE !== 'false') {
    throw new Error('DB_SYNCHRONIZE must be exactly false before seeding');
  }
  if (!options.dryRun && options.confirmDatabase !== database) {
    throw new Error(
      `Refusing to seed ${database}. Pass --confirm-db=${database} to confirm the exact target.`,
    );
  }
  if (nodeEnv === 'staging') {
    if (env.SEED_ALLOW_STAGING !== 'true') {
      throw new Error('Staging requires SEED_ALLOW_STAGING=true');
    }
    if (!options.dryRun && !options.backupConfirmed) {
      throw new Error('Staging requires --backup-confirmed');
    }
    if (storageProvider(env) !== 's3') {
      throw new Error('Staging demo media requires STORAGE_PROVIDER=s3');
    }
  }
  return { nodeEnv, database };
}

function printHelp() {
  console.log(`JobsLoot deterministic demo seeder

Usage:
  npm run seed:demo -- --dry-run
  npm run seed:demo -- --confirm-db=<database>

Staging additionally requires:
  SEED_ALLOW_STAGING=true npm run seed:demo -- \\
    --confirm-db=<database> --backup-confirmed

Production is never accepted.`);
}

function plannedCounts(fixtures) {
  return {
    users: fixtures.users.length,
    companies: fixtures.companies.length,
    jobs: fixtures.jobs.length,
    applications: fixtures.applications.length,
    applicationStatuses: applicationStatusCounts,
    posts: fixtures.posts.length,
    reels: fixtures.reels.length,
    supportTickets: 8,
    applicationMessages: 160,
    ratings: 24,
  };
}

function validateSeedResult(result) {
  const expected = {
    users: 24,
    companies: 5,
    jobs: 40,
    applications: 60,
    posts: 20,
    reels: 8,
    ratings: 24,
    notifications: 72,
    supportTickets: 8,
  };
  const errors = [];
  for (const [key, value] of Object.entries(expected)) {
    if (result.counts[key] !== value) {
      errors.push(`${key}: expected ${value}, received ${result.counts[key]}`);
    }
  }
  if (result.details.messages < 160) {
    errors.push(
      `messages: expected at least 160, received ${result.details.messages}`,
    );
  }
  if (errors.length) {
    throw new Error(`Seed postcondition failed: ${errors.join('; ')}`);
  }
}

async function removeLegacyMedia(storageKeys) {
  const roots = {
    reels: path.join(process.cwd(), 'uploads', 'reels'),
    'community-posts': path.join(process.cwd(), 'uploads', 'community-posts'),
    'community-post-videos': path.join(
      process.cwd(),
      'uploads',
      'community-post-videos',
    ),
  };
  for (const storageKey of new Set(storageKeys)) {
    const [prefix, ...parts] = String(storageKey).split('/');
    const root = roots[prefix];
    if (!root || !parts.length) continue;
    const target = path.join(root, path.basename(parts.at(-1)));
    const relative = path.relative(root, target);
    if (relative.startsWith('..') || path.isAbsolute(relative)) continue;
    await fs.unlink(target).catch(() => undefined);
  }
}

function sampleAccounts(fixtures) {
  const keys = ['ahmed', 'sara', 'fatima', 'kamran', 'admin'];
  return keys.map((key) => {
    const user = fixtures.users.find((item) => item.key === key);
    return {
      type:
        key === 'ahmed'
          ? 'worker'
          : key === 'sara'
            ? 'employer'
            : key === 'fatima'
              ? 'hybrid'
              : key === 'kamran'
                ? 'incomplete-profile'
                : 'admin',
      phone: user.phone,
      password: DEMO_PASSWORD,
    };
  });
}

async function run(argv = process.argv.slice(2), env = process.env) {
  const options = parseArguments(argv);
  if (options.help) {
    printHelp();
    return;
  }
  const runtime = assertRuntimeSafety(options, env);
  const fixtures = buildFixtures();
  const provider = storageProvider(env);
  const conn = await mysql.createConnection(databaseConfig(env));
  let templates = null;
  let mediaStore = null;
  let transactionStarted = false;

  try {
    await assertSchemaReady(conn);
    const existing = await discoverDemoState(conn, fixtures);
    const report = {
      seedNamespace: SEED_NAMESPACE,
      mode: options.dryRun ? 'dry-run' : 'apply',
      environment: runtime.nodeEnv,
      database: runtime.database,
      publicBaseUrl: publicBaseUrl(env),
      storageProvider: provider,
      cleanup: existing.report,
      planned: plannedCounts(fixtures),
      sampleAccounts: sampleAccounts(fixtures),
    };

    if (options.dryRun) {
      console.log('Demo seed dry-run complete. No data or files were changed.');
      console.log(JSON.stringify(report, null, 2));
      return report;
    }

    templates = await generateTemplates();
    mediaStore = new SeedMediaStore({ env });
    await conn.beginTransaction();
    transactionStarted = true;
    const result = await seedAll(conn, fixtures, mediaStore, templates);
    validateSeedResult(result);
    await conn.commit();
    transactionStarted = false;

    await mediaStore.removeAssets(result.previous.assets);
    await removeLegacyMedia(result.previous.legacyStorageKeys);

    const output = {
      ...report,
      removed: result.previous.report,
      created: result.counts,
      details: {
        messages: result.details.messages,
        ratings: result.details.ratings,
        follows: result.details.follows,
        blocks: result.details.blocks,
        notifications: result.details.notifications,
        support: result.details.support,
      },
    };
    console.log('JobsLoot deterministic demo seed complete.');
    console.log(JSON.stringify(output, null, 2));
    return output;
  } catch (error) {
    if (transactionStarted) await conn.rollback().catch(() => undefined);
    if (mediaStore) await mediaStore.cleanupCreated();
    throw error;
  } finally {
    if (templates) await templates.dispose();
    await conn.end();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error('Demo database seed failed.');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

module.exports = {
  assertRuntimeSafety,
  parseArguments,
  plannedCounts,
  publicBaseUrl,
  run,
  validateSeedResult,
};
