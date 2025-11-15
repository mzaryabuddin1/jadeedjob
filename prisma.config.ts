import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: "postgresql://postgres:P3XKhnHPYdGWyl5I@localhost:5432/jobsloot_staging?schema=public",
  },
});
