import { Router } from "express";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { prisma } from "../../config/database.js";
import { redis } from "../../config/redis.js";
import { AuthController } from "./auth.controller.js";
import { authenticate } from "./auth.middleware.js";
import { PrismaAccountRepository } from "./account.repository.js";
import { MailtrapEmailSender } from "./email.sender.js";
import { OtpService } from "./otp.service.js";
import { UpstashOtpStore } from "./otp.store.js";
import { SessionService } from "./session.service.js";
import { StaffDirectoryController } from "./staff-directory.controller.js";
import { requireRole } from "./auth.middleware.js";
import { AccountRole } from "../../generated/prisma/enums.js";
import { StaffDirectoryService } from "./staff-directory.service.js";

const accounts = new PrismaAccountRepository(prisma);
export const sessionService = new SessionService(
  env.SESSION_SECRET,
  env.SESSION_TTL_SECONDS,
  env.SESSION_JWT_ISSUER,
  env.SESSION_JWT_AUDIENCE,
);
const otpStore = new UpstashOtpStore(redis);
const emailSender = new MailtrapEmailSender(env);
const otpService = new OtpService(
  accounts,
  otpStore,
  sessionService,
  emailSender,
  env,
  logger,
);
const controller = new AuthController(otpService, env);

export const authRouter = Router();

authRouter.post("/otp/request", controller.requestOtp);
authRouter.post("/otp/verify", controller.verifyOtp);
authRouter.get(
  "/me",
  authenticate(env.SESSION_COOKIE_NAME, sessionService, accounts),
  controller.me,
);
authRouter.post("/logout", controller.logout);

export const requireAuthentication = authenticate(
  env.SESSION_COOKIE_NAME,
  sessionService,
  accounts,
);

export const staffDirectoryRouter = Router();
const staffDirectoryController = new StaffDirectoryController(
  new StaffDirectoryService(prisma),
);
staffDirectoryRouter.get(
  "/",
  requireAuthentication,
  requireRole(AccountRole.MANAGER),
  staffDirectoryController.list,
);
