export const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const configuredRealtimeTransport =
  process.env.NEXT_PUBLIC_REALTIME_TRANSPORT ?? "auto";
const configuredPollingInterval = Number(
  process.env.NEXT_PUBLIC_REALTIME_POLL_INTERVAL_MS ?? "10000",
);

export const realtimePollingIntervalMs = Number.isFinite(
  configuredPollingInterval,
)
  ? Math.max(configuredPollingInterval, 5_000)
  : 10_000;

export function shouldUseSse(): boolean {
  if (configuredRealtimeTransport === "sse") return true;
  if (configuredRealtimeTransport === "polling") return false;

  try {
    return !new URL(apiUrl).hostname.endsWith(".vercel.app");
  } catch {
    return true;
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as {
      code?: string;
      message?: string;
    } | null;
    throw new ApiError(
      response.status,
      error?.code ?? "REQUEST_FAILED",
      error?.message ?? "The request failed",
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
