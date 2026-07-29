import type { Request, RequestHandler } from "express";
import { z } from "zod";
import { ImportSource } from "../../generated/prisma/enums.js";
import { asyncHandler } from "../../lib/async-handler.js";
import {
  BadRequestError,
  UnauthorizedError,
} from "../../lib/app-error.js";
import type { SseHub } from "../realtime/sse-hub.js";
import type { ImportReportService } from "./import-report.service.js";
import type { ImportService } from "./import.service.js";

const batchIdSchema = z.uuid();

function managerId(request: Request): string {
  if (!request.auth) {
    throw new UnauthorizedError();
  }

  return request.auth.id;
}

function uploadedCsv(request: Request): Express.Multer.File {
  if (!request.file) {
    throw new BadRequestError(
      "IMPORT_FILE_REQUIRED",
      "A CSV file is required in the file field",
    );
  }
  if (!request.file.originalname.toLowerCase().endsWith(".csv")) {
    throw new BadRequestError(
      "IMPORT_FILE_TYPE_INVALID",
      "The uploaded file must use a .csv extension",
    );
  }

  return request.file;
}

export class ImportController {
  readonly importStaff: RequestHandler;
  readonly importShifts: RequestHandler;
  readonly listReports: RequestHandler;
  readonly getReport: RequestHandler;

  constructor(
    private readonly importer: ImportService,
    private readonly reports: ImportReportService,
    private readonly events: SseHub,
  ) {
    this.importStaff = asyncHandler(async (request, response) => {
      const managerAccountId = managerId(request);
      const file = uploadedCsv(request);
      const result = await this.importer.importStaff({
        content: file.buffer.toString("utf8"),
        createdByAccountId: managerAccountId,
        filename: file.originalname,
        source: ImportSource.UPLOAD,
      });
      this.publishStatus(managerAccountId, result.batchId);
      response.status(201).json({ data: { import: result } });
    });

    this.importShifts = asyncHandler(async (request, response) => {
      const managerAccountId = managerId(request);
      const file = uploadedCsv(request);
      const result = await this.importer.importShifts({
        content: file.buffer.toString("utf8"),
        createdByAccountId: managerAccountId,
        filename: file.originalname,
        source: ImportSource.UPLOAD,
      });
      this.publishStatus(managerAccountId, result.batchId);
      response.status(201).json({ data: { import: result } });
    });

    this.listReports = asyncHandler(async (_request, response) => {
      const imports = await this.reports.list();
      response.status(200).json({ data: { imports } });
    });

    this.getReport = asyncHandler(async (request, response) => {
      const batchId = batchIdSchema.parse(request.params.id);
      const importBatch = await this.reports.get(batchId);
      response.status(200).json({ data: { import: importBatch } });
    });
  }

  private publishStatus(accountId: string, batchId: string): void {
    this.events.publishToAccount(accountId, {
      name: "import.status_changed",
      resourceId: batchId,
    });
  }
}
