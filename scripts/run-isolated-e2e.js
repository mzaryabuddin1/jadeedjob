#!/usr/bin/env node
'use strict';

require('dotenv').config();

const crypto = require('crypto');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const mysql = require('mysql2/promise');

const suffix = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
const database = `jobsloot_e2e_${suffix}`;
const uploadRoot = path.join(os.tmpdir(), database, 'uploads');

function connectionOptions() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
  };
}

function testEnvironment() {
  return {
    ...process.env,
    NODE_ENV: 'test',
    DB_DATABASE: database,
    DB_SYNCHRONIZE: 'false',
    STORAGE_PROVIDER: 'local',
    LOCAL_UPLOAD_ROOT: uploadRoot,
    GOOGLE_AUTH_ENABLED: 'false',
    FACEBOOK_AUTH_ENABLED: 'false',
    LEGAL_REGISTRATION_ENFORCEMENT_ENABLED: 'false',
    LEGAL_COMMUNITY_ENFORCEMENT_ENABLED: 'false',
    JWT_SECRET:
      process.env.JWT_SECRET || 'jobsloot-e2e-jwt-secret-at-least-32-characters',
    SOCIAL_CHALLENGE_SECRET:
      process.env.SOCIAL_CHALLENGE_SECRET ||
      'jobsloot-e2e-social-secret-at-least-32-characters',
  };
}

function run(command, args, env, quiet = false) {
  const result = spawnSync(command, args, {
    cwd: path.resolve(__dirname, '..'),
    env,
    stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    encoding: quiet ? 'utf8' : undefined,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (quiet) {
      process.stderr.write(String(result.stdout || ''));
      process.stderr.write(String(result.stderr || ''));
    }
    throw new Error(`${command} ${args.join(' ')} exited with ${result.status}`);
  }
  if (quiet) {
    const summary = String(result.stdout || '')
      .split(/\r?\n/)
      .filter((line) => /Migration .*executed successfully|migrations? (are|is) already loaded/i.test(line));
    process.stdout.write(`${summary.join('\n') || 'Migrations completed successfully'}\n`);
  }
}

async function main() {
  if (!/^jobsloot_e2e_[a-zA-Z0-9_]+$/.test(database)) {
    throw new Error('Refusing unsafe disposable database name');
  }
  const admin = await mysql.createConnection(connectionOptions());
  try {
    await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    const env = testEnvironment();
    run('npm', ['run', 'migration:run'], env, true);
    run('npm', ['run', 'test:e2e', '--', ...process.argv.slice(2)], env);
  } finally {
    await admin.query(`DROP DATABASE IF EXISTS \`${database}\``).catch(() => undefined);
    await admin.end();
    await fs.rm(path.join(os.tmpdir(), database), {
      recursive: true,
      force: true,
    });
  }
}

main().catch((error) => {
  const code = error?.code || error?.name || 'E2E_SETUP_FAILED';
  const message = error?.message || String(error || 'Unknown setup failure');
  process.stderr.write(`${code}: ${message}\n`);
  process.exitCode = 1;
});
