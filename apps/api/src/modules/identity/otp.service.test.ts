import pino from "pino";
import { describe, expect, it } from "vitest";
import {
  AccountRole,
  Profession,
} from "../../generated/prisma/enums.js";
import type { AccountRepository } from "./identity.types.js";
import type { EmailSender, OtpEmail } from "./email.sender.js";
import type { OtpChallenge, OtpStore } from "./otp.store.js";
import { OtpService } from "./otp.service.js";
import { SessionService } from "./session.service.js";

const account = {
  email: "nurse@clinic.test",
  fullName: "Test Nurse",
  id: "5105648e-e677-4e26-873a-84a82f2a8b17",
  role: AccountRole.STAFF,
  staffProfile: {
    id: "d904cdd2-1fd8-4c22-990b-a52b85a7ebf7",
    profession: Profession.NURSE,
    staffId: "101",
  },
};

class MemoryOtpStore implements OtpStore {
  readonly challenges = new Map<string, OtpChallenge>();
  readonly counters = new Map<string, number>();

  async consumeChallenge(key: string): Promise<OtpChallenge | null> {
    const value = this.challenges.get(key) ?? null;
    this.challenges.delete(key);
    return value;
  }

  async delete(key: string): Promise<void> {
    this.challenges.delete(key);
    this.counters.delete(key);
  }

  async getChallenge(key: string): Promise<OtpChallenge | null> {
    return this.challenges.get(key) ?? null;
  }

  async increment(key: string): Promise<number> {
    const value = (this.counters.get(key) ?? 0) + 1;
    this.counters.set(key, value);
    return value;
  }

  async setChallenge(
    key: string,
    challenge: OtpChallenge,
  ): Promise<void> {
    this.challenges.set(key, challenge);
  }
}

class CapturingEmailSender implements EmailSender {
  readonly messages: OtpEmail[] = [];

  async sendOtp(message: OtpEmail): Promise<void> {
    this.messages.push(message);
  }
}

function createFixture(hasAccount = true) {
  const accounts: AccountRepository = {
    findByEmail: async email =>
      hasAccount && email === account.email ? account : null,
    findById: async id => (hasAccount && id === account.id ? account : null),
  };
  const otpStore = new MemoryOtpStore();
  const emailSender = new CapturingEmailSender();
  const sessions = new SessionService(
    "test-session-secret-that-is-at-least-32-bytes",
    86_400,
    "clinic-test-api",
    "clinic-test-web",
  );
  const service = new OtpService(
    accounts,
    otpStore,
    sessions,
    emailSender,
    {
      AUTH_MODE: "otp",
      DEMO_AUTH_ENABLED: true,
      DEMO_OTP_CODE: "123456",
      OTP_HMAC_SECRET: "test-otp-secret-that-is-at-least-32-bytes",
      OTP_MAX_ATTEMPTS: 2,
      OTP_REQUEST_LIMIT: 5,
      OTP_REQUEST_WINDOW_SECONDS: 900,
      OTP_TTL_SECONDS: 300,
    },
    pino({ level: "silent" }),
  );

  return { emailSender, otpStore, service, sessions };
}

describe("OTP authentication", () => {
  it("stores only an HMAC and consumes the fixed demo OTP once", async () => {
    const fixture = createFixture();
    const { otpSessionId } = await fixture.service.request(account.email);
    const stored = fixture.otpStore.challenges.get(
      `otp:session:${otpSessionId}`,
    );

    expect(stored?.hashedOtp).toMatch(/^[a-f0-9]{64}$/);
    expect(stored?.hashedOtp).not.toContain("123456");
    expect(fixture.emailSender.messages).toHaveLength(1);

    const verified = await fixture.service.verify({
      otp: "123456",
      otpSessionId,
    });

    expect(verified.account).toEqual(account);
    expect(
      await fixture.sessions.resolve(verified.sessionToken),
    ).toBe(account.id);
    await expect(
      fixture.service.verify({ otp: "123456", otpSessionId }),
    ).rejects.toMatchObject({ code: "OTP_INVALID_OR_EXPIRED" });
  });

  it("returns an opaque OTP request id without revealing an unknown email", async () => {
    const fixture = createFixture(false);
    const result = await fixture.service.request("unknown@clinic.test");

    expect(result.otpSessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(fixture.otpStore.challenges.size).toBe(0);
    expect(fixture.emailSender.messages).toHaveLength(0);
  });

  it("expires the challenge after the configured number of invalid attempts", async () => {
    const fixture = createFixture();
    const { otpSessionId } = await fixture.service.request(account.email);

    await expect(
      fixture.service.verify({ otp: "000000", otpSessionId }),
    ).rejects.toMatchObject({ code: "OTP_INVALID_OR_EXPIRED" });
    await expect(
      fixture.service.verify({ otp: "000000", otpSessionId }),
    ).rejects.toMatchObject({ code: "OTP_INVALID_OR_EXPIRED" });
    await expect(
      fixture.service.verify({ otp: "123456", otpSessionId }),
    ).rejects.toMatchObject({ code: "OTP_ATTEMPTS_EXHAUSTED" });
  });
});
