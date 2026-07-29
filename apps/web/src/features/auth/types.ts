export interface AuthenticatedAccount {
  role: "MANAGER" | "STAFF";
}

export interface LoginState {
  email: string;
  otp: string;
  otpSessionId: string | null;
  rememberMe: boolean;
}
