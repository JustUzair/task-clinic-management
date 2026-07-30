"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { ApiError, realtimePollingIntervalMs } from "../../lib/api";
import {
  claimShift,
  loadStaffDashboard,
  unclaimAssignment,
} from "./staff-api";
import type { StaffDashboard } from "./types";

export function useStaffDashboard() {
  const router = useRouter();
  const [availablePage, setAvailablePage] = useState(1);
  const [mutationError, setMutationError] = useState("");
  const [liveRefreshing, setLiveRefreshing] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    data: dashboard,
    error: requestError,
    isLoading,
    mutate: refresh,
  } = useSWR<StaffDashboard>(
    ["staff-dashboard", availablePage],
    () => loadStaffDashboard(availablePage),
    {
      dedupingInterval: 2_000,
      keepPreviousData: true,
      refreshInterval: realtimePollingIntervalMs,
      refreshWhenHidden: false,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      shouldRetryOnError: error =>
        !(error instanceof ApiError && error.status === 401),
    },
  );

  useEffect(() => {
    if (requestError instanceof ApiError && requestError.status === 401) {
      router.replace("/");
    }
  }, [requestError, router]);

  useEffect(() => {
    if (
      dashboard &&
      availablePage > dashboard.availablePagination.totalPages
    ) {
      setAvailablePage(dashboard.availablePagination.totalPages);
    }
  }, [availablePage, dashboard]);

  const refreshFromEvent = useCallback(async () => {
    setLiveRefreshing(true);
    try {
      await refresh();
    } finally {
      setLiveRefreshing(false);
    }
  }, [refresh]);

  useEffect(() => {
    const invalidate = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => void refreshFromEvent(), 75);
    };
    window.addEventListener("clinic:invalidate", invalidate);
    return () => {
      window.removeEventListener("clinic:invalidate", invalidate);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [refreshFromEvent]);

  const mutate = async (id: string, operation: () => Promise<unknown>) => {
    setPendingId(id);
    setMutationError("");
    try {
      await operation();
      await refresh();
    } catch (operationError) {
      setMutationError(
        operationError instanceof Error
          ? operationError.message
          : "The schedule could not be updated",
      );
    } finally {
      setPendingId(null);
    }
  };

  return {
    claim: (shiftId: string) => mutate(shiftId, () => claimShift(shiftId)),
    dashboard: dashboard ?? null,
    error:
      mutationError ||
      (requestError instanceof Error
        ? requestError.message
        : requestError
          ? "Unable to load the staff schedule"
          : ""),
    loading: isLoading,
    pendingId,
    refreshing: liveRefreshing,
    setAvailablePage: (page: number) =>
      setAvailablePage(
        Math.max(
          1,
          Math.min(
            page,
            dashboard?.availablePagination.totalPages ?? page,
          ),
        ),
      ),
    unclaim: (assignmentId: string) =>
      mutate(assignmentId, () => unclaimAssignment(assignmentId)),
  };
}
