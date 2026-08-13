'use strict';

const crypto = require('crypto');
const {
  DEMO_EMAIL_DOMAIN,
  DEMO_PASSWORD,
  SEED_NAMESPACE,
  deterministicUuid,
} = require('./fixtures');

const REQUIRED_MIGRATIONS = [
  'FreshDatabaseBaseline1785000000000',
  'ProductionBackendCompletion1785342156433',
  'AddContentAssetReferences1786352400000',
  'AddUnifiedModerationAndLegal1786518000000',
  'HardenIdempotencyDeletionNotifications1786518060000',
];

const REQUIRED_TABLES = [
  'users',
  'pages',
  'page_members',
  'company_branches',
  'company_access_requests',
  'company_verification_reviews',
  'jobs',
  'job_applications',
  'chat_conversations',
  'chat_participants',
  'chat_read_states',
  'chat_messages',
  'job_invitations',
  'ratings',
  'notifications',
  'notification_preferences',
  'support_tickets',
  'support_ticket_messages',
  'community_posts',
  'community_post_video_upload_sessions',
  'reels',
  'reel_upload_sessions',
  'profile_follows',
  'profile_blocks',
  'stored_assets',
  'legal_documents',
  'user_legal_acceptances',
  'moderation_reports',
  'moderation_audits',
];

const quoteIdentifier = (value) => {
  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    throw new Error(`Unsafe SQL identifier: ${value}`);
  }
  return `\`${value}\``;
};

const csv = (values) => (values?.length ? values.join(',') : null);
const json = (value) => (value == null ? null : JSON.stringify(value));
const placeholders = (values) => values.map(() => '?').join(',');

async function insertRow(conn, table, row) {
  const entries = Object.entries(row).filter(
    ([, value]) => value !== undefined,
  );
  const columns = entries.map(([column]) => quoteIdentifier(column)).join(', ');
  const values = entries.map(([, value]) => value);
  const sql = `INSERT INTO ${quoteIdentifier(table)} (${columns}) VALUES (${placeholders(values)})`;
  const [result] = await conn.execute(sql, values);
  return result;
}

async function updateById(conn, table, id, row) {
  const entries = Object.entries(row).filter(
    ([, value]) => value !== undefined,
  );
  const assignments = entries
    .map(([column]) => `${quoteIdentifier(column)} = ?`)
    .join(', ');
  await conn.execute(
    `UPDATE ${quoteIdentifier(table)} SET ${assignments} WHERE id = ?`,
    [...entries.map(([, value]) => value), id],
  );
}

async function deleteByIds(conn, table, column, ids) {
  if (!ids.length) return;
  await conn.execute(
    `DELETE FROM ${quoteIdentifier(table)} WHERE ${quoteIdentifier(column)} IN (${placeholders(ids)})`,
    ids,
  );
}

function passwordFor(phone) {
  const salt = crypto
    .createHash('sha256')
    .update(`${SEED_NAMESPACE}:${phone}`)
    .digest('hex')
    .slice(0, 32);
  const hash = crypto
    .pbkdf2Sync(DEMO_PASSWORD, salt, 1000, 64, 'sha512')
    .toString('hex');
  return { salt, hash };
}

