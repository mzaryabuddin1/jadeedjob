"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRuntimeConfiguration = validateRuntimeConfiguration;
const DEPLOYED_ENVIRONMENTS = new Set(['staging', 'production']);
function validateRuntimeConfiguration() {
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (!DEPLOYED_ENVIRONMENTS.has(nodeEnv))
        return;
    const required = [
        'APP_URL',
        'ALLOWED_ORIGINS',
        'JWT_SECRET',
        'SOCIAL_CHALLENGE_SECRET',
        'REDIS_URL',
        'S3_BUCKET',
        'S3_REGION',
        'S3_ACCESS_KEY_ID',
        'S3_SECRET_ACCESS_KEY',
        'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN',
        'TWILIO_PHONE_NUMBER',
    ];
    if (process.env.GOOGLE_AUTH_ENABLED !== 'false' &&
        !process.env.GOOGLE_CLIENT_IDS) {
        required.push('GOOGLE_CLIENT_ID');
    }
    if (process.env.FACEBOOK_AUTH_ENABLED !== 'false') {
        required.push('FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET');
    }
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON &&
        !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        required.push('FIREBASE_SERVICE_ACCOUNT_JSON');
    }
    const missing = required.filter((key) => !String(process.env[key] || '').trim());
    if (missing.length) {
        throw new Error(`Missing required ${nodeEnv} configuration: ${[...new Set(missing)].join(', ')}`);
    }
    if (process.env.DB_SYNCHRONIZE !== 'false') {
        throw new Error(`DB_SYNCHRONIZE must be explicitly set to false in ${nodeEnv}`);
    }
    if (process.env.STORAGE_PROVIDER && process.env.STORAGE_PROVIDER !== 's3') {
        throw new Error(`STORAGE_PROVIDER must be s3 in ${nodeEnv}`);
    }
    if ((process.env.JWT_SECRET || '').length < 32) {
        throw new Error('JWT_SECRET must contain at least 32 characters');
    }
    const origins = (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
    if (!origins.length || origins.includes('*')) {
        throw new Error('ALLOWED_ORIGINS must contain explicit origins and cannot contain *');
    }
}
//# sourceMappingURL=validate-runtime-configuration.js.map