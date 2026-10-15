"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateLegacyJobFilterColumn = migrateLegacyJobFilterColumn;
const promise_1 = require("mysql2/promise");
async function migrateLegacyJobFilterColumn() {
    const conn = await (0, promise_1.createConnection)({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
    });
    try {
        const [cols] = await conn.query(`SELECT 1 FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'jobs' AND COLUMN_NAME = 'filterId'`);
        if (!cols.length)
            return;
        const [joinTable] = await conn.query(`SELECT 1 FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'job_filters'`);
        if (!joinTable.length) {
            throw new Error('jobs.filterId exists but job_filters table is missing — cannot migrate categories');
        }
        const [copied] = await conn.query(`INSERT IGNORE INTO job_filters (jobId, filterId)
       SELECT j.id, j.filterId
       FROM jobs j
       JOIN filters f ON f.id = j.filterId
       WHERE j.filterId IS NOT NULL`);
        const [fks] = await conn.query(`SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'jobs'
         AND COLUMN_NAME = 'filterId' AND REFERENCED_TABLE_NAME IS NOT NULL`);
        for (const fk of fks) {
            await conn.query(`ALTER TABLE jobs DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
        }
        await conn.query('ALTER TABLE jobs DROP COLUMN filterId');
        console.log(`[migrate] jobs.filterId → job_filters: ${copied.affectedRows} row(s) copied, column dropped`);
    }
    finally {
        await conn.end();
    }
}
if (require.main === module) {
    require('dotenv').config();
    migrateLegacyJobFilterColumn()
        .then(() => console.log('✅ migrate:job-filters finished'))
        .catch((err) => {
        console.error('❌ migrate:job-filters failed:', err.message || err);
        process.exit(1);
    });
}
//# sourceMappingURL=migrate-legacy-filter-column.js.map