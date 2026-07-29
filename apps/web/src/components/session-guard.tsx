"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  clearServerSession,
  hasBrowserSession,
} from "../features/auth/browser-session";

export function SessionGuard() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === "/" || hasBrowserSession()) return;

    void clearServerSession()
      .catch(() => undefined)
      .finally(() => router.replace("/"));
  }, [pathname, router]);

  return null;
}
