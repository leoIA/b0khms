// =============================================================================
// ConstrutorPro - Prisma Configuration (Prisma v7+)
// =============================================================================
// The datasource `url` property is no longer supported in schema.prisma for
// Prisma v7. Connection URLs must be provided here for Migrate, and passed
// via `datasourceUrl` in the PrismaClient constructor at runtime.

import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasourceUrl: process.env.DATABASE_URL,
});
