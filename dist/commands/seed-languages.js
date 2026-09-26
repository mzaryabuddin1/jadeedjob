"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const path_1 = require("path");
(0, dotenv_1.config)({ path: (0, path_1.resolve)(process.cwd(), '.env') });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../app.module");
const language_service_1 = require("../language/language.service");
async function run() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log'],
    });
    try {
        const languageService = app.get(language_service_1.LanguageService);
        const { created, skipped } = await languageService.seedLanguages();
        console.log('\n✅ Language seed finished');
        console.log(`   Created: ${created.length}`);
        console.log(`   Skipped (already exist): ${skipped.length}`);
        if (created.length) {
            console.log('\n   New languages:');
            created.forEach((l) => console.log(`   - [${l.id}] ${l.name} (${l.code})`));
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
    console.error('❌ seed:languages failed:', err.message || err);
    process.exit(1);
});
//# sourceMappingURL=seed-languages.js.map