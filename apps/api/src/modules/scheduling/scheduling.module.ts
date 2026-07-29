import { Router } from "express";
import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import { AccountRole } from "../../generated/prisma/enums.js";
import {
  requireAuthentication,
} from "../identity/identity.module.js";
import { requireRole } from "../identity/auth.middleware.js";
import { notificationService } from "../notification/notification.module.js";
import { sseHub } from "../realtime/realtime.module.js";
import { ShiftController } from "./shift.controller.js";
import { ShiftService } from "./shift.service.js";
import { DiscoveryService } from "./discovery.service.js";
import { DiscoveryController } from "./discovery.controller.js";
import { AssignmentController } from "./assignment.controller.js";
import { AssignmentService } from "./assignment.service.js";
import { CoverageController } from "./coverage.controller.js";
import { CoverageService } from "./coverage.service.js";

const shifts = new ShiftService(
  prisma,
  notificationService,
  sseHub,
  env.CLINIC_TIMEZONE,
);
const controller = new ShiftController(shifts, env.CLINIC_TIMEZONE);
const discoveryController = new DiscoveryController(
  new DiscoveryService(prisma, env.CLINIC_TIMEZONE),
);
const assignmentController = new AssignmentController(
  new AssignmentService(prisma, notificationService, sseHub),
);
const coverageController = new CoverageController(
  new CoverageService(prisma, env.CLINIC_TIMEZONE),
);

export const shiftRouter = Router();
export const staffScheduleRouter = Router();

shiftRouter.use(requireAuthentication);
shiftRouter.get("/:id", controller.getById);
shiftRouter.post("/", requireRole(AccountRole.MANAGER), controller.create);
shiftRouter.post(
  "/:id/claims",
  requireRole(AccountRole.STAFF),
  assignmentController.selfClaim,
);
shiftRouter.post(
  "/:id/assignments",
  requireRole(AccountRole.MANAGER),
  assignmentController.managerAssign,
);
shiftRouter.patch(
  "/:id",
  requireRole(AccountRole.MANAGER),
  controller.update,
);
shiftRouter.post(
  "/:id/cancel",
  requireRole(AccountRole.MANAGER),
  controller.cancel,
);
shiftRouter.delete(
  "/:id",
  requireRole(AccountRole.MANAGER),
  controller.archive,
);

staffScheduleRouter.use(
  requireAuthentication,
  requireRole(AccountRole.STAFF),
);
staffScheduleRouter.get("/", discoveryController.dashboard);

export const assignmentRouter = Router();
assignmentRouter.use(requireAuthentication);
assignmentRouter.delete("/:id", assignmentController.remove);

export const coverageRouter = Router();
coverageRouter.use(
  requireAuthentication,
  requireRole(AccountRole.MANAGER),
);
coverageRouter.get("/", coverageController.week);
