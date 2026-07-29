"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const dotenv_1 = require("dotenv");
const path_1 = require("path");
const typeorm_1 = require("typeorm");
(0, dotenv_1.config)();
const nodeEnv = process.env.NODE_ENV || 'development';
const AppDataSource = new typeorm_1.DataSource({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [(0, path_1.join)(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [(0, path_1.join)(__dirname, 'migrations', '*.{ts,js}')],
    migrationsTableName: 'typeorm_migrations',
    synchronize: nodeEnv === 'development' && process.env.DB_SYNCHRONIZE !== 'false',
    legacySpatialSupport: false,
});
exports.default = AppDataSource;
//# sourceMappingURL=data-source.js.map