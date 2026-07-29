import type { CookieOptions, RequestHandler } from "express";
import { z } from "zod";
import type { Environment } from "../../config/env.js";
import { asyncHandler } from "../../lib/async-handler.js";
import { UnauthorizedError } from "../../lib/app-error.js";
import type { OtpService } from "./otp.service.js";

const requestOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

const verifyOtpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/),
  otpSessionId: z.uuid(),
  rememberMe: z.boolean().default(false),
});

export class AuthController {
  readonly requestOtp: RequestHandler;
  readonly verifyOtp: RequestHandler;
  readonly me: RequestHandler;
  readonly logout: RequestHandler;

  constructor(
    private readonly otpService: OtpService,
    private readonly config: Pick<
      Environment,
      | "COOKIE_SAME_SITE"
      | "COOKIE_SECURE"
      | "SESSION_COOKIE_NAME"
      | "SESSION_TTL_SECONDS"
    >,
  ) {
    this.requestOtp = asyncHandler(async (request, response) => {
      const input = requestOtpSchema.parse(request.body);
      const result = await this.otpService.request(input.email);

      response.status(202).json({
        data: result,
        message:
          "If the email belongs to an account, a login code has been issued.",
      });
    });

    this.verifyOtp = asyncHandler(async (request, response) => {
      const input = verifyOtpSchema.parse(request.body);
      const result = await this.otpService.verify(input);

      response.cookie(
        this.config.SESSION_COOKIE_NAME,
        result.sessionToken,
        this.cookieOptions(input.rememberMe),
      );
      response.status(200).json({ data: { account: result.account } });
    });

    this.me = (request, response, next) => {
      if (!request.auth) {
        next(new UnauthorizedError());
        return;
      }

      response.status(200).json({ data: { account: request.auth } });
    };

    this.logout = asyncHandler(async (_request, response) => {
      response.clearCookie(
        this.config.SESSION_COOKIE_NAME,
        this.cookieOptions(false),
      );
      response.status(204).send();
    });
  }

  private cookieOptions(rememberMe: boolean): CookieOptions {
    return {
      httpOnly: true,
      maxAge: rememberMe ? this.config.SESSION_TTL_SECONDS * 1_000 : undefined,
      path: "/",
      sameSite: this.config.COOKIE_SAME_SITE,
      secure: this.config.COOKIE_SECURE,
    };
  }
}
