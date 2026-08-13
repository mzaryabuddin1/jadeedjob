"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FreshDatabaseBaseline1785000000000 = void 0;
class FreshDatabaseBaseline1785000000000 {
    constructor() {
        this.name = 'FreshDatabaseBaseline1785000000000';
    }
    async up(queryRunner) {
        const existingTables = new Set((await queryRunner.getTables()).map((table) => table.name));
        const missingEntityTables = new Set(queryRunner.connection.entityMetadatas
            .map((metadata) => metadata.tablePath)
            .filter((table) => !existingTables.has(table)));
        if (missingEntityTables.size === 0)
            return;
        const schemaChanges = await queryRunner.connection.driver
            .createSchemaBuilder()
            .log();
        const createsByTable = new Map();
        for (const query of schemaChanges.upQueries) {
            const sql = query.query.trim();
            const match = sql.match(/^CREATE TABLE\s+`([^`]+)`/i);
            if (!match || !missingEntityTables.has(match[1]))
                continue;
            createsByTable.set(match[1], sql.replace(/^CREATE TABLE\s+/i, 'CREATE TABLE IF NOT EXISTS '));
        }
        const unresolved = [...missingEntityTables].filter((table) => !createsByTable.has(table));
        if (unresolved.length > 0) {
            throw new Error(`Could not generate create-only baseline for: ${unresolved.join(', ')}`);
        }
        for (const query of schemaChanges.upQueries) {
            const match = query.query.trim().match(/^CREATE TABLE\s+`([^`]+)`/i);
            if (!match)
                continue;
            const create = createsByTable.get(match[1]);
            if (create)
                await queryRunner.query(create);
        }
    }
    async down() {
        throw new Error('FreshDatabaseBaseline is intentionally irreversible and never drops tables.');
    }
}
exports.FreshDatabaseBaseline1785000000000 = FreshDatabaseBaseline1785000000000;
//# sourceMappingURL=1785000000000-FreshDatabaseBaseline.js.map