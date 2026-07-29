"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../lib/api";
import {
  claimShift,
  loadStaffDashboard,
  unclaimAssignment,
} from "./staff-api";
import type { StaffDashboard } from "./types";

export function useStaffDashboard() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<StaffDashboard | null>(null);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setDashboard(await loadStaffDashboard());
      setError("");
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        router.replace("/");
        return;
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load the staff schedule",
      );
    }
  }, [router]);

  useEffect(() => {
    void load();
    const invalidate = () => void load();
    window.addEventListener("clinic:invalidate", invalidate);
    return () => window.removeEventListener("clinic:invalidate", invalidate);
  }, [load]);

  const mutate = async (id: string, operation: () => Promise<unknown>) => {
    setPendingId(id);
    setError("");
    try {
      await operation();
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The schedule could not be updated",
      );
    } finally {
      setPendingId(null);
    }
  };

  return {
    claim: (shiftId: string) => mutate(shiftId, () => claimShift(shiftId)),
    dashboard,
    error,
    pendingId,
    unclaim: (assignmentId: string) =>
      mutate(assignmentId, () => unclaimAssignment(assignmentId)),
  };
}
