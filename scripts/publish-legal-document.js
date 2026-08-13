#!/usr/bin/env node

require('ts-node/register');
require('tsconfig-paths/register');
require('dotenv').config();

const path = require('path');

function parseArgs(argv) {
  return argv.reduce((result, item) => {
    if (!item.startsWith('--')) return result;
    const separator = item.indexOf('=');
    const key = separator === -1 ? item.slice(2) : item.slice(2, separator);
    const value = separator === -1 ? true : item.slice(separator + 1);
    result[key] = value;
    return result;
  }, {});
}

function required(args, key) {
  const value = String(args[key] || '').trim();
  if (!value) throw new Error(`--${key} is required`);
  return value;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const type = required(args, 'type');
  const version = required(args, 'version');
  const title = required(args, 'title');
  const contentUrl = required(args, 'content-url');
  const effectiveAtText = required(args, 'effective-at');
  const confirmedDatabase = required(args, 'confirm-db');
  if (!['terms', 'privacy', 'community_guidelines'].includes(type)) {
    throw new Error('--type must be terms, privacy, or community_guidelines');
  }
  if (version.length > 80 || title.length > 200 || contentUrl.length > 1000) {
    throw new Error('Legal document metadata exceeds the allowed length');
  }
  const contentUrlValue = new URL(contentUrl);
  if (!['https:', 'http:'].includes(contentUrlValue.protocol)) {
    throw new Error('--content-url must use HTTP or HTTPS');
  }
  const effectiveAt = new Date(effectiveAtText);
  if (Number.isNaN(effectiveAt.getTime())) {
    throw new Error('--effective-at must be a valid ISO timestamp');
  }
  if (confirmedDatabase !== process.env.DB_DATABASE) {
    throw new Error(
      `Database confirmation mismatch: expected ${process.env.DB_DATABASE || '<unset>'}`,
    );
  }

  process.env.DB_SYNCHRONIZE = 'false';
  const dataSourcePath = path.join(
    process.cwd(),
    'src',
    'database',
    'data-source.ts',
  );
  const dataSource = require(dataSourcePath).default;
  await dataSource.initialize();
  try {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    const hasLegalDocuments = await queryRunner.hasTable('legal_documents');
    await queryRunner.release();
    if (!hasLegalDocuments) {
      throw new Error('Run TypeORM migrations before publishing legal documents');
    }
    const result = await dataSource.transaction(async (manager) => {
      const existingRows = await manager.query(
        'SELECT * FROM legal_documents WHERE documentType = ? AND version = ? FOR UPDATE',
        [type, version],
      );
      const existing = existingRows[0];
      if (existing) {
        const same =
          existing.title === title &&
          existing.contentUrl === contentUrl &&
          new Date(existing.effectiveAt).getTime() === effectiveAt.getTime();
        if (!same) {
          throw new Error(
            'This document type/version already exists with different metadata',
          );
        }
      }

      const now = new Date();
      await manager.query(
        'UPDATE legal_documents SET isCurrent = 0, supersededAt = COALESCE(supersededAt, ?) WHERE documentType = ? AND isCurrent = 1 AND version <> ?',
        [now, type, version],
      );
      if (existing) {
        await manager.query(
          'UPDATE legal_documents SET isCurrent = 1, supersededAt = NULL WHERE id = ?',
          [existing.id],
        );
        return { id: existing.id, created: false };
      }
      const inserted = await manager.query(
        'INSERT INTO legal_documents (documentType, version, title, contentUrl, effectiveAt, publishedAt, supersededAt, isCurrent, publishedByAdminId, createdAt) VALUES (?, ?, ?, ?, ?, ?, NULL, 1, NULL, ?)',
        [type, version, title, contentUrl, effectiveAt, now, now],
      );
      return { id: inserted.insertId, created: true };
    });
    process.stdout.write(
      `${result.created ? 'Published' : 'Reactivated'} ${type} ${version} as document ${result.id}\n`,
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
