"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import { useCallback, useEffect, useState } from "react";
import { apiRequest, apiUrl } from "../lib/api";

interface Notification {
  id: string;
  type: string;
  messageData: Record<string, unknown>;
}

export function NotificationInbox() {
  const [items, setItems] = useState<Notification[]>([]);

  const load = useCallback(async () => {
    const response = await apiRequest<{
      data: { notifications: Notification[] };
    }>("/api/v1/notifications");
    setItems(response.data.notifications);
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
      if (event.type === "notification.created") void load();
    };

    for (const eventName of eventNames) {
      stream.addEventListener(eventName, onEvent);
    }
    return () => stream.close();
  }, [load]);

  const current = items[0];

  return (
    <Snackbar
      anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      open={Boolean(current)}
    >
      <Alert
        action={
          <Button
            color="inherit"
            onClick={async () => {
              if (!current) return;
              await apiRequest(
                `/api/v1/notifications/${current.id}/acknowledge`,
                { method: "POST" },
              );
              setItems(previous => previous.slice(1));
            }}
            size="small"
          >
            Acknowledge
          </Button>
        }
        severity="info"
        sx={{ alignItems: "center", maxWidth: 420, width: "100%" }}
        variant="filled"
      >
        {current
          ? current.type.replaceAll("_", " ").toLowerCase()
          : "Schedule update"}
      </Alert>
    </Snackbar>
  );
}
