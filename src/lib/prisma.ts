import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export function getPrismaClient(): PrismaClient {
  return globalForPrisma.prisma ?? prisma;
}

export function setPrismaClientForTests(client: PrismaClient): void {
  globalForPrisma.prisma = client;
}
