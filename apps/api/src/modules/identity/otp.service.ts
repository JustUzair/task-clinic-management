import { randomInt, randomUUID } from "node:crypto";
import type { Logger } from "pino";
import type { Environment } from "../../config/env.js";
import {
  BadRequestError,
  ServiceUnavailableError,
  TooManyRequestsError,
} from "../../lib/app-error.js";
import { hmac, safeEqual } from "../../lib/crypto.js";
import type { AccountRepository } from "./identity.types.js";
import type { AuthenticatedAccount } from "./identity.types.js";
import type { EmailSender } from "./email.sender.js";
import type { OtpStore } from "./otp.store.js";
import type { SessionService } from "./session.service.js";

export interface VerifyOtpInput {
  otpSessionId: string;
  otp: string;
}

export class OtpService {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly store: OtpStore,
    private readonly sessions: SessionService,
    private readonly emailSender: EmailSender,
    private readonly config: Pick<
      Environment,
      | "AUTH_MODE"
      | "DEMO_AUTH_ENABLED"
      | "DEMO_OTP_CODE"
      | "OTP_HMAC_SECRET"
      | "OTP_MAX_ATTEMPTS"
      | "OTP_REQUEST_LIMIT"
      | "OTP_REQUEST_WINDOW_SECONDS"
      | "OTP_TTL_SECONDS"
    >,
    private readonly logger: Logger,
  ) {}

  async request(email: string): Promise<{ otpSessionId: string }> {
    if (this.config.AUTH_MODE !== "otp") {
      throw new ServiceUnavailableError(
        "OTP_AUTH_DISABLED",
        "OTP authentication is not enabled",
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const rateKey = `otp:request:${hmac(
      normalizedEmail,
      this.config.OTP_HMAC_SECRET,
    )}`;
    const requestCount = await this.store.increment(
      rateKey,
      this.config.OTP_REQUEST_WINDOW_SECONDS,
    );

    if (requestCount > this.config.OTP_REQUEST_LIMIT) {
      throw new TooManyRequestsError(
        "OTP_REQUEST_LIMITED",
        "Too many OTP requests. Try again later.",
      );
    }

    const otpSessionId = randomUUID();
    const account = await this.accounts.findByEmail(normalizedEmail);

    if (!account) {
      return { otpSessionId };
    }

    const otp = this.config.DEMO_AUTH_ENABLED
      ? this.config.DEMO_OTP_CODE
      : randomInt(0, 1_000_000).toString().padStart(6, "0");
    const challengeKey = `otp:session:${otpSessionId}`;

    await this.store.setChallenge(
      challengeKey,
      {
        accountId: account.id,
        email: account.email,
        hashedOtp: this.hashOtp(otpSessionId, account.id, otp),
      },
      this.config.OTP_TTL_SECONDS,
    );

    try {
      await this.emailSender.sendOtp({
        email: account.email,
        expiresInMinutes: Math.ceil(this.config.OTP_TTL_SECONDS / 60),
        otp,
      });
    } catch (error) {
      this.logger.error(
        { accountId: account.id, error },
        "OTP email delivery failed",
      );

      if (!this.config.DEMO_AUTH_ENABLED) {
        await this.store.delete(challengeKey);
      }
    }

    return { otpSessionId };
  }

  async verify(input: VerifyOtpInput): Promise<{
    account: AuthenticatedAccount;
    sessionToken: string;
  }> {
    const challengeKey = `otp:session:${input.otpSessionId}`;
    const challenge = await this.store.getChallenge(challengeKey);

    if (!challenge) {
      throw this.invalidOtpError();
    }

    const attemptsKey = `otp:attempts:${input.otpSessionId}`;
    const attempts = await this.store.increment(
      attemptsKey,
      this.config.OTP_TTL_SECONDS,
    );

    if (attempts > this.config.OTP_MAX_ATTEMPTS) {
      await this.store.delete(challengeKey);
      throw new TooManyRequestsError(
        "OTP_ATTEMPTS_EXHAUSTED",
        "Too many invalid login-code attempts. Request a new code.",
      );
    }

    const candidateHash = this.hashOtp(
      input.otpSessionId,
      challenge.accountId,
      input.otp,
    );

    if (!safeEqual(candidateHash, challenge.hashedOtp)) {
      throw this.invalidOtpError();
    }

    const consumed = await this.store.consumeChallenge(challengeKey);
    if (!consumed || !safeEqual(consumed.hashedOtp, challenge.hashedOtp)) {
      throw this.invalidOtpError();
    }

    await this.store.delete(attemptsKey);
    const account = await this.accounts.findById(challenge.accountId);

    if (!account) {
      throw this.invalidOtpError();
    }

    return {
      account,
      sessionToken: await this.sessions.create(challenge.accountId),
    };
  }

  private hashOtp(
    otpSessionId: string,
    accountId: string,
    otp: string,
  ): string {
    return hmac(
      `${otpSessionId}:${accountId}:${otp}`,
      this.config.OTP_HMAC_SECRET,
    );
  }

  private invalidOtpError(): BadRequestError {
    return new BadRequestError(
      "OTP_INVALID_OR_EXPIRED",
      "The login code is invalid or expired",
    );
  }
}
