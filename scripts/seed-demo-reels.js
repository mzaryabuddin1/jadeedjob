#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');

const REPO_ROOT = path.resolve(__dirname, '..');
const DEMO_PASSWORD = 'Demo@1234!';
const DEMO_REEL_STORAGE_PREFIX = 'reels/demo/';
const DEMO_REEL_UPLOAD_SUBDIR = 'demo';

const DEMO_REEL_CREATORS = [
  {
    key: 'jadeedCrew',
    phone: '0300001901',
    email: 'reels.jadeed.crew@example.com',
    firstName: 'Jadeed',
    lastName: 'Crew',
    full_name: 'Jadeed Crew',
    profile_photo: 'https://i.pravatar.cc/160?img=12',
  },
  {
    key: 'brightFix',
    phone: '0300001902',
    email: 'reels.brightfix@example.com',
    firstName: 'BrightFix',
    lastName: 'Services',
    full_name: 'BrightFix Services',
    profile_photo: 'https://i.pravatar.cc/160?img=32',
  },
  {
    key: 'areebaWorks',
    phone: '0300001903',
    email: 'reels.areeba@example.com',
    firstName: 'Areeba',
    lastName: 'Works',
    full_name: 'Areeba Works',
    profile_photo: 'https://i.pravatar.cc/160?img=47',
  },
  {
    key: 'mariaTheodore',
    phone: '0300001904',
    email: 'reels.maria@example.com',
    firstName: 'Maria',
    lastName: 'Theodore',
    full_name: 'Maria Theodore',
    profile_photo: 'https://i.pravatar.cc/160?img=5',
  },
];

const DEMO_REELS = [
  {
    key: 'community-kitchen-shift',
    sourceFileName: 'video-1.mp4',
    targetFileName: 'community-kitchen-shift.mp4',
    creatorKey: 'jadeedCrew',
    category: 'community',
    caption:
      'Busy dinner rush, steady hands, and a helper turning a packed shift into reliable work.',
    audioTitle: 'City shift diary',
    durationSeconds: 51,
    stats: { likes: 82100, comments: 3200, saves: 11700, shares: 9100 },
    linkedJobKey: 'kitchenHelper',
    linkedJobTitle: 'Kitchen Helper for Busy Restaurant',
  },
  {
    key: 'nearby-electrician',
    sourceFileName: 'video-2.mp4',
    targetFileName: 'nearby-electrician.mp4',
    creatorKey: 'brightFix',
    category: 'jobs',
    caption:
      'A quick look at what makes a reliable electrician helper stand out before the first site visit. Bring clean tools, arrive with a confirmed location, ask what safety gear is needed, and keep the employer updated before every shift. The small details are what turn one day of work into repeat calls.',
    audioTitle: 'Original audio - BrightFix',
    durationSeconds: 8,
    stats: { likes: 45200, comments: 1900, saves: 8800, shares: 6400 },
    linkedJobKey: 'siteElectrician',
    linkedJobTitle: 'Site Electrician for Apartment Project',
  },
  {
    key: 'market-morning',
    sourceFileName: 'video-3.mp4',
    targetFileName: 'market-morning.mp4',
    creatorKey: 'areebaWorks',
    category: 'community',
    caption:
      'Morning prep, clean counters, labeled stock, quick handoffs, and a team rhythm that makes every customer interaction easier.',
    audioTitle: 'Loop mode - warmup',
    durationSeconds: 51,
    stats: { likes: 67300, comments: 4100, saves: 10200, shares: 7300 },
  },
  {
    key: 'social-city-loop',
    sourceFileName: 'video-4.mp4',
    targetFileName: 'social-city-loop.mp4',
    creatorKey: 'mariaTheodore',
    category: 'social',
    caption:
      'Short scenes, deep emotions, and a little movement between the everyday moments.',
    audioTitle: 'Loop Mode (instrumental)',
    durationSeconds: 16,
    stats: { likes: 118000, comments: 18900, saves: 11800, shares: 10000 },
  },
];

const DEMO_REEL_CREATOR_PHONES = DEMO_REEL_CREATORS.map((creator) => creator.phone);

function loadEnv() {
  const envPath = path.resolve(REPO_ROOT, '.env');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const index = trimmed.indexOf('=');
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (value.endsWith(',')) value = value.slice(0, -1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
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
    multipleStatements: false,
  };
}

