import { apiRequest } from "../../lib/api";
import type { AuthenticatedAccount } from "./types";

export async function getCurrentAccount(): Promise<AuthenticatedAccount> {
  const response = await apiRequest<{
    data: { account: AuthenticatedAccount };
  }>("/api/v1/auth/me");

  return response.data.account;
}

export async function requestLoginOtp(email: string): Promise<string> {
  const response = await apiRequest<{
    data: { otpSessionId: string };
  }>("/api/v1/auth/otp/request", {
    body: JSON.stringify({ email }),
    method: "POST",
  });

  return response.data.otpSessionId;
}

export async function verifyLoginOtp(input: {
  otp: string;
  otpSessionId: string;
  rememberMe: boolean;
}): Promise<AuthenticatedAccount> {
  const response = await apiRequest<{
    data: { account: AuthenticatedAccount };
  }>("/api/v1/auth/otp/verify", {
    body: JSON.stringify(input),
    method: "POST",
  });

  return response.data.account;
}

export function routeForAccount(account: AuthenticatedAccount): string {
  return account.role === "MANAGER" ? "/manager" : "/staff";
}
