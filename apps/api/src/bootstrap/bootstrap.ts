import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";
import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { AccountRole, ImportSource } from "../generated/prisma/enums.js";
import { ImportService } from "../modules/import/import.service.js";

const bootstrapLockName = "clinic-scheduler-bootstrap-v1";

async function readFixture(filename: string): Promise<string> {
  const candidates = [
    resolve(process.cwd(), "data", filename),
    resolve(process.cwd(), "../../data", filename),
  ];

  for (const candidate of candidates) {
    try {
      return await readFile(candidate, "utf8");
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !("code" in error) ||
        error.code !== "ENOENT"
      ) {
        throw error;
      }
    }
  }

  throw new Error(`Required seed fixture not found: data/${filename}`);
}

async function ensureManager(): Promise<void> {
  const existing = await prisma.account.findUnique({
    where: { email: env.SEED_MANAGER_EMAIL },
    include: { staffProfile: true },
  });

  if (!existing) {
    await prisma.account.create({
      data: {
        email: env.SEED_MANAGER_EMAIL,
        fullName: env.SEED_MANAGER_NAME,
        role: AccountRole.MANAGER,
      },
    });
    return;
  }

  if (
    existing.role !== AccountRole.MANAGER ||
    existing.staffProfile !== null
  ) {
    throw new Error(
      "SEED_MANAGER_EMAIL already belongs to a non-manager account",
    );
  }
}

export async function bootstrapApplication(): Promise<void> {
  if (!env.RUN_SEED_ON_START) {
    logger.info("Automatic seed import is disabled");
    return;
  }

  const [staffContent, shiftContent] = await Promise.all([
    readFixture("staff.csv"),
    readFixture("shifts.csv"),
  ]);
  const guardPool = new Pool({
    connectionString: env.DIRECT_URL ?? env.DATABASE_URL,
    connectionTimeoutMillis: 10_000,
    max: 1,
  });
  const guardConnection = await guardPool.connect();

  try {
    await guardConnection.query(
      "SELECT pg_advisory_lock(hashtext($1))",
      [bootstrapLockName],
    );

    await ensureManager();
    const importer = new ImportService(
      prisma,
      {
        maxBytes: env.IMPORT_MAX_FILE_BYTES,
        maxRows: env.IMPORT_MAX_ROWS,
      },
      env.CLINIC_TIMEZONE,
    );
    const staff = await importer.importStaff({
      content: staffContent,
      filename: "staff.csv",
      source: ImportSource.SEED,
    });
    const shifts = await importer.importShifts({
      content: shiftContent,
      filename: "shifts.csv",
      source: ImportSource.SEED,
    });

    logger.info({ shifts, staff }, "Database bootstrap completed");
  } finally {
    try {
      await guardConnection.query(
        "SELECT pg_advisory_unlock(hashtext($1))",
        [bootstrapLockName],
      );
    } finally {
      guardConnection.release();
      await guardPool.end();
    }
  }
}
