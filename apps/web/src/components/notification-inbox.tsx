"use client";

import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Snackbar from "@mui/material/Snackbar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  notificationMessage,
  type NotificationItem,
} from "../features/notifications/notification-message";
import { apiRequest, apiUrl } from "../lib/api";

export function NotificationInbox() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [error, setError] = useState("");
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (showProgress = false) => {
    if (showProgress) setRefreshing(true);
    try {
      const response = await apiRequest<{
        data: { notifications: NotificationItem[] };
      }>("/api/v1/notifications");
      setItems(response.data.notifications);
      setError("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load notifications",
      );
    } finally {
      if (showProgress) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
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
        refreshTimer.current = setTimeout(() => void load(true), 75);
      }
    };

    for (const eventName of eventNames) {
      stream.addEventListener(eventName, onEvent);
    }
    return () => {
      stream.close();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [load]);

  const current = items[0];
  const showStatus = Boolean(current) || refreshing || Boolean(error);

  return (
    <Snackbar
      anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      open={showStatus}
    >
      <Alert
        action={
          current ? (
            <Button
              color="inherit"
              disabled={acknowledging || refreshing}
              onClick={async () => {
                setAcknowledging(true);
                setError("");
                try {
                  await apiRequest(
                    `/api/v1/notifications/${current.id}/acknowledge`,
                    { method: "POST" },
                  );
                  setItems(previous => previous.slice(1));
                } catch (requestError) {
                  setError(
                    requestError instanceof Error
                      ? requestError.message
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
        sx={{ alignItems: "center", maxWidth: 420, width: "100%" }}
        variant="filled"
      >
        <AlertTitle>{error ? "Notification error" : "Schedule update"}</AlertTitle>
        {error
          ? error
          : refreshing
            ? "Checking for schedule updates…"
            : current
              ? notificationMessage(current)
              : "Your schedule changed."}
      </Alert>
    </Snackbar>
  );
}
