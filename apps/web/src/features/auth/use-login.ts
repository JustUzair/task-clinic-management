"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { ApiError } from "../../lib/api";
import {
  getCurrentAccount,
  requestLoginOtp,
  routeForAccount,
  verifyLoginOtp,
} from "./auth-api";
import {
  clearServerSession,
  hasBrowserSession,
  markBrowserSession,
} from "./browser-session";
import type { LoginState } from "./types";

const initialState: LoginState = {
  email: "",
  otp: "",
  otpSessionId: null,
  rememberMe: false,
};

export function useLogin() {
  const router = useRouter();
  const [login, setLogin] = useState(initialState);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hasBrowserSession()) {
      void clearServerSession().catch(() => undefined);
      return;
    }

    void getCurrentAccount()
      .then(account => router.replace(routeForAccount(account)))
      .catch(() => undefined);
  }, [router]);

  const update = <Key extends keyof LoginState>(
    key: Key,
    value: LoginState[Key],
  ) => {
    setLogin(previous => ({ ...previous, [key]: value }));
  };

  const run = async (operation: () => Promise<void>) => {
    setLoading(true);
    setError("");
    try {
      await operation();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Unable to complete sign in",
      );
    } finally {
      setLoading(false);
    }
  };

  const requestOtp = (event: FormEvent) => {
    event.preventDefault();
    return run(async () => {
      const otpSessionId = await requestLoginOtp(login.email);
      update("otpSessionId", otpSessionId);
    });
  };

  const verifyOtp = (event: FormEvent) => {
    event.preventDefault();
    if (!login.otpSessionId) return Promise.resolve();

    return run(async () => {
      const account = await verifyLoginOtp({
        otp: login.otp,
        otpSessionId: login.otpSessionId!,
        rememberMe: login.rememberMe,
      });
      markBrowserSession(login.rememberMe);
      router.replace(routeForAccount(account));
    });
  };

  return {
    error,
    loading,
    login,
    requestOtp,
    reset: () =>
      setLogin(previous => ({
        ...previous,
        otp: "",
        otpSessionId: null,
      })),
    update,
    verifyOtp,
  };
}
