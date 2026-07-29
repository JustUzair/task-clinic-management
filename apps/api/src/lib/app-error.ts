export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  constructor(code: string, message: string, details?: unknown) {
    super(400, code, message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(code = "UNAUTHORIZED", message = "Authentication required") {
    super(401, code, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(code = "FORBIDDEN", message = "You cannot perform this action") {
    super(403, code, message);
  }
}

export class NotFoundError extends AppError {
  constructor(code: string, message: string) {
    super(404, code, message);
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string, details?: unknown) {
    super(409, code, message, details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(code: string, message: string) {
    super(429, code, message);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(code: string, message: string) {
    super(503, code, message);
  }
}