function defaultMobileAppDir() {
  return path.resolve(REPO_ROOT, '..', '..', 'mobile-app-jadeedjob');
}

function resolveMobileAppDir(options = {}) {
  return path.resolve(
    options.mobileAppDir ||
      process.env.MOBILE_APP_JADEEDJOB_DIR ||
      defaultMobileAppDir(),
  );
}

function resolveReelUploadRoot(options = {}) {
  return path.resolve(
    options.uploadRoot || process.env.REEL_UPLOAD_DIR || path.join(REPO_ROOT, 'uploads', 'reels'),
  );
}

function normalizeAppUrl(options = {}) {
  return String(options.appUrl || process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

function resolveDemoVideoAssets(options = {}) {
  const mobileAppDir = resolveMobileAppDir(options);
  const sourceDir = path.join(mobileAppDir, 'src', 'assets', 'demoVideos');
  const uploadRoot = resolveReelUploadRoot(options);
  const targetDir = path.join(uploadRoot, DEMO_REEL_UPLOAD_SUBDIR);
  const appUrl = normalizeAppUrl(options);

  return DEMO_REELS.map((reel) => {
    const sourcePath = path.join(sourceDir, reel.sourceFileName);
    const targetPath = path.join(targetDir, reel.targetFileName);
    const storageKey = `${DEMO_REEL_STORAGE_PREFIX}${reel.targetFileName}`;

    return {
      ...reel,
      sourcePath,
      targetPath,
      storageKey,
      videoUrl: `${appUrl}/uploads/reels/${DEMO_REEL_UPLOAD_SUBDIR}/${reel.targetFileName}`,
      contentType: 'video/mp4',
    };
  });
}

function buildDemoReelPlan(options = {}) {
  return {
    creators: DEMO_REEL_CREATORS.map((creator) => ({ ...creator })),
    reels: resolveDemoVideoAssets(options),
    uploadRoot: resolveReelUploadRoot(options),
    mobileAppDir: resolveMobileAppDir(options),
    appUrl: normalizeAppUrl(options),
  };
}

function hashPassword(password, phone) {
  const salt = crypto.createHash('sha256').update(`jadeed-demo:${phone}`).digest('hex').slice(0, 32);
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function placeholders(values) {
  return values.map(() => '?').join(',');
}

async function tableExists(conn, tableName) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS total
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [tableName],
  );

  return Number(rows[0]?.total || 0) > 0;
}

async function ensureDemoReelTables(conn) {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS reels (
      id int NOT NULL AUTO_INCREMENT,
      creatorId int NOT NULL,
      publisherType enum('user','company') NOT NULL DEFAULT 'user',
      publisherCompanyId int NULL,
      caption text NOT NULL,
      category enum('community','jobs','social') NOT NULL,
      audioTitle varchar(255) NOT NULL DEFAULT 'Original audio',
      linkedJobId int NULL,
      visibility enum('public','followers','draft') NOT NULL DEFAULT 'public',
      status enum('upload_pending','processing','published','draft','failed','deleted') NOT NULL DEFAULT 'upload_pending',
      allowComments tinyint NOT NULL DEFAULT 1,
      allowSharing tinyint NOT NULL DEFAULT 1,
      videoUrl varchar(2000) NULL,
      storageKey varchar(255) NULL,
      originalFileName varchar(255) NULL,
      contentType varchar(255) NULL,
      fileSizeBytes int unsigned NULL,
      durationSeconds int unsigned NULL,
      likesCount int unsigned NOT NULL DEFAULT 0,
      commentsCount int unsigned NOT NULL DEFAULT 0,
      savesCount int unsigned NOT NULL DEFAULT 0,
      sharesCount int unsigned NOT NULL DEFAULT 0,
      publishedAt datetime NULL,
      processedAt datetime NULL,
      deletedAt datetime NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY IDX_reels_status_visibility_createdAt (status, visibility, createdAt),
      KEY IDX_reels_creatorId_createdAt (creatorId, createdAt),
      KEY IDX_reels_publisher_user_status_created_at (publisherType, creatorId, status, createdAt),
      KEY IDX_reels_publisher_company_status_created_at (publisherType, publisherCompanyId, status, createdAt),
      KEY IDX_reels_storageKey (storageKey)
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS reel_upload_sessions (
      id int NOT NULL AUTO_INCREMENT,
      uploadId varchar(255) NOT NULL,
      reelId int NOT NULL,
      userId int NOT NULL,
      uploadKey varchar(255) NOT NULL,
      storageProvider enum('local','object') NOT NULL DEFAULT 'local',
      status enum('pending','uploaded','completed','expired','failed') NOT NULL DEFAULT 'pending',
      originalFileName varchar(255) NOT NULL,
      contentType varchar(255) NOT NULL,
      expectedFileSizeBytes int unsigned NULL,
      durationSeconds int unsigned NULL,
      uploadedFileName varchar(255) NULL,
      localFilePath varchar(2000) NULL,
      publicUrl varchar(2000) NULL,
      uploadedFileSizeBytes int unsigned NULL,
      uploadedContentType varchar(255) NULL,
      expiresAt datetime NOT NULL,
      completedAt datetime NULL,
      errorMessage text NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY IDX_reel_upload_sessions_uploadId (uploadId),
      KEY IDX_reel_upload_sessions_reelId_userId (reelId, userId)
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS reel_likes (
      id int NOT NULL AUTO_INCREMENT,
      reelId int NOT NULL,
      userId int NOT NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY IDX_reel_likes_reelId_userId (reelId, userId)
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS reel_saves (
      id int NOT NULL AUTO_INCREMENT,
      reelId int NOT NULL,
      userId int NOT NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY IDX_reel_saves_reelId_userId (reelId, userId)
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS reel_comments (
      id int NOT NULL AUTO_INCREMENT,
      reelId int NOT NULL,
      userId int NOT NULL,
      text text NOT NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY IDX_reel_comments_reelId_createdAt (reelId, createdAt)
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS reel_creator_follows (
      id int NOT NULL AUTO_INCREMENT,
      creatorId int NOT NULL,
      followerId int NOT NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY IDX_reel_creator_follows_creator_follower_unique (creatorId, followerId),
      KEY IDX_reel_creator_follows_follower_creator (followerId, creatorId)
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS profile_follows (
      id int NOT NULL AUTO_INCREMENT,
      followerUserId int NOT NULL,
      profileType enum('user','company') NOT NULL,
      profileId int NOT NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY UQ_profile_follows_follower_type_profile (followerUserId, profileType, profileId),
      KEY IDX_profile_follows_target_follower (profileType, profileId, followerUserId),
      KEY IDX_profile_follows_follower_target (followerUserId, profileType, profileId)
    )
  `);
}

async function selectIds(conn, sql, params = []) {
  const [rows] = await conn.execute(sql, params);
  return rows.map((row) => Number(row.id));
}

async function deleteWhere(conn, table, clauses) {
  if (!(await tableExists(conn, table))) return;

  const active = clauses.filter((clause) => clause.values.length > 0);
  if (!active.length) return;

  const where = active.map((clause) => `${clause.column} IN (${placeholders(clause.values)})`).join(' OR ');
  const values = active.flatMap((clause) => clause.values);
  await conn.execute(`DELETE FROM ${table} WHERE ${where}`, values);
}

async function cleanupDemoReelFiles(options = {}) {
  const demoDir = path.join(resolveReelUploadRoot(options), DEMO_REEL_UPLOAD_SUBDIR);
  await fsp.rm(demoDir, { recursive: true, force: true });
}

async function cleanupDemoReelData(conn, options = {}) {
  await ensureDemoReelTables(conn);

  const creatorIds = await selectIds(
    conn,
    `SELECT id FROM users WHERE phone IN (${placeholders(DEMO_REEL_CREATOR_PHONES)})`,
    DEMO_REEL_CREATOR_PHONES,
  );

  const storageKeys = resolveDemoVideoAssets(options).map((reel) => reel.storageKey);
  const storageKeyIds = await selectIds(
    conn,
    `SELECT id FROM reels WHERE storageKey IN (${placeholders(storageKeys)}) OR storageKey LIKE ?`,
    [...storageKeys, `${DEMO_REEL_STORAGE_PREFIX}%`],
  );

  const creatorReelIds = creatorIds.length
    ? await selectIds(
        conn,
        `SELECT id FROM reels WHERE creatorId IN (${placeholders(creatorIds)})`,
        creatorIds,
      )
    : [];

  const reelIds = Array.from(new Set([...storageKeyIds, ...creatorReelIds]));

  await deleteWhere(conn, 'reel_upload_sessions', [
    { column: 'reelId', values: reelIds },
    { column: 'userId', values: creatorIds },
  ]);
  await deleteWhere(conn, 'reel_comments', [
    { column: 'reelId', values: reelIds },
    { column: 'userId', values: creatorIds },
  ]);
  await deleteWhere(conn, 'reel_likes', [
    { column: 'reelId', values: reelIds },
    { column: 'userId', values: creatorIds },
  ]);
  await deleteWhere(conn, 'reel_saves', [
    { column: 'reelId', values: reelIds },
    { column: 'userId', values: creatorIds },
  ]);
  await deleteWhere(conn, 'reel_creator_follows', [
    { column: 'creatorId', values: creatorIds },
    { column: 'followerId', values: creatorIds },
  ]);
  if (creatorIds.length && (await tableExists(conn, 'profile_follows'))) {
    const ids = placeholders(creatorIds);
    await conn.execute(
      `DELETE FROM profile_follows
       WHERE followerUserId IN (${ids})
          OR (profileType = 'user' AND profileId IN (${ids}))`,
      [...creatorIds, ...creatorIds],
    );
  }
  await deleteWhere(conn, 'reels', [{ column: 'id', values: reelIds }]);
  await deleteWhere(conn, 'users', [{ column: 'id', values: creatorIds }]);

  if (options.removeFiles !== false) {
    await cleanupDemoReelFiles(options);
  }
}

async function findLocaleIds(conn) {
  const [[country]] = await conn.execute(
    "SELECT id FROM countries WHERE code = 'PK' OR name = 'Pakistan' ORDER BY id ASC LIMIT 1",
  );
  const [[language]] = await conn.execute(
    "SELECT id FROM languages WHERE code = 'en' OR name = 'English' ORDER BY id ASC LIMIT 1",
  );

  return {
    countryId: country?.id ? Number(country.id) : null,
    languageId: language?.id ? Number(language.id) : null,
  };
}

async function insertDemoReelCreators(conn) {
  const { countryId, languageId } = await findLocaleIds(conn);
  const creatorsByKey = {};

  for (const creator of DEMO_REEL_CREATORS) {
    const { salt, hash } = hashPassword(DEMO_PASSWORD, creator.phone);
    const [result] = await conn.execute(
      `INSERT INTO users (
        email, firstName, lastName, phone, passwordHash, passwordSalt,
        isVerified, isBanned, full_name, profile_photo, professional_summary,
        kyc_status, notes, ratingAverage, ratingCount, countryId, languageId
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        1, 0, ?, ?, ?,
        'approved', ?, 0, 0, ?, ?
      )`,
      [
        creator.email,
        creator.firstName,
        creator.lastName,
        creator.phone,
        hash,
        salt,
        creator.full_name,
        creator.profile_photo,
        `${creator.full_name} demo creator for reel feed testing.`,
        'Demo reel creator for app testing.',
        countryId,
        languageId,
      ],
    );

    creatorsByKey[creator.key] = Number(result.insertId);
  }

  return creatorsByKey;
}

async function copyDemoVideos(plan) {
  const targetDir = path.join(plan.uploadRoot, DEMO_REEL_UPLOAD_SUBDIR);
  await fsp.mkdir(targetDir, { recursive: true });

  for (const reel of plan.reels) {
    await fsp.copyFile(reel.sourcePath, reel.targetPath);
  }
}

async function resolveLinkedJobs(conn, reels, jobsByKey = {}) {
  const linkedJobs = { ...jobsByKey };

  for (const reel of reels) {
    if (!reel.linkedJobKey || linkedJobs[reel.linkedJobKey]) continue;

    const [rows] = await conn.execute(
      'SELECT id FROM jobs WHERE title = ? AND isActive = 1 ORDER BY id DESC LIMIT 1',
      [reel.linkedJobTitle],
    );

    if (rows.length) {
      linkedJobs[reel.linkedJobKey] = Number(rows[0].id);
    }
  }

  return linkedJobs;
}

async function insertDemoReels(conn, plan, creatorsByKey, jobsByKey = {}) {
  const linkedJobs = await resolveLinkedJobs(conn, plan.reels, jobsByKey);
  const insertedReels = {};
  const now = new Date();

  for (const [index, reel] of plan.reels.entries()) {
    if (reel.linkedJobKey && !linkedJobs[reel.linkedJobKey]) {
      throw new Error(`Unable to resolve linked job for demo reel ${reel.key}: ${reel.linkedJobKey}`);
    }

    const stat = await fsp.stat(reel.sourcePath);
    const createdAt = new Date(now.getTime() - index * 60 * 1000);

    const [result] = await conn.execute(
      `INSERT INTO reels (
        creatorId, publisherType, publisherCompanyId, caption, category, audioTitle, linkedJobId, visibility, status,
        allowComments, allowSharing, videoUrl, storageKey, originalFileName,
        contentType, fileSizeBytes, durationSeconds, likesCount, commentsCount,
        savesCount, sharesCount, publishedAt, processedAt, createdAt, updatedAt
      ) VALUES (
        ?, 'user', NULL, ?, ?, ?, ?, 'public', 'published',
        1, 1, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?
      )`,
      [
        creatorsByKey[reel.creatorKey],
        reel.caption,
        reel.category,
        reel.audioTitle,
        reel.linkedJobKey ? linkedJobs[reel.linkedJobKey] : null,
        reel.videoUrl,
        reel.storageKey,
        reel.targetFileName,
        reel.contentType,
        stat.size,
        reel.durationSeconds,
        reel.stats.likes,
        reel.stats.comments,
        reel.stats.saves,
        reel.stats.shares,
        createdAt,
        createdAt,
        createdAt,
        createdAt,
      ],
    );

    insertedReels[reel.key] = Number(result.insertId);
  }

  return insertedReels;
}

async function seedDemoReels(conn, options = {}) {
  const plan = buildDemoReelPlan(options);

  for (const reel of plan.reels) {
    if (!fs.existsSync(reel.sourcePath)) {
      throw new Error(`Missing demo reel video: ${reel.sourcePath}`);
    }
  }

  await ensureDemoReelTables(conn);

  if (options.cleanup !== false) {
    await cleanupDemoReelData(conn, { ...options, removeFiles: true });
  }

  await copyDemoVideos(plan);
  const creatorsByKey = await insertDemoReelCreators(conn);
  const reelsByKey = await insertDemoReels(conn, plan, creatorsByKey, options.jobsByKey || {});

  return {
    creatorsByKey,
    reelsByKey,
    reels: plan.reels.map((reel) => ({
      key: reel.key,
      videoUrl: reel.videoUrl,
      storageKey: reel.storageKey,
    })),
  };
}

async function dryRun(options = {}) {
  const plan = buildDemoReelPlan(options);

  return {
    mobileAppDir: plan.mobileAppDir,
    uploadRoot: plan.uploadRoot,
    appUrl: plan.appUrl,
    creators: plan.creators.map((creator) => ({
      key: creator.key,
      phone: creator.phone,
      full_name: creator.full_name,
    })),
    reels: plan.reels.map((reel) => ({
      key: reel.key,
      sourcePath: reel.sourcePath,
      sourceExists: fs.existsSync(reel.sourcePath),
      targetPath: reel.targetPath,
      videoUrl: reel.videoUrl,
      category: reel.category,
      durationSeconds: reel.durationSeconds,
      linkedJobKey: reel.linkedJobKey || null,
    })),
  };
}

async function run() {
  const isDryRun = process.argv.includes('--dry-run');

  if (isDryRun) {
    console.log(JSON.stringify(await dryRun(), null, 2));
    return;
  }

  const conn = await mysql.createConnection(dbConfig());

  try {
    await conn.beginTransaction();
    const result = await seedDemoReels(conn);
    await conn.commit();
    console.log('Demo reels seed complete.');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    await conn.rollback();
    console.error('Demo reels seed failed.');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  run();
}

module.exports = {
  DEMO_REEL_CREATOR_PHONES,
  DEMO_REEL_CREATORS,
  DEMO_REELS,
  DEMO_REEL_STORAGE_PREFIX,
  buildDemoReelPlan,
  cleanupDemoReelData,
  dryRun,
  ensureDemoReelTables,
  resolveDemoVideoAssets,
  seedDemoReels,
};
