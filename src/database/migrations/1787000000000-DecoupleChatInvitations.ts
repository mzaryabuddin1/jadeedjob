import { MigrationInterface, QueryRunner } from 'typeorm';

export class DecoupleChatInvitations1787000000000
  implements MigrationInterface
{
  name = 'DecoupleChatInvitations1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('job_invitations'))) return;
    const database = queryRunner.connection.options.database as string;
    const constraints: Array<{ CONSTRAINT_NAME: string }> =
      await queryRunner.query(
        `SELECT DISTINCT kcu.CONSTRAINT_NAME
           FROM information_schema.KEY_COLUMN_USAGE kcu
          WHERE kcu.TABLE_SCHEMA = ?
            AND kcu.TABLE_NAME = 'job_invitations'
            AND kcu.COLUMN_NAME = 'conversationId'
            AND kcu.REFERENCED_TABLE_NAME = 'chat_conversations'`,
        [database],
      );
    for (const constraint of constraints) {
      const safeName = String(constraint.CONSTRAINT_NAME).replace(/`/g, '``');
      await queryRunner.query(
        `ALTER TABLE \`job_invitations\` DROP FOREIGN KEY \`${safeName}\``,
      );
    }
  }

  public async down(): Promise<void> {
    throw new Error(
      'DecoupleChatInvitations is intentionally irreversible while Mongo chat storage may own conversations.',
    );
  }
}
