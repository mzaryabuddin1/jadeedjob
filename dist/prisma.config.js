"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("prisma/config");
exports.default = (0, config_1.defineConfig)({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    engine: "classic",
    datasource: {
        url: "postgresql://postgres:P3XKhnHPYdGWyl5I@localhost:5432/jobsloot_staging?schema=public",
    },
});
//# sourceMappingURL=prisma.config.js.map