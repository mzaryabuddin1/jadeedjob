"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const path_1 = require("path");
(0, dotenv_1.config)({ path: (0, path_1.resolve)(process.cwd(), '.env') });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../app.module");
const filter_service_1 = require("../filter/filter.service");
async function run() {
    const createdByArg = process.argv.find((a) => a.startsWith('--user='));
    const createdBy = createdByArg
        ? Number(createdByArg.split('=')[1])
        : undefined;
    const pending = process.argv.includes('--pending');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log'],
    });
    try {
        const filterService = app.get(filter_service_1.FilterService);
        const { created, skipped } = await filterService.seedFakeFilters({
            createdBy,
            approve: !pending,
        });
        console.log('\n✅ Filter seed finished');
        console.log(`   Created: ${created.length}`);
        console.log(`   Skipped (already exist): ${skipped.length}`);
        if (created.length) {
            console.log('\n   New filters:');
            created.forEach((f) => console.log(`   - [${f.id}] ${f.name} (${f.approvalStatus})`));
        }
        if (skipped.length) {
            console.log('\n   Skipped names:', skipped.join(', '));
        }
        console.log('');
    }
    finally {
        await app.close();
    }
}
run().catch((err) => {
    console.error('❌ seed:filters failed:', err.message || err);
    process.exit(1);
});
//# sourceMappingURL=seed-filters.js.map