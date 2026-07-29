import cookieParser from "cookie-parser";
import express from "express";
import pino from "pino";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { AccountRole } from "../../generated/prisma/enums.js";
import { errorHandler } from "../../middleware/error-handler.js";
import { AuthController } from "./auth.controller.js";
import { authenticate } from "./auth.middleware.js";
import type { AccountRepository } from "./identity.types.js";
import type { EmailSender } from "./email.sender.js";
import type { OtpChallenge, OtpStore } from "./otp.store.js";
import { OtpService } from "./otp.service.js";
import { SessionService } from "./session.service.js";

const account = {
  email: "manager@clinic.test",
  fullName: "Clinic Manager",
  id: "7dc1ce29-c2cb-4b73-9d1d-e64b85f5079b",
  role: AccountRole.MANAGER,
  staffProfile: null,
};

class MemoryStore implements OtpStore {
  private readonly values = new Map<string, unknown>();

  async consumeChallenge(key: string): Promise<OtpChallenge | null> {
    const value = (this.values.get(key) as OtpChallenge | undefined) ?? null;
    this.values.delete(key);
    return value;
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }

  async getChallenge(key: string): Promise<OtpChallenge | null> {
    return (this.values.get(key) as OtpChallenge | undefined) ?? null;
  }

  async increment(key: string): Promise<number> {
    const value = ((this.values.get(key) as number | undefined) ?? 0) + 1;
    this.values.set(key, value);
    return value;
  }

  async setChallenge(
    key: string,
    value: OtpChallenge,
  ): Promise<void> {
    this.values.set(key, value);
  }
}

function createTestApp() {
  const accounts: AccountRepository = {
    findByEmail: async email => (email === account.email ? account : null),
    findById: async id => (id === account.id ? account : null),
  };
  const store = new MemoryStore();
  const sessions = new SessionService(
    "test-session-secret-that-is-at-least-32-bytes",
    86_400,
    "clinic-test-api",
    "clinic-test-web",
  );
  const emailSender: EmailSender = {
    sendOtp: async () => undefined,
  };
  const otp = new OtpService(
    accounts,
    store,
    sessions,
    emailSender,
    {
      AUTH_MODE: "otp",
      DEMO_AUTH_ENABLED: true,
      DEMO_OTP_CODE: "123456",
      OTP_HMAC_SECRET: "test-otp-secret-that-is-at-least-32-bytes",
      OTP_MAX_ATTEMPTS: 5,
      OTP_REQUEST_LIMIT: 5,
      OTP_REQUEST_WINDOW_SECONDS: 900,
      OTP_TTL_SECONDS: 300,
    },
    pino({ level: "silent" }),
  );
  const controller = new AuthController(otp, {
    COOKIE_SAME_SITE: "lax",
    COOKIE_SECURE: false,
    SESSION_COOKIE_NAME: "clinic_session",
    SESSION_TTL_SECONDS: 86_400,
  });
  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.post("/auth/otp/request", controller.requestOtp);
  app.post("/auth/otp/verify", controller.verifyOtp);
  app.get(
    "/auth/me",
    authenticate("clinic_session", sessions, accounts),
    controller.me,
  );
  app.post("/auth/logout", controller.logout);
  app.use(errorHandler);

  return app;
}

describe("identity HTTP flow", () => {
  it("creates, uses, and clears a persistent JWT session cookie", async () => {
    const client = request.agent(createTestApp());
    const requestResponse = await client
      .post("/auth/otp/request")
      .send({ email: " MANAGER@clinic.test " })
      .expect(202);
    const otpSessionId = requestResponse.body.data.otpSessionId as string;

    const verifyResponse = await client
      .post("/auth/otp/verify")
      .send({
        otp: "123456",
        otpSessionId,
        rememberMe: true,
      })
      .expect(200);

    expect(verifyResponse.body.data.account).toEqual(account);
    const sessionCookie = verifyResponse.headers["set-cookie"]?.[0];
    expect(sessionCookie).toContain("HttpOnly");
    expect(sessionCookie).toContain("Max-Age=86400");
    expect(sessionCookie).toContain("SameSite=Lax");
    expect(
      sessionCookie?.split(";")[0]?.split("=")[1]?.split("."),
    ).toHaveLength(3);

    await client
      .get("/auth/me")
      .expect(200)
      .expect(response => {
        expect(response.body.data.account).toEqual(account);
      });

    await client.post("/auth/logout").expect(204);
    await client.get("/auth/me").expect(401);
  });

  it("returns the same public request shape for an unknown account", async () => {
    const app = createTestApp();
    const known = await request(app)
      .post("/auth/otp/request")
      .send({ email: account.email })
      .expect(202);
    const unknown = await request(app)
      .post("/auth/otp/request")
      .send({ email: "unknown@clinic.test" })
      .expect(202);

    expect(Object.keys(unknown.body)).toEqual(Object.keys(known.body));
    expect(Object.keys(unknown.body.data)).toEqual(Object.keys(known.body.data));
    expect(unknown.body.message).toBe(known.body.message);
  });
});
