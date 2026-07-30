import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import * as helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { originGuard } from "./middleware/origin-guard.js";
import {
  authRouter,
  staffDirectoryRouter,
} from "./modules/identity/identity.module.js";
import { importRouter } from "./modules/import/import.module.js";
import { notificationRouter } from "./modules/notification/notification.module.js";
import { realtimeRouter } from "./modules/realtime/realtime.module.js";
import {
  shiftRouter,
  staffScheduleRouter,
  assignmentRouter,
  coverageRouter,
} from "./modules/scheduling/scheduling.module.js";
import { statusRouter } from "./routes/status.routes.js";

export const app = express();

app.disable("x-powered-by");
app.use(
  pinoHttp({
    logger,
    genReqId: request =>
      request.headers["x-request-id"]?.toString() ?? crypto.randomUUID(),
  }),
);
app.use(helmet.default());
app.use(
  compression({
    filter: (request, response) =>
      request.headers.accept?.includes("text/event-stream")
        ? false
        : compression.filter(request, response),
  }),
);
app.use(
  cors({
    credentials: true,
    origin: env.APP_ORIGIN,
  }),
);
app.use(originGuard(env.APP_ORIGIN));
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.get("/healthz", (_request, response) => {
  response.status(200).json({ status: "ok" });
});
app.use("/api/v1/status", statusRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/staff-directory", staffDirectoryRouter);
app.use("/api/v1/imports", importRouter);
app.use("/api/v1/shifts", shiftRouter);
app.use("/api/v1/staff/shifts", staffScheduleRouter);
app.use("/api/v1/assignments", assignmentRouter);
app.use("/api/v1/coverage", coverageRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/events", realtimeRouter);

app.use(notFoundHandler);
app.use(errorHandler);
