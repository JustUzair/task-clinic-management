import { Router } from "express";
import { prisma } from "../../config/database.js";
import { requireAuthentication } from "../identity/identity.module.js";
import { NotificationController } from "./notification.controller.js";
import { NotificationService } from "./notification.service.js";

export const notificationService = new NotificationService(prisma);
const controller = new NotificationController(notificationService);

export const notificationRouter = Router();

notificationRouter.use(requireAuthentication);
notificationRouter.get("/", controller.listUnacknowledged);
notificationRouter.post("/:id/acknowledge", controller.acknowledge);
