"use client";

import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Snackbar from "@mui/material/Snackbar";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import {
  notificationMessage,
  type NotificationItem,
} from "../features/notifications/notification-message";
import {
  apiRequest,
  apiUrl,
  realtimePollingIntervalMs,
  shouldUseSse,
} from "../lib/api";

interface NotificationResponse {
  data: { notifications: NotificationItem[] };
}

export function NotificationInbox() {
  const [liveRefreshing, setLiveRefreshing] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [actionError, setActionError] = useState("");
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    data,
    error: requestError,
    mutate,
  } = useSWR<NotificationResponse>(
    "notifications",
    () => apiRequest<NotificationResponse>("/api/v1/notifications"),
    {
      dedupingInterval: 2_000,
      keepPreviousData: true,
      refreshInterval: realtimePollingIntervalMs,
      refreshWhenHidden: false,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );
  const items = data?.data.notifications ?? [];

  const refreshFromEvent = useCallback(async () => {
    setLiveRefreshing(true);
    try {
      await mutate();
      setActionError("");
    } finally {
      setLiveRefreshing(false);
    }
  }, [mutate]);

  useEffect(() => {
    if (!shouldUseSse()) return;

    const stream = new EventSource(`${apiUrl}/api/v1/events`, {
      withCredentials: true,
    });
    const eventNames = [
      "coverage.changed",
      "schedule.changed",
      "notification.created",
      "import.status_changed",
    ];
    const onEvent = (event: Event) => {
      window.dispatchEvent(
        new CustomEvent("clinic:invalidate", { detail: event.type }),
      );
      if (
        event.type === "notification.created" ||
        event.type === "schedule.changed"
      ) {
        if (refreshTimer.current) clearTimeout(refreshTimer.current);
        refreshTimer.current = setTimeout(
          () => void refreshFromEvent(),
          75,
        );
      }
    };

    for (const eventName of eventNames) {
      stream.addEventListener(eventName, onEvent);
    }
    return () => {
      stream.close();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [refreshFromEvent]);

  const current = items[0];
  const error =
    actionError ||
    (requestError instanceof Error
      ? requestError.message
      : requestError
        ? "Unable to load notifications"
        : "");
  const showStatus = Boolean(current) || liveRefreshing || Boolean(error);

  return (
    <Snackbar
      anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      open={showStatus}
      sx={{
        bottom: 16,
        left: { sm: "auto", xs: 16 },
        right: 16,
      }}
    >
      <Alert
        action={
          current ? (
            <Button
              color="inherit"
              disabled={acknowledging || liveRefreshing}
              onClick={async () => {
                setAcknowledging(true);
                setActionError("");
                try {
                  await apiRequest(
                    `/api/v1/notifications/${current.id}/acknowledge`,
                    { method: "POST" },
                  );
                  await mutate(
                    previous =>
                      previous
                        ? {
                            data: {
                              notifications:
                                previous.data.notifications.slice(1),
                            },
                          }
                        : previous,
                    { revalidate: false },
                  );
                } catch (acknowledgeError) {
                  setActionError(
                    acknowledgeError instanceof Error
                      ? acknowledgeError.message
                      : "Unable to acknowledge the notification",
                  );
                } finally {
                  setAcknowledging(false);
                }
              }}
              size="small"
            >
              {acknowledging ? (
                <>
                  <CircularProgress color="inherit" size={14} sx={{ mr: 1 }} />
                  Saving…
                </>
              ) : (
                "Acknowledge"
              )}
            </Button>
          ) : null
        }
        severity={error ? "error" : "info"}
        sx={{ alignItems: "center", maxWidth: 420, width: { sm: "100%", xs: "calc(100vw - 32px)" } }}
        variant="filled"
      >
        <AlertTitle>{error ? "Notification error" : "Schedule update"}</AlertTitle>
        {error
          ? error
          : liveRefreshing
            ? "Checking for schedule updates…"
            : current
              ? notificationMessage(current)
              : "Your schedule changed."}
      </Alert>
    </Snackbar>
  );
}
