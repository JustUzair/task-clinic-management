import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import multer from "multer";
import { AppError } from "../lib/app-error.js";
import { logger } from "../config/logger.js";

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({
    code: "NOT_FOUND",
    message: `Route ${request.method} ${request.path} does not exist`,
  });
};

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  request,
  response,
  _next,
) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      code: error.code,
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      code: "INVALID_REQUEST",
      message: "The request payload is invalid",
      details: error.issues.map(issue => ({
        message: issue.message,
        path: issue.path.join("."),
      })),
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    response.status(400).json({
      code:
        error.code === "LIMIT_FILE_SIZE"
          ? "IMPORT_FILE_TOO_LARGE"
          : "IMPORT_UPLOAD_INVALID",
      message: error.message,
    });
    return;
  }

  logger.error(
    {
      error,
      method: request.method,
      path: request.path,
      requestId: request.id,
    },
    "Unhandled request error",
  );

  response.status(500).json({
    code: "INTERNAL_ERROR",
    message: "Unexpected server error",
  });
};