async function assertSchemaReady(conn) {
  const [tables] = await conn.execute(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()`,
  );
  const available = new Set(tables.map((row) => row.TABLE_NAME));
  const missingTables = REQUIRED_TABLES.filter(
    (table) => !available.has(table),
  );
  if (missingTables.length) {
    throw new Error(`Missing required tables: ${missingTables.join(', ')}`);
  }

  const [migrationRows] = await conn.execute(
    'SELECT name FROM typeorm_migrations ORDER BY id',
  );
  const applied = new Set(migrationRows.map((row) => row.name));
  const missingMigrations = REQUIRED_MIGRATIONS.filter(
    (migration) => !applied.has(migration),
  );
  if (missingMigrations.length) {
    throw new Error(
      `Run npm run migration:run before seeding. Missing: ${missingMigrations.join(', ')}`,
    );
  }
}

async function selectIds(conn, sql, params = []) {
  const [rows] = await conn.execute(sql, params);
  return rows.map((row) => row.id);
}

async function discoverDemoState(conn, fixtures) {
  const phones = fixtures.users.map((user) => user.phone);
  const [userRows] = await conn.execute(
    `SELECT id, phone FROM users
     WHERE phone IN (${placeholders(phones)})
        OR email LIKE ?
        OR phone LIKE '03009900%'`,
    [...phones, `%@${DEMO_EMAIL_DOMAIN}`],
  );
  const userIds = userRows.map((row) => Number(row.id));
  const userClause = userIds.length
    ? `ownerId IN (${placeholders(userIds)})`
    : '0 = 1';
  const companyIds = await selectIds(
    conn,
    `SELECT id FROM pages WHERE username LIKE 'demo-%' OR ${userClause}`,
    userIds,
  );
  const jobConditions = [];
  const jobParams = [];
  if (userIds.length) {
    jobConditions.push(`createdBy IN (${placeholders(userIds)})`);
    jobParams.push(...userIds);
  }
  if (companyIds.length) {
    jobConditions.push(`pageId IN (${placeholders(companyIds)})`);
    jobParams.push(...companyIds);
  }
  const jobIds = jobConditions.length
    ? await selectIds(
        conn,
        `SELECT id FROM jobs WHERE ${jobConditions.join(' OR ')}`,
        jobParams,
      )
    : [];

  const applicationConditions = [];
  const applicationParams = [];
  if (jobIds.length) {
    applicationConditions.push(`jobId IN (${placeholders(jobIds)})`);
    applicationParams.push(...jobIds);
  }
  if (userIds.length) {
    applicationConditions.push(`applicantId IN (${placeholders(userIds)})`);
    applicationParams.push(...userIds);
  }
  const applicationIds = applicationConditions.length
    ? await selectIds(
        conn,
        `SELECT id FROM job_applications WHERE ${applicationConditions.join(' OR ')}`,
        applicationParams,
      )
    : [];

  const conversationConditions = [];
  const conversationParams = [];
  if (applicationIds.length) {
    conversationConditions.push(
      `conversation.applicationId IN (${placeholders(applicationIds)})`,
    );
    conversationParams.push(...applicationIds);
  }
  if (jobIds.length) {
    conversationConditions.push(
      `conversation.jobId IN (${placeholders(jobIds)})`,
    );
    conversationParams.push(...jobIds);
  }
  if (userIds.length) {
    conversationConditions.push(
      `conversation.createdByUserId IN (${placeholders(userIds)})`,
    );
    conversationParams.push(...userIds);
    conversationConditions.push(
      `participant.userId IN (${placeholders(userIds)})`,
    );
    conversationParams.push(...userIds);
  }
  if (companyIds.length) {
    conversationConditions.push(
      `conversation.companyId IN (${placeholders(companyIds)})`,
    );
    conversationParams.push(...companyIds);
  }
  const conversationIds = conversationConditions.length
    ? await selectIds(
        conn,
        `SELECT DISTINCT conversation.id
         FROM chat_conversations conversation
         LEFT JOIN chat_participants participant
           ON participant.conversationId = conversation.id
         WHERE ${conversationConditions.join(' OR ')}`,
        conversationParams,
      )
    : [];

  const postConditions = [];
  const postParams = [];
  if (userIds.length) {
    postConditions.push(`creatorId IN (${placeholders(userIds)})`);
    postParams.push(...userIds);
  }
  if (companyIds.length) {
    postConditions.push(`publisherCompanyId IN (${placeholders(companyIds)})`);
    postParams.push(...companyIds);
  }
  const postIds = postConditions.length
    ? await selectIds(
        conn,
        `SELECT id FROM community_posts WHERE ${postConditions.join(' OR ')}`,
        postParams,
      )
    : [];
  const reelIds = postConditions.length
    ? await selectIds(
        conn,
        `SELECT id FROM reels WHERE ${postConditions.join(' OR ')}`,
        postParams,
      )
    : [];

  const organizationIds = userIds.length
    ? await selectIds(
        conn,
        `SELECT id FROM organizations
         WHERE username LIKE 'demo-%'
            OR createdBy IN (${placeholders(userIds)})`,
        userIds,
      )
    : await selectIds(
        conn,
        "SELECT id FROM organizations WHERE username LIKE 'demo-%'",
      );

  const assetConditions = ["storageKey LIKE 'demo-seed/v2/%'"];
  const assetParams = [];
  if (userIds.length) {
    assetConditions.push(`ownerUserId IN (${placeholders(userIds)})`);
    assetParams.push(...userIds);
  }
  const [assets] = await conn.execute(
    `SELECT id, provider, bucket, storageKey
     FROM stored_assets
     WHERE ${assetConditions.join(' OR ')}`,
    assetParams,
  );

  const legacyStorageKeys = [];
  if (reelIds.length) {
    const [rows] = await conn.execute(
      `SELECT storageKey FROM reels WHERE id IN (${placeholders(reelIds)})`,
      reelIds,
    );
    legacyStorageKeys.push(
      ...rows.map((row) => row.storageKey).filter(Boolean),
    );
  }
  if (postIds.length) {
    const [rows] = await conn.execute(
      `SELECT imageStorageKey, videoStorageKey, videoThumbnailStorageKey
       FROM community_posts WHERE id IN (${placeholders(postIds)})`,
      postIds,
    );
    for (const row of rows) {
      legacyStorageKeys.push(
        ...[
          row.imageStorageKey,
          row.videoStorageKey,
          row.videoThumbnailStorageKey,
        ].filter(Boolean),
      );
    }
  }

  return {
    userIds,
    companyIds,
    jobIds,
    applicationIds,
    conversationIds,
    postIds,
    reelIds,
    organizationIds,
    assets,
    legacyStorageKeys,
    report: {
      users: userIds.length,
      companies: companyIds.length,
      jobs: jobIds.length,
      applications: applicationIds.length,
      conversations: conversationIds.length,
      posts: postIds.length,
      reels: reelIds.length,
      organizations: organizationIds.length,
      assets: assets.length,
    },
  };
}

async function cleanupDemoRecords(conn, state) {
  const {
    userIds,
    companyIds,
    jobIds,
    applicationIds,
    conversationIds,
    postIds,
    reelIds,
    organizationIds,
    assets,
  } = state;

  const moderationConditions = [];
  const moderationParams = [];
  if (userIds.length) {
    const values = placeholders(userIds);
    moderationConditions.push(
      `reporterUserId IN (${values})`,
      `targetOwnerUserId IN (${values})`,
    );
    moderationParams.push(...userIds, ...userIds);
  }
  if (companyIds.length) {
    moderationConditions.push(
      `targetCompanyId IN (${placeholders(companyIds)})`,
    );
    moderationParams.push(...companyIds);
  }
  for (const [targetType, ids] of [
    ['post', postIds],
    ['reel', reelIds],
    ['job', jobIds],
  ]) {
    if (!ids.length) continue;
    moderationConditions.push(
      `(targetType = ? AND targetId IN (${placeholders(ids)}))`,
    );
    moderationParams.push(targetType, ...ids.map(String));
  }
  if (moderationConditions.length) {
    const reportIds = await selectIds(
      conn,
      `SELECT id FROM moderation_reports WHERE ${moderationConditions.join(' OR ')}`,
      moderationParams,
    );
    await deleteByIds(conn, 'moderation_audits', 'reportId', reportIds);
    await deleteByIds(conn, 'moderation_reports', 'id', reportIds);
  }

  await deleteByIds(conn, 'chat_messages', 'conversationId', conversationIds);
  await deleteByIds(conn, 'job_invitations', 'conversationId', conversationIds);
  await deleteByIds(
    conn,
    'chat_read_states',
    'conversationId',
    conversationIds,
  );
  await deleteByIds(
    conn,
    'chat_participants',
    'conversationId',
    conversationIds,
  );
  await deleteByIds(conn, 'chat_conversations', 'id', conversationIds);
  await deleteByIds(conn, 'ratings', 'jobApplicationId', applicationIds);
  await deleteByIds(conn, 'job_applications', 'id', applicationIds);
  await deleteByIds(conn, 'community_posts', 'id', postIds);
  await deleteByIds(conn, 'reels', 'id', reelIds);

  if (userIds.length) {
    const values = placeholders(userIds);
    await conn.execute(
      `DELETE FROM job_invitations
       WHERE inviterUserId IN (${values}) OR inviteeUserId IN (${values})`,
      [...userIds, ...userIds],
    );
    await conn.execute(
      `DELETE FROM profile_follows
       WHERE followerUserId IN (${values})
          OR (profileType = 'user' AND profileId IN (${values}))`,
      [...userIds, ...userIds],
    );
    await conn.execute(
      `DELETE FROM profile_blocks
       WHERE blockerUserId IN (${values})
          OR (profileType = 'user' AND profileId IN (${values}))`,
      [...userIds, ...userIds],
    );
    await conn.execute(
      `DELETE FROM reel_creator_follows
       WHERE creatorId IN (${values}) OR followerId IN (${values})`,
      [...userIds, ...userIds],
    );
    await conn.execute(
      `DELETE FROM company_access_requests WHERE userId IN (${values})`,
      userIds,
    );
    await conn.execute(
      `DELETE FROM company_verification_reviews
       WHERE actorUserId IN (${values})`,
      userIds,
    );
    await conn.execute(
      `DELETE FROM page_members WHERE userId IN (${values})`,
      userIds,
    );
    await conn.execute(
      `DELETE FROM org_members WHERE userId IN (${values})`,
      userIds,
    );
    await conn.execute(
      `DELETE FROM ratings WHERE givenBy IN (${values})
          OR targetUserId IN (${values})`,
      [...userIds, ...userIds],
    );
    for (const table of [
      'community_post_comments',
      'community_post_likes',
      'community_post_saves',
      'community_post_reports',
      'reel_comments',
      'reel_likes',
      'reel_saves',
    ]) {
      const column =
        table === 'reel_comments' ||
        table === 'reel_likes' ||
        table === 'reel_saves'
          ? 'userId'
          : 'userId';
      await conn.execute(
        `DELETE FROM ${quoteIdentifier(table)} WHERE ${quoteIdentifier(column)} IN (${values})`,
        userIds,
      );
    }
    await conn.execute(
      `DELETE FROM reel_reports WHERE reporterUserId IN (${values})`,
      userIds,
    );
    for (const table of [
      'notifications',
      'notification_preferences',
      'push_devices',
      'support_contact_messages',
      'support_tickets',
      'work_experience',
      'education',
      'certifications',
      'auth_sessions',
      'auth_identities',
      'otp_records',
      'idempotency_records',
      'account_deletion_requests',
      'user_legal_acceptances',
    ]) {
      const column = table === 'otp_records' ? 'userId' : 'userId';
      await conn.execute(
        `DELETE FROM ${quoteIdentifier(table)} WHERE ${quoteIdentifier(column)} IN (${values})`,
        userIds,
      );
    }
  }

  if (companyIds.length) {
    const values = placeholders(companyIds);
    await conn.execute(
      `DELETE FROM profile_follows
       WHERE profileType = 'company' AND profileId IN (${values})`,
      companyIds,
    );
    await conn.execute(
      `DELETE FROM profile_blocks
       WHERE profileType = 'company' AND profileId IN (${values})`,
      companyIds,
    );
    await conn.execute(
      `DELETE FROM company_access_requests WHERE companyId IN (${values})`,
      companyIds,
    );
    await conn.execute(
      `DELETE FROM company_verification_reviews WHERE companyId IN (${values})`,
      companyIds,
    );
  }

  await deleteByIds(conn, 'jobs', 'id', jobIds);
  await deleteByIds(conn, 'pages', 'id', companyIds);
  await deleteByIds(conn, 'organizations', 'id', organizationIds);
  await deleteByIds(
    conn,
    'stored_assets',
    'id',
    assets.map((asset) => asset.id),
  );
}

async function upsertLookups(conn, fixtures) {
  const countryIds = {};
  for (const country of fixtures.countries) {
    const [rows] = await conn.execute(
      'SELECT id FROM countries WHERE code = ? LIMIT 1',
      [country.code],
    );
    if (rows.length) {
      countryIds[country.code] = Number(rows[0].id);
      await updateById(conn, 'countries', rows[0].id, country);
    } else {
      const result = await insertRow(conn, 'countries', country);
      countryIds[country.code] = Number(result.insertId);
    }
  }

  const languageIds = {};
  for (const language of fixtures.languages) {
    const [rows] = await conn.execute(
      'SELECT id FROM languages WHERE code = ? LIMIT 1',
      [language.code],
    );
    if (rows.length) {
      languageIds[language.code] = Number(rows[0].id);
      await updateById(conn, 'languages', rows[0].id, language);
    } else {
      const result = await insertRow(conn, 'languages', language);
      languageIds[language.code] = Number(result.insertId);
    }
  }
  return { countryIds, languageIds };
}

async function upsertUsers(conn, fixtures, lookupIds, now) {
  const userIds = {};
  for (const [index, user] of fixtures.users.entries()) {
    const password = passwordFor(user.phone);
    const base = {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      passwordHash: password.hash,
      passwordSalt: password.salt,
      isVerified: false,
      phoneVerifiedAt: null,
      referralCode: user.referralCode,
      tokenVersion: 100,
      systemRole: user.systemRole,
      isBanned: false,
      deletionScheduledAt: null,
      deletedAt: null,
      full_name: user.fullName,
      father_name: `Parent of ${user.firstName}`,
      gender: index % 2 ? 'Female' : 'Male',
      date_of_birth: `199${index % 8}-0${(index % 8) + 1}-15`,
      nationality: 'Pakistani',
      marital_status: index % 3 ? 'Single' : 'Married',
      profile_photo: null,
      profilePhotoAssetId: null,
      national_id_number: `DEMO-CNIC-${String(index + 1).padStart(4, '0')}`,
      passport_number: null,
      id_expiry_date: '2030-12-31',
      id_document_front: null,
      idDocumentFrontAssetId: null,
      id_document_back: null,
      idDocumentBackAssetId: null,
      address_proof_document: null,
      addressProofAssetId: null,
      alternate_phone: `03008800${String(index + 1).padStart(2, '0')}`,
      address_line1: 'Demo district address',
      address_line2: null,
      city: user.city,
      state: user.state,
      postal_code: '00000',
      contact_country:
        user.countryCode === 'AE' ? 'United Arab Emirates' : 'Pakistan',
      latitude: user.latitude,
      longitude: user.longitude,
      professional_summary: `${user.fullName} is a deterministic ${user.role} profile for JobsLoot development.`,
      linkedin_url: `https://www.linkedin.com/in/jobsloot-demo-${user.key}`,
      github_url: null,
      portfolio_url: `https://jobsloot.com/profiles/${user.key}`,
      behance_url: null,
      skills: csv(user.skills),
      technical_skills: csv(user.technicalSkills),
      soft_skills: csv(user.softSkills),
      bank_name: null,
      account_number: null,
      iban: null,
      branch_name: null,
      swift_code: null,
      kyc_status: 'pending',
      verified_by_admin_id: null,
      verification_date: null,
      rejection_reason: null,
      notes: 'JobsLoot deterministic demo account.',
      admin_notes: null,
      fcmTokens: null,
      ratingAverage: 0,
      ratingCount: 0,
      countryId: lookupIds.countryIds[user.countryCode],
      languageId: lookupIds.languageIds[user.languageCode],
      languages_spoken: json([
        {
          language: user.languageCode === 'en' ? 'English' : 'Urdu',
          level: 'Conversational',
        },
      ]),
      filter_preferences: null,
      updatedAt: now,
    };
    const [existing] = await conn.execute(
      'SELECT id FROM users WHERE phone = ? LIMIT 1',
      [user.phone],
    );
    if (existing.length) {
      const id = Number(existing[0].id);
      await updateById(conn, 'users', id, base);
      userIds[user.key] = id;
    } else {
      const result = await insertRow(conn, 'users', {
        ...base,
        createdAt: now,
      });
      userIds[user.key] = Number(result.insertId);
    }
  }
  return userIds;
}

