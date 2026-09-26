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
        'Social login returns `kyc_complete: false` until phone is verified via `/auth/kyc/*`.',
        '',
        '### Email update',
        'Use `/auth/update-email/*` (JWT required). Email must be unique.',
    ].join('\n'))
        .setVersion('1.0')
        .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste JWT from login / register / google / facebook',
    }, 'JWT')
        .addTag('Health', 'App health check')
        .addTag('Auth', 'Register, login, social, KYC, email update, forgot password')
        .addTag('Users', 'Profile & preferences')
        .addTag('Countries', 'Country list')
        .addTag('Languages', 'Language CRUD')
        .addTag('Cities', 'Cities (seeded for Pakistan)')
        .addTag('Filters', 'Job category filters')
        .addTag('Jobs', 'Job posts')
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