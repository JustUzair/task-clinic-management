import { Router } from "express";
import { env } from "../../config/env.js";
import { UnauthorizedError } from "../../lib/app-error.js";
import { requireAuthentication } from "../identity/identity.module.js";
import { SseHub } from "./sse-hub.js";

export const sseHub = new SseHub(
  env.SSE_HEARTBEAT_INTERVAL_MS,
  env.SSE_RETRY_INTERVAL_MS,
);

export const realtimeRouter = Router();

realtimeRouter.get("/", requireAuthentication, (request, response, next) => {
  if (!request.auth) {
    next(new UnauthorizedError());
    return;
  }

  const disconnect = sseHub.connect(request.auth, response);
  request.on("close", disconnect);
});
