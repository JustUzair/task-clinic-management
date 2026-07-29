import type { RequestHandler } from "express";
import type { AccountRole } from "../../generated/prisma/enums.js";
import {
  ForbiddenError,
  UnauthorizedError,
} from "../../lib/app-error.js";
import type { AccountRepository } from "./identity.types.js";
import type { SessionService } from "./session.service.js";

export function authenticate(
  cookieName: string,
  sessions: SessionService,
  accounts: AccountRepository,
): RequestHandler {
  return async (request, _response, next) => {
    try {
      const token = request.cookies[cookieName] as string | undefined;
      if (!token) {
        throw new UnauthorizedError();
      }

      const accountId = await sessions.resolve(token);
      if (!accountId) {
        throw new UnauthorizedError(
          "SESSION_INVALID_OR_EXPIRED",
          "Your session is invalid or expired",
        );
      }

      const account = await accounts.findById(accountId);
      if (!account) {
        throw new UnauthorizedError(
          "SESSION_INVALID_OR_EXPIRED",
          "Your session is invalid or expired",
        );
      }

      request.auth = account;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireRole(...allowedRoles: AccountRole[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.auth) {
      next(new UnauthorizedError());
      return;
    }

    if (!allowedRoles.includes(request.auth.role)) {
      next(
        new ForbiddenError(
          "ROLE_FORBIDDEN",
          "Your account role cannot perform this action",
        ),
      );
      return;
    }

    next();
  };
}
