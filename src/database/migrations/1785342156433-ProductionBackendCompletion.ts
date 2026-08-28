import { MigrationInterface, QueryRunner } from 'typeorm';

type BaselineCounts = {
  applications: number;
  messages: number;
  ratings: number;
  users: number;
  companies: number;
};

export class ProductionBackendCompletion1785342156433
  implements MigrationInterface
{
  name = 'ProductionBackendCompletion1785342156433';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.requireTables(queryRunner, [
      'users',
      'pages',
      'page_members',
      'jobs',
      'job_applications',
      'chat_messages',
      'ratings',
      'otp_records',
      'support_tickets',
      'support_ticket_attachments',
      'reels',
    ]);

    const baseline = await this.readBaseline(queryRunner);

    await this.createTables(queryRunner);
    await this.addColumns(queryRunner);
    await this.normalizeUuidColumns(queryRunner);
    await this.extendOtpPurposes(queryRunner);
    await this.relaxSocialPasswordColumns(queryRunner);
    await this.removeDuplicateBackfillRows(queryRunner);
    await this.addIndexes(queryRunner);
    await this.backfillApplicationConversations(queryRunner);
    await this.backfillRatings(queryRunner);
    await this.backfillSupportMessages(queryRunner);
    await this.backfillPushDevices(queryRunner);
    await this.addForeignKeys(queryRunner);
    await this.refreshRatingAggregates(queryRunner);
    await this.verifyPostconditions(queryRunner, baseline);
  }

  public async down(): Promise<void> {
    throw new Error(
      'ProductionBackendCompletion is data-bearing and intentionally irreversible. Restore the pre-migration backup instead.',
    );
  }

  private async createTables(queryRunner: QueryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`chat_conversations\` (
        \`id\` varchar(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        \`type\` enum('application','inquiry','invitation') NOT NULL,
        \`jobId\` int NULL,
        \`applicationId\` int NULL,
        \`createdByUserId\` int NOT NULL,
        \`companyId\` int NULL,
        \`writeState\` enum('active','read_only') NOT NULL DEFAULT 'active',
        \`readOnlyReason\` varchar(120) NULL,
        \`clientRequestId\` varchar(120) NULL,
        \`lastActivityAt\` datetime NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`chat_participants\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`conversationId\` varchar(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        \`userId\` int NOT NULL,
        \`active\` tinyint NOT NULL DEFAULT 1,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`chat_read_states\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`conversationId\` varchar(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        \`userId\` int NOT NULL,
        \`lastReadMessageId\` int NULL,
        \`readAt\` datetime NULL,
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`job_invitations\` (
        \`id\` varchar(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        \`conversationId\` varchar(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        \`jobId\` int NOT NULL,
        \`inviterUserId\` int NOT NULL,
        \`inviteeUserId\` int NOT NULL,
        \`status\` enum('pending','accepted','declined','cancelled','expired') NOT NULL DEFAULT 'pending',
        \`respondedAt\` datetime NULL,
        \`expiresAt\` datetime NULL,
        \`clientRequestId\` varchar(120) NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`auth_sessions\` (
        \`id\` varchar(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        \`userId\` int NOT NULL,
        \`installationId\` varchar(120) NOT NULL,
        \`refreshTokenHash\` varchar(64) NOT NULL,
        \`tokenVersion\` int NOT NULL DEFAULT 0,
        \`platform\` enum('ios','android','web','unknown') NOT NULL DEFAULT 'unknown',
        \`deviceName\` varchar(120) NULL,
        \`appVersion\` varchar(40) NULL,
        \`expiresAt\` datetime NOT NULL,
        \`lastUsedAt\` datetime NULL,
        \`revokedAt\` datetime NULL,
        \`revokedReason\` varchar(80) NULL,
        \`metadata\` longtext NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`auth_identities\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`userId\` int NOT NULL,
        \`provider\` enum('google','facebook') NOT NULL,
        \`subject\` varchar(255) NOT NULL,
        \`providerEmail\` varchar(255) NULL,
        \`providerMetadata\` longtext NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`auth_social_challenges\` (
        \`id\` varchar(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        \`provider\` enum('google','facebook') NOT NULL,
        \`subject\` varchar(255) NOT NULL,
        \`expiresAt\` datetime NOT NULL,
        \`usedAt\` datetime NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`stored_assets\` (
        \`id\` varchar(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        \`ownerUserId\` int NOT NULL,
        \`purpose\` varchar(80) NOT NULL,
        \`provider\` enum('local','s3') NOT NULL,
        \`bucket\` varchar(255) NULL,
        \`storageKey\` varchar(500) NOT NULL,
        \`originalName\` varchar(255) NULL,
        \`contentType\` varchar(120) NOT NULL,
        \`sizeBytes\` bigint UNSIGNED NOT NULL,
        \`sha256\` varchar(64) NOT NULL,
        \`visibility\` enum('public','private') NOT NULL DEFAULT 'private',
        \`metadata\` longtext NULL,
        \`deletedAt\` datetime NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`idempotency_records\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`userId\` int NOT NULL,
        \`scope\` varchar(80) NOT NULL,
        \`requestKey\` varchar(120) NOT NULL,
        \`requestHash\` varchar(64) NOT NULL,
        \`state\` enum('processing','completed') NOT NULL DEFAULT 'processing',
        \`responseStatus\` int NULL,
        \`responseBody\` longtext NULL,
        \`expiresAt\` datetime NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`profile_blocks\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`blockerUserId\` int NOT NULL,
        \`profileType\` enum('user','company') NOT NULL,
        \`profileId\` int NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`reel_reports\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`reelId\` int NOT NULL,
        \`reporterUserId\` int NOT NULL,
        \`reason\` enum('spam','unsafe','false_information','other') NOT NULL,
        \`details\` text NULL,
        \`status\` enum('pending','reviewed','dismissed','actioned') NOT NULL DEFAULT 'pending',
        \`resolvedByAdminId\` int NULL,
        \`resolutionNote\` text NULL,
        \`resolvedAt\` datetime NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`push_devices\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`userId\` int NOT NULL,
        \`installationId\` varchar(120) NOT NULL,
        \`token\` varchar(512) NOT NULL,
        \`platform\` enum('ios','android') NOT NULL,
        \`appVersion\` varchar(40) NULL,
        \`locale\` varchar(20) NULL,
        \`lastSeenAt\` datetime NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`notification_preferences\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`userId\` int NOT NULL,
        \`enabled\` tinyint NOT NULL DEFAULT 1,
        \`jobs\` tinyint NOT NULL DEFAULT 1,
        \`applications\` tinyint NOT NULL DEFAULT 1,
        \`messages\` tinyint NOT NULL DEFAULT 1,
        \`community\` tinyint NOT NULL DEFAULT 1,
        \`videos\` tinyint NOT NULL DEFAULT 1,
        \`company\` tinyint NOT NULL DEFAULT 1,
        \`support\` tinyint NOT NULL DEFAULT 1,
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`company_access_requests\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`companyId\` int NOT NULL,
        \`userId\` int NOT NULL,
        \`status\` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
        \`message\` text NULL,
        \`requestedRole\` enum('admin','editor') NOT NULL DEFAULT 'editor',
        \`reviewReason\` text NULL,
        \`reviewedByUserId\` int NULL,
        \`reviewedAt\` datetime NULL,
        \`clientRequestId\` varchar(120) NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`company_verification_reviews\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`companyId\` int NOT NULL,
        \`actorUserId\` int NULL,
        \`previousStatus\` varchar(40) NULL,
        \`nextStatus\` varchar(40) NOT NULL,
        \`reason\` text NULL,
        \`submissionSnapshot\` longtext NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`support_ticket_messages\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`ticketId\` int NOT NULL,
        \`sender\` enum('user','support') NOT NULL,
        \`senderUserId\` int NULL,
        \`body\` text NULL,
        \`attachments\` longtext NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`account_deletion_requests\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`userId\` int NOT NULL,
        \`status\` enum('scheduled','recovered','completed','cancelled') NOT NULL DEFAULT 'scheduled',
        \`scheduledDeletionAt\` datetime NOT NULL,
        \`recoveredAt\` datetime NULL,
        \`completedAt\` datetime NULL,
        \`blockerSnapshot\` longtext NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
  }

  private async addColumns(queryRunner: QueryRunner) {
    const columns: Array<[string, string, string]> = [
      ['pages', 'ratingAverage', 'float NOT NULL DEFAULT 0'],
      ['pages', 'ratingCount', 'int NOT NULL DEFAULT 0'],
      ['pages', 'logoAssetId', 'varchar(36) NULL'],
      ['pages', 'verificationDocumentAssetId', 'varchar(36) NULL'],
      ['pages', 'verificationProofType', 'varchar(80) NULL'],
      ['chat_messages', 'conversationId', 'varchar(36) NULL'],
      ['chat_messages', 'clientMessageId', 'varchar(120) NULL'],
      ['chat_messages', 'readAt', 'datetime NULL'],
      ['ratings', 'side', "enum('worker','employer') NULL"],
      [
        'ratings',
        'targetType',
        "enum('user','company') NOT NULL DEFAULT 'user'",
      ],
      ['ratings', 'targetUserId', 'int NULL'],
      ['ratings', 'targetCompanyId', 'int NULL'],
      ['ratings', 'legacyGrandfathered', 'tinyint NOT NULL DEFAULT 0'],
      ['job_applications', 'bidAmount', 'decimal(12,2) NULL'],
      ['job_applications', 'bidCurrency', 'varchar(12) NULL'],
      ['job_applications', 'lastApplyRequestId', 'varchar(120) NULL'],
      ['job_applications', 'sourceInvitationId', 'varchar(36) NULL'],
      ['users', 'deletionScheduledAt', 'datetime NULL'],
      ['users', 'deletedAt', 'datetime NULL'],
      ['users', 'phoneVerifiedAt', 'datetime NULL'],
      ['users', 'referralCode', 'varchar(255) NULL'],
      ['users', 'tokenVersion', 'int NOT NULL DEFAULT 0'],
      ["users", 'systemRole', "enum('user','admin') NOT NULL DEFAULT 'user'"],
      ['users', 'profilePhotoAssetId', 'varchar(36) NULL'],
      ['users', 'national_id_number', 'varchar(255) NULL'],
      ['users', 'passport_number', 'varchar(255) NULL'],
      ['users', 'id_expiry_date', 'date NULL'],
      ['users', 'id_document_front', 'varchar(255) NULL'],
      ['users', 'idDocumentFrontAssetId', 'varchar(36) NULL'],
      ['users', 'id_document_back', 'varchar(255) NULL'],
      ['users', 'idDocumentBackAssetId', 'varchar(36) NULL'],
      ['users', 'address_proof_document', 'varchar(255) NULL'],
      ['users', 'addressProofAssetId', 'varchar(36) NULL'],
      ['users', 'latitude', 'float NULL'],
      ['users', 'longitude', 'float NULL'],
      ['users', 'admin_notes', 'text NULL'],
      ['users', 'languages_spoken', 'json NULL'],
      ['support_ticket_attachments', 'assetId', 'varchar(36) NULL'],
      ['support_tickets', 'subject', 'varchar(255) NULL'],
    ];
    for (const [table, column, definition] of columns) {
      await this.addColumn(queryRunner, table, column, definition);
    }
  }

  private async extendOtpPurposes(queryRunner: QueryRunner) {
    await queryRunner.query(`
      ALTER TABLE \`otp_records\`
      MODIFY \`purpose\` enum(
        'register',
        'forgot-password',
        'phone-change',
        'password-change',
        'social-phone',
        'account-deletion',
        'account-recovery'
      ) NOT NULL
    `);
  }

  private async normalizeUuidColumns(queryRunner: QueryRunner) {
    const columns: Array<[string, string, boolean]> = [
      ['chat_conversations', 'id', false],
      ['chat_participants', 'conversationId', false],
      ['chat_read_states', 'conversationId', false],
      ['job_invitations', 'id', false],
      ['job_invitations', 'conversationId', false],
      ['auth_sessions', 'id', false],
      ['auth_social_challenges', 'id', false],
      ['stored_assets', 'id', false],
      ['chat_messages', 'conversationId', true],
      ['job_applications', 'sourceInvitationId', true],
    ];
    for (const [table, column, nullable] of columns) {
      await queryRunner.query(`
        ALTER TABLE \`${table}\`
        MODIFY \`${column}\`
          varchar(36) CHARACTER SET ascii COLLATE ascii_bin
          ${nullable ? 'NULL' : 'NOT NULL'}
      `);
    }
  }

  private async relaxSocialPasswordColumns(queryRunner: QueryRunner) {
    await queryRunner.query(
      'ALTER TABLE `users` MODIFY `passwordHash` varchar(255) NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `users` MODIFY `passwordSalt` varchar(255) NULL',
    );
    await queryRunner.query('ALTER TABLE `ratings` MODIFY `givenTo` int NULL');
  }

  private async removeDuplicateBackfillRows(queryRunner: QueryRunner) {
    await queryRunner.query(`
      DELETE duplicate
      FROM \`chat_participants\` duplicate
      INNER JOIN \`chat_participants\` keeper
        ON keeper.\`conversationId\` = duplicate.\`conversationId\`
       AND keeper.\`userId\` = duplicate.\`userId\`
       AND keeper.\`id\` < duplicate.\`id\`
    `);
    await queryRunner.query(`
      DELETE duplicate
      FROM \`chat_read_states\` duplicate
      INNER JOIN \`chat_read_states\` keeper
        ON keeper.\`conversationId\` = duplicate.\`conversationId\`
       AND keeper.\`userId\` = duplicate.\`userId\`
       AND keeper.\`id\` < duplicate.\`id\`
    `);
  }

  private async backfillApplicationConversations(queryRunner: QueryRunner) {
    await queryRunner.query(`
      INSERT INTO \`chat_conversations\` (
        \`id\`,
        \`type\`,
        \`jobId\`,
        \`applicationId\`,
        \`createdByUserId\`,
        \`companyId\`,
        \`writeState\`,
        \`readOnlyReason\`,
        \`lastActivityAt\`,
        \`createdAt\`,
        \`updatedAt\`
      )
      SELECT
        UUID(),
        'application',
        ja.\`jobId\`,
        ja.\`id\`,
        ja.\`applicantId\`,
        j.\`pageId\`,
        CASE
          WHEN ja.\`status\` IN ('pending','accepted','completed') THEN 'active'
          ELSE 'read_only'
        END,
        CASE
          WHEN ja.\`status\` IN ('pending','accepted','completed') THEN NULL
          ELSE CONCAT('application_', ja.\`status\`)
        END,
        COALESCE(MAX(cm.\`createdAt\`), ja.\`updatedAt\`, ja.\`createdAt\`),
        ja.\`createdAt\`,
        COALESCE(ja.\`updatedAt\`, ja.\`createdAt\`)
      FROM \`job_applications\` ja
      INNER JOIN \`jobs\` j ON j.\`id\` = ja.\`jobId\`
      LEFT JOIN \`chat_messages\` cm ON cm.\`jobApplicationId\` = ja.\`id\`
      LEFT JOIN \`chat_conversations\` existing
        ON existing.\`applicationId\` = ja.\`id\`
      WHERE existing.\`id\` IS NULL
      GROUP BY
        ja.\`id\`,
        ja.\`jobId\`,
        ja.\`applicantId\`,
        ja.\`status\`,
        ja.\`createdAt\`,
        ja.\`updatedAt\`,
        j.\`pageId\`
    `);

    await queryRunner.query(`
      INSERT INTO \`chat_participants\`
        (\`conversationId\`, \`userId\`, \`active\`, \`createdAt\`)
      SELECT cc.\`id\`, ja.\`applicantId\`, 1, cc.\`createdAt\`
      FROM \`chat_conversations\` cc
      INNER JOIN \`job_applications\` ja ON ja.\`id\` = cc.\`applicationId\`
      WHERE cc.\`type\` = 'application'
        AND NOT EXISTS (
          SELECT 1
          FROM \`chat_participants\` existing
          WHERE existing.\`conversationId\` = cc.\`id\`
            AND existing.\`userId\` = ja.\`applicantId\`
        )
    `);
    await queryRunner.query(`
      INSERT INTO \`chat_participants\`
        (\`conversationId\`, \`userId\`, \`active\`, \`createdAt\`)
      SELECT cc.\`id\`, j.\`createdBy\`, 1, cc.\`createdAt\`
      FROM \`chat_conversations\` cc
      INNER JOIN \`jobs\` j ON j.\`id\` = cc.\`jobId\`
      WHERE cc.\`type\` = 'application'
        AND NOT EXISTS (
          SELECT 1
          FROM \`chat_participants\` existing
          WHERE existing.\`conversationId\` = cc.\`id\`
            AND existing.\`userId\` = j.\`createdBy\`
        )
    `);

    await queryRunner.query(`
      UPDATE \`chat_messages\` cm
      INNER JOIN \`chat_conversations\` cc
        ON cc.\`applicationId\` = cm.\`jobApplicationId\`
      SET cm.\`conversationId\` = cc.\`id\`
      WHERE cm.\`conversationId\` IS NULL
    `);

    await queryRunner.query(`
      INSERT INTO \`chat_read_states\`
        (\`conversationId\`, \`userId\`, \`lastReadMessageId\`, \`readAt\`, \`updatedAt\`)
      SELECT
        cp.\`conversationId\`,
        cp.\`userId\`,
        MAX(
          CASE
            WHEN cm.\`senderId\` = cp.\`userId\` OR cm.\`readAt\` IS NOT NULL
            THEN cm.\`id\`
            ELSE NULL
          END
        ),
        MAX(
          CASE
            WHEN cm.\`senderId\` = cp.\`userId\` THEN cm.\`createdAt\`
            ELSE cm.\`readAt\`
          END
        ),
        CURRENT_TIMESTAMP(6)
      FROM \`chat_participants\` cp
      LEFT JOIN \`chat_messages\` cm
        ON cm.\`conversationId\` = cp.\`conversationId\`
      WHERE NOT EXISTS (
        SELECT 1
        FROM \`chat_read_states\` existing
        WHERE existing.\`conversationId\` = cp.\`conversationId\`
          AND existing.\`userId\` = cp.\`userId\`
      )
      GROUP BY cp.\`conversationId\`, cp.\`userId\`
    `);
  }

  private async backfillRatings(queryRunner: QueryRunner) {
    await queryRunner.query(`
      UPDATE \`ratings\` r
      INNER JOIN \`job_applications\` ja
        ON ja.\`id\` = r.\`jobApplicationId\`
      INNER JOIN \`jobs\` j
        ON j.\`id\` = ja.\`jobId\`
      SET
        r.\`side\` = CASE
          WHEN r.\`givenBy\` = ja.\`applicantId\` THEN 'employer'
          ELSE 'worker'
        END,
        r.\`targetType\` = CASE
          WHEN r.\`givenBy\` = ja.\`applicantId\` AND j.\`pageId\` IS NOT NULL
            THEN 'company'
          ELSE 'user'
        END,
        r.\`targetUserId\` = CASE
          WHEN r.\`givenBy\` <> ja.\`applicantId\` THEN ja.\`applicantId\`
          WHEN j.\`pageId\` IS NULL THEN j.\`createdBy\`
          ELSE NULL
        END,
        r.\`targetCompanyId\` = CASE
          WHEN r.\`givenBy\` = ja.\`applicantId\` THEN j.\`pageId\`
          ELSE NULL
        END,
        r.\`legacyGrandfathered\` = 1
      WHERE r.\`side\` IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE \`ratings\`
      MODIFY \`side\` enum('worker','employer') NOT NULL
    `);
  }

  private async backfillSupportMessages(queryRunner: QueryRunner) {
    await queryRunner.query(`
      INSERT INTO \`support_ticket_messages\`
        (\`ticketId\`, \`sender\`, \`senderUserId\`, \`body\`, \`attachments\`, \`createdAt\`)
      SELECT
        st.\`id\`,
        'user',
        st.\`userId\`,
        st.\`message\`,
        st.\`attachments\`,
        st.\`createdAt\`
      FROM \`support_tickets\` st
      WHERE NOT EXISTS (
        SELECT 1
        FROM \`support_ticket_messages\` stm
        WHERE stm.\`ticketId\` = st.\`id\`
      )
    `);
  }

  private async backfillPushDevices(queryRunner: QueryRunner) {
    const users: Array<{ id: number; fcmTokens: string | null }> =
      await queryRunner.query(`
        SELECT \`id\`, \`fcmTokens\`
        FROM \`users\`
        WHERE \`fcmTokens\` IS NOT NULL AND \`fcmTokens\` <> ''
      `);
    for (const user of users) {
      let tokens: unknown = [];
      try {
        tokens =
          typeof user.fcmTokens === 'string'
            ? JSON.parse(user.fcmTokens)
            : user.fcmTokens;
      } catch {
        tokens = [];
      }
      if (!Array.isArray(tokens)) continue;
      for (let index = 0; index < tokens.length; index += 1) {
        const token = String(tokens[index] || '').trim();
        if (!token) continue;
        await queryRunner.query(
          `
            INSERT IGNORE INTO \`push_devices\`
              (\`userId\`, \`installationId\`, \`token\`, \`platform\`, \`lastSeenAt\`)
            VALUES (?, ?, ?, 'android', CURRENT_TIMESTAMP)
          `,
          [user.id, `legacy-${user.id}-${index + 1}`, token],
        );
      }
    }
  }

  private async addIndexes(queryRunner: QueryRunner) {
    const indexes: Array<[string, string, string, boolean?]> = [
      [
        'chat_conversations',
        'UQ_chat_conversations_application',
        '`applicationId`',
        true,
      ],
      [
        'chat_conversations',
        'IDX_chat_conversations_job_activity',
        '`jobId`, `lastActivityAt`',
      ],
      [
        'chat_participants',
        'UQ_chat_participants_conversation_user',
        '`conversationId`, `userId`',
        true,
      ],
      [
        'chat_participants',
        'IDX_chat_participants_user_conversation',
        '`userId`, `conversationId`',
      ],
      [
        'chat_read_states',
        'UQ_chat_read_states_conversation_user',
        '`conversationId`, `userId`',
        true,
      ],
      [
        'chat_read_states',
        'IDX_chat_read_states_user_updated',
        '`userId`, `updatedAt`',
      ],
      [
        'job_invitations',
        'UQ_job_invitations_conversation',
        '`conversationId`',
        true,
      ],
      [
        'job_invitations',
        'IDX_job_invitations_job_invitee',
        '`jobId`, `inviteeUserId`',
      ],
      [
        'job_invitations',
        'IDX_job_invitations_invitee_status',
        '`inviteeUserId`, `status`',
      ],
      [
        'chat_messages',
        'UQ_chat_messages_conversation_sender_client',
        '`conversationId`, `senderId`, `clientMessageId`',
        true,
      ],
      [
        'ratings',
        'UQ_ratings_application_side',
        '`jobApplicationId`, `side`',
        true,
      ],
      [
        'job_applications',
        'UQ_job_applications_job_applicant',
        '`jobId`, `applicantId`',
        true,
      ],
      ['page_members', 'UQ_page_members_page_user', '`pageId`, `userId`', true],
      [
        'auth_sessions',
        'IDX_auth_sessions_user_installation',
        '`userId`, `installationId`',
      ],
      [
        'auth_sessions',
        'IDX_auth_sessions_expiry_revoked',
        '`expiresAt`, `revokedAt`',
      ],
      [
        'auth_identities',
        'UQ_auth_identities_provider_subject',
        '`provider`, `subject`',
        true,
      ],
      [
        'auth_identities',
        'IDX_auth_identities_user_provider',
        '`userId`, `provider`',
      ],
      [
        'auth_social_challenges',
        'IDX_auth_social_challenges_expiry_used',
        '`expiresAt`, `usedAt`',
      ],
      ['stored_assets', 'IDX_stored_assets_storage_key', '`storageKey`', true],
      [
        'stored_assets',
        'IDX_stored_assets_owner_purpose',
        '`ownerUserId`, `purpose`',
      ],
      [
        'idempotency_records',
        'UQ_idempotency_user_scope_key',
        '`userId`, `scope`, `requestKey`',
        true,
      ],
      ['idempotency_records', 'IDX_idempotency_expiry', '`expiresAt`'],
      [
        'profile_blocks',
        'UQ_profile_blocks_blocker_target',
        '`blockerUserId`, `profileType`, `profileId`',
        true,
      ],
      [
        'profile_blocks',
        'IDX_profile_blocks_target',
        '`profileType`, `profileId`',
      ],
      [
        'reel_reports',
        'UQ_reel_reports_reel_reporter',
        '`reelId`, `reporterUserId`',
        true,
      ],
      [
        'reel_reports',
        'IDX_reel_reports_status_created',
        '`status`, `createdAt`',
      ],
      ['push_devices', 'IDX_push_devices_token', '`token`', true],
      [
        'push_devices',
        'UQ_push_devices_user_installation',
        '`userId`, `installationId`',
        true,
      ],
      [
        'notification_preferences',
        'UQ_notification_preferences_user',
        '`userId`',
        true,
      ],
      [
        'company_access_requests',
        'IDX_company_access_requests_company_status',
        '`companyId`, `status`',
      ],
      [
        'company_access_requests',
        'IDX_company_access_requests_user_status',
        '`userId`, `status`',
      ],
      [
        'company_verification_reviews',
        'IDX_company_verification_reviews_company_created',
        '`companyId`, `createdAt`',
      ],
      [
        'support_ticket_messages',
        'IDX_support_ticket_messages_ticket_created',
        '`ticketId`, `createdAt`',
      ],
      [
        'account_deletion_requests',
        'IDX_account_deletion_status_schedule',
        '`status`, `scheduledDeletionAt`',
      ],
    ];
    for (const [table, name, columns, unique = false] of indexes) {
      await this.addIndex(queryRunner, table, name, columns, unique);
    }
  }

  private async addForeignKeys(queryRunner: QueryRunner) {
    const foreignKeys: Array<[string, string, string, string, string, string]> =
      [
        [
          'chat_conversations',
          'FK_chat_conversations_job',
          'jobId',
          'jobs',
          'id',
          'SET NULL',
        ],
        [
          'chat_conversations',
          'FK_chat_conversations_application',
          'applicationId',
          'job_applications',
          'id',
          'SET NULL',
        ],
        [
          'chat_participants',
          'FK_chat_participants_conversation',
          'conversationId',
          'chat_conversations',
          'id',
          'CASCADE',
        ],
        [
          'chat_participants',
          'FK_chat_participants_user',
          'userId',
          'users',
          'id',
          'CASCADE',
        ],
        [
          'chat_read_states',
          'FK_chat_read_states_conversation',
          'conversationId',
          'chat_conversations',
          'id',
          'CASCADE',
        ],
        [
          'chat_read_states',
          'FK_chat_read_states_user',
          'userId',
          'users',
          'id',
          'CASCADE',
        ],
        [
          'job_invitations',
          'FK_job_invitations_conversation',
          'conversationId',
          'chat_conversations',
          'id',
          'CASCADE',
        ],
        [
          'job_invitations',
          'FK_job_invitations_job',
          'jobId',
          'jobs',
          'id',
          'CASCADE',
        ],
        [
          'job_invitations',
          'FK_job_invitations_inviter',
          'inviterUserId',
          'users',
          'id',
          'CASCADE',
        ],
        [
          'job_invitations',
          'FK_job_invitations_invitee',
          'inviteeUserId',
          'users',
          'id',
          'CASCADE',
        ],
        [
          'chat_messages',
          'FK_chat_messages_conversation',
          'conversationId',
          'chat_conversations',
          'id',
          'CASCADE',
        ],
        [
          'job_applications',
          'FK_job_applications_source_invitation',
          'sourceInvitationId',
          'job_invitations',
          'id',
          'SET NULL',
        ],
        [
          'auth_sessions',
          'FK_auth_sessions_user',
          'userId',
          'users',
          'id',
          'CASCADE',
        ],
        [
          'auth_identities',
          'FK_auth_identities_user',
          'userId',
          'users',
          'id',
          'CASCADE',
        ],
        [
          'stored_assets',
          'FK_stored_assets_owner',
          'ownerUserId',
          'users',
          'id',
          'CASCADE',
        ],
        [
          'idempotency_records',
          'FK_idempotency_records_user',
          'userId',
          'users',
          'id',
          'CASCADE',
        ],
        [
          'profile_blocks',
          'FK_profile_blocks_blocker',
          'blockerUserId',
          'users',
          'id',
          'CASCADE',
        ],
        [
          'reel_reports',
          'FK_reel_reports_reel',
          'reelId',
          'reels',
          'id',
          'CASCADE',
        ],
        [
          'reel_reports',
          'FK_reel_reports_reporter',
          'reporterUserId',
          'users',
          'id',
          'CASCADE',
        ],
        [
          'reel_reports',
          'FK_reel_reports_resolver',
          'resolvedByAdminId',
          'users',
          'id',
          'SET NULL',
        ],
        [
          'push_devices',
          'FK_push_devices_user',
          'userId',
          'users',
          'id',
          'CASCADE',
        ],
        [
          'notification_preferences',
          'FK_notification_preferences_user',
          'userId',
          'users',
          'id',
          'CASCADE',
        ],
        [
          'company_access_requests',
          'FK_company_access_requests_company',
          'companyId',
          'pages',
          'id',
          'CASCADE',
        ],
        [
          'company_access_requests',
          'FK_company_access_requests_user',
          'userId',
          'users',
          'id',
          'CASCADE',
        ],
        [
          'company_access_requests',
          'FK_company_access_requests_reviewer',
          'reviewedByUserId',
          'users',
          'id',
          'SET NULL',
        ],
        [
          'company_verification_reviews',
          'FK_company_verification_reviews_company',
          'companyId',
          'pages',
          'id',
          'CASCADE',
        ],
        [
          'company_verification_reviews',
          'FK_company_verification_reviews_actor',
          'actorUserId',
          'users',
          'id',
          'SET NULL',
        ],
        [
          'support_ticket_messages',
          'FK_support_ticket_messages_ticket',
          'ticketId',
          'support_tickets',
          'id',
          'CASCADE',
        ],
        [
          'support_ticket_messages',
          'FK_support_ticket_messages_sender',
          'senderUserId',
          'users',
          'id',
          'SET NULL',
        ],
        [
          'account_deletion_requests',
          'FK_account_deletion_requests_user',
          'userId',
          'users',
          'id',
          'CASCADE',
        ],
        ['ratings', 'FK_ratings_given_by', 'givenBy', 'users', 'id', 'CASCADE'],
        [
          'ratings',
          'FK_ratings_given_to',
          'givenTo',
          'users',
          'id',
          'SET NULL',
        ],
        [
          'ratings',
          'FK_ratings_target_user',
          'targetUserId',
          'users',
          'id',
          'SET NULL',
        ],
        [
          'ratings',
          'FK_ratings_target_company',
          'targetCompanyId',
          'pages',
          'id',
          'SET NULL',
        ],
      ];
    for (const foreignKey of foreignKeys) {
      await this.addForeignKey(queryRunner, ...foreignKey);
    }
  }

  private async refreshRatingAggregates(queryRunner: QueryRunner) {
    await queryRunner.query(`
      UPDATE \`users\` u
      LEFT JOIN (
        SELECT
          \`targetUserId\`,
          AVG(\`stars\`) AS average,
          COUNT(*) AS count
        FROM \`ratings\`
        WHERE \`targetType\` = 'user' AND \`targetUserId\` IS NOT NULL
        GROUP BY \`targetUserId\`
      ) aggregate ON aggregate.\`targetUserId\` = u.\`id\`
      SET
        u.\`ratingAverage\` = COALESCE(aggregate.average, 0),
        u.\`ratingCount\` = COALESCE(aggregate.count, 0)
    `);
    await queryRunner.query(`
      UPDATE \`pages\` p
      LEFT JOIN (
        SELECT
          \`targetCompanyId\`,
          AVG(\`stars\`) AS average,
          COUNT(*) AS count
        FROM \`ratings\`
        WHERE \`targetType\` = 'company' AND \`targetCompanyId\` IS NOT NULL
        GROUP BY \`targetCompanyId\`
      ) aggregate ON aggregate.\`targetCompanyId\` = p.\`id\`
      SET
        p.\`ratingAverage\` = COALESCE(aggregate.average, 0),
        p.\`ratingCount\` = COALESCE(aggregate.count, 0)
    `);
  }

  private async verifyPostconditions(
    queryRunner: QueryRunner,
    baseline: BaselineCounts,
  ) {
    const current = await this.readBaseline(queryRunner);
    for (const key of Object.keys(baseline) as Array<keyof BaselineCounts>) {
      if (current[key] !== baseline[key]) {
        throw new Error(
          `Migration changed ${key} count from ${baseline[key]} to ${current[key]}`,
        );
      }
    }

    const [checks] = await queryRunner.query(`
      SELECT
        (
          SELECT COUNT(*)
          FROM \`job_applications\` ja
          LEFT JOIN \`chat_conversations\` cc
            ON cc.\`applicationId\` = ja.\`id\`
          WHERE cc.\`id\` IS NULL
        ) AS applicationsWithoutConversation,
        (
          SELECT COUNT(*)
          FROM \`chat_messages\`
          WHERE \`jobApplicationId\` IS NOT NULL AND \`conversationId\` IS NULL
        ) AS messagesWithoutConversation,
        (
          SELECT COUNT(*)
          FROM \`ratings\`
          WHERE \`side\` IS NULL
             OR (
               \`targetType\` = 'user' AND \`targetUserId\` IS NULL
             )
             OR (
               \`targetType\` = 'company' AND \`targetCompanyId\` IS NULL
             )
        ) AS invalidRatings
    `);
    if (
      Number(checks.applicationsWithoutConversation) !== 0 ||
      Number(checks.messagesWithoutConversation) !== 0 ||
      Number(checks.invalidRatings) !== 0
    ) {
      throw new Error(
        `Migration postcondition failed: ${JSON.stringify(checks)}`,
      );
    }
  }

  private async readBaseline(
    queryRunner: QueryRunner,
  ): Promise<BaselineCounts> {
    const [row] = await queryRunner.query(`
      SELECT
        (SELECT COUNT(*) FROM \`job_applications\`) AS applications,
        (SELECT COUNT(*) FROM \`chat_messages\`) AS messages,
        (SELECT COUNT(*) FROM \`ratings\`) AS ratings,
        (SELECT COUNT(*) FROM \`users\`) AS users,
        (SELECT COUNT(*) FROM \`pages\`) AS companies
    `);
    return {
      applications: Number(row.applications),
      messages: Number(row.messages),
      ratings: Number(row.ratings),
      users: Number(row.users),
      companies: Number(row.companies),
    };
  }

  private async requireTables(queryRunner: QueryRunner, tables: string[]) {
    for (const table of tables) {
      if (!(await queryRunner.hasTable(table))) {
        throw new Error(`Required base table ${table} does not exist`);
      }
    }
  }

  private async addColumn(
    queryRunner: QueryRunner,
    table: string,
    column: string,
    definition: string,
  ) {
    if (!(await queryRunner.hasColumn(table, column))) {
      await queryRunner.query(
        `ALTER TABLE \`${table}\` ADD \`${column}\` ${definition}`,
      );
    }
  }

  private async addIndex(
    queryRunner: QueryRunner,
    table: string,
    name: string,
    columns: string,
    unique = false,
  ) {
    if (await this.indexExists(queryRunner, table, name)) return;
    await queryRunner.query(
      `CREATE ${unique ? 'UNIQUE ' : ''}INDEX \`${name}\` ON \`${table}\` (${columns})`,
    );
  }

  private async addForeignKey(
    queryRunner: QueryRunner,
    table: string,
    name: string,
    column: string,
    referencedTable: string,
    referencedColumn: string,
    onDelete: string,
  ) {
    if (await this.foreignKeyExists(queryRunner, table, name)) return;
    await queryRunner.query(`
      ALTER TABLE \`${table}\`
      ADD CONSTRAINT \`${name}\`
      FOREIGN KEY (\`${column}\`)
      REFERENCES \`${referencedTable}\`(\`${referencedColumn}\`)
      ON DELETE ${onDelete}
      ON UPDATE NO ACTION
    `);
  }

  private async indexExists(
    queryRunner: QueryRunner,
    table: string,
    name: string,
  ) {
    const rows = await queryRunner.query(
      `
        SELECT 1
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND INDEX_NAME = ?
        LIMIT 1
      `,
      [table, name],
    );
    return rows.length > 0;
  }

  private async foreignKeyExists(
    queryRunner: QueryRunner,
    table: string,
    name: string,
  ) {
    const rows = await queryRunner.query(
      `
        SELECT 1
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND CONSTRAINT_NAME = ?
          AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        LIMIT 1
      `,
      [table, name],
    );
    return rows.length > 0;
  }
}
