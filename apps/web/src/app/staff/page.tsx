"use client";

import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import { DashboardShell } from "../../components/dashboard-shell";
import { AvailableShifts } from "../../components/staff/available-shifts";
import { PersonalSchedule } from "../../components/staff/personal-schedule";
import { useStaffDashboard } from "../../features/staff/use-staff-dashboard";

export default function StaffPage() {
  const staff = useStaffDashboard();
  const dashboard = staff.dashboard;

  return (
    <DashboardShell title="Staff dashboard">
      <Stack spacing={3}>
        {staff.error ? <Alert severity="error">{staff.error}</Alert> : null}
        <AvailableShifts
          onClaim={staff.claim}
          pendingId={staff.pendingId}
          shifts={dashboard?.available ?? []}
        />
        <PersonalSchedule
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
      </Stack>
    </DashboardShell>
  );
}
