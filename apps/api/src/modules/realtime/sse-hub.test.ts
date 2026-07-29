import type { Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { AccountRole, Profession } from "../../generated/prisma/enums.js";
import { SseHub } from "./sse-hub.js";

describe("SseHub", () => {
  it("flushes account events immediately", () => {
    const writes: string[] = [];
    const response = {
      flush: vi.fn(),
      flushHeaders: vi.fn(),
      set: vi.fn(),
      status: vi.fn(),
      write: vi.fn((chunk: string) => {
        writes.push(chunk);
        return true;
      }),
    } as unknown as Response;
    const hub = new SseHub(60_000, 3_000);
    const disconnect = hub.connect(
      {
        email: "nurse@clinic.test",
        fullName: "Test Nurse",
        id: "account-1",
        role: AccountRole.STAFF,
        staffProfile: {
          id: "staff-1",
          profession: Profession.NURSE,
          staffId: "101",
        },
      },
      response,
    );

    hub.publishToAccount("account-1", {
      name: "notification.created",
      resourceId: "notification-1",
    });

    expect(writes.join("")).toContain("event: notification.created\n");
    expect(writes.join("")).toContain(
      'data: {"resourceId":"notification-1"}\n\n',
    );
    expect(response.flush).toHaveBeenCalledTimes(2);

    disconnect();
  });
});
