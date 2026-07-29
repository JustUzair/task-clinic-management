import { apiRequest } from "../../lib/api";

const rememberedSessionKey = "clinic:remembered-session";
const sessionOnlyKey = "clinic:session-only";

export function markBrowserSession(rememberMe: boolean): void {
  if (typeof window === "undefined") return;

  clearBrowserSession();
  const storage = rememberMe ? window.localStorage : window.sessionStorage;
  storage.setItem(rememberMe ? rememberedSessionKey : sessionOnlyKey, "1");
}

export function hasBrowserSession(): boolean {
  if (typeof window === "undefined") return false;

  return Boolean(
    window.localStorage.getItem(rememberedSessionKey) ||
      window.sessionStorage.getItem(sessionOnlyKey),
  );
}

export function clearBrowserSession(): void {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(rememberedSessionKey);
  window.sessionStorage.removeItem(sessionOnlyKey);
}

export async function clearServerSession(): Promise<void> {
  clearBrowserSession();
  await apiRequest("/api/v1/auth/logout", { method: "POST" });
}
