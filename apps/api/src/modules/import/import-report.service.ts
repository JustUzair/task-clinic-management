import type { PrismaClient } from "../../generated/prisma/client.js";
import { ImportRowStatus } from "../../generated/prisma/enums.js";
import { NotFoundError } from "../../lib/app-error.js";

export class ImportReportService {
  constructor(private readonly database: PrismaClient) {}

  async list() {
    return this.database.importBatch.findMany({
      orderBy: [{ startedAt: "desc" }, { id: "desc" }],
      select: {
        acceptedRows: true,
        completedAt: true,
        failureReason: true,
        id: true,
        mergedRows: true,
        rejectedRows: true,
        source: true,
        sourceFilename: true,
        startedAt: true,
        status: true,
        totalRows: true,
        type: true,
      },
    });
  }

  async get(batchId: string) {
    const batch = await this.database.importBatch.findUnique({
      where: { id: batchId },
      include: {
        rows: {
          where: {
            status: {
              in: [ImportRowStatus.MERGED, ImportRowStatus.REJECTED],
            },
          },
          orderBy: { sourceRowNumber: "asc" },
        },
      },
    });

    if (!batch) {
      throw new NotFoundError(
        "IMPORT_BATCH_NOT_FOUND",
        "Import batch not found",
      );
    }

    return batch;
  }
}
