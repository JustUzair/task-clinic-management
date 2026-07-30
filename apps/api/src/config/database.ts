import { PrismaPg } from "@prisma/adapter-pg";
import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "./env.js";

const processGlobal = globalThis as typeof globalThis & {
  clinicDatabasePool?: Pool;
  clinicPrisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    connectionTimeoutMillis: env.DATABASE_CONNECTION_TIMEOUT_MS,
    idleTimeoutMillis: env.DATABASE_IDLE_TIMEOUT_MS,
    max: env.DATABASE_POOL_MAX,
  });
  processGlobal.clinicDatabasePool = pool;

  if (process.env.VERCEL === "1") {
    attachDatabasePool(pool);
  }

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma =
  processGlobal.clinicPrisma ?? (processGlobal.clinicPrisma = createPrismaClient());
