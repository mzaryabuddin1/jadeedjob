#!/usr/bin/env node
'use strict';

require('dotenv').config();
const { spawnSync } = require('child_process');

const database = String(process.env.DB_DATABASE || '').trim();
if (!database) {
  console.error('DB_DATABASE is required');
  process.exit(1);
}

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const confirm = `--confirm-db=${database}`;

function run(script) {
  const result = spawnSync(
    npmCmd,
    ['run', script, '--', confirm],
    { stdio: 'inherit', shell: true },
  );
  if (result.status !== 0) process.exit(result.status || 1);
}

run('seed:registration-lookups');
run('seed:demo');

console.log(`Seeding complete for ${database}.`);
