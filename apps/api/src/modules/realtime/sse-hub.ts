import { randomUUID } from "node:crypto";
import type { Response } from "express";
import type { AccountRole } from "../../generated/prisma/enums.js";
import type { AuthenticatedAccount } from "../identity/identity.types.js";

export type LiveEventName =
  | "coverage.changed"
  | "schedule.changed"
  | "notification.created"
  | "import.status_changed";

interface Connection {
  accountId: string;
  response: Response;
  role: AccountRole;
}

export interface LiveEvent {
  name: LiveEventName;
  resourceId?: string;
}

export class SseHub {
  private readonly connections = new Set<Connection>();
  private readonly heartbeat: NodeJS.Timeout;

  constructor(
    heartbeatIntervalMs: number,
    private readonly retryIntervalMs: number,
  ) {
    this.heartbeat = setInterval(() => {
      for (const connection of this.connections) {
        connection.response.write(": heartbeat\n\n");
        connection.response.flush?.();
      }
    }, heartbeatIntervalMs);
    this.heartbeat.unref();
  }

  connect(account: AuthenticatedAccount, response: Response): () => void {
    const connection: Connection = {
      accountId: account.id,
      response,
      role: account.role,
    };
    this.connections.add(connection);

    response.status(200);
    response.set({
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no",
    });
    response.flushHeaders();
    response.write(`retry: ${this.retryIntervalMs}\n`);
    response.write(": connected\n\n");
    response.flush?.();

    return () => {
      this.connections.delete(connection);
    };
  }

  publishToAccount(accountId: string, event: LiveEvent): void {
    for (const connection of this.connections) {
      if (connection.accountId === accountId) {
        this.write(connection.response, event);
      }
    }
  }

  publishToRole(role: AccountRole, event: LiveEvent): void {
    for (const connection of this.connections) {
      if (connection.role === role) {
        this.write(connection.response, event);
      }
    }
  }

  private write(response: Response, event: LiveEvent): void {
    response.write(`id: ${randomUUID()}\n`);
    response.write(`event: ${event.name}\n`);
    response.write(
      `data: ${JSON.stringify(
        event.resourceId ? { resourceId: event.resourceId } : {},
      )}\n\n`,
    );
    response.flush?.();
  }
}
