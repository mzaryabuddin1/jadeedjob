import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates only entity tables that are wholly absent. Existing tables are never
 * inspected for drift or changed here; later additive migrations own upgrades.
 */
export class FreshDatabaseBaseline1785000000000
  implements MigrationInterface
{
  name = 'FreshDatabaseBaseline1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const existingTables = new Set(
      (await queryRunner.getTables()).map((table) => table.name),
    );
    const missingEntityTables = new Set(
      queryRunner.connection.entityMetadatas
        .map((metadata) => metadata.tablePath)
        .filter((table) => !existingTables.has(table)),
    );

    if (missingEntityTables.size === 0) return;

    const schemaChanges = await queryRunner.connection.driver
      .createSchemaBuilder()
      .log();

    const createsByTable = new Map<string, string>();
    for (const query of schemaChanges.upQueries) {
      const sql = query.query.trim();
      const match = sql.match(/^CREATE TABLE\s+`([^`]+)`/i);
      if (!match || !missingEntityTables.has(match[1])) continue;
      createsByTable.set(
        match[1],
        sql.replace(/^CREATE TABLE\s+/i, 'CREATE TABLE IF NOT EXISTS '),
      );
    }

    const unresolved = [...missingEntityTables].filter(
      (table) => !createsByTable.has(table),
    );
    if (unresolved.length > 0) {
      throw new Error(
        `Could not generate create-only baseline for: ${unresolved.join(', ')}`,
      );
    }

    // Schema-builder output is dependency ordered. Filtering by its original
    // sequence preserves that ordering while excluding every non-create query.
    for (const query of schemaChanges.upQueries) {
      const match = query.query.trim().match(/^CREATE TABLE\s+`([^`]+)`/i);
      if (!match) continue;
      const create = createsByTable.get(match[1]);
      if (create) await queryRunner.query(create);
    }
  }

  public async down(): Promise<void> {
    throw new Error(
      'FreshDatabaseBaseline is intentionally irreversible and never drops tables.',
    );
  }
}
