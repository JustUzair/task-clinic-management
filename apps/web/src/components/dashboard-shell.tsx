"use client";

import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { apiRequest } from "../lib/api";
import { clearBrowserSession } from "../features/auth/browser-session";
import { NotificationInbox } from "./notification-inbox";

export function DashboardShell({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  const router = useRouter();

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <AppBar
        color="inherit"
        elevation={0}
        position="static"
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ justifyContent: "space-between" }}>
            <Box>
              <Typography
                color="primary"
                sx={{ fontWeight: 700, letterSpacing: 1 }}
                variant="overline"
              >
                Clinic Shift Scheduler
              </Typography>
              <Typography component="h1" sx={{ lineHeight: 1.1 }} variant="h6">
                {title}
              </Typography>
            </Box>
            <Button
              onClick={async () => {
                await apiRequest("/api/v1/auth/logout", { method: "POST" });
                clearBrowserSession();
                router.replace("/");
              }}
              variant="outlined"
            >
              Sign out
            </Button>
          </Toolbar>
        </Container>
      </AppBar>
      <Container component="main" maxWidth="xl" sx={{ py: 3 }}>
        {children}
      </Container>
      <NotificationInbox />
    </Box>
  );
}
