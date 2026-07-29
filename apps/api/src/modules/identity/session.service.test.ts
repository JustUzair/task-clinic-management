import { describe, expect, it } from "vitest";
import { SessionService } from "./session.service.js";

const accountId = "7dc1ce29-c2cb-4b73-9d1d-e64b85f5079b";

describe("JWT session service", () => {
  it("signs and verifies a JWT with the expected claims", async () => {
    const sessions = createSessions("clinic-test-web");
    const token = await sessions.create(accountId);

    expect(token.split(".")).toHaveLength(3);
    await expect(sessions.resolve(token)).resolves.toBe(accountId);
  });

  it("rejects tampering and a token for another audience", async () => {
    const sessions = createSessions("clinic-test-web");
    const otherAudience = createSessions("another-client");
    const token = await sessions.create(accountId);
    const [header, payload, signature] = token.split(".");
    const replacement = signature?.startsWith("a") ? "b" : "a";
    const tampered = `${header}.${payload}.${replacement}${signature?.slice(1)}`;

    await expect(sessions.resolve(tampered)).resolves.toBeNull();
    await expect(otherAudience.resolve(token)).resolves.toBeNull();
  });
});

function createSessions(audience: string) {
  return new SessionService(
    "test-session-secret-that-is-at-least-32-bytes",
    3_600,
    "clinic-test-api",
    audience,
  );
}
