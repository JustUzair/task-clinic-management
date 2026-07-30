"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Bell, BriefcaseMedical, CalendarClock, CheckCircle2 } from "lucide-react";
import { DashboardShell } from "../../components/dashboard-shell";
import { LoadingIndicator } from "../../components/loading-indicator";
import { AvailableShifts } from "../../components/staff/available-shifts";
import { PersonalSchedule } from "../../components/staff/personal-schedule";
import { useStaffDashboard } from "../../features/staff/use-staff-dashboard";

export default function StaffPage() {
  const staff = useStaffDashboard();
  const dashboard = staff.dashboard;
  const stats = dashboard
    ? [
        {
          icon: CalendarClock,
          label: "Upcoming shifts",
          tone: "#147d74",
          value: dashboard.upcoming.length,
        },
        {
          icon: BriefcaseMedical,
          label: "Open shifts",
          tone: "#23414d",
          value: dashboard.availablePagination.total,
        },
        {
          icon: CheckCircle2,
          label: "Completed",
          tone: "#1f8f63",
          value: dashboard.completed.length,
        },
        {
          icon: Bell,
          label: "Cancelled or removed",
          tone: "#d97706",
          value: dashboard.cancelled.length,
        },
      ]
    : [];

  return (
    <DashboardShell title="Staff dashboard">
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4">Your shift workspace</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Review your schedule, claim open work, and keep up with changes
            without leaving the page.
          </Typography>
        </Box>
        {staff.error ? <Alert severity="error">{staff.error}</Alert> : null}
        {staff.loading && !dashboard ? (
          <LoadingIndicator label="Loading your schedule…" page />
        ) : (
          <>
            <Box
              sx={{
                display: "grid",
                gap: 3,
                gridTemplateColumns: { md: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" },
              }}
            >
              {stats.map(item => (
                <Card key={item.label} variant="outlined">
                  <CardContent
                    sx={{ alignItems: "center", display: "flex", gap: 2.25 }}
                  >
                    <Box
                      sx={{
                        alignItems: "center",
                        backgroundColor: `${item.tone}14`,
                        borderRadius: 4,
                        color: item.tone,
                        display: "flex",
                        height: 52,
                        justifyContent: "center",
                        width: 52,
                      }}
                    >
                      <item.icon size={22} />
                    </Box>
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        {item.label}
                      </Typography>
                      <Typography sx={{ fontWeight: 800 }} variant="h5">
                        {item.value}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
            <PersonalSchedule
              busy={staff.refreshing}
              groups={[
                {
                  assignments: dashboard?.upcoming ?? [],
                  title: "Upcoming",
                  unclaimable: true,
                },
                { assignments: dashboard?.ongoing ?? [], title: "Ongoing" },
                { assignments: dashboard?.completed ?? [], title: "Completed" },
                {
                  assignments: dashboard?.cancelled ?? [],
                  title: "Cancelled / removed",
                },
              ]}
              onUnclaim={staff.unclaim}
              pendingId={staff.pendingId}
            />
            <AvailableShifts
              busy={staff.refreshing}
              onClaim={staff.claim}
              onPageChange={staff.setAvailablePage}
              pagination={
                dashboard?.availablePagination ?? {
                  page: 1,
                  total: 0,
                  totalPages: 1,
                }
              }
              pendingId={staff.pendingId}
              shifts={dashboard?.available ?? []}
            />
          </>
        )}
      </Stack>
    </DashboardShell>
  );
}
