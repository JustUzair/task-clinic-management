import type { RequestHandler } from "express";
import { ForbiddenError } from "../lib/app-error.js";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export function originGuard(allowedOrigin: string): RequestHandler {
  return (request, _response, next) => {
    if (safeMethods.has(request.method)) {
      next();
      return;
    }

    const origin = request.header("origin");
    const referer = request.header("referer");
    let sourceOrigin: string | null = origin ?? null;

    if (!sourceOrigin && referer) {
      try {
        sourceOrigin = new URL(referer).origin;
      } catch {
        sourceOrigin = null;
      }
    }

    if (sourceOrigin !== allowedOrigin) {
      next(
        new ForbiddenError(
          "ORIGIN_FORBIDDEN",
          "A trusted request origin is required",
        ),
      );
      return;
    }

    next();
  };
}
