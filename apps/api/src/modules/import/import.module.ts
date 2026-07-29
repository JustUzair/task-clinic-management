import { Router } from "express";
import multer from "multer";
import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import { AccountRole } from "../../generated/prisma/enums.js";
import { requireRole } from "../identity/auth.middleware.js";
import { requireAuthentication } from "../identity/identity.module.js";
import { sseHub } from "../realtime/realtime.module.js";
import { notificationService } from "../notification/notification.module.js";
import { ImportController } from "./import.controller.js";
import { ImportReportService } from "./import-report.service.js";
import { ImportService } from "./import.service.js";

const upload = multer({
  limits: {
    fileSize: env.IMPORT_MAX_FILE_BYTES,
    files: 1,
  },
  storage: multer.memoryStorage(),
});
const importer = new ImportService(
  prisma,
  {
    maxBytes: env.IMPORT_MAX_FILE_BYTES,
    maxRows: env.IMPORT_MAX_ROWS,
  },
  env.CLINIC_TIMEZONE,
  notificationService,
  sseHub,
);
const controller = new ImportController(
  importer,
  new ImportReportService(prisma),
  sseHub,
);

export const importRouter = Router();

importRouter.use(
  requireAuthentication,
  requireRole(AccountRole.MANAGER),
);
importRouter.get("/", controller.listReports);
importRouter.get("/:id", controller.getReport);
importRouter.post("/staff", upload.single("file"), controller.importStaff);
importRouter.post("/shifts", upload.single("file"), controller.importShifts);