async function upsertFilters(conn, fixtures, creatorId) {
  const filterIds = {};
  for (const filter of fixtures.filters) {
    const [rows] = await conn.execute(
      'SELECT id FROM filters WHERE name = ? LIMIT 1',
      [filter.name],
    );
    const data = {
      ...filter,
      status: 'active',
      approvalStatus: 'approved',
      rejectionReason: null,
      createdBy: creatorId,
      creatorId,
    };
    if (rows.length) {
      filterIds[filter.name] = Number(rows[0].id);
      await updateById(conn, 'filters', rows[0].id, data);
    } else {
      const result = await insertRow(conn, 'filters', data);
      filterIds[filter.name] = Number(result.insertId);
    }
  }
  return filterIds;
}

async function seedUserProfiles(
  conn,
  fixtures,
  userIds,
  filterIds,
  mediaStore,
  templates,
  now,
) {
  const adminId = userIds.admin;
  for (const [index, user] of fixtures.users.entries()) {
    const userId = userIds[user.key];
    const profileAsset = await mediaStore.createAsset(conn, {
      ownerUserId: userId,
      purpose: 'profiles/photo',
      semantic: `profiles/${user.key}/avatar`,
      template: templates.image,
      metadata: { userKey: user.key },
      createdAt: now,
    });
    const hasDocuments = ['verified', 'pending', 'rejected'].includes(
      user.verification,
    );
    let front = null;
    let back = null;
    if (hasDocuments) {
      front = await mediaStore.createAsset(conn, {
        ownerUserId: userId,
        purpose: 'profiles/id-front',
        semantic: `profiles/${user.key}/id-front`,
        template: templates.image,
        metadata: { userKey: user.key },
        createdAt: now,
      });
      back = await mediaStore.createAsset(conn, {
        ownerUserId: userId,
        purpose: 'profiles/id-back',
        semantic: `profiles/${user.key}/id-back`,
        template: templates.image,
        metadata: { userKey: user.key },
        createdAt: now,
      });
    }
    const approved = user.verification === 'verified';
    await updateById(conn, 'users', userId, {
      profilePhotoAssetId: profileAsset.id,
      phoneVerifiedAt: now,
      idDocumentFrontAssetId: front?.id || null,
      idDocumentBackAssetId: back?.id || null,
      kyc_status: approved
        ? 'approved'
        : user.verification === 'rejected'
          ? 'rejected'
          : 'pending',
      isVerified: approved,
      verified_by_admin_id: approved ? adminId : null,
      verification_date: approved ? '2026-08-01' : null,
      rejection_reason:
        user.verification === 'rejected'
          ? 'Demo document needs a clearer image.'
          : null,
      filter_preferences: csv(
        user.preferences.map((name) => filterIds[name]).filter(Boolean),
      ),
    });

    await insertRow(conn, 'work_experience', {
      company_name: `${user.city} Demo Services`,
      designation:
        user.role === 'worker' ? 'Skilled Worker' : 'Operations Lead',
      department: 'Operations',
      employment_type: 'full-time',
      from_date: '2022-01-01 00:00:00',
      to_date: user.role === 'worker' ? '2025-12-31 00:00:00' : null,
      key_responsibilities: 'Completed assigned work safely and on schedule.',
      experience_certificate: null,
      currently_working: user.role !== 'worker',
      userId,
    });
    await insertRow(conn, 'education', {
      highest_qualification: index % 3 === 0 ? 'Bachelors' : 'Intermediate',
      institution_name: 'JobsLoot Demo Skills Institute',
      graduation_year: String(2012 + (index % 10)),
      gpa_or_grade: 'B',
      degree_document: null,
      userId,
    });
    await insertRow(conn, 'certifications', {
      certification_name: `${user.skills[0]} Safety Certificate`,
      issuing_institution: 'JobsLoot Demo Training Center',
      certification_date: '2025-06-15',
      certificate_file: null,
      userId,
    });
  }
}

