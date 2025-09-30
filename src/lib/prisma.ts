// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma?: PrismaClient }

// Usa un union type simple; nada de LogLevel/LogDefinition
const log: ('query' | 'warn' | 'error')[] =
  process.env.PRISMA_LOG_QUERIES === 'true'
    ? ['query', 'warn', 'error']
    : ['warn', 'error']

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
