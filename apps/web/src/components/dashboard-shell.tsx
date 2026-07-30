"use client";

import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import {
  Bell,
  CalendarRange,
  LayoutDashboard,
  LogOut,
  Menu,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { apiRequest } from "../lib/api";
import { clearBrowserSession } from "../features/auth/browser-session";
import { NotificationInbox } from "./notification-inbox";

const drawerWidth = 280;

export function DashboardShell({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const isManager = pathname.startsWith("/manager");
  const navItems = isManager
    ? [{ href: "/manager", icon: LayoutDashboard, label: "Coverage overview" }]
    : [{ href: "/staff", icon: CalendarRange, label: "My schedule" }];

  async function signOut() {
    setSigningOut(true);
    try {
      await apiRequest("/api/v1/auth/logout", { method: "POST" });
      clearBrowserSession();
      router.replace("/");
    } finally {
      setSigningOut(false);
    }
  }

  const drawer = (
    <Box
      sx={{
        background:
          "linear-gradient(180deg, #12343f 0%, #183f48 34%, #12343f 100%)",
        color: "common.white",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <Box sx={{ px: 2.5, py: 3 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Avatar
            sx={{
              backgroundColor: "rgba(216, 240, 238, 0.16)",
              color: "common.white",
              fontWeight: 800,
              height: 48,
              width: 48,
            }}
          >
            CS
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 800 }}>Clinic Scheduler</Typography>
            <Typography
              sx={{ color: "rgba(255,255,255,0.72)" }}
              variant="body2"
            >
              {isManager ? "Manager workspace" : "Staff workspace"}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ px: 2.5 }}>
        <Box
          sx={{
            backgroundColor: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 2,
            p: 2,
          }}
        >
          <Typography sx={{ fontWeight: 700 }} variant="subtitle2">
            {isManager ? "Operations view" : "Personal shift view"}
          </Typography>
          <Typography
            sx={{ color: "rgba(255,255,255,0.72)", mt: 0.75 }}
            variant="body2"
          >
            {isManager
              ? "Create shifts, assign staff, and review import evidence."
              : "Track your schedule, claim open shifts, and acknowledge updates."}
          </Typography>
        </Box>
      </Box>

      <List sx={{ px: 1.5, pt: 3 }}>
        {navItems.map(item => {
          const active = pathname === item.href;
          return (
            <ListItemButton
              key={item.href}
              onClick={() => {
                router.push(item.href);
                setMobileOpen(false);
              }}
              sx={{
                borderRadius: 1,
                color: active ? "common.white" : "rgba(255,255,255,0.78)",
                mb: 0.75,
                ...(active
                  ? { backgroundColor: "rgba(20,125,116,0.72)" }
                  : {
                      "&:hover": { backgroundColor: "rgba(255,255,255,0.08)" },
                    }),
              }}
            >
              <ListItemIcon sx={{ color: "inherit", minWidth: 38 }}>
                <item.icon size={18} />
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ flexGrow: 1 }} />
      <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />
      <Box sx={{ p: 2 }}>
        <Button
          disabled={signingOut}
          fullWidth
          onClick={() => void signOut()}
          startIcon={
            signingOut ? (
              <CircularProgress color="inherit" size={16} />
            ) : (
              <LogOut size={16} />
            )
          }
          sx={{
            backgroundColor: "rgba(255,255,255,0.08)",
            color: "common.white",
            "&:hover": { backgroundColor: "rgba(255,255,255,0.14)" },
          }}
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        backgroundColor: "background.default",
        display: "flex",
        minHeight: "100vh",
      }}
    >
      <Box
        component="nav"
        sx={{ flexShrink: { md: 0 }, width: { md: drawerWidth } }}
      >
        <Drawer
          ModalProps={{ keepMounted: true }}
          onClose={() => setMobileOpen(false)}
          open={mobileOpen}
          sx={{
            display: { md: "none", xs: "block" },
            "& .MuiDrawer-paper": { width: drawerWidth },
          }}
          variant="temporary"
        >
          {drawer}
        </Drawer>
        <Drawer
          open
          sx={{
            display: { md: "block", xs: "none" },
            "& .MuiDrawer-paper": {
              border: 0,
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
          variant="permanent"
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          minWidth: 0,
        }}
      >
        <AppBar
          color="transparent"
          elevation={0}
          position="sticky"
          sx={{
            borderBottom: "1px solid",
            borderColor: "rgba(16, 35, 45, 0.08)",
            px: { xs: 0, md: 1 },
          }}
        >
          <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3 } }}>
            <Toolbar
              disableGutters
              sx={{ gap: 2, justifyContent: "space-between" }}
            >
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: "center", minWidth: 0 }}
              >
                <IconButton
                  onClick={() => setMobileOpen(true)}
                  sx={{ display: { md: "none" } }}
                >
                  <Menu size={18} />
                </IconButton>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    color="primary"
                    sx={{ fontWeight: 800, letterSpacing: "0.16em" }}
                    variant="overline"
                  >
                    {isManager ? "Manager console" : "Staff console"}
                  </Typography>
                  <Typography
                    component="h1"
                    sx={{ lineHeight: 1.1 }}
                    variant="h6"
                  >
                    {title}
                  </Typography>
                </Box>
              </Stack>
              <Stack
                direction="row"
                spacing={1.25}
                sx={{ alignItems: "center" }}
              >
                <Tooltip title="Live notifications appear in the bottom corner">
                  <Badge color="primary" variant="dot">
                    <Bell size={18} />
                  </Badge>
                </Tooltip>
                <Avatar
                  sx={{
                    backgroundColor: "primary.light",
                    color: "primary.dark",
                    fontSize: 13,
                    fontWeight: 800,
                    height: 38,
                    width: 38,
                  }}
                >
                  {isManager ? "MG" : "ST"}
                </Avatar>
              </Stack>
            </Toolbar>
          </Container>
        </AppBar>
        <Container
          component="main"
          maxWidth="xl"
          sx={{ px: { xs: 2, md: 3 }, py: 3 }}
        >
          {children}
        </Container>
      </Box>
      <NotificationInbox />
    </Box>
  );
}