async function seedCompanies(
  conn,
  fixtures,
  userIds,
  mediaStore,
  templates,
  now,
) {
  const companyIds = {};
  const branchIds = {};
  const allPermissions = {
    postJobs: true,
    editJobs: true,
    viewApplicants: true,
    chatApplicants: true,
    manageTeam: true,
    publishContent: true,
  };
  const editorPermissions = {
    postJobs: true,
    editJobs: true,
    viewApplicants: true,
    chatApplicants: true,
    manageTeam: false,
    publishContent: false,
  };
  const userKeys = fixtures.users.map((user) => user.key);

  for (const [index, company] of fixtures.companies.entries()) {
    const ownerId = userIds[company.owner];
    const logo = await mediaStore.createAsset(conn, {
      ownerUserId: ownerId,
      purpose: 'companies/logo',
      semantic: `companies/${company.key}/logo`,
      template: templates.image,
      metadata: { companyKey: company.key },
      createdAt: now,
    });
    const proof = await mediaStore.createAsset(conn, {
      ownerUserId: ownerId,
      purpose: 'companies/verification',
      semantic: `companies/${company.key}/verification`,
      template: templates.image,
      metadata: { companyKey: company.key },
      createdAt: now,
    });
    const approved = company.status === 'approved';
    const result = await insertRow(conn, 'pages', {
      company_name: company.name,
      business_name: `${company.name} Private Limited`,
      username: company.username,
      company_logo: null,
      logoAssetId: logo.id,
      website_url: `https://jobsloot.com/companies/${company.username}`,
      official_email: `hello@${company.username}.${DEMO_EMAIL_DOMAIN}`,
      official_phone: `03007700${String(index + 1).padStart(2, '0')}`,
      industry_type: company.industry,
      company_description: `${company.name} is a deterministic JobsLoot demo employer.`,
      founded_year: 2018 + index,
      country: company.city === 'Dubai' ? 'United Arab Emirates' : 'Pakistan',
      state: company.city === 'Dubai' ? 'Dubai' : 'Demo State',
      city: company.city,
      postal_code: '00000',
      address_line1: 'Demo business district',
      business_registration_number: `DEMO-BRN-${index + 1}`,
      tax_identification_number: `DEMO-TAX-${index + 1}`,
      registration_authority: 'JobsLoot Demo Registry',
      company_type: 'Private Limited',
      representative_name: fixtures.users.find(
        (user) => user.key === company.owner,
      ).fullName,
      representative_designation: 'Owner',
      representative_email: `owner@${company.username}.${DEMO_EMAIL_DOMAIN}`,
      verified_email_domain: `${company.username}.${DEMO_EMAIL_DOMAIN}`,
      number_of_employees: 25 + index * 10,
      client_list: csv(['Demo Retail Client', 'Demo Corporate Client']),
      certifications: csv(['JobsLoot Demo Employer']),
      company_rating: null,
      ratingAverage: 0,
      ratingCount: 0,
      verificationDocumentAssetId: proof.id,
      verificationProofType: 'business_license',
      verificationStatus: company.status,
      verificationReason: approved
        ? null
        : `Demo company state: ${company.status.replace('_', ' ')}`,
      verifiedAt: approved ? now : null,
      verifiedByAdminId: approved ? userIds.admin : null,
      ownerId,
      createdAt: now,
      updatedAt: now,
    });
    const companyId = Number(result.insertId);
    companyIds[company.key] = companyId;

    const adminKey = userKeys[(index + 5) % (userKeys.length - 1)];
    const editorKey = userKeys[(index + 11) % (userKeys.length - 1)];
    for (const member of [
      {
        key: company.owner,
        role: 'owner',
        access: true,
        permissions: allPermissions,
      },
      {
        key: adminKey,
        role: 'admin',
        access: true,
        permissions: allPermissions,
      },
      {
        key: editorKey,
        role: 'editor',
        access: company.status !== 'suspended',
        permissions:
          company.status === 'approved'
            ? { ...editorPermissions, publishContent: true }
            : editorPermissions,
      },
    ]) {
      await insertRow(conn, 'page_members', {
        pageId: companyId,
        userId: userIds[member.key],
        role: member.role,
        hasAccess: member.access,
        permissions: json(member.permissions),
        createdAt: now,
      });
    }

    branchIds[company.key] = [];
    for (let branchIndex = 0; branchIndex < 2; branchIndex += 1) {
      const branch = await insertRow(conn, 'company_branches', {
        companyId,
        label: branchIndex === 0 ? 'Main Branch' : 'Service Branch',
        address: `${company.city} demo branch ${branchIndex + 1}`,
        lat: 24.86 + index * 0.1 + branchIndex * 0.01,
        lng: 67.0 + index * 0.1 + branchIndex * 0.01,
        createdAt: now,
        updatedAt: now,
      });
      branchIds[company.key].push(Number(branch.insertId));
    }

    await insertRow(conn, 'company_verification_reviews', {
      companyId,
      actorUserId: userIds.admin,
      previousStatus: 'pending',
      nextStatus: company.status,
      reason: approved
        ? 'Approved for deterministic demo use.'
        : `Seeded ${company.status} review.`,
      submissionSnapshot: json({
        seedNamespace: SEED_NAMESPACE,
        proofAssetId: proof.id,
      }),
      createdAt: now,
    });

    const requesterKey = userKeys[15 + index];
    await insertRow(conn, 'company_access_requests', {
      companyId,
      userId: userIds[requesterKey],
      status: ['pending', 'approved', 'rejected', 'cancelled', 'pending'][
        index
      ],
      message: `Demo access request for ${company.name}.`,
      requestedRole: index % 2 ? 'admin' : 'editor',
      reviewReason: index === 2 ? 'Demo request rejected.' : null,
      reviewedByUserId: index === 0 || index === 4 ? null : ownerId,
      reviewedAt: index === 0 || index === 4 ? null : now,
      clientRequestId: `${SEED_NAMESPACE}:company-access:${index + 1}`,
      createdAt: now,
      updatedAt: now,
    });
  }
  return { companyIds, branchIds };
}

async function seedOrganizations(conn, userIds, now) {
  const definitions = [
    [
      'Demo Worker Network',
      'demo-worker-network',
      'Workforce Community',
      'ahmed',
    ],
    ['Demo Employer Circle', 'demo-employer-circle', 'Employer Group', 'sara'],
  ];
  for (const [name, username, industry, ownerKey] of definitions) {
    const result = await insertRow(conn, 'organizations', {
      name,
      username,
      industry,
      isActive: 'active',
      createdBy: userIds[ownerKey],
      createdAt: now,
    });
    const organizationId = Number(result.insertId);
    for (const [index, key] of ['ahmed', 'sara', 'bilal', 'fatima'].entries()) {
      await insertRow(conn, 'org_members', {
        organizationId,
        userId: userIds[key],
        role: index === 0 ? 'admin' : 'user',
      });
    }
  }
}

async function seedJobs(
  conn,
  fixtures,
  userIds,
  companyIds,
  branchIds,
  filterIds,
  now,
) {
  const jobIds = {};
  for (const [index, job] of fixtures.jobs.entries()) {
    const values = [
      filterIds[job.filterName],
      job.title.trim(),
      job.description,
      job.requirements,
      csv(job.benefits),
      job.shift,
      job.jobType,
      job.jobType,
      job.shift,
      `${job.shift} shift`,
      job.salaryType,
      job.salaryAmount,
      job.currency,
      job.vacancies,
      job.isRemote,
    ];
    const locationSql = job.location ? 'ST_GeomFromText(?, 4326)' : 'NULL';
    if (job.location) {
      values.push(`POINT(${job.location.lng} ${job.location.lat})`);
    }
    values.push(
      '2026-08-15',
      '2026-12-31',
      '2026-11-30',
      job.filterName,
      'Matric',
      index % 4 === 0 ? 'Fresh candidates welcome' : '1 year',
      csv(['Urdu', 'English']),
      `jobs@${DEMO_EMAIL_DOMAIN}`,
      `03006600${String(index + 1).padStart(2, '0')}`,
      job.postingMode,
      job.status,
      job.isActive,
      userIds[job.creatorKey],
      job.companyKey ? companyIds[job.companyKey] : null,
      job.companyKey ? branchIds[job.companyKey][index % 2] : null,
      now,
      now,
    );
    const [result] = await conn.execute(
      `INSERT INTO jobs (
        filterId, title, description, requirements, benefits, shifts, jobTypes,
        jobType, shift, working_hours, salaryType, salaryAmount, currency,
        vacancies, isRemote, location, startDate, endDate, deadline, industry,
        educationLevel, experienceRequired, languageRequirements, contactEmail,
        contactPhone, postingMode, status, isActive, createdBy, pageId, branchId,
        createdAt, updatedAt
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${locationSql},
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )`,
      values,
    );
    jobIds[job.key] = Number(result.insertId);
  }
  return jobIds;
}

