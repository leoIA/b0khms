// =============================================================================
// ConstrutorPro - Cliente Prisma
// =============================================================================

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
  });

if (String(process.env.NODE_ENV) !== 'production') globalForPrisma.prisma = db;

// Tipos de exportação
export type { PrismaClient } from '@prisma/client';
