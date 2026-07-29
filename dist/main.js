"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const express = __importStar(require("express"));
const path_1 = require("path");
const swagger_1 = require("@nestjs/swagger");
const api_exception_filter_1 = require("./common/errors/api-exception.filter");
const redis_io_adapter_1 = require("./chat/redis-io.adapter");
const validate_runtime_configuration_1 = require("./config/validate-runtime-configuration");
const packageJson = require('../package.json');
async function bootstrap() {
    (0, validate_runtime_configuration_1.validateRuntimeConfiguration)();
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalFilters(new api_exception_filter_1.ApiExceptionFilter());
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
    const configuredOrigins = (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
    app.enableCors({
        origin: configuredOrigins.length > 0
            ? configuredOrigins
            : process.env.NODE_ENV === 'production'
                ? false
                : true,
        credentials: true,
    });
    if (['staging', 'production'].includes(process.env.NODE_ENV || '')) {
        const redisAdapter = new redis_io_adapter_1.RedisIoAdapter(app);
        await redisAdapter.connect();
        app.useWebSocketAdapter(redisAdapter);
    }
    const swaggerConfig = new swagger_1.DocumentBuilder()
        .setTitle('JadeedJob API')
        .setVersion(packageJson.version ?? '0.0.1')
        .addBearerAuth()
        .build();
    const swaggerDocument = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
    swagger_1.SwaggerModule.setup('docs', app, swaggerDocument, {
        jsonDocumentUrl: 'docs-json',
    });
    if ((process.env.NODE_ENV || 'development') === 'development') {
        app.use('/uploads', express.static((0, path_1.join)(__dirname, '..', 'uploads')));
    }
    await app.listen(Number(process.env.PORT || 3000), '0.0.0.0');
}
bootstrap();
//# sourceMappingURL=main.js.map