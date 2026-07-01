import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// Fallback to a placeholder URL during build/compile if DATABASE_URL is not set yet
const connectionString = process.env.DATABASE_URL || "postgresql://postgres:placeholder@localhost:5432/postgres"

const pool = new Pool({ 
  connectionString,
  max: 10,
  idleTimeoutMillis: 10000,
})

const adapter = new PrismaPg(pool)

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
