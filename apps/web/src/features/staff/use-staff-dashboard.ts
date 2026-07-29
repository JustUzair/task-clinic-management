"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (initial = false) => {
    initial ? setLoading(true) : setRefreshing(true);
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
    } finally {
      initial ? setLoading(false) : setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    void load(true);
    const invalidate = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => void load(), 75);
    };
    window.addEventListener("clinic:invalidate", invalidate);
    return () => {
      window.removeEventListener("clinic:invalidate", invalidate);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
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
    loading,
    pendingId,
    refreshing,
    unclaim: (assignmentId: string) =>
      mutate(assignmentId, () => unclaimAssignment(assignmentId)),
  };
}
