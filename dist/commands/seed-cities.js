"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const path_1 = require("path");
(0, dotenv_1.config)({ path: (0, path_1.resolve)(process.cwd(), '.env') });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../app.module");
const city_service_1 = require("../city/city.service");
async function run() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log'],
    });
    try {
        const cityService = app.get(city_service_1.CityService);
        const { created, skipped, countryId } = await cityService.seedPakistanCities();
        console.log('\n✅ City seed finished (Pakistan)');
        console.log(`   Country ID: ${countryId}`);
        console.log(`   Created: ${created.length}`);
        console.log(`   Skipped (already exist): ${skipped.length}`);
        if (created.length) {
            console.log('\n   New cities:');
            created.forEach((c) => console.log(`   - [${c.id}] ${c.name}`));
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
    console.error('❌ seed:cities failed:', err.message || err);
    process.exit(1);
});
//# sourceMappingURL=seed-cities.js.map