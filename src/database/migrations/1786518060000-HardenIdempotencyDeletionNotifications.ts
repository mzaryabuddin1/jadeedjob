import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenIdempotencyDeletionNotifications1786518060000
  implements MigrationInterface
{
  name = 'HardenIdempotencyDeletionNotifications1786518060000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('idempotency_records')) {
      await queryRunner.query(`
        ALTER TABLE \`idempotency_records\`
        MODIFY \`state\` enum('processing','completed','failed') NOT NULL DEFAULT 'processing'
      `);
      await this.addColumn(queryRunner, 'idempotency_records', 'leaseId', 'varchar(36) NULL');
      await this.addColumn(queryRunner, 'idempotency_records', 'leaseExpiresAt', 'datetime NULL');
      await this.addColumn(queryRunner, 'idempotency_records', 'attemptCount', 'int UNSIGNED NOT NULL DEFAULT 1');
      await this.addColumn(queryRunner, 'idempotency_records', 'responseHeaders', 'json NULL');
      await this.addColumn(queryRunner, 'idempotency_records', 'completedAt', 'datetime NULL');
      await this.addColumn(queryRunner, 'idempotency_records', 'lastErrorCode', 'text NULL');
      await this.addIndex(
        queryRunner,
        'idempotency_records',
        'IDX_idempotency_state_lease',
        '`state`, `leaseExpiresAt`',
      );
      await queryRunner.query(`
        UPDATE \`idempotency_records\`
        SET \`completedAt\` = COALESCE(\`completedAt\`, \`updatedAt\`)
        WHERE \`state\` = 'completed'
      `);
    }

    if (await queryRunner.hasTable('notifications')) {
      await this.addColumn(queryRunner, 'notifications', 'dedupeKey', 'varchar(255) NULL');
      await this.addIndex(
        queryRunner,
        'notifications',
        'UQ_notifications_dedupe_key',
        '`dedupeKey`',
        true,
      );
    }

    if (await queryRunner.hasTable('account_deletion_requests')) {
      await this.addColumn(queryRunner, 'account_deletion_requests', 'activeKey', 'varchar(80) NULL');
      await this.addColumn(queryRunner, 'account_deletion_requests', 'processingClaimToken', 'varchar(36) NULL');
      await this.addColumn(queryRunner, 'account_deletion_requests', 'processingClaimedAt', 'datetime NULL');
      await this.addColumn(queryRunner, 'account_deletion_requests', 'processingAttempts', 'int UNSIGNED NOT NULL DEFAULT 0');
      await this.addColumn(queryRunner, 'account_deletion_requests', 'lastError', 'text NULL');
      await queryRunner.query(`
        UPDATE \`account_deletion_requests\` older
        INNER JOIN \`account_deletion_requests\` newer
          ON newer.\`userId\` = older.\`userId\`
         AND newer.\`status\` = 'scheduled'
         AND older.\`status\` = 'scheduled'
         AND newer.\`id\` > older.\`id\`
        SET older.\`status\` = 'cancelled', older.\`activeKey\` = NULL
      `);
      await queryRunner.query(`
        UPDATE \`account_deletion_requests\`
        SET \`activeKey\` = CONCAT('user:', \`userId\`)
        WHERE \`status\` = 'scheduled' AND \`activeKey\` IS NULL
      `);
      await this.addIndex(
        queryRunner,
        'account_deletion_requests',
        'UQ_account_deletion_active_key',
        '`activeKey`',
        true,
      );
      await this.addIndex(
        queryRunner,
        'account_deletion_requests',
        'IDX_account_deletion_processing_claim',
        '`status`, `processingClaimedAt`',
      );
    }
  }

  public async down(): Promise<void> {
    throw new Error(
      'HardenIdempotencyDeletionNotifications is data-bearing and intentionally irreversible.',
    );
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

  private async addIndex(
    queryRunner: QueryRunner,
    table: string,
    name: string,
    columns: string,
    unique = false,
  ) {
    const rows = await queryRunner.query(
      `SELECT 1 FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
      [table, name],
    );
    if (!rows.length) {
      await queryRunner.query(
        `CREATE ${unique ? 'UNIQUE ' : ''}INDEX \`${name}\` ON \`${table}\` (${columns})`,
      );
    }
  }
}
