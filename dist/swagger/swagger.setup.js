"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSwagger = setupSwagger;
const swagger_1 = require("@nestjs/swagger");
function setupSwagger(app) {
    const config = new swagger_1.DocumentBuilder()
        .setTitle('JobsLoot API')
        .setDescription([
        'JobsLoot / JadeedJob backend API docs.',
        '',
        '### Auth',
        '1. Register or Login to get `access_token`',
        '2. Click **Authorize** and paste: `Bearer <token>` or just the token',
        '3. Call protected endpoints',
        '',
        '### Dev OTP',
        'Phone & email OTP is always **`123456`** until production SMS/email is enabled.',
        '',
        '### KYC (Google / Facebook)',
        '**New / unlinked** social → `kyc_complete: false` + `kyc_token` (30 min). No DB user yet.',
        'Then `POST /auth/kyc/send-otp` + `verify-otp` with `kycToken`.',
        'If phone already exists → links to that account (OTP = ownership).',
        'If that account already has another Google/Facebook → `requires_link_confirmation` + `link_token`.',
        'Confirm with `POST /auth/link-identity/confirm` (never overwrites primary email / googleId).',
        'Never auto-links by email match alone.',
        '',
        '### Email update',
        'Use `/auth/update-email/*` (JWT required). Email must be unique.',
        '',
        '### Filters',
        '`GET /filters` — approved categories. Icons: `{ type: "tabler", name }` or `{ type: "custom", svg }`.',
        '`last_update_time` for RN cache. Optional Bearer → preferred filters first.',
        'Update prefs: `PATCH /users/me` with `filter_preferences` (min **4**, max **30**).',
        'Seed: `npm run seed:filters`',
        '',
        '### Jobs',
        'Create/update with `filterIds: number[]` (1–10 categories). Legacy `filterId` still works.',
    ].join('\n'))
        .setVersion('1.0')
        .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste JWT from login / register / google / facebook',
    }, 'JWT')
        .addTag('Health', 'App health check')
        .addTag('Auth', 'Register, login, social (kyc_token until phone OTP), KYC, email update')
        .addTag('Users', 'Profile & filter_preferences (min 4, max 30)')
        .addTag('Countries', 'Country list')
        .addTag('Languages', 'Language CRUD')
        .addTag('Cities', 'Cities (seeded for Pakistan)')
        .addTag('Filters', 'Job categories. Tabler/custom icons. Cache via last_update_time. Optional JWT for preferred-first.')
        .addTag('Jobs', 'Job posts — multi filterIds (1–10)')
        .addTag('Job Applications', 'Apply & manage applications')
        .addTag('Organization', 'Organizations & members')
        .addTag('Pages', 'Company pages')
        .addTag('Chat', 'Application chat messages')
        .addTag('Ratings', 'Rate after job application')
        .addTag('Files', 'File upload')
        .addTag('Firebase', 'Push notification helpers')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
            docExpansion: 'list',
            filter: true,
            tagsSorter: 'alpha',
            operationsSorter: 'alpha',
        },
        customSiteTitle: 'JobsLoot API Docs',
    });
}
//# sourceMappingURL=swagger.setup.js.map