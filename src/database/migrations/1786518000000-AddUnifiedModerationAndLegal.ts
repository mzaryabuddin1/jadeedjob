import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnifiedModerationAndLegal1786518000000
  implements MigrationInterface
{
  name = 'AddUnifiedModerationAndLegal1786518000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`legal_documents\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`documentType\` enum('terms','privacy','community_guidelines') NOT NULL,
        \`version\` varchar(80) NOT NULL,
        \`title\` varchar(200) NOT NULL,
        \`contentUrl\` varchar(1000) NOT NULL,
        \`effectiveAt\` datetime NOT NULL,
        \`publishedAt\` datetime NOT NULL,
        \`supersededAt\` datetime NULL,
        \`isCurrent\` tinyint NOT NULL DEFAULT 1,
        \`publishedByAdminId\` int NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_legal_documents_type_version\` (\`documentType\`, \`version\`),
        KEY \`IDX_legal_documents_current\` (\`documentType\`, \`isCurrent\`)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`user_legal_acceptances\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`userId\` int NOT NULL,
        \`legalDocumentId\` int NOT NULL,
        \`documentType\` enum('terms','privacy','community_guidelines') NOT NULL,
        \`version\` varchar(80) NOT NULL,
        \`clientPlatform\` enum('ios','android','web','unknown') NOT NULL DEFAULT 'unknown',
        \`acceptedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_user_legal_acceptances_user_document\` (\`userId\`, \`legalDocumentId\`),
        KEY \`IDX_user_legal_acceptances_user_type\` (\`userId\`, \`documentType\`),
        CONSTRAINT \`FK_user_legal_acceptances_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`FK_user_legal_acceptances_document\` FOREIGN KEY (\`legalDocumentId\`) REFERENCES \`legal_documents\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`moderation_reports\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`targetType\` enum('post','post_comment','reel','reel_comment','user','company','chat_message','job') NOT NULL,
        \`targetId\` varchar(64) NOT NULL,
        \`reporterUserId\` int NOT NULL,
        \`targetOwnerUserId\` int NULL,
        \`targetCompanyId\` int NULL,
        \`activeKey\` varchar(255) NULL,
        \`legacySourceType\` varchar(40) NULL,
        \`legacySourceId\` int NULL,
        \`reason\` varchar(80) NOT NULL,
        \`details\` text NULL,
        \`targetSnapshot\` json NULL,
        \`status\` enum('pending','dismissed','actioned') NOT NULL DEFAULT 'pending',
        \`action\` enum('dismiss','hide','remove','warn','suspend','ban') NULL,
        \`reviewedByAdminId\` int NULL,
        \`resolutionNotes\` text NULL,
        \`suspensionEndsAt\` datetime NULL,
        \`resolvedAt\` datetime NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_moderation_reports_active_key\` (\`activeKey\`),
        UNIQUE KEY \`UQ_moderation_reports_legacy_source\` (\`legacySourceType\`, \`legacySourceId\`),
        KEY \`IDX_moderation_reports_status_created\` (\`status\`, \`createdAt\`),
        KEY \`IDX_moderation_reports_target\` (\`targetType\`, \`targetId\`),
        CONSTRAINT \`FK_moderation_reports_reporter\` FOREIGN KEY (\`reporterUserId\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`FK_moderation_reports_reviewer\` FOREIGN KEY (\`reviewedByAdminId\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`moderation_audits\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`reportId\` int NOT NULL,
        \`actorUserId\` int NULL,
        \`event\` varchar(60) NOT NULL,
        \`notes\` text NULL,
        \`metadata\` json NULL,
        \`dedupeKey\` varchar(255) NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_moderation_audits_dedupe_key\` (\`dedupeKey\`),
        KEY \`IDX_moderation_audits_report_created\` (\`reportId\`, \`createdAt\`),
        CONSTRAINT \`FK_moderation_audits_report\` FOREIGN KEY (\`reportId\`) REFERENCES \`moderation_reports\` (\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`FK_moderation_audits_actor\` FOREIGN KEY (\`actorUserId\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);

    for (const table of [
      'community_posts',
      'community_post_comments',
      'reels',
      'reel_comments',
      'chat_messages',
      'jobs',
    ]) {
      if (await queryRunner.hasTable(table)) {
        await this.addColumn(
          queryRunner,
          table,
          'moderationStatus',
          "enum('visible','hidden','removed') NOT NULL DEFAULT 'visible'",
        );
      }
    }
    if (await queryRunner.hasTable('community_post_comments')) {
      await this.addColumn(queryRunner, 'community_post_comments', 'deletedAt', 'datetime NULL');
      await this.addColumn(queryRunner, 'community_post_comments', 'deletedByUserId', 'int NULL');
      await this.addColumn(queryRunner, 'community_post_comments', 'deletionReason', 'varchar(80) NULL');
    }
    if (await queryRunner.hasTable('reel_comments')) {
      await this.addColumn(queryRunner, 'reel_comments', 'deletedAt', 'datetime NULL');
      await this.addColumn(queryRunner, 'reel_comments', 'deletedByUserId', 'int NULL');
      await this.addColumn(queryRunner, 'reel_comments', 'deletionReason', 'varchar(80) NULL');
    }
    await this.addColumn(queryRunner, 'users', 'suspendedAt', 'datetime NULL');
    await this.addColumn(queryRunner, 'users', 'suspendedUntil', 'datetime NULL');
    await this.addColumn(queryRunner, 'users', 'suspensionReason', 'text NULL');

    await this.backfillLegacyReports(queryRunner);
  }

  public async down(): Promise<void> {
    throw new Error(
      'AddUnifiedModerationAndLegal is data-bearing and intentionally irreversible.',
    );
  }

  private async backfillLegacyReports(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable('community_post_reports')) {
      await queryRunner.query(`
        INSERT IGNORE INTO \`moderation_reports\` (
          \`targetType\`, \`targetId\`, \`reporterUserId\`, \`targetOwnerUserId\`,
          \`targetCompanyId\`, \`activeKey\`, \`legacySourceType\`, \`legacySourceId\`,
          \`reason\`, \`details\`, \`targetSnapshot\`, \`status\`, \`createdAt\`, \`updatedAt\`
        )
        SELECT
          'post', CAST(pr.\`postId\` AS CHAR), pr.\`userId\`, p.\`creatorId\`,
          p.\`publisherCompanyId\`, CONCAT(pr.\`userId\`, ':post:', pr.\`postId\`),
          'post_report', pr.\`id\`, pr.\`reason\`, pr.\`details\`,
          JSON_OBJECT('postId', CAST(pr.\`postId\` AS CHAR)), 'pending', pr.\`createdAt\`, pr.\`createdAt\`
        FROM \`community_post_reports\` pr
        INNER JOIN \`community_posts\` p ON p.\`id\` = pr.\`postId\`
      `);
      await queryRunner.query(`
        UPDATE \`moderation_reports\` mr
        INNER JOIN \`community_post_reports\` pr
          ON mr.\`targetType\` = 'post'
         AND mr.\`targetId\` = CAST(pr.\`postId\` AS CHAR)
         AND mr.\`reporterUserId\` = pr.\`userId\`
        SET mr.\`legacySourceType\` = 'post_report', mr.\`legacySourceId\` = pr.\`id\`
        WHERE mr.\`legacySourceType\` IS NULL
      `);
    }
    if (await queryRunner.hasTable('reel_reports')) {
      await queryRunner.query(`
        INSERT IGNORE INTO \`moderation_reports\` (
          \`targetType\`, \`targetId\`, \`reporterUserId\`, \`targetOwnerUserId\`,
          \`targetCompanyId\`, \`activeKey\`, \`legacySourceType\`, \`legacySourceId\`,
          \`reason\`, \`details\`, \`targetSnapshot\`, \`status\`, \`action\`,
          \`reviewedByAdminId\`, \`resolutionNotes\`, \`resolvedAt\`, \`createdAt\`, \`updatedAt\`
        )
        SELECT
          'reel', CAST(rr.\`reelId\` AS CHAR), rr.\`reporterUserId\`, r.\`creatorId\`,
          r.\`publisherCompanyId\`,
          CASE WHEN rr.\`status\` = 'pending' THEN CONCAT(rr.\`reporterUserId\`, ':reel:', rr.\`reelId\`) ELSE NULL END,
          'reel_report', rr.\`id\`, rr.\`reason\`, rr.\`details\`,
          JSON_OBJECT('reelId', CAST(rr.\`reelId\` AS CHAR)),
          CASE WHEN rr.\`status\` = 'pending' THEN 'pending' WHEN rr.\`status\` = 'dismissed' THEN 'dismissed' ELSE 'actioned' END,
          CASE WHEN rr.\`status\` = 'dismissed' THEN 'dismiss' WHEN rr.\`status\` = 'actioned' THEN 'hide' WHEN rr.\`status\` = 'reviewed' THEN 'warn' ELSE NULL END,
          rr.\`resolvedByAdminId\`, rr.\`resolutionNote\`, rr.\`resolvedAt\`, rr.\`createdAt\`, rr.\`updatedAt\`
        FROM \`reel_reports\` rr
        INNER JOIN \`reels\` r ON r.\`id\` = rr.\`reelId\`
      `);
      await queryRunner.query(`
        UPDATE \`moderation_reports\` mr
        INNER JOIN \`reel_reports\` rr
          ON mr.\`targetType\` = 'reel'
         AND mr.\`targetId\` = CAST(rr.\`reelId\` AS CHAR)
         AND mr.\`reporterUserId\` = rr.\`reporterUserId\`
        SET mr.\`legacySourceType\` = 'reel_report', mr.\`legacySourceId\` = rr.\`id\`
        WHERE mr.\`legacySourceType\` IS NULL
      `);
    }
    await queryRunner.query(`
      INSERT IGNORE INTO \`moderation_audits\`
        (\`reportId\`, \`actorUserId\`, \`event\`, \`notes\`, \`metadata\`, \`dedupeKey\`, \`createdAt\`)
      SELECT mr.\`id\`, mr.\`reporterUserId\`, 'legacy_report_imported', NULL,
        JSON_OBJECT('legacySourceType', mr.\`legacySourceType\`, 'legacySourceId', mr.\`legacySourceId\`),
        CONCAT('legacy:', mr.\`legacySourceType\`, ':', mr.\`legacySourceId\`), mr.\`createdAt\`
      FROM \`moderation_reports\` mr
      WHERE mr.\`legacySourceType\` IS NOT NULL
    `);
  }

  private async addColumn(
    queryRunner: QueryRunner,
    table: string,
    column: string,
    definition: string,
  ) {
    if (!(await queryRunner.hasColumn(table, column))) {
      await queryRunner.query(
        `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`,
      );
    }
  }
}
