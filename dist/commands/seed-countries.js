"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const path_1 = require("path");
(0, dotenv_1.config)({ path: (0, path_1.resolve)(process.cwd(), '.env') });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../app.module");
const country_service_1 = require("../country/country.service");
async function run() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log'],
    });
    try {
        const countryService = app.get(country_service_1.CountryService);
        const { created, skipped } = await countryService.seedCountries();
        console.log('\n✅ Country seed finished');
        console.log(`   Created: ${created.length}`);
        console.log(`   Skipped (already exist): ${skipped.length}`);
        if (created.length) {
            console.log('\n   New countries:');
            created.forEach((c) => console.log(`   - [${c.id}] ${c.name} (${c.code}) ${c.dial_code}`));
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
    console.error('❌ seed:countries failed:', err.message || err);
    process.exit(1);
});
//# sourceMappingURL=seed-countries.js.map