async function seedApplicationsAndChats(
  conn,
  fixtures,
  userIds,
  companyIds,
  jobIds,
  now,
) {
  const jobsByKey = Object.fromEntries(
    fixtures.jobs.map((job) => [job.key, job]),
  );
  const applications = [];
  let messageCount = 0;
  for (const [index, application] of fixtures.applications.entries()) {
    const job = jobsByKey[application.jobKey];
    const createdAt = new Date(now.getTime() - (70 - index) * 60 * 60 * 1000);
    const result = await insertRow(conn, 'job_applications', {
      jobId: jobIds[application.jobKey],
      applicantId: userIds[application.applicantKey],
      status: application.status,
      bidAmount: application.bidAmount,
      bidCurrency: application.bidAmount ? 'PKR' : null,
      lastApplyRequestId: `${SEED_NAMESPACE}:apply:${index + 1}`,
      sourceInvitationId: null,
      withdrawnAt: application.status === 'withdrawn' ? createdAt : null,
      completedAt: application.status === 'completed' ? createdAt : null,
      createdAt,
      updatedAt: createdAt,
    });
    const applicationId = Number(result.insertId);
    const conversationId = deterministicUuid(`application:${index + 1}`);
    const readOnly = ['rejected', 'withdrawn'].includes(application.status);
    await insertRow(conn, 'chat_conversations', {
      id: conversationId,
      type: 'application',
      jobId: jobIds[application.jobKey],
      applicationId,
      createdByUserId: userIds[application.applicantKey],
      companyId: job.companyKey ? companyIds[job.companyKey] : null,
      writeState: readOnly ? 'read_only' : 'active',
      readOnlyReason: readOnly ? `application_${application.status}` : null,
      clientRequestId: `${SEED_NAMESPACE}:chat:${index + 1}`,
      lastActivityAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    });
    const participantIds = [
      userIds[application.applicantKey],
      userIds[job.creatorKey],
    ];
    for (const participantId of new Set(participantIds)) {
      await insertRow(conn, 'chat_participants', {
        conversationId,
        userId: participantId,
        active: true,
        createdAt,
      });
    }

    const numberOfMessages = index < 40 ? 3 : 2;
    const messageIds = [];
    for (
      let messageIndex = 0;
      messageIndex < numberOfMessages;
      messageIndex += 1
    ) {
      const senderId = participantIds[messageIndex % participantIds.length];
      const sentAt = new Date(
        createdAt.getTime() + messageIndex * 6 * 60 * 1000,
      );
      const message = await insertRow(conn, 'chat_messages', {
        jobApplicationId: applicationId,
        conversationId,
        clientMessageId: `${SEED_NAMESPACE}:message:${index + 1}:${messageIndex + 1}`,
        senderId,
        content:
          messageIndex === 0
            ? 'Hello, I am available for this role.'
            : messageIndex === 1
              ? 'Thanks. Please confirm your preferred start date.'
              : 'I can start this week and attend an interview.',
        mediaUrl: null,
        attachments: null,
        messageType: 'text',
        readAt: messageIndex < numberOfMessages - 1 ? sentAt : null,
        createdAt: sentAt,
      });
      messageIds.push(Number(message.insertId));
      messageCount += 1;
      await updateById(conn, 'chat_conversations', conversationId, {
        lastActivityAt: sentAt,
        updatedAt: sentAt,
      });
    }
    for (const [participantIndex, participantId] of [
      ...new Set(participantIds),
    ].entries()) {
      await insertRow(conn, 'chat_read_states', {
        conversationId,
        userId: participantId,
        lastReadMessageId:
          participantIndex === 0
            ? messageIds[messageIds.length - 2] || null
            : messageIds.at(-1),
        readAt: participantIndex === 0 ? null : createdAt,
        updatedAt: createdAt,
      });
    }
    applications.push({
      ...application,
      id: applicationId,
      conversationId,
      job,
    });
  }

  const invitationStatuses = ['pending', 'accepted', 'declined', 'expired'];
  for (let index = 0; index < invitationStatuses.length; index += 1) {
    const job = fixtures.jobs[index + 1];
    const invitee = fixtures.users[15 + index];
    const conversationId = deterministicUuid(`invitation:${index + 1}`);
    const invitationId = deterministicUuid(`job-invitation:${index + 1}`);
    const status = invitationStatuses[index];
    const readOnly = ['declined', 'expired'].includes(status);
    await insertRow(conn, 'chat_conversations', {
      id: conversationId,
      type: 'invitation',
      jobId: jobIds[job.key],
      applicationId: null,
      createdByUserId: userIds[job.creatorKey],
      companyId: job.companyKey ? companyIds[job.companyKey] : null,
      writeState: readOnly ? 'read_only' : 'active',
      readOnlyReason: readOnly ? `invitation_${status}` : null,
      clientRequestId: `${SEED_NAMESPACE}:invitation-chat:${index + 1}`,
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await insertRow(conn, 'job_invitations', {
      id: invitationId,
      conversationId,
      jobId: jobIds[job.key],
      inviterUserId: userIds[job.creatorKey],
      inviteeUserId: userIds[invitee.key],
      status,
      respondedAt: status === 'pending' ? null : now,
      expiresAt:
        status === 'expired' ? now : new Date(now.getTime() + 86400000 * 7),
      clientRequestId: `${SEED_NAMESPACE}:invitation:${index + 1}`,
      createdAt: now,
      updatedAt: now,
    });
    for (const participantId of [
      userIds[job.creatorKey],
      userIds[invitee.key],
    ]) {
      await insertRow(conn, 'chat_participants', {
        conversationId,
        userId: participantId,
        active: true,
        createdAt: now,
      });
      await insertRow(conn, 'chat_read_states', {
        conversationId,
        userId: participantId,
        lastReadMessageId: null,
        readAt: null,
        updatedAt: now,
      });
    }
    await insertRow(conn, 'chat_messages', {
      jobApplicationId: null,
      conversationId,
      clientMessageId: `${SEED_NAMESPACE}:invitation-message:${index + 1}`,
      senderId: userIds[job.creatorKey],
      content: `You are invited to apply for ${job.title}.`,
      mediaUrl: null,
      attachments: null,
      messageType: 'text',
      readAt: null,
      createdAt: now,
    });
    messageCount += 1;
  }

  for (let index = 0; index < 3; index += 1) {
    const job = fixtures.jobs[index];
    const requester = fixtures.users[20 + index];
    const conversationId = deterministicUuid(`inquiry:${index + 1}`);
    await insertRow(conn, 'chat_conversations', {
      id: conversationId,
      type: 'inquiry',
      jobId: jobIds[job.key],
      applicationId: null,
      createdByUserId: userIds[requester.key],
      companyId: job.companyKey ? companyIds[job.companyKey] : null,
      writeState: 'active',
      readOnlyReason: null,
      clientRequestId: `${SEED_NAMESPACE}:inquiry:${index + 1}`,
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now,
    });
    for (const participantId of [
      userIds[requester.key],
      userIds[job.creatorKey],
    ]) {
      await insertRow(conn, 'chat_participants', {
        conversationId,
        userId: participantId,
        active: true,
        createdAt: now,
      });
      await insertRow(conn, 'chat_read_states', {
        conversationId,
        userId: participantId,
        lastReadMessageId: null,
        readAt: null,
        updatedAt: now,
      });
    }
    await insertRow(conn, 'chat_messages', {
      jobApplicationId: null,
      conversationId,
      clientMessageId: `${SEED_NAMESPACE}:inquiry-message:${index + 1}`,
      senderId: userIds[requester.key],
      content: `Is the ${job.title} position still available?`,
      mediaUrl: null,
      attachments: null,
      messageType: 'text',
      readAt: null,
      createdAt: now,
    });
    messageCount += 1;
  }

  return { applications, messageCount };
}

async function seedRatings(conn, applications, userIds, companyIds, now) {
  const completed = applications.filter((item) => item.status === 'completed');
  for (const [index, application] of completed.entries()) {
    const applicantId = userIds[application.applicantKey];
    const employerId = userIds[application.job.creatorKey];
    await insertRow(conn, 'ratings', {
      jobApplicationId: application.id,
      givenBy: employerId,
      givenTo: applicantId,
      side: 'worker',
      targetType: 'user',
      targetUserId: applicantId,
      targetCompanyId: null,
      legacyGrandfathered: false,
      stars: 4 + (index % 2),
      comment: 'Reliable worker with clear communication.',
      createdAt: now,
      updatedAt: now,
    });
    const companyId = application.job.companyKey
      ? companyIds[application.job.companyKey]
      : null;
    await insertRow(conn, 'ratings', {
      jobApplicationId: application.id,
      givenBy: applicantId,
      givenTo: companyId ? null : employerId,
      side: 'employer',
      targetType: companyId ? 'company' : 'user',
      targetUserId: companyId ? null : employerId,
      targetCompanyId: companyId,
      legacyGrandfathered: false,
      stars: 4 + ((index + 1) % 2),
      comment: 'The job details and work expectations were clear.',
      createdAt: now,
      updatedAt: now,
    });
  }

  const demoUserIds = Object.values(userIds);
  await conn.execute(
    `UPDATE users SET ratingAverage = 0, ratingCount = 0
     WHERE id IN (${placeholders(demoUserIds)})`,
    demoUserIds,
  );
  const [userRatings] = await conn.execute(
    `SELECT targetUserId AS id, AVG(stars) AS average, COUNT(*) AS total
     FROM ratings
     WHERE targetType = 'user'
       AND targetUserId IN (${placeholders(demoUserIds)})
     GROUP BY targetUserId`,
    demoUserIds,
  );
  for (const row of userRatings) {
    await updateById(conn, 'users', row.id, {
      ratingAverage: Number(row.average),
      ratingCount: Number(row.total),
    });
  }
  for (const companyId of Object.values(companyIds)) {
    const [rows] = await conn.execute(
      `SELECT AVG(stars) AS average, COUNT(*) AS total
       FROM ratings WHERE targetType = 'company' AND targetCompanyId = ?`,
      [companyId],
    );
    await updateById(conn, 'pages', companyId, {
      ratingAverage: Number(rows[0].average || 0),
      ratingCount: Number(rows[0].total || 0),
    });
  }
  return completed.length * 2;
}

async function seedSocialGraph(conn, fixtures, userIds, companyIds, now) {
  const followPairs = [];
  for (let index = 0; index < 16; index += 1) {
    const follower = fixtures.users[index].key;
    const target = fixtures.users[(index + 5) % 20].key;
    if (follower !== target) {
      followPairs.push({ follower, type: 'user', target });
    }
  }
  for (let index = 0; index < 8; index += 1) {
    followPairs.push({
      follower: fixtures.users[index + 8].key,
      type: 'company',
      target: 'quickship',
    });
  }
  for (const follow of followPairs) {
    const followerUserId = userIds[follow.follower];
    const profileId =
      follow.type === 'user'
        ? userIds[follow.target]
        : companyIds[follow.target];
    await insertRow(conn, 'profile_follows', {
      followerUserId,
      profileType: follow.type,
      profileId,
      createdAt: now,
    });
    if (follow.type === 'user') {
      await insertRow(conn, 'reel_creator_follows', {
        creatorId: profileId,
        followerId: followerUserId,
        createdAt: now,
      });
    }
  }

  await insertRow(conn, 'profile_blocks', {
    blockerUserId: userIds.admin,
    profileType: 'user',
    profileId: userIds.rizwan,
    createdAt: now,
  });
  await insertRow(conn, 'profile_blocks', {
    blockerUserId: userIds.maria,
    profileType: 'company',
    profileId: companyIds.metro,
    createdAt: now,
  });
  return { follows: followPairs.length, blocks: 2 };
}

async function seedPosts(
  conn,
  fixtures,
  userIds,
  companyIds,
  jobIds,
  mediaStore,
  templates,
  now,
) {
  const postRecords = [];
  for (const [index, post] of fixtures.posts.entries()) {
    const linkedJob = post.linkedJobKey
      ? fixtures.jobs.find((job) => job.key === post.linkedJobKey)
      : null;
    const creatorKey =
      !post.companyKey && linkedJob ? linkedJob.creatorKey : post.creatorKey;
    const mediaType = ['video', 'pending', 'failed'].includes(post.mediaMode)
      ? 'video'
      : post.mediaMode === 'image'
        ? 'image'
        : 'none';
    const mediaStatus =
      post.mediaMode === 'pending'
        ? 'upload_pending'
        : post.mediaMode === 'failed'
          ? 'failed'
          : 'published';
    const createdAt = new Date(now.getTime() - (25 - index) * 60 * 60 * 1000);
    const result = await insertRow(conn, 'community_posts', {
      creatorId: userIds[creatorKey],
      publisherType: post.companyKey ? 'company' : 'user',
      publisherCompanyId: post.companyKey ? companyIds[post.companyKey] : null,
      body: post.body,
      imageUrl: null,
      imageAssetId: null,
      imageStorageKey: null,
      mediaType,
      mediaStatus,
      videoUrl: null,
      videoAssetId: null,
      videoStorageKey: null,
      videoThumbnailUrl: null,
      videoThumbnailAssetId: null,
      videoThumbnailStorageKey: null,
      videoContentType: mediaType === 'video' ? 'video/mp4' : null,
      videoFileSizeBytes: null,
      videoDurationSeconds: mediaType === 'video' ? 2 : null,
      linkedJobId: post.linkedJobKey ? jobIds[post.linkedJobKey] : null,
      allowComments: post.allowComments,
      likesCount: 0,
      commentsCount: 0,
      savesCount: 0,
      sharesCount: index % 4,
      deletedAt: null,
      createdAt,
      updatedAt: createdAt,
    });
    const postId = Number(result.insertId);
    if (post.mediaMode === 'image') {
      const asset = await mediaStore.createAsset(conn, {
        ownerUserId: userIds[creatorKey],
        purpose: 'community-posts/image',
        semantic: `posts/${post.key}/image`,
        template: templates.image,
        metadata: { postId },
        createdAt,
      });
      await updateById(conn, 'community_posts', postId, {
        imageAssetId: asset.id,
        imageStorageKey: asset.storageKey,
      });
    }
    if (post.mediaMode === 'video') {
      const video = await mediaStore.createAsset(conn, {
        ownerUserId: userIds[creatorKey],
        purpose: 'community-posts/video',
        semantic: `posts/${post.key}/video`,
        template: templates.video,
        metadata: { postId },
        createdAt,
      });
      const thumbnail = await mediaStore.createAsset(conn, {
        ownerUserId: userIds[creatorKey],
        purpose: 'community-posts/video-thumbnail',
        semantic: `posts/${post.key}/thumbnail`,
        template: templates.thumbnail,
        metadata: { postId },
        createdAt,
      });
      await updateById(conn, 'community_posts', postId, {
        videoAssetId: video.id,
        videoStorageKey: video.storageKey,
        videoThumbnailAssetId: thumbnail.id,
        videoThumbnailStorageKey: thumbnail.storageKey,
        videoFileSizeBytes: video.sizeBytes,
      });
    }
    if (['pending', 'failed'].includes(post.mediaMode)) {
      await insertRow(conn, 'community_post_video_upload_sessions', {
        uploadId: deterministicUuid(`post-upload:${post.key}`),
        postId,
        userId: userIds[creatorKey],
        replacement: false,
        status: post.mediaMode === 'pending' ? 'pending' : 'failed',
        uploadKey: `pending/${post.key}.mp4`,
        originalFileName: `${post.key}.mp4`,
        contentType: 'video/mp4',
        expectedFileSizeBytes: 102400,
        clientDurationSeconds: 2,
        uploadedFileName: null,
        localFilePath: null,
        publicUrl: null,
        uploadedAssetId: null,
        thumbnailAssetId: null,
        uploadedFileSizeBytes: null,
        uploadedDurationSeconds: null,
        uploadedContentType: null,
        expiresAt:
          post.mediaMode === 'pending'
            ? new Date(now.getTime() + 30 * 60 * 1000)
            : new Date(now.getTime() - 30 * 60 * 1000),
        completedAt: null,
        errorMessage:
          post.mediaMode === 'failed' ? 'Seeded failed upload' : null,
        createdAt,
        updatedAt: createdAt,
      });
    }
    postRecords.push({ ...post, creatorKey, id: postId, createdAt });
  }

  let comments = 0;
  let likes = 0;
  let saves = 0;
  let reports = 0;
  for (const [index, post] of postRecords.entries()) {
    if (!['image', 'video', 'none'].includes(post.mediaMode)) continue;
    const reactors = fixtures.users
      .filter((user) => user.key !== post.creatorKey)
      .slice(index % 8, (index % 8) + 3);
    for (const reactor of reactors) {
      await insertRow(conn, 'community_post_likes', {
        postId: post.id,
        userId: userIds[reactor.key],
        createdAt: now,
      });
      likes += 1;
    }
    for (const reactor of reactors.slice(0, 2)) {
      await insertRow(conn, 'community_post_saves', {
        postId: post.id,
        userId: userIds[reactor.key],
        createdAt: now,
      });
      saves += 1;
    }
    if (post.allowComments) {
      await insertRow(conn, 'community_post_comments', {
        postId: post.id,
        userId: userIds[reactors[0].key],
        text: 'Useful community update. Thanks for sharing.',
        createdAt: now,
      });
      comments += 1;
    }
    if (index % 7 === 0) {
      const legacyReport = await insertRow(conn, 'community_post_reports', {
        postId: post.id,
        userId: userIds.admin,
        reason: 'other',
        details: 'Deterministic report for moderation testing.',
        createdAt: now,
      });
      const canonicalReport = await insertRow(conn, 'moderation_reports', {
        targetType: 'post',
        targetId: String(post.id),
        reporterUserId: userIds.admin,
        targetOwnerUserId: userIds[post.creatorKey],
        targetCompanyId: post.companyKey ? companyIds[post.companyKey] : null,
        activeKey: `${userIds.admin}:post:${post.id}`,
        legacySourceType: 'post_report',
        legacySourceId: Number(legacyReport.insertId),
        reason: 'other',
        details: 'Deterministic report for moderation testing.',
        targetSnapshot: json({ postId: String(post.id) }),
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      });
      await insertRow(conn, 'moderation_audits', {
        reportId: Number(canonicalReport.insertId),
        actorUserId: userIds.admin,
        event: 'report_created',
        metadata: json({ source: SEED_NAMESPACE }),
        dedupeKey: `${SEED_NAMESPACE}:post-report:${post.id}`,
        createdAt: now,
      });
      reports += 1;
    }
    await updateById(conn, 'community_posts', post.id, {
      likesCount: reactors.length,
      savesCount: Math.min(2, reactors.length),
      commentsCount: post.allowComments ? 1 : 0,
    });
  }
  return { postRecords, comments, likes, saves, reports };
}

async function seedReels(
  conn,
  fixtures,
  userIds,
  companyIds,
  jobIds,
  mediaStore,
  templates,
  now,
) {
  const reelRecords = [];
  for (const [index, reel] of fixtures.reels.entries()) {
    const linkedJob = reel.linkedJobKey
      ? fixtures.jobs.find((job) => job.key === reel.linkedJobKey)
      : null;
    const creatorKey =
      !reel.companyKey && linkedJob ? linkedJob.creatorKey : reel.creatorKey;
    const createdAt = new Date(now.getTime() - (12 - index) * 60 * 60 * 1000);
    const result = await insertRow(conn, 'reels', {
      creatorId: userIds[creatorKey],
      publisherType: reel.companyKey ? 'company' : 'user',
      publisherCompanyId: reel.companyKey ? companyIds[reel.companyKey] : null,
      caption: reel.caption,
      category: reel.category,
      audioTitle: reel.audioTitle,
      linkedJobId: reel.linkedJobKey ? jobIds[reel.linkedJobKey] : null,
      visibility: reel.visibility,
      status: reel.status,
      allowComments: index % 5 !== 0,
      allowSharing: true,
      videoUrl: null,
      videoAssetId: null,
      storageKey: null,
      originalFileName: reel.hasMedia ? `${reel.key}.mp4` : null,
      contentType: reel.hasMedia ? 'video/mp4' : null,
      fileSizeBytes: null,
      durationSeconds: reel.hasMedia ? 2 : null,
      likesCount: 0,
      commentsCount: 0,
      savesCount: 0,
      sharesCount: index % 4,
      publishedAt: reel.status === 'published' ? createdAt : null,
      processedAt: reel.hasMedia ? createdAt : null,
      deletedAt: null,
      createdAt,
      updatedAt: createdAt,
    });
    const reelId = Number(result.insertId);
    if (reel.hasMedia) {
      const video = await mediaStore.createAsset(conn, {
        ownerUserId: userIds[creatorKey],
        purpose: 'reels/video',
        semantic: `reels/${reel.key}/video`,
        template: templates.video,
        metadata: { reelId },
        createdAt,
      });
      await updateById(conn, 'reels', reelId, {
        videoAssetId: video.id,
        storageKey: video.storageKey,
        fileSizeBytes: video.sizeBytes,
      });
    } else {
      await insertRow(conn, 'reel_upload_sessions', {
        uploadId: deterministicUuid(`reel-upload:${reel.key}`),
        reelId,
        userId: userIds[creatorKey],
        uploadKey: `pending/${reel.key}.mp4`,
        storageProvider: 'object',
        status: 'failed',
        originalFileName: `${reel.key}.mp4`,
        contentType: 'video/mp4',
        expectedFileSizeBytes: 102400,
        durationSeconds: 2,
        uploadedFileName: null,
        localFilePath: null,
        publicUrl: null,
        uploadedAssetId: null,
        uploadedFileSizeBytes: null,
        uploadedContentType: null,
        expiresAt: new Date(now.getTime() - 30 * 60 * 1000),
        completedAt: null,
        errorMessage: 'Seeded failed upload',
        createdAt,
        updatedAt: createdAt,
      });
    }
    reelRecords.push({ ...reel, creatorKey, id: reelId });
  }

  let comments = 0;
  let likes = 0;
  let saves = 0;
  let reports = 0;
  for (const [index, reel] of reelRecords.entries()) {
    if (reel.status !== 'published') continue;
    const reactors = fixtures.users
      .filter((user) => user.key !== reel.creatorKey)
      .slice(index + 2, index + 6);
    for (const reactor of reactors) {
      await insertRow(conn, 'reel_likes', {
        reelId: reel.id,
        userId: userIds[reactor.key],
        createdAt: now,
      });
      likes += 1;
    }
    for (const reactor of reactors.slice(0, 2)) {
      await insertRow(conn, 'reel_saves', {
        reelId: reel.id,
        userId: userIds[reactor.key],
        createdAt: now,
      });
      saves += 1;
    }
    if (index % 5 !== 0) {
      await insertRow(conn, 'reel_comments', {
        reelId: reel.id,
        userId: userIds[reactors[0].key],
        text: 'Great look at the workday.',
        createdAt: now,
      });
      comments += 1;
    }
    if (index % 4 === 0) {
      const legacyReport = await insertRow(conn, 'reel_reports', {
        reelId: reel.id,
        reporterUserId: userIds.admin,
        reason: 'other',
        details: 'Deterministic Reel report for admin testing.',
        status: 'pending',
        resolvedByAdminId: null,
        resolutionNote: null,
        resolvedAt: null,
        createdAt: now,
        updatedAt: now,
      });
      const canonicalReport = await insertRow(conn, 'moderation_reports', {
        targetType: 'reel',
        targetId: String(reel.id),
        reporterUserId: userIds.admin,
        targetOwnerUserId: userIds[reel.creatorKey],
        targetCompanyId: reel.companyKey ? companyIds[reel.companyKey] : null,
        activeKey: `${userIds.admin}:reel:${reel.id}`,
        legacySourceType: 'reel_report',
        legacySourceId: Number(legacyReport.insertId),
        reason: 'other',
        details: 'Deterministic Reel report for admin testing.',
        targetSnapshot: json({ reelId: String(reel.id) }),
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      });
      await insertRow(conn, 'moderation_audits', {
        reportId: Number(canonicalReport.insertId),
        actorUserId: userIds.admin,
        event: 'report_created',
        metadata: json({ source: SEED_NAMESPACE }),
        dedupeKey: `${SEED_NAMESPACE}:reel-report:${reel.id}`,
        createdAt: now,
      });
      reports += 1;
    }
    await updateById(conn, 'reels', reel.id, {
      likesCount: reactors.length,
      savesCount: Math.min(2, reactors.length),
      commentsCount: index % 5 !== 0 ? 1 : 0,
    });
  }
  return { reelRecords, comments, likes, saves, reports };
}

async function seedNotifications(
  conn,
  fixtures,
  userIds,
  jobIds,
  applications,
  postRecords,
  reelRecords,
  now,
) {
  let count = 0;
  for (const [index, user] of fixtures.users.entries()) {
    await insertRow(conn, 'notification_preferences', {
      userId: userIds[user.key],
      enabled: true,
      jobs: true,
      applications: true,
      messages: index % 5 !== 0,
      community: true,
      videos: true,
      company: true,
      support: true,
      updatedAt: now,
    });
    const application = applications[index % applications.length];
    const notifications = [
      {
        type: 'job_match',
        title: 'A matching job is available',
        message: fixtures.jobs[index % 20].title,
        data: { jobId: jobIds[fixtures.jobs[index % 20].key] },
      },
      {
        type: 'application_status',
        title: 'Application update',
        message: `Application is ${application.status}.`,
        data: {
          applicationId: application.id,
          jobId: jobIds[application.jobKey],
          chatId: application.conversationId,
        },
      },
      {
        type: index % 2 ? 'community' : 'video',
        title: index % 2 ? 'Community update' : 'New Reel',
        message: 'There is new demo content to view.',
        data:
          index % 2
            ? { postId: postRecords[index % postRecords.length].id }
            : { reelId: reelRecords[index % reelRecords.length].id },
      },
    ];
    for (const [notificationIndex, notification] of notifications.entries()) {
      await insertRow(conn, 'notifications', {
        userId: userIds[user.key],
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: json(notification.data),
        readAt: notificationIndex === 2 && index % 2 === 0 ? now : null,
        createdAt: new Date(now.getTime() - notificationIndex * 3600000),
        updatedAt: now,
      });
      count += 1;
    }
  }
  return count;
}

async function seedSupport(conn, fixtures, userIds, now) {
  const statuses = [
    'open',
    'in_progress',
    'waiting_on_user',
    'resolved',
    'closed',
    'open',
    'in_progress',
    'resolved',
  ];
  let messages = 0;
  for (let index = 0; index < 8; index += 1) {
    const user = fixtures.users[index + 4];
    const ticket = await insertRow(conn, 'support_tickets', {
      userId: userIds[user.key],
      kind: index % 3 === 0 ? 'complaint' : 'feedback',
      category: [
        'app',
        'payment',
        'job_post',
        'worker',
        'chat',
        'suggestion',
        'other',
      ][index % 7],
      subject: `Demo support request ${index + 1}`,
      message: 'This is the first deterministic support message.',
      preferredContact: 'phone',
      contact: user.phone,
      status: statuses[index],
      attachments: json([]),
      createdAt: now,
      updatedAt: now,
    });
    const ticketId = Number(ticket.insertId);
    const thread = [
      [
        'user',
        userIds[user.key],
        'This is the first deterministic support message.',
      ],
      [
        'support',
        userIds.admin,
        'Support has received the request and is reviewing it.',
      ],
      ...(index % 2
        ? [
            [
              'user',
              userIds[user.key],
              'Thank you. I can provide more details if needed.',
            ],
          ]
        : []),
    ];
    for (const [sender, senderUserId, body] of thread) {
      await insertRow(conn, 'support_ticket_messages', {
        ticketId,
        sender,
        senderUserId,
        body,
        attachments: json([]),
        createdAt: now,
      });
      messages += 1;
    }
  }
  return { tickets: 8, messages };
}

async function removeObsoleteDemoUsers(
  conn,
  previousUserIds,
  canonicalUserIds,
) {
  const canonical = new Set(Object.values(canonicalUserIds));
  const obsolete = previousUserIds.filter((id) => !canonical.has(id));
  await deleteByIds(conn, 'users', 'id', obsolete);
  return obsolete.length;
}

async function readSeedCounts(conn, userIds, companyIds) {
  const userValues = Object.values(userIds);
  const companyValues = Object.values(companyIds);
  const scalar = async (sql, params = []) => {
    const [rows] = await conn.execute(sql, params);
    return Number(rows[0].total);
  };
  return {
    users: userValues.length,
    companies: companyValues.length,
    jobs: await scalar(
      `SELECT COUNT(*) total FROM jobs WHERE createdBy IN (${placeholders(userValues)})`,
      userValues,
    ),
    applications: await scalar(
      `SELECT COUNT(*) total FROM job_applications WHERE applicantId IN (${placeholders(userValues)})`,
      userValues,
    ),
    conversations: await scalar(
      `SELECT COUNT(DISTINCT conversationId) total FROM chat_participants
       WHERE userId IN (${placeholders(userValues)})`,
      userValues,
    ),
    messages: await scalar(
      `SELECT COUNT(*) total FROM chat_messages WHERE senderId IN (${placeholders(userValues)})`,
      userValues,
    ),
    ratings: await scalar(
      `SELECT COUNT(*) total FROM ratings WHERE givenBy IN (${placeholders(userValues)})`,
      userValues,
    ),
    posts: await scalar(
      `SELECT COUNT(*) total FROM community_posts WHERE creatorId IN (${placeholders(userValues)})`,
      userValues,
    ),
    reels: await scalar(
      `SELECT COUNT(*) total FROM reels WHERE creatorId IN (${placeholders(userValues)})`,
      userValues,
    ),
    notifications: await scalar(
      `SELECT COUNT(*) total FROM notifications WHERE userId IN (${placeholders(userValues)})`,
      userValues,
    ),
    supportTickets: await scalar(
      `SELECT COUNT(*) total FROM support_tickets WHERE userId IN (${placeholders(userValues)})`,
      userValues,
    ),
    assets: await scalar(
      `SELECT COUNT(*) total FROM stored_assets
       WHERE ownerUserId IN (${placeholders(userValues)}) AND deletedAt IS NULL`,
      userValues,
    ),
  };
}

async function seedAll(
  conn,
  fixtures,
  mediaStore,
  templates,
  now = new Date(),
) {
  const previous = await discoverDemoState(conn, fixtures);
  await cleanupDemoRecords(conn, previous);
  const lookupIds = await upsertLookups(conn, fixtures);
  const userIds = await upsertUsers(conn, fixtures, lookupIds, now);
  const filterIds = await upsertFilters(conn, fixtures, userIds.admin);
  await seedUserProfiles(
    conn,
    fixtures,
    userIds,
    filterIds,
    mediaStore,
    templates,
    now,
  );
  const { companyIds, branchIds } = await seedCompanies(
    conn,
    fixtures,
    userIds,
    mediaStore,
    templates,
    now,
  );
  await seedOrganizations(conn, userIds, now);
  const jobIds = await seedJobs(
    conn,
    fixtures,
    userIds,
    companyIds,
    branchIds,
    filterIds,
    now,
  );
  const { applications, messageCount } = await seedApplicationsAndChats(
    conn,
    fixtures,
    userIds,
    companyIds,
    jobIds,
    now,
  );
  const ratingCount = await seedRatings(
    conn,
    applications,
    userIds,
    companyIds,
    now,
  );
  const social = await seedSocialGraph(
    conn,
    fixtures,
    userIds,
    companyIds,
    now,
  );
  const postResult = await seedPosts(
    conn,
    fixtures,
    userIds,
    companyIds,
    jobIds,
    mediaStore,
    templates,
    now,
  );
  const reelResult = await seedReels(
    conn,
    fixtures,
    userIds,
    companyIds,
    jobIds,
    mediaStore,
    templates,
    now,
  );
  const notificationCount = await seedNotifications(
    conn,
    fixtures,
    userIds,
    jobIds,
    applications,
    postResult.postRecords,
    reelResult.reelRecords,
    now,
  );
  const support = await seedSupport(conn, fixtures, userIds, now);
  const obsoleteUsersRemoved = await removeObsoleteDemoUsers(
    conn,
    previous.userIds,
    userIds,
  );
  const counts = await readSeedCounts(conn, userIds, companyIds);
  return {
    previous,
    ids: { userIds, companyIds, jobIds },
    counts,
    details: {
      messages: messageCount,
      ratings: ratingCount,
      follows: social.follows,
      blocks: social.blocks,
      postInteractions: postResult,
      reelInteractions: reelResult,
      notifications: notificationCount,
      support,
      obsoleteUsersRemoved,
    },
  };
}

module.exports = {
  REQUIRED_MIGRATIONS,
  REQUIRED_TABLES,
  assertSchemaReady,
  cleanupDemoRecords,
  discoverDemoState,
  insertRow,
  passwordFor,
  readSeedCounts,
  seedAll,
};